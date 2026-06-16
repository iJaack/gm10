import assert from 'node:assert/strict';
import test from 'node:test';
import { createValuationPublicHandler } from '../api/valuation-public.js';

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
    },
  };
}

function handlerForPack(pack) {
  return createValuationPublicHandler({
    createValuationPackStoreImpl: () => ({
      getLatestPack: async () => pack,
    }),
    fetchActiveTreasuryCardsImpl: async () => [],
  });
}

test('valuation-public exposes only approved submitted consensus marks', async () => {
  const handler = handlerForPack({
    packId: 'valuation-public-test',
    generatedAt: '2026-04-21T10:00:00.000Z',
    cards: [
      {
        positionId: 7,
        title: 'Pikachu & Zekrom GX PSA 10',
        decision: 'approved',
        submittedTxHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sourceRef: 'source-a',
        proofHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        consensus: {
          status: 'passed',
          proposedValueUsdc6: '1100000000',
        },
      },
      {
        positionId: 8,
        title: 'Pending card',
        decision: 'pending',
        submittedTxHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        consensus: {
          status: 'passed',
          proposedValueUsdc6: '200000000',
        },
      },
      {
        positionId: 9,
        title: 'Unsubmitted card',
        decision: 'approved',
        submittedTxHash: '',
        consensus: {
          status: 'passed',
          proposedValueUsdc6: '300000000',
        },
      },
    ],
  });
  const response = responseRecorder();

  await handler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], '*');
  assert.equal(response.headers['cache-control'], 's-maxage=15, stale-while-revalidate=60');
  assert.deepEqual(response.payload, {
    packId: 'valuation-public-test',
    generatedAt: '2026-04-21T10:00:00.000Z',
    source: 'submitted',
    marks: [
      {
        positionId: 7,
        title: 'Pikachu & Zekrom GX PSA 10',
        valueUsdc6: '1100000000',
        generatedAt: '2026-04-21T10:00:00.000Z',
        submittedTxHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sourceRef: 'source-a',
        proofHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    ],
  });
});

test('valuation-public prefers live marks and keeps submitted marks as per-position fallback', async () => {
  const freshObservedAt = new Date().toISOString();
  const handler = createValuationPublicHandler({
    createValuationPackStoreImpl: () => ({
      getLatestPack: async () => ({
        packId: 'submitted-pack',
        generatedAt: '2026-04-21T10:00:00.000Z',
        cards: [
          {
            positionId: 7,
            title: 'Fresh card',
            decision: 'approved',
            submittedTxHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            consensus: {
              status: 'passed',
              proposedValueUsdc6: '1100000000',
            },
          },
          {
            positionId: 8,
            title: 'Submitted fallback card',
            decision: 'approved',
            submittedTxHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            consensus: {
              status: 'passed',
              proposedValueUsdc6: '200000000',
            },
          },
        ],
      }),
    }),
    fetchActiveTreasuryCardsImpl: async () => [
      {
        positionId: 7,
        cardKey: 'psa:11029260',
        title: 'Fresh card',
        currentValueUsdc6: '1100000000',
        observations: [
          {
            sourceId: 'primary',
            sourceName: 'PokemonPriceTracker',
            cardKey: 'psa:11029260',
            observedAt: freshObservedAt,
            fetchedAt: freshObservedAt,
            valueUsdc6: '1200000000',
            currency: 'USD',
            confidence: 0.9,
            rawPayloadRef: 'pokemon://latest',
            sourceUrl: 'https://example.com/primary',
            matchReason: 'latest market price',
          },
          {
            sourceId: 'benchmark',
            sourceName: 'Current registry mark',
            cardKey: 'psa:11029260',
            observedAt: freshObservedAt,
            fetchedAt: freshObservedAt,
            valueUsdc6: '1100000000',
            currency: 'USD',
            confidence: 0.85,
            rawPayloadRef: 'registry://current-mark',
            sourceUrl: 'https://example.com/registry',
            matchReason: 'continuity benchmark',
          },
        ],
      },
    ],
  });
  const response = responseRecorder();

  await handler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.source, 'live');
  assert.equal(response.payload.submittedPackId, 'submitted-pack');
  assert.deepEqual(response.payload.marks.map((mark) => [mark.positionId, mark.valueUsdc6]), [
    [7, '1200000000'],
    [8, '200000000'],
  ]);
});

test('valuation-public still returns live marks when submitted pack storage is unavailable', async () => {
  const freshObservedAt = new Date().toISOString();
  const handler = createValuationPublicHandler({
    createValuationPackStoreImpl: () => ({
      getLatestPack: async () => {
        throw new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden');
      },
    }),
    fetchActiveTreasuryCardsImpl: async () => [
      {
        positionId: 7,
        cardKey: 'psa:11029260',
        title: 'Fresh card',
        currentValueUsdc6: '1100000000',
        observations: [
          {
            sourceId: 'primary',
            sourceName: 'PokemonPriceTracker',
            cardKey: 'psa:11029260',
            observedAt: freshObservedAt,
            fetchedAt: freshObservedAt,
            valueUsdc6: '1200000000',
            currency: 'USD',
            confidence: 0.9,
            rawPayloadRef: 'pokemon://latest',
            sourceUrl: 'https://example.com/primary',
            matchReason: 'latest market price',
          },
          {
            sourceId: 'benchmark',
            sourceName: 'Current registry mark',
            cardKey: 'psa:11029260',
            observedAt: freshObservedAt,
            fetchedAt: freshObservedAt,
            valueUsdc6: '1100000000',
            currency: 'USD',
            confidence: 0.85,
            rawPayloadRef: 'registry://current-mark',
            sourceUrl: 'https://example.com/registry',
            matchReason: 'continuity benchmark',
          },
        ],
      },
    ],
  });
  const response = responseRecorder();

  await handler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.source, 'live');
  assert.equal(response.payload.submittedPackId, null);
  assert.deepEqual(response.payload.marks.map((mark) => [mark.positionId, mark.valueUsdc6]), [
    [7, '1200000000'],
  ]);
});

test('valuation-public handles preflight and rejects unsupported methods', async () => {
  const handler = handlerForPack(null);
  const optionsResponse = responseRecorder();
  await handler({ method: 'OPTIONS' }, optionsResponse);
  assert.equal(optionsResponse.statusCode, 204);
  assert.equal(optionsResponse.headers['access-control-allow-methods'], 'GET, OPTIONS');

  const postResponse = responseRecorder();
  await handler({ method: 'POST' }, postResponse);
  assert.equal(postResponse.statusCode, 405);
  assert.equal(postResponse.headers.allow, 'GET, OPTIONS');
  assert.deepEqual(postResponse.payload, { error: 'Method not allowed' });
});

test('valuation-public falls back to live consensus marks when no submitted marks exist', async () => {
  const freshObservedAt = new Date().toISOString();
  const handler = createValuationPublicHandler({
    createValuationPackStoreImpl: () => ({
      getLatestPack: async () => null,
    }),
    fetchActiveTreasuryCardsImpl: async () => [
      {
        positionId: 7,
        cardKey: 'psa:11029260',
        title: 'Pikachu & Zekrom GX PSA 10',
        currentValueUsdc6: '999000000',
        observations: [
          {
            sourceId: 'primary',
            sourceName: 'PokemonPriceTracker',
            cardKey: 'psa:11029260',
            observedAt: freshObservedAt,
            fetchedAt: freshObservedAt,
            valueUsdc6: '0',
            currency: 'USD',
            confidence: 0,
            rawPayloadRef: 'primary://unavailable',
            sourceUrl: 'https://example.com/primary',
            matchReason: 'unavailable',
          },
          {
            sourceId: 'benchmark',
            sourceName: 'Current registry mark',
            cardKey: 'psa:11029260',
            observedAt: freshObservedAt,
            fetchedAt: freshObservedAt,
            valueUsdc6: '999000000',
            currency: 'USD',
            confidence: 0.85,
            rawPayloadRef: 'registry://current-mark',
            sourceUrl: 'https://example.com/registry',
            matchReason: 'continuity benchmark',
          },
          {
            sourceId: 'evidence',
            sourceName: 'Courtyard',
            cardKey: 'psa:11029260',
            observedAt: freshObservedAt,
            fetchedAt: freshObservedAt,
            valueUsdc6: '1100000000',
            currency: 'USD',
            confidence: 0.8,
            rawPayloadRef: 'courtyard://asset/7',
            sourceUrl: 'https://courtyard.io/asset/7',
            matchReason: 'vaulted asset estimate',
          },
        ],
      },
    ],
  });
  const response = responseRecorder();

  await handler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.source, 'live');
  assert.equal(response.payload.marks.length, 1);
  assert.equal(response.payload.marks[0].positionId, 7);
  assert.equal(response.payload.marks[0].valueUsdc6, '1100000000');
});
