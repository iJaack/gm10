import { parseUsdc6 } from './valuation.js';

const SOURCE_ID = 'primary';
const SOURCE_NAME = 'PokemonPriceTracker';
const BASE_URL = 'https://www.pokemonpricetracker.com/api/v2/cards';
const MISSING_PAYLOAD_REF = 'missing://pokemon-price-tracker';
const RATE_LIMIT_PAYLOAD_REF = 'rate-limited://pokemon-price-tracker';
const DEFAULT_SUCCESS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_RATE_LIMIT_CACHE_TTL_MS = 15 * 60 * 1000;

const observationCache = new Map();
const pendingRequests = new Map();

function positiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

function normalizeGrade(value) {
  const grade = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!grade) return 'psa10';
  if (/^10$/.test(grade)) return 'psa10';
  if (/^psa(8|9|10)$/.test(grade)) return grade;
  if (/^psa[-_ ]?(8|9|10)$/.test(String(value ?? '').trim().toLowerCase())) {
    return `psa${String(value).match(/(8|9|10)/)?.[1] ?? '10'}`;
  }
  return grade;
}

function missingObservation({ cardKey, reason, fetchedAt, rawPayloadRef = MISSING_PAYLOAD_REF }) {
  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    cardKey,
    observedAt: fetchedAt,
    fetchedAt,
    valueUsdc6: '0',
    currency: 'USD',
    confidence: 0,
    rawPayloadRef,
    sourceUrl: '',
    matchReason: `PokemonPriceTracker unavailable: ${reason}`,
  };
}

function cloneObservationForRequest(observation, { cardKey, fetchedAt }) {
  const isMissingObservation = observation.valueUsdc6 === '0' && observation.confidence === 0;
  return {
    ...observation,
    cardKey,
    fetchedAt,
    observedAt: isMissingObservation ? fetchedAt : (observation.observedAt ?? fetchedAt),
  };
}

function firstCard(payload) {
  if (Array.isArray(payload?.data)) return payload.data[0];
  if (Array.isArray(payload?.cards)) return payload.cards[0];
  if (payload?.data && typeof payload.data === 'object') return payload.data;
  if (payload?.card && typeof payload.card === 'object') return payload.card;
  return payload && typeof payload === 'object' ? payload : undefined;
}

function numericValue(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return undefined;
}

function salesCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function confidenceForSalesCount(count) {
  if (count >= 3) return 0.9;
  if (count > 0) return 0.82;
  return 0.8;
}

function confidenceForProviderLabel(label, fallbackCount) {
  const normalized = String(label ?? '').toLowerCase();
  if (normalized === 'high') return 0.9;
  if (normalized === 'medium') return 0.86;
  if (normalized === 'low') return 0.8;
  return confidenceForSalesCount(fallbackCount);
}

function sourceUrlForCard(card, cardConfig) {
  const id = card?.id ?? card?.slug ?? cardConfig?.tcgPlayerId ?? '';
  return id ? `https://www.pokemonpricetracker.com/card/${id}` : 'https://www.pokemonpricetracker.com/api-reference';
}

function buildUrl(cardConfig) {
  const url = new URL(BASE_URL);
  url.searchParams.set('includeEbay', 'true');
  url.searchParams.set('days', String(cardConfig?.days ?? 90));

  if (cardConfig?.tcgPlayerId) {
    url.searchParams.set('tcgPlayerId', String(cardConfig.tcgPlayerId));
  } else {
    const search = cardConfig?.search ?? cardConfig?.title;
    url.searchParams.set('search', String(search));
    url.searchParams.set('limit', '5');
  }

  return url;
}

function cacheKey({ apiKey, url, grade }) {
  return JSON.stringify([apiKey, String(url), grade]);
}

function readCachedObservation(key, { cardKey, fetchedAt }) {
  const cached = observationCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAtMs <= Date.now()) {
    observationCache.delete(key);
    return undefined;
  }
  return cloneObservationForRequest(cached.observation, { cardKey, fetchedAt });
}

function cacheTtlForObservation(observation, { successCacheTtlMs, rateLimitCacheTtlMs }) {
  if (observation.rawPayloadRef === RATE_LIMIT_PAYLOAD_REF) {
    return rateLimitCacheTtlMs;
  }
  if (observation.valueUsdc6 !== '0' && observation.confidence > 0) {
    return successCacheTtlMs;
  }
  return 0;
}

function writeCachedObservation(key, observation, options) {
  const ttlMs = cacheTtlForObservation(observation, options);
  if (ttlMs <= 0) return;
  observationCache.set(key, {
    observation,
    expiresAtMs: Date.now() + ttlMs,
  });
}

function retryAfterSuffix(response) {
  const rawRetryAfter = response?.headers?.get?.('retry-after');
  if (!rawRetryAfter) return '';

  const retryAfter = String(rawRetryAfter).trim();
  if (!retryAfter) return '';
  if (/^\d+$/.test(retryAfter)) {
    return `; retry after ${retryAfter}s`;
  }
  return `; retry after ${retryAfter}`;
}

function extractGradeValue(card, grade) {
  const ebay = card?.ebay ?? card?.eBay ?? card?.ebayData ?? card?.graded ?? {};
  const gradeData = ebay?.[grade]
    ?? ebay?.salesByGrade?.[grade]
    ?? ebay?.[grade.toUpperCase()]
    ?? ebay?.salesByGrade?.[grade.toUpperCase()]
    ?? ebay?.[grade.replace('psa', 'psa_')]
    ?? {};
  const value = numericValue(
    gradeData.smartMarketPrice?.price,
    gradeData.marketPrice7Day,
    gradeData.medianPrice,
    gradeData.avg,
    gradeData.average,
    gradeData.averagePrice,
    gradeData.market,
    gradeData.price,
    gradeData.value,
  );
  if (value === undefined) {
    return undefined;
  }

  const count = salesCount(gradeData.count ?? gradeData.salesCount ?? gradeData.sales ?? gradeData.sampleSize);
  return {
    count,
    confidence: confidenceForProviderLabel(gradeData.smartMarketPrice?.confidence, count),
    observedAt: gradeData.latestDate ?? gradeData.lastSaleDate ?? gradeData.lastMarketUpdate ?? gradeData.updatedAt ?? ebay.updatedAt ?? card?.updatedAt,
    valueUsdc6: parseUsdc6(String(value)),
  };
}

export async function fetchPokemonPriceTrackerObservation({
  cardKey,
  cardConfig,
  apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY,
  fetchImpl = fetch,
  fetchedAt = new Date().toISOString(),
} = {}) {
  if (!apiKey) {
    return missingObservation({ cardKey, fetchedAt, reason: 'API key not configured' });
  }

  if (!cardConfig?.tcgPlayerId && !cardConfig?.search && !cardConfig?.title) {
    return missingObservation({ cardKey, fetchedAt, reason: 'card identity not configured' });
  }

  const grade = normalizeGrade(cardConfig.grade);
  const url = buildUrl(cardConfig);
  const requestCacheKey = cacheKey({ apiKey, url, grade });
  const successCacheTtlMs = positiveIntegerEnv('POKEMON_PRICE_TRACKER_CACHE_TTL_MS', DEFAULT_SUCCESS_CACHE_TTL_MS);
  const rateLimitCacheTtlMs = positiveIntegerEnv('POKEMON_PRICE_TRACKER_RATE_LIMIT_TTL_MS', DEFAULT_RATE_LIMIT_CACHE_TTL_MS);

  const cachedObservation = readCachedObservation(requestCacheKey, { cardKey, fetchedAt });
  if (cachedObservation) {
    return cachedObservation;
  }

  if (pendingRequests.has(requestCacheKey)) {
    const pendingObservation = await pendingRequests.get(requestCacheKey);
    return cloneObservationForRequest(pendingObservation, { cardKey, fetchedAt });
  }

  const requestPromise = fetchLivePokemonPriceTrackerObservation({
    cardKey,
    cardConfig,
    apiKey,
    fetchImpl,
    fetchedAt,
    grade,
    url,
  });
  pendingRequests.set(requestCacheKey, requestPromise);

  try {
    const observation = await requestPromise;
    writeCachedObservation(requestCacheKey, observation, {
      successCacheTtlMs,
      rateLimitCacheTtlMs,
    });
    return observation;
  } finally {
    pendingRequests.delete(requestCacheKey);
  }
}

async function fetchLivePokemonPriceTrackerObservation({
  cardKey,
  cardConfig,
  apiKey,
  fetchImpl,
  fetchedAt,
  grade,
  url,
}) {
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      if (response.status === 429) {
        return missingObservation({
          cardKey,
          fetchedAt,
          rawPayloadRef: RATE_LIMIT_PAYLOAD_REF,
          reason: `rate limited (429${retryAfterSuffix(response)})`,
        });
      }
      throw new Error(`PokemonPriceTracker returned ${response.status}`);
    }

    const payload = await response.json();
    const card = firstCard(payload);
    const gradeValue = extractGradeValue(card, grade);
    if (!card || !gradeValue) {
      throw new Error(`no ${grade.toUpperCase()} value found`);
    }

    const readableGrade = grade.replace('psa', 'PSA ');
    const cardId = card?.tcgPlayerId ?? cardConfig?.tcgPlayerId ?? 'search';
    return {
      sourceId: SOURCE_ID,
      sourceName: SOURCE_NAME,
      cardKey,
      observedAt: gradeValue.observedAt ?? fetchedAt,
      fetchedAt,
      valueUsdc6: gradeValue.valueUsdc6,
      currency: 'USD',
      confidence: gradeValue.confidence,
      rawPayloadRef: `pokemon-price-tracker://cards/${cardId}/${grade}`,
      sourceUrl: sourceUrlForCard(card, cardConfig),
      matchReason: `${readableGrade} eBay market price from PokemonPriceTracker${cardConfig?.tcgPlayerId ? ` tcgPlayerId ${cardConfig.tcgPlayerId}` : ' search result'}`,
    };
  } catch (error) {
    return missingObservation({
      cardKey,
      fetchedAt,
      reason: error instanceof Error ? error.message : 'request failed',
    });
  }
}

export function resetPokemonPriceTrackerCacheForTests() {
  observationCache.clear();
  pendingRequests.clear();
}
