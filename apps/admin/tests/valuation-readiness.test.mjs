import assert from 'node:assert/strict';
import test from 'node:test';
import { buildValuationSourceReadiness } from '../server/lib/valuation-readiness.js';

function observation(sourceId, overrides = {}) {
  return {
    sourceId,
    sourceName: sourceId,
    cardKey: 'card-1',
    observedAt: '2026-06-15T09:00:00.000Z',
    fetchedAt: '2026-06-15T09:00:00.000Z',
    valueUsdc6: '100000000',
    currency: 'USD',
    confidence: 0.9,
    rawPayloadRef: `memory://${sourceId}`,
    sourceUrl: `https://example.com/${sourceId}`,
    matchReason: 'exact match',
    ...overrides,
  };
}

test('valuation source readiness reports non-secret provider configuration', () => {
  const readiness = buildValuationSourceReadiness({ env: {} });

  const primary = readiness.providers.find((provider) => provider.providerId === 'pokemon-price-tracker');
  const benchmark = readiness.providers.find((provider) => provider.providerId === 'independent-benchmark');
  const courtyard = readiness.providers.find((provider) => provider.providerId === 'courtyard');

  assert.equal(primary.status, 'missing_auth');
  assert.equal(benchmark.status, 'missing_provider');
  assert.equal(courtyard.status, 'available_with_identity');
});

test('valuation source readiness summarizes live, missing, and rate-limited observations', () => {
  const readiness = buildValuationSourceReadiness({
    env: { POKEMON_PRICE_TRACKER_API_KEY: 'configured' },
    pack: {
      cards: [{
        positionId: 4,
        observations: [
          observation('primary', {
            valueUsdc6: '0',
            confidence: 0,
            rawPayloadRef: 'rate-limited://pokemon-price-tracker',
            matchReason: 'PokemonPriceTracker unavailable: rate limited (429)',
          }),
          observation('benchmark'),
          observation('evidence', {
            valueUsdc6: '0',
            confidence: 0,
            rawPayloadRef: 'missing://evidence',
            matchReason: 'source not configured',
          }),
        ],
      }],
    },
  });

  const primary = readiness.sourceQuality.find((source) => source.sourceId === 'primary');
  const benchmark = readiness.sourceQuality.find((source) => source.sourceId === 'benchmark');
  const evidence = readiness.sourceQuality.find((source) => source.sourceId === 'evidence');

  assert.equal(readiness.providers.find((provider) => provider.providerId === 'pokemon-price-tracker').status, 'configured');
  assert.equal(primary.rateLimited, 1);
  assert.equal(benchmark.live, 1);
  assert.equal(evidence.missing, 1);
  assert.equal(evidence.examples[0].positionId, 4);
});
