import { addBps, formatDecimalUnits, parseDecimalUnits } from './units.js';

export const AVALANCHE_CHAIN_ID = 43114;
export const POLYGON_CHAIN_ID = 137;
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';
export const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
export const POL_GAS_BUFFER_RAW = parseDecimalUnits('0.5', 18);
export const ROUTE_BUFFER_BPS = 200;

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
    toAmountMinRaw: String(quote.estimate?.toAmountMin ?? '0'),
    toAmountUsd: String(quote.estimate?.toAmountUSD ?? ''),
    fromAmountUsd: String(quote.estimate?.fromAmountUSD ?? ''),
    executionDuration: Number(quote.estimate?.executionDuration ?? 0),
    enoughOutput: toAmountRaw >= target,
  };
}

export function summarizeFunding(usdcQuote, polQuote) {
  const totalRaw = BigInt(usdcQuote.totalInputRaw) + BigInt(polQuote.totalInputRaw);
  const bufferedRaw = addBps(totalRaw, ROUTE_BUFFER_BPS);
  return {
    totalRaw: totalRaw.toString(),
    totalAvax: formatDecimalUnits(totalRaw, 18, 8),
    bufferedRaw: bufferedRaw.toString(),
    bufferedAvax: formatDecimalUnits(bufferedRaw, 18, 8),
    bufferBps: ROUTE_BUFFER_BPS,
    polGasBufferRaw: POL_GAS_BUFFER_RAW,
    polGasBuffer: '0.5',
  };
}

export async function fetchLiFiQuote(params, fetchImpl = fetch) {
  const url = new URL('https://li.quest/v1/quote/toAmount');
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

export async function buildFundingQuotes({ usdcRaw, fromAddress, toAddress }, fetchImpl = fetch) {
  if (!/^\d+$/.test(String(usdcRaw ?? ''))) throw new Error('Missing USDC raw target amount');
  if (!fromAddress || !toAddress) throw new Error('Missing Safe address for LI.FI quote');

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

  const [usdcRawQuote, polRawQuote] = await Promise.all([
    fetchLiFiQuote({ ...base, toToken: POLYGON_USDC, toAmount: usdcRaw }, fetchImpl),
    fetchLiFiQuote({ ...base, toToken: NATIVE_TOKEN, toAmount: POL_GAS_BUFFER_RAW }, fetchImpl),
  ]);
  const usdc = normalizeQuote('polygonUsdc', usdcRawQuote, usdcRaw);
  const pol = normalizeQuote('polygonPolGas', polRawQuote, POL_GAS_BUFFER_RAW);
  return {
    usdc,
    pol,
    summary: summarizeFunding(usdc, pol),
  };
}
