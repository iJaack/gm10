import { addBps, formatDecimalUnits } from './units.js';
import { AVALANCHE_CHAIN_ID, NATIVE_TOKEN } from './lifi.js';
import { keccak256, toBytes } from 'viem';

export const CONTINUOUS_COMMIT_PROVIDERS = ['lifi', 'mobula'];
export const DEFAULT_COMMIT_TTL_SECONDS = 20 * 60;
export const DEFAULT_MIN_SETTLEMENT_BUFFER_BPS = 50;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;
const INTEGER_RE = /^\d+$/;

function assertInteger(rawValue, label, { allowZero = false } = {}) {
  if (!INTEGER_RE.test(String(rawValue ?? ''))) throw new Error(`Missing ${label}`);
  const value = BigInt(rawValue);
  if (!allowZero && value <= 0n) throw new Error(`${label} must be greater than zero`);
  return value;
}

function assertAddress(value, label) {
  const normalized = String(value ?? '').trim();
  if (!ADDRESS_RE.test(normalized)) throw new Error(`Missing ${label}`);
  return normalized;
}

function normalizeProvider(provider) {
  const normalized = String(provider ?? '').trim().toLowerCase();
  if (!CONTINUOUS_COMMIT_PROVIDERS.includes(normalized)) {
    throw new Error('Unsupported continuous commit provider');
  }
  return normalized;
}

function normalizeRouteId(routeId) {
  const value = String(routeId ?? '').trim();
  if (BYTES32_RE.test(value)) return value.toLowerCase();
  if (!value) throw new Error('Missing provider route id');
  return keccak256(toBytes(value));
}

function normalizeExpiry(expiresAt, now = Date.now(), ttlSeconds = DEFAULT_COMMIT_TTL_SECONDS) {
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
    const explicit = Number(expiresAt);
    if (!Number.isFinite(explicit) || explicit <= 0) throw new Error('Invalid quote expiry');
    return explicit;
  }
  return Math.floor(now / 1000) + ttlSeconds;
}

export function isCommitQuoteExpired(quote, now = Date.now()) {
  return Number(quote?.expiresAt ?? 0) <= Math.floor(now / 1000);
}

export function buildCommitHash(route) {
  const payload = [
    route.provider,
    route.providerRouteId,
    String(route.fromChainId),
    String(route.fromToken),
    String(route.fromAmountRaw),
    String(route.buyer).toLowerCase(),
    String(route.settlementToken).toLowerCase(),
    String(route.minSettlementAmountRaw),
    String(route.receiverAddress).toLowerCase(),
    String(route.recipientChainId),
    String(route.recipientAddress),
    String(route.expiresAt),
  ].join('|');
  return keccak256(toBytes(payload));
}

export function normalizeContinuousCommitQuote(input, now = Date.now()) {
  const provider = normalizeProvider(input?.provider);
  const fromChainId = Number(input?.fromChainId);
  const recipientChainId = Number(input?.recipientChainId ?? input?.fromChainId);
  if (!Number.isInteger(fromChainId) || fromChainId <= 0) throw new Error('Missing source chain id');
  if (!Number.isInteger(recipientChainId) || recipientChainId <= 0) throw new Error('Missing recipient chain id');

  const fromAmountRaw = assertInteger(input?.fromAmountRaw, 'source amount');
  const settlementAmountRaw = assertInteger(input?.settlementAmountRaw, 'Avalanche settlement amount');
  const minSettlementAmountRaw = assertInteger(
    input?.minSettlementAmountRaw ?? addBps(settlementAmountRaw, -DEFAULT_MIN_SETTLEMENT_BUFFER_BPS),
    'minimum settlement amount',
  );
  if (minSettlementAmountRaw > settlementAmountRaw) throw new Error('Minimum settlement exceeds quoted settlement');

  const route = {
    provider,
    providerRouteId: normalizeRouteId(input?.providerRouteId ?? input?.routeId),
    fromChainId,
    fromToken: String(input?.fromToken ?? NATIVE_TOKEN).trim(),
    fromAmountRaw: fromAmountRaw.toString(),
    fromAmountLabel: input?.fromTokenDecimals === undefined
      ? undefined
      : formatDecimalUnits(fromAmountRaw, Number(input.fromTokenDecimals), 8),
    buyer: assertAddress(input?.buyer, 'buyer address'),
    receiverAddress: assertAddress(input?.receiverAddress, 'Avalanche commit receiver'),
    toChainId: AVALANCHE_CHAIN_ID,
    settlementToken: assertAddress(input?.settlementToken ?? NATIVE_TOKEN, 'Avalanche settlement token'),
    settlementAmountRaw: settlementAmountRaw.toString(),
    minSettlementAmountRaw: minSettlementAmountRaw.toString(),
    recipientChainId,
    recipientAddress: String(input?.recipientAddress ?? input?.buyer ?? '').trim(),
    expiresAt: normalizeExpiry(input?.expiresAt, now, Number(input?.ttlSeconds ?? DEFAULT_COMMIT_TTL_SECONDS)),
  };

  return {
    ...route,
    commitId: buildCommitHash(route),
    eligible: !isCommitQuoteExpired(route, now),
  };
}

export function assertContinuousCommitEligible(quote, now = Date.now()) {
  if (Number(quote?.toChainId) !== AVALANCHE_CHAIN_ID) throw new Error('Route must settle on Avalanche');
  if (isCommitQuoteExpired(quote, now)) throw new Error('Continuous commit quote expired');
  assertInteger(quote?.settlementAmountRaw, 'Avalanche settlement amount');
  assertInteger(quote?.minSettlementAmountRaw, 'minimum settlement amount');
  if (BigInt(quote.settlementAmountRaw) < BigInt(quote.minSettlementAmountRaw)) {
    throw new Error('Settled amount below minimum');
  }
  return true;
}

export function previewContinuousCommitMint({ settlementAmountUsdt6, navPerTokenUsdt6, mintSpreadBps = -500 }) {
  const settlement = assertInteger(settlementAmountUsdt6, 'settlement amount');
  const nav = assertInteger(navPerTokenUsdt6, 'NAV per token');
  const spread = BigInt(Number(mintSpreadBps));
  const mintMultiplierBps = 10_000n + spread;
  if (mintMultiplierBps <= 0n || spread > 5_000n) throw new Error('Invalid mint spread');

  const mintPriceUsdt6 = (nav * mintMultiplierBps) / 10_000n;
  const buyerCatch18 = (settlement * 10n ** 18n) / mintPriceUsdt6;
  const segmentCatchEach18 = (buyerCatch18 * 100n) / 10_000n;

  return {
    mintPriceUsdt6: mintPriceUsdt6.toString(),
    buyerCatch18: buyerCatch18.toString(),
    segmentCatchEach18: segmentCatchEach18.toString(),
    effectiveSupplyExpansion18: (buyerCatch18 + segmentCatchEach18 * 5n).toString(),
  };
}

export function normalizeContinuousCommitStatus(input, now = Date.now()) {
  const quote = input?.quote ? normalizeContinuousCommitQuote(input.quote, now) : undefined;
  const txHash = String(input?.txHash ?? '').trim();
  const sourceStatus = String(input?.sourceStatus ?? 'unknown').toLowerCase();
  const settled = Boolean(input?.settled);
  const minted = Boolean(input?.minted);
  const delivered = Boolean(input?.delivered);
  const failed = Boolean(input?.failed) || ['failed', 'refund', 'refunded'].includes(sourceStatus);

  return {
    txHash,
    sourceStatus,
    settled,
    minted,
    delivered,
    failed,
    expired: quote ? isCommitQuoteExpired(quote, now) : false,
    canSettle: Boolean(quote && !settled && !failed && !isCommitQuoteExpired(quote, now)),
    canRetryOft: Boolean(minted && !delivered && !failed),
    canClaimAvalancheCatch: Boolean(minted && !delivered),
    quote,
  };
}
