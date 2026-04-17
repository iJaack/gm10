import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';

const DEFAULT_REGISTRY_ADDRESS = '0x02962F73AdFAA792636c62d3D2a76d922c6B052c';
const DEFAULT_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
const MAX_DEFAULT_POSITIONS = 40;

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

function missingSourceObservation(sourceId, cardKey) {
  const nowIso = new Date().toISOString();
  const sourceName = {
    primary: 'Primary source',
    benchmark: 'Benchmark source',
    evidence: 'Evidence source',
  }[sourceId] ?? `${sourceId} source`;

  return {
    sourceId,
    sourceName,
    cardKey,
    observedAt: nowIso,
    fetchedAt: nowIso,
    valueUsdc6: '0',
    currency: 'USD',
    confidence: 0,
    rawPayloadRef: `missing://${sourceId}`,
    sourceUrl: '',
    matchReason: 'source not configured',
  };
}

export function normalizeRegistryPosition(position) {
  if (!position || Number(position.status) !== 1) {
    return null;
  }

  const positionId = Number(position.id);
  const tokenId = position.tokenId?.toString?.() ?? String(position.tokenId ?? '');
  const evmCollection = String(position.evmCollection ?? '').toLowerCase();

  return {
    positionId,
    cardKey: `${evmCollection}:${tokenId}`,
    title: `Treasury card #${positionId}`,
    currentValueUsdc6: position.currentValueUsdt6.toString(),
    observations: ['primary', 'benchmark', 'evidence'].map((sourceId) => missingSourceObservation(sourceId, `${evmCollection}:${tokenId}`)),
  };
}

export async function fetchActiveTreasuryCards({ registryAddress, rpcUrl, maxPositions = MAX_DEFAULT_POSITIONS } = {}) {
  const resolvedRegistryAddress =
    registryAddress
    ?? process.env.GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS
    ?? process.env.VITE_GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS
    ?? DEFAULT_REGISTRY_ADDRESS;
  const resolvedRpcUrl =
    rpcUrl
    ?? process.env.AVALANCHE_RPC_URL
    ?? process.env.GM10_AVALANCHE_RPC_URL
    ?? DEFAULT_RPC_URL;

  const client = createPublicClient({
    chain: avalanche,
    transport: http(resolvedRpcUrl),
  });

  const count = await client.readContract({
    address: resolvedRegistryAddress,
    abi: REGISTRY_ABI,
    functionName: 'collectiblePositionCount',
  });
  const limit = Math.min(Number(count), Number(maxPositions));
  const cards = [];

  for (let index = 1; index <= limit; index += 1) {
    const position = await client.readContract({
      address: resolvedRegistryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getCollectiblePosition',
      args: [BigInt(index)],
    });
    const card = normalizeRegistryPosition(position);
    if (card) {
      cards.push(card);
    }
  }

  return cards;
}
