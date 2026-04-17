import { createHash } from 'node:crypto';

const USDC_DECIMALS = 6n;
const USDC_BASE = 10n ** USDC_DECIMALS;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TOLERANCE_BPS = 1_000n;
const DEFAULT_MIN_CONFIDENCE = 0.8;

function toBigIntRaw(value, label) {
  try {
    const raw = BigInt(String(value ?? '').trim());
    if (raw < 0n) throw new Error();
    return raw;
  } catch {
    throw new Error(`Invalid ${label}`);
  }
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

export function parseUsdc6(value) {
  const input = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(input)) {
    throw new Error(`Invalid USDC amount: ${value}`);
  }

  const [whole, fraction = ''] = input.split('.');
  const padded = `${fraction}${'0'.repeat(Number(USDC_DECIMALS))}`.slice(0, Number(USDC_DECIMALS));
  return (BigInt(whole) * USDC_BASE + BigInt(padded || '0')).toString();
}

export function formatUsdc6(rawValue) {
  const raw = toBigIntRaw(rawValue, 'USDC raw amount');
  const whole = raw / USDC_BASE;
  const fraction = raw % USDC_BASE;

  if (fraction === 0n) {
    return whole.toString();
  }

  const padded = fraction.toString().padStart(Number(USDC_DECIMALS), '0').replace(/0+$/, '');
  return `${whole}.${padded}`;
}

export function canonicalJson(value) {
  if (value === undefined) {
    return 'null';
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'bigint') {
    return JSON.stringify(value.toString());
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

export function hashBytes32(value) {
  const input = typeof value === 'string' ? value : canonicalJson(value);
  return `0x${createHash('sha256').update(input).digest('hex')}`;
}

export function sourceRefForCard(packId, positionId) {
  return hashBytes32(`${packId}:${positionId}`);
}

function isStaleObservation(observedAt, nowIso) {
  const observedMs = Date.parse(observedAt);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(observedMs) || !Number.isFinite(nowMs)) {
    return true;
  }
  return nowMs - observedMs > SEVEN_DAYS_MS;
}

function compareRawValues(a, b) {
  const left = toBigIntRaw(a.valueUsdc6, `${a.sourceId} valueUsdc6`);
  const right = toBigIntRaw(b.valueUsdc6, `${b.sourceId} valueUsdc6`);
  if (left < right) return -1;
  if (left > right) return 1;
  return String(a.sourceId).localeCompare(String(b.sourceId));
}

function withinTolerance(a, b, toleranceBps = DEFAULT_TOLERANCE_BPS) {
  const left = toBigIntRaw(a.valueUsdc6, `${a.sourceId} valueUsdc6`);
  const right = toBigIntRaw(b.valueUsdc6, `${b.sourceId} valueUsdc6`);
  if (left === 0n || right === 0n) {
    return false;
  }

  const maxValue = left > right ? left : right;
  const diff = left > right ? left - right : right - left;
  return diff * 10_000n <= maxValue * toleranceBps;
}

function validateObservation(observation, nowIso, index) {
  const warnings = [];
  const sourceId = String(observation?.sourceId ?? `source-${index}`);
  const confidence = toNumber(observation?.confidence);
  const validConfidence = confidence !== undefined && confidence >= DEFAULT_MIN_CONFIDENCE;
  const value = toBigIntRaw(observation?.valueUsdc6, `${sourceId} valueUsdc6`);

  if (value <= 0n) {
    warnings.push(`${sourceId}: non-positive value`);
  }

  if (!validConfidence) {
    warnings.push(`${sourceId}: low confidence`);
  }

  if (isStaleObservation(observation?.observedAt, nowIso)) {
    warnings.push(`${sourceId}: stale observation`);
  }

  return {
    observation: {
      ...observation,
      sourceId,
      valueUsdc6: value.toString(),
    },
    warnings,
    valid: warnings.length === 0,
  };
}

function pickAgreeingPair(validObservations) {
  let bestPair;
  let bestDiff;

  for (let i = 0; i < validObservations.length; i += 1) {
    for (let j = i + 1; j < validObservations.length; j += 1) {
      const left = validObservations[i];
      const right = validObservations[j];
      if (!withinTolerance(left, right)) continue;

      const diff = toBigIntRaw(left.valueUsdc6, `${left.sourceId} valueUsdc6`) > toBigIntRaw(right.valueUsdc6, `${right.sourceId} valueUsdc6`)
        ? toBigIntRaw(left.valueUsdc6, `${left.sourceId} valueUsdc6`) - toBigIntRaw(right.valueUsdc6, `${right.sourceId} valueUsdc6`)
        : toBigIntRaw(right.valueUsdc6, `${right.sourceId} valueUsdc6`) - toBigIntRaw(left.valueUsdc6, `${left.sourceId} valueUsdc6`);

      if (bestDiff === undefined || diff < bestDiff) {
        bestDiff = diff;
        bestPair = [left, right];
      }
    }
  }

  return bestPair;
}

export function evaluateConsensus({ observations = [], nowIso, toleranceBps = DEFAULT_TOLERANCE_BPS } = {}) {
  const warnings = [];
  const normalized = observations.map((observation, index) => validateObservation(observation, nowIso, index));

  for (const entry of normalized) {
    warnings.push(...entry.warnings);
  }

  const validObservations = normalized.filter((entry) => entry.valid).map((entry) => entry.observation);
  const validSourceCount = validObservations.length;
  const agreeingPair = validObservations.length >= 2 ? pickAgreeingPair(validObservations) : undefined;

  if (!agreeingPair) {
    if (validSourceCount >= 2) {
      warnings.push('fewer than two sources agree within tolerance');
    }
    return {
      status: 'needs_review',
      validSourceCount,
      agreeingSourceIds: [],
      warnings,
    };
  }

  const agreeingSourceIds = agreeingPair.map((observation) => observation.sourceId);
  const sortedValid = [...validObservations].sort(compareRawValues);

  let proposedValueUsdc6;
  if (validSourceCount === 2) {
    const lower = compareRawValues(sortedValid[0], sortedValid[1]) <= 0 ? sortedValid[0] : sortedValid[1];
    proposedValueUsdc6 = toBigIntRaw(lower.valueUsdc6, `${lower.sourceId} valueUsdc6`).toString();
  } else {
    const median = sortedValid[Math.floor(sortedValid.length / 2)];
    proposedValueUsdc6 = toBigIntRaw(median.valueUsdc6, `${median.sourceId} valueUsdc6`).toString();
  }

  return {
    status: 'passed',
    proposedValueUsdc6,
    validSourceCount,
    agreeingSourceIds,
    warnings,
  };
}

export function buildValuationPack({ packId, generatedAt, cards = [] } = {}) {
  return {
    packId,
    generatedAt,
    cadence: 'weekly-friday',
    unit: 'USDC_6',
    cards: cards.map((card) => {
      const consensus = evaluateConsensus({
        observations: card.observations ?? [],
        nowIso: generatedAt,
      });
      const observations = (card.observations ?? []).map((observation) => ({
        ...observation,
        sourceId: String(observation?.sourceId ?? ''),
      }));

      return {
        ...card,
        observations,
        consensus,
        decision: 'pending',
        submittedTxHash: '',
        sourceRef: sourceRefForCard(packId, card.positionId),
        proofHash: hashBytes32(canonicalJson(observations)),
      };
    }),
  };
}
