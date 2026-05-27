import { addBps, formatDecimalUnits, parseDecimalUnits } from './units.js';
import { solanaAddressToBytes32 } from '../../src/lib/solanaAddress.js';

export const AVALANCHE_CHAIN_ID = 43114;
export const POLYGON_CHAIN_ID = 137;
export const SOLANA_CHAIN_ID = 1151111081099710;
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';
export const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
export const SOLANA_NATIVE_SOL = '11111111111111111111111111111111';
export const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const AVALANCHE_USDC_E = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
export const ROUTE_BUFFER_BPS = 10;
const MIN_FALLBACK_FROM_AMOUNT_RAW = BigInt(parseDecimalUnits('0.005', 18));
const MAX_FALLBACK_FROM_AMOUNT_RAW = BigInt(parseDecimalUnits('100', 18));
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function sourceGasRaw(quote) {
  return (quote.estimate?.gasCosts ?? [])
    .filter((gas) => Number(gas.token?.chainId) === AVALANCHE_CHAIN_ID)
    .reduce((total, gas) => total + BigInt(gas.amount ?? '0'), 0n);
}

export function normalizeQuote(kind, quote, targetRaw) {
  const fromAmountRaw = BigInt(quote.action?.fromAmount ?? quote.estimate?.fromAmount ?? '0');
  const gasRaw = sourceGasRaw(quote);
  const target = BigInt(targetRaw);
  const toAmountRaw = BigInt(quote.estimate?.toAmount ?? '0');
  const toAmountMinRaw = BigInt(quote.estimate?.toAmountMin ?? quote.estimate?.toAmount ?? '0');
  return {
    kind,
    id: quote.id,
    tool: quote.estimate?.tool || '',
    fromAmountRaw: fromAmountRaw.toString(),
    fromAmountAvax: formatDecimalUnits(fromAmountRaw, 18, 8),
    sourceGasRaw: gasRaw.toString(),
    sourceGasAvax: formatDecimalUnits(gasRaw, 18, 8),
    totalInputRaw: (fromAmountRaw + gasRaw).toString(),
    totalInputAvax: formatDecimalUnits(fromAmountRaw + gasRaw, 18, 8),
    targetRaw: target.toString(),
    toAmountRaw: toAmountRaw.toString(),
    toAmountMinRaw: toAmountMinRaw.toString(),
    toAmountUsd: String(quote.estimate?.toAmountUSD ?? ''),
    fromAmountUsd: String(quote.estimate?.fromAmountUSD ?? ''),
    executionDuration: Number(quote.estimate?.executionDuration ?? 0),
    enoughOutput: toAmountMinRaw >= target,
    transactionRequest: quote.transactionRequest
      ? {
          to: quote.transactionRequest.to,
          data: quote.transactionRequest.data,
          value: quote.transactionRequest.value ?? '0',
          chainId: quote.transactionRequest.chainId,
          gasLimit: quote.transactionRequest.gasLimit,
          gasPrice: quote.transactionRequest.gasPrice,
          maxFeePerGas: quote.transactionRequest.maxFeePerGas,
          maxPriorityFeePerGas: quote.transactionRequest.maxPriorityFeePerGas,
        }
      : null,
    approvalAddress: quote.estimate?.approvalAddress || null,
  };
}

export function summarizeFunding(usdcQuote) {
  const totalRaw = BigInt(usdcQuote.totalInputRaw);
  const bufferedRaw = addBps(totalRaw, ROUTE_BUFFER_BPS);
  return {
    totalRaw: totalRaw.toString(),
    totalAvax: formatDecimalUnits(totalRaw, 18, 8),
    bufferedRaw: bufferedRaw.toString(),
    bufferedAvax: formatDecimalUnits(bufferedRaw, 18, 8),
    bufferBps: ROUTE_BUFFER_BPS,
  };
}

async function requestLiFiQuote(path, params, fetchImpl = fetch) {
  const url = new URL(`https://li.quest${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'gm10-admin',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `LI.FI API returned ${response.status}`);
  }
  return payload;
}

export function fetchLiFiQuote(params, fetchImpl = fetch) {
  return requestLiFiQuote('/v1/quote/toAmount', params, fetchImpl);
}

function fetchLiFiSourceQuote(params, fetchImpl = fetch) {
  return requestLiFiQuote('/v1/quote', params, fetchImpl);
}

function assertSourceAmount(rawValue) {
  if (!/^\d+$/.test(String(rawValue ?? ''))) throw new Error('Missing AVAX raw source amount');
  if (BigInt(rawValue) <= 0n) throw new Error('AVAX source amount must be greater than zero');
}

function assertAvaxAddress(value) {
  if (!ADDRESS_RE.test(String(value ?? ''))) throw new Error('Missing Avalanche Safe address for LI.FI quote');
}

function assertEvmAddress(value, label) {
  if (!ADDRESS_RE.test(String(value ?? ''))) throw new Error(`Missing ${label} address for LI.FI quote`);
}

function assertSolanaAddress(value) {
  solanaAddressToBytes32(String(value ?? ''));
}

function fallbackFromAmounts(preferredRaw) {
  const preferred = BigInt(preferredRaw || parseDecimalUnits('1', 18));
  const start = preferred > MIN_FALLBACK_FROM_AMOUNT_RAW * 2n ? preferred / 2n : MIN_FALLBACK_FROM_AMOUNT_RAW;
  const amounts = new Set();
  for (let candidate = start; candidate <= MAX_FALLBACK_FROM_AMOUNT_RAW; candidate *= 2n) {
    amounts.add(candidate.toString());
  }
  amounts.add(MAX_FALLBACK_FROM_AMOUNT_RAW.toString());
  return [...amounts].sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : 1));
}

function usdcPreferredFromAmountRaw(usdcRaw) {
  return ((BigInt(usdcRaw) * 10n ** 12n) / 10n).toString();
}

async function fetchLiFiFallbackQuote(kind, params, targetRaw, preferredFromAmountRaw, fetchImpl) {
  let lastError;
  let low = 0n;
  let high = 0n;
  let bestQuote = null;

  for (const fromAmount of fallbackFromAmounts(preferredFromAmountRaw)) {
    try {
      const quote = await fetchLiFiSourceQuote({ ...params, fromAmount }, fetchImpl);
      const normalized = normalizeQuote(kind, quote, targetRaw);
      if (normalized.enoughOutput) {
        high = BigInt(fromAmount);
        bestQuote = quote;
        break;
      }
      low = BigInt(fromAmount);
    } catch (error) {
      lastError = error;
    }
  }

  if (!bestQuote) {
    throw new Error(lastError?.message || 'No available LI.FI quote can satisfy the target output');
  }

  for (let index = 0; index < 6; index += 1) {
    const mid = (low + high) / 2n;
    if (mid <= low || mid >= high) break;
    try {
      const quote = await fetchLiFiSourceQuote({ ...params, fromAmount: mid.toString() }, fetchImpl);
      if (normalizeQuote(kind, quote, targetRaw).enoughOutput) {
        bestQuote = quote;
        high = mid;
      } else {
        low = mid;
      }
    } catch (error) {
      lastError = error;
      low = mid;
    }
  }

  return bestQuote;
}

async function fetchLiFiTargetQuote(kind, params, targetRaw, preferredFromAmountRaw, fetchImpl) {
  try {
    const exactQuote = await fetchLiFiQuote({ ...params, toAmount: targetRaw }, fetchImpl);
    if (normalizeQuote(kind, exactQuote, targetRaw).enoughOutput) {
      return exactQuote;
    }
  } catch {
    // Fall through to the documented exact-source quote endpoint below.
  }

  return fetchLiFiFallbackQuote(kind, params, targetRaw, preferredFromAmountRaw, fetchImpl);
}

export async function buildFundingQuotes({ usdcRaw, fromAddress, toAddress, toToken = POLYGON_USDC }, fetchImpl = fetch) {
  if (!/^\d+$/.test(String(usdcRaw ?? ''))) throw new Error('Missing USDC raw target amount');
  if (!fromAddress || !toAddress) throw new Error('Missing Safe address for LI.FI quote');
  assertEvmAddress(toToken, 'Polygon funding token');

  const base = {
    fromChain: AVALANCHE_CHAIN_ID,
    toChain: POLYGON_CHAIN_ID,
    fromToken: NATIVE_TOKEN,
    fromAddress,
    toAddress,
    slippage: 0.005,
    integrator: 'gm10-admin',
    order: 'CHEAPEST',
  };

  const usdcRawQuote = await fetchLiFiTargetQuote(
    'polygonUsdc',
    { ...base, toToken },
    usdcRaw,
    usdcPreferredFromAmountRaw(usdcRaw),
    fetchImpl,
  );
  const usdc = normalizeQuote('polygonUsdc', usdcRawQuote, usdcRaw);
  return {
    usdc,
    summary: summarizeFunding(usdc),
  };
}

export async function buildContinuousCommitRoute({
  fromChainId,
  fromToken,
  fromAmountRaw,
  fromAddress,
  escrowAddress,
  settlementAddress,
  settlementToken = NATIVE_TOKEN,
}, fetchImpl = fetch) {
  const sourceChain = Number(fromChainId);
  if (!Number.isInteger(sourceChain) || sourceChain <= 0) throw new Error('Missing source chain id');
  if (!/^\d+$/.test(String(fromAmountRaw ?? ''))) throw new Error('Missing source token amount');
  if (BigInt(fromAmountRaw) <= 0n) throw new Error('Source token amount must be greater than zero');
  assertEvmAddress(fromAddress, 'buyer');
  const destinationAddress = settlementAddress || escrowAddress;
  assertEvmAddress(destinationAddress, 'Avalanche settlement receiver');
  assertEvmAddress(settlementToken, 'Avalanche settlement token');
  const sourceToken = String(fromToken || NATIVE_TOKEN).trim();
  if (sourceToken !== NATIVE_TOKEN) assertEvmAddress(sourceToken, 'source token');

  if (sourceChain === AVALANCHE_CHAIN_ID && sourceToken === NATIVE_TOKEN && settlementToken === NATIVE_TOKEN) {
    const raw = BigInt(fromAmountRaw);
    return {
      route: {
        kind: 'continuousCommit',
        id: `native-avax:${sourceChain}:${destinationAddress}:${fromAmountRaw}`,
        tool: 'native-transfer',
        fromAmountRaw: raw.toString(),
        fromAmountAvax: formatDecimalUnits(raw, 18, 8),
        sourceGasRaw: '0',
        sourceGasAvax: '0',
        totalInputRaw: raw.toString(),
        totalInputAvax: formatDecimalUnits(raw, 18, 8),
        targetRaw: raw.toString(),
        toAmountRaw: raw.toString(),
        toAmountMinRaw: raw.toString(),
        toAmountUsd: '',
        fromAmountUsd: '',
        executionDuration: 0,
        enoughOutput: true,
        transactionRequest: {
          to: destinationAddress,
          data: '0x',
          value: raw.toString(),
          chainId: AVALANCHE_CHAIN_ID,
        },
        approvalAddress: null,
      },
      settlementToken,
      escrowAddress: destinationAddress,
      settlementAddress: destinationAddress,
    };
  }

  const quote = await fetchLiFiSourceQuote(
    {
      fromChain: sourceChain,
      toChain: AVALANCHE_CHAIN_ID,
      fromToken: sourceToken,
      toToken: settlementToken,
      fromAddress,
      toAddress: destinationAddress,
      fromAmount: fromAmountRaw,
      slippage: 0.005,
      integrator: 'gm10-continuous-round',
      order: 'CHEAPEST',
    },
    fetchImpl,
  );
  const targetRaw = quote.estimate?.toAmountMin ?? quote.estimate?.toAmount ?? '0';

  return {
    route: normalizeQuote('continuousCommit', quote, targetRaw),
    settlementToken,
    escrowAddress: destinationAddress,
    settlementAddress: destinationAddress,
  };
}

export async function buildSolanaFundingQuote({ fromAmountRaw, fromAddress, toAddress }, fetchImpl = fetch) {
  assertSourceAmount(fromAmountRaw);
  assertAvaxAddress(fromAddress);
  assertSolanaAddress(toAddress);

  const quote = await fetchLiFiSourceQuote(
    {
      fromChain: AVALANCHE_CHAIN_ID,
      toChain: SOLANA_CHAIN_ID,
      fromToken: NATIVE_TOKEN,
      toToken: SOLANA_NATIVE_SOL,
      fromAddress,
      toAddress,
      fromAmount: fromAmountRaw,
      slippage: 0.005,
      integrator: 'gm10-admin',
      order: 'CHEAPEST',
    },
    fetchImpl,
  );

  return {
    sol: normalizeQuote('solanaSol', quote, 0),
  };
}

export async function buildSolanaUsdcFundingQuote({ usdcRaw, fromAddress, toAddress }, fetchImpl = fetch) {
  if (!/^\d+$/.test(String(usdcRaw ?? ''))) throw new Error('Missing Solana USDC raw target amount');
  assertAvaxAddress(fromAddress);
  assertSolanaAddress(toAddress);

  const quote = await fetchLiFiTargetQuote(
    'solanaUsdc',
    {
      fromChain: AVALANCHE_CHAIN_ID,
      toChain: SOLANA_CHAIN_ID,
      fromToken: NATIVE_TOKEN,
      toToken: SOLANA_USDC,
      fromAddress,
      toAddress,
      slippage: 0.005,
      integrator: 'gm10-admin',
      order: 'CHEAPEST',
    },
    usdcRaw,
    usdcPreferredFromAmountRaw(usdcRaw),
    fetchImpl,
  );

  return {
    usdc: normalizeQuote('solanaUsdc', quote, usdcRaw),
  };
}
