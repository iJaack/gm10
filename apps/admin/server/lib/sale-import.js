import { createPublicClient, getAddress, hexToBigInt, http, isAddress } from 'viem';
import { avalanche, polygon } from 'viem/chains';

const DEFAULT_REGISTRY_ADDRESS = '0x0fCbce2341E3682AB92f1cAabDF976E17D91436A';
const DEFAULT_AVALANCHE_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
const DEFAULT_POLYGON_RPC_URL = 'https://polygon-rpc.com';
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const DEFAULT_POLYGON_HOT_WALLET = '0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50';
const DEFAULT_POLYGON_STABLE_TOKENS = [
  // Native Polygon USDC
  { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6 },
  // Bridged USDC.e
  { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC.e', decimals: 6 },
  // Polygon USDT
  { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
];

const REGISTRY_ABI = [
  {
    inputs: [],
    name: 'collectiblePositionCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'getCollectiblePosition',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'originPurchaseKey', type: 'bytes32' },
          { name: 'chainEid', type: 'uint32' },
          { name: 'marketplaceId', type: 'bytes32' },
          { name: 'custodyMode', type: 'uint8' },
          { name: 'tokenStandard', type: 'bytes32' },
          { name: 'evmCollection', type: 'address' },
          { name: 'nonEvmCollection', type: 'bytes32' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'nonEvmTokenId', type: 'bytes32' },
          { name: 'externalAssetId', type: 'bytes32' },
          { name: 'categoryId', type: 'bytes32' },
          { name: 'marketplaceProvenanceRef', type: 'bytes32' },
          { name: 'acquisitionPriceUsdt6', type: 'uint256' },
          { name: 'currentValueUsdt6', type: 'uint256' },
          { name: 'lastNavMarkUsdt6', type: 'uint256' },
          { name: 'acquisitionDate', type: 'uint256' },
          { name: 'lastValuationAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'metadataHash', type: 'bytes32' },
          { name: 'proofHash', type: 'bytes32' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

function isTxHash(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function normalizeAddress(value) {
  return isAddress(value) ? getAddress(value).toLowerCase() : undefined;
}

function topicAddress(topic) {
  if (!topic || topic.length !== 66) return undefined;
  return getAddress(`0x${topic.slice(26)}`);
}

function parseTokenList(value) {
  if (!value) return DEFAULT_POLYGON_STABLE_TOKENS;
  const entries = Array.isArray(value) ? value : String(value).split(',');
  return entries
    .map((entry) => {
      if (typeof entry === 'string') {
        const [address, symbol = 'STABLE', decimals = '6'] = entry.split(':');
        return { address, symbol, decimals: Number(decimals) };
      }
      return entry;
    })
    .filter((entry) => isAddress(entry?.address) && Number.isInteger(entry?.decimals) && entry.decimals >= 6)
    .map((entry) => ({
      address: getAddress(entry.address),
      symbol: String(entry.symbol ?? 'STABLE'),
      decimals: Number(entry.decimals),
    }));
}

function normalizeStableAmountToUsdt6(amount, decimals) {
  if (decimals === 6) return amount;
  if (decimals > 6) return amount / (10n ** BigInt(decimals - 6));
  return amount * (10n ** BigInt(6 - decimals));
}

function decimalStringFromUsdt6(value) {
  const whole = value / 1_000_000n;
  const fraction = String(value % 1_000_000n).padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function logAddress(log) {
  return normalizeAddress(log?.address);
}

export function parseTransferLogs(logs, { hotWallet, stableTokens = DEFAULT_POLYGON_STABLE_TOKENS } = {}) {
  const normalizedHotWallet = normalizeAddress(hotWallet);
  if (!normalizedHotWallet) throw new Error('A valid Polygon hot wallet is required');

  const tokenMap = new Map(
    parseTokenList(stableTokens).map((token) => [normalizeAddress(token.address), token]),
  );
  const nftTransfersOut = [];
  const stableTransfersIn = [];

  for (const log of logs ?? []) {
    if (String(log?.topics?.[0] ?? '').toLowerCase() !== TRANSFER_TOPIC) continue;

    if (log.topics.length === 4) {
      const from = topicAddress(log.topics[1]);
      const to = topicAddress(log.topics[2]);
      if (normalizeAddress(from) !== normalizedHotWallet) continue;
      nftTransfersOut.push({
        collection: getAddress(log.address),
        tokenId: hexToBigInt(log.topics[3]).toString(),
        from,
        to,
      });
      continue;
    }

    if (log.topics.length === 3) {
      const token = tokenMap.get(logAddress(log));
      if (!token) continue;
      const to = topicAddress(log.topics[2]);
      if (normalizeAddress(to) !== normalizedHotWallet) continue;
      const amount = hexToBigInt(log.data ?? '0x0');
      stableTransfersIn.push({
        token: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        amount: amount.toString(),
        amountUsdt6: normalizeStableAmountToUsdt6(amount, token.decimals).toString(),
        from: topicAddress(log.topics[1]),
        to,
      });
    }
  }

  return { nftTransfersOut, stableTransfersIn };
}

async function fetchRegistryPositions({ registryClient, registryAddress, maxPositions }) {
  const count = await registryClient.readContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'collectiblePositionCount',
  });
  const limit = Math.min(Number(count), maxPositions);
  const positions = [];

  for (let id = 1; id <= limit; id += 1) {
    const position = await registryClient.readContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getCollectiblePosition',
      args: [BigInt(id)],
    });
    positions.push(position);
  }

  return positions;
}

function matchPositionForTransfer(positions, transfer) {
  const collection = normalizeAddress(transfer.collection);
  const tokenId = transfer.tokenId;
  const matches = positions.filter((position) => {
    const status = Number(position.status);
    const positionCollection = normalizeAddress(position.evmCollection);
    const positionTokenId = position.tokenId?.toString?.() ?? String(position.tokenId ?? '');
    return (status === 1 || status === 2)
      && positionCollection
      && positionCollection !== normalizeAddress(ADDRESS_ZERO)
      && positionCollection === collection
      && positionTokenId === tokenId;
  });

  if (matches.length !== 1) {
    return { match: undefined, count: matches.length };
  }

  return { match: matches[0], count: 1 };
}

export async function inferSaleFromTransaction({
  txHash,
  hotWallet = process.env.VITE_GM10_ADMIN_POLYGON_COURTYARD_HOT_WALLET_ADDRESS
    ?? process.env.GM10_ADMIN_POLYGON_COURTYARD_HOT_WALLET_ADDRESS
    ?? DEFAULT_POLYGON_HOT_WALLET,
  polygonClient,
  registryClient,
  registryAddress = process.env.GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS
    ?? process.env.VITE_GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS
    ?? DEFAULT_REGISTRY_ADDRESS,
  polygonRpcUrl = process.env.POLYGON_RPC_URL ?? process.env.GM10_POLYGON_RPC_URL ?? DEFAULT_POLYGON_RPC_URL,
  avalancheRpcUrl = process.env.AVALANCHE_RPC_URL ?? process.env.GM10_AVALANCHE_RPC_URL ?? DEFAULT_AVALANCHE_RPC_URL,
  stableTokens = process.env.GM10_ADMIN_POLYGON_STABLE_TOKENS,
  maxPositions = 80,
} = {}) {
  if (!isTxHash(txHash)) throw new Error('A valid sale transaction hash is required');
  if (!isAddress(hotWallet)) throw new Error('A valid Polygon hot wallet is required');
  if (!isAddress(registryAddress)) throw new Error('A valid portfolio registry address is required');

  const resolvedPolygonClient = polygonClient ?? createPublicClient({
    chain: polygon,
    transport: http(polygonRpcUrl),
  });
  const resolvedRegistryClient = registryClient ?? createPublicClient({
    chain: avalanche,
    transport: http(avalancheRpcUrl),
  });

  const receipt = await resolvedPolygonClient.getTransactionReceipt({ hash: txHash });
  if (!receipt || receipt.status === 'reverted') throw new Error('Sale transaction was not successful');

  const { nftTransfersOut, stableTransfersIn } = parseTransferLogs(receipt.logs, {
    hotWallet,
    stableTokens,
  });
  if (nftTransfersOut.length !== 1) {
    throw new Error(`Expected exactly one NFT transfer out of the hot wallet, found ${nftTransfersOut.length}`);
  }
  if (stableTransfersIn.length === 0) {
    throw new Error('No supported stablecoin proceeds were transferred to the hot wallet in this transaction');
  }

  const positions = await fetchRegistryPositions({
    registryClient: resolvedRegistryClient,
    registryAddress,
    maxPositions,
  });
  const { match, count } = matchPositionForTransfer(positions, nftTransfersOut[0]);
  if (!match) {
    throw new Error(`Expected one active registry position for the sold NFT, found ${count}`);
  }

  const proceedsUsdt6 = stableTransfersIn.reduce((sum, transfer) => sum + BigInt(transfer.amountUsdt6), 0n);
  const firstToken = stableTransfersIn[0];
  const singleTokenAmount = stableTransfersIn
    .filter((transfer) => normalizeAddress(transfer.token) === normalizeAddress(firstToken.token))
    .reduce((sum, transfer) => sum + BigInt(transfer.amount), 0n);

  return {
    txHash,
    hotWallet: getAddress(hotWallet),
    saleKey: `courtyard-sale-${match.id.toString()}-${txHash.slice(2, 10)}`,
    positionId: Number(match.id),
    chainEid: Number(match.chainEid ?? 0),
    collection: nftTransfersOut[0].collection,
    tokenId: nftTransfersOut[0].tokenId,
    buyer: nftTransfersOut[0].to,
    proceedsUsdt6: proceedsUsdt6.toString(),
    proceedsUsdt: decimalStringFromUsdt6(proceedsUsdt6),
    settlementMode: 'external',
    stableProceedsToken: '',
    stableProceedsAmount: '',
    sourceChainEid: '30109',
    sourceToken: firstToken.token,
    sourceTokenAmount: decimalStringFromUsdt6(normalizeStableAmountToUsdt6(singleTokenAmount, firstToken.decimals)),
    sourceTokenDecimals: String(firstToken.decimals),
    sourceProceedsRef: txHash,
    stableTransfersIn,
    executionRef: txHash,
    proceedsRef: txHash,
    proofRef: txHash,
    grossProceedsUsdt: decimalStringFromUsdt6(proceedsUsdt6),
    marketplaceFeesUsdt: '0',
    bridgeFeesUsdt: '0',
    minNetProceedsUsdt: decimalStringFromUsdt6(proceedsUsdt6),
    warning: 'This records Polygon hot-wallet proceeds as external pending. Bridge or transfer funds back to the Avalanche fund before confirming settled proceeds and finalizing.',
  };
}
