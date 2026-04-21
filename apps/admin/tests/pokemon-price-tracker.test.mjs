import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchPokemonPriceTrackerObservation } from '../server/lib/pokemon-price-tracker.js';

const fetchedAt = '2026-04-20T11:30:00.000Z';

test('PokemonPriceTracker adapter fails closed without an API key', async () => {
  const observation = await fetchPokemonPriceTrackerObservation({
    cardKey: 'psa:140897946',
    cardConfig: { tcgPlayerId: '490294', grade: 'psa10' },
    fetchedAt,
  });

  assert.equal(observation.sourceId, 'primary');
  assert.equal(observation.sourceName, 'PokemonPriceTracker');
  assert.equal(observation.valueUsdc6, '0');
  assert.equal(observation.confidence, 0);
  assert.equal(observation.rawPayloadRef, 'missing://pokemon-price-tracker');
  assert.match(observation.matchReason, /API key not configured/);
});

test('PokemonPriceTracker adapter normalizes PSA eBay average into primary observation', async () => {
  let requestUrl = '';
  let authorization = '';
  const observation = await fetchPokemonPriceTrackerObservation({
    cardKey: 'psa:140897946',
    cardConfig: { tcgPlayerId: '490294', grade: 'psa10' },
    apiKey: 'free-key',
    fetchedAt,
    fetchImpl: async (url, options) => {
      requestUrl = String(url);
      authorization = options.headers.Authorization;
      return {
        ok: true,
        json: async () => ({
          data: [{
            id: 'sv8pt5-161',
            name: 'Gengar VMAX',
            tcgPlayerId: '490294',
            ebay: {
              psa10: {
                avg: 125.5,
                count: 8,
                latestDate: '2026-04-19T00:00:00.000Z',
              },
            },
          }],
        }),
      };
    },
  });

  assert.match(requestUrl, /tcgPlayerId=490294/);
  assert.match(requestUrl, /includeEbay=true/);
  assert.doesNotMatch(requestUrl, /grade=/);
  assert.equal(authorization, 'Bearer free-key');
  assert.equal(observation.sourceId, 'primary');
  assert.equal(observation.valueUsdc6, '125500000');
  assert.equal(observation.confidence, 0.9);
  assert.equal(observation.observedAt, '2026-04-19T00:00:00.000Z');
  assert.equal(observation.rawPayloadRef, 'pokemon-price-tracker://cards/490294/psa10');
  assert.match(observation.matchReason, /PSA 10 eBay market price/);
});

test('PokemonPriceTracker adapter searches by title when tcgPlayerId is unavailable', async () => {
  let requestUrl = '';
  const observation = await fetchPokemonPriceTrackerObservation({
    cardKey: 'psa:140897946',
    cardConfig: {
      title: '2021 Pokemon Gengar VMAX PSA 10',
      grade: 'psa10',
    },
    apiKey: 'free-key',
    fetchedAt,
    fetchImpl: async (url) => {
      requestUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          data: [{
            name: 'Gengar VMAX',
            ebay: {
              psa10: {
                averagePrice: '96.25',
                salesCount: 2,
              },
            },
          }],
        }),
      };
    },
  });

  assert.match(requestUrl, /search=2021\+Pokemon\+Gengar\+VMAX\+PSA\+10/);
  assert.equal(observation.valueUsdc6, '96250000');
  assert.equal(observation.confidence, 0.82);
  assert.equal(observation.rawPayloadRef, 'pokemon-price-tracker://cards/search/psa10');
});

test('PokemonPriceTracker adapter supports live salesByGrade response shape', async () => {
  const observation = await fetchPokemonPriceTrackerObservation({
    cardKey: 'swsh8-271',
    cardConfig: {
      title: 'Gengar VMAX',
      grade: 'psa10',
    },
    apiKey: 'free-key',
    fetchedAt,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        data: [{
          tcgPlayerId: '253266',
          ebay: {
            updatedAt: '2026-04-20T05:44:39.885Z',
            salesByGrade: {
              psa10: {
                count: 148,
                averagePrice: 1863.4027702702701,
                medianPrice: 1899.985,
                lastMarketUpdate: '2026-04-20T05:44:39.883Z',
                smartMarketPrice: {
                  price: 2312.5,
                  confidence: 'medium',
                },
              },
            },
          },
        }],
      }),
    }),
  });

  assert.equal(observation.valueUsdc6, '2312500000');
  assert.equal(observation.confidence, 0.86);
  assert.equal(observation.observedAt, '2026-04-20T05:44:39.883Z');
  assert.equal(observation.rawPayloadRef, 'pokemon-price-tracker://cards/253266/psa10');
});

test('PokemonPriceTracker adapter reuses successful responses for identical card identity', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => ({
        data: [{
          tcgPlayerId: 'cache-success-card',
          ebay: {
            psa10: {
              averagePrice: 88,
              salesCount: 4,
              lastMarketUpdate: '2026-04-20T10:00:00.000Z',
            },
          },
        }],
      }),
    };
  };

  const first = await fetchPokemonPriceTrackerObservation({
    cardKey: 'cache-success',
    cardConfig: { tcgPlayerId: 'cache-success-card', grade: 'psa10' },
    apiKey: 'cache-key',
    fetchedAt,
    fetchImpl,
  });
  const second = await fetchPokemonPriceTrackerObservation({
    cardKey: 'cache-success',
    cardConfig: { tcgPlayerId: 'cache-success-card', grade: 'psa10' },
    apiKey: 'cache-key',
    fetchedAt: '2026-04-20T11:31:00.000Z',
    fetchImpl,
  });

  assert.equal(calls, 1);
  assert.equal(first.valueUsdc6, '88000000');
  assert.equal(second.valueUsdc6, '88000000');
  assert.equal(second.fetchedAt, '2026-04-20T11:31:00.000Z');
  assert.equal(second.observedAt, '2026-04-20T10:00:00.000Z');
});

test('PokemonPriceTracker adapter cools down after a 429 response', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: false,
      status: 429,
      headers: {
        get: (name) => (name.toLowerCase() === 'retry-after' ? '120' : null),
      },
    };
  };

  const first = await fetchPokemonPriceTrackerObservation({
    cardKey: 'cache-rate-limit',
    cardConfig: { tcgPlayerId: 'cache-rate-limit-card', grade: 'psa10' },
    apiKey: 'rate-limit-key',
    fetchedAt,
    fetchImpl,
  });
  const second = await fetchPokemonPriceTrackerObservation({
    cardKey: 'cache-rate-limit',
    cardConfig: { tcgPlayerId: 'cache-rate-limit-card', grade: 'psa10' },
    apiKey: 'rate-limit-key',
    fetchedAt: '2026-04-20T11:32:00.000Z',
    fetchImpl,
  });

  assert.equal(calls, 1);
  assert.equal(first.rawPayloadRef, 'rate-limited://pokemon-price-tracker');
  assert.equal(second.rawPayloadRef, 'rate-limited://pokemon-price-tracker');
  assert.equal(second.fetchedAt, '2026-04-20T11:32:00.000Z');
  assert.match(first.matchReason, /rate limited \(429; retry after 120s\)/);
});
