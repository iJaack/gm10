import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import handler from '../api/valuation-pack.js';

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

test('valuation-pack POST generate creates a pack from submitted cards and observations', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-api-'));
  const previousDir = process.env.GM10_VALUATION_LOCAL_DIR;
  process.env.GM10_VALUATION_LOCAL_DIR = dir;
  try {
    const response = responseRecorder();
    await handler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [{
          positionId: 1,
          cardKey: 'psa:140897946',
          title: 'Gengar VMAX PSA 10',
          currentValueUsdc6: '96000000',
          observations: [
            {
              sourceId: 'primary',
              sourceName: 'Primary',
              cardKey: 'psa:140897946',
              observedAt: '2026-04-17T09:00:00.000Z',
              fetchedAt: '2026-04-17T09:00:00.000Z',
              valueUsdc6: '100000000',
              currency: 'USD',
              confidence: 0.92,
              rawPayloadRef: 'memory://primary',
              sourceUrl: 'https://example.com/primary',
              matchReason: 'exact',
            },
            {
              sourceId: 'benchmark',
              sourceName: 'Benchmark',
              cardKey: 'psa:140897946',
              observedAt: '2026-04-17T09:00:00.000Z',
              fetchedAt: '2026-04-17T09:00:00.000Z',
              valueUsdc6: '105000000',
              currency: 'USD',
              confidence: 0.92,
              rawPayloadRef: 'memory://benchmark',
              sourceUrl: 'https://example.com/benchmark',
              matchReason: 'exact',
            },
          ],
        }],
      },
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.payload.pack.cards[0].consensus.status, 'passed');

    const getResponse = responseRecorder();
    await handler({ method: 'GET' }, getResponse);
    assert.equal(getResponse.statusCode, 200);
    assert.equal(getResponse.payload.pack.packId, response.payload.pack.packId);
  } finally {
    if (previousDir === undefined) {
      delete process.env.GM10_VALUATION_LOCAL_DIR;
    } else {
      process.env.GM10_VALUATION_LOCAL_DIR = previousDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('valuation-pack rejects unsupported methods and actions', async () => {
  const response = responseRecorder();
  await handler({ method: 'PUT' }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.payload.error, 'Method not allowed');

  const actionResponse = responseRecorder();
  await handler({ method: 'POST', body: { action: 'noop' } }, actionResponse);
  assert.equal(actionResponse.statusCode, 400);
  assert.equal(actionResponse.payload.error, 'Unsupported valuation-pack action');
});

test('valuation-pack returns 400 for malformed generatedAt and card payloads', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-api-'));
  const previousDir = process.env.GM10_VALUATION_LOCAL_DIR;
  process.env.GM10_VALUATION_LOCAL_DIR = dir;
  try {
    const badGeneratedAtResponse = responseRecorder();
    await handler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: 'not-a-date',
        cards: [],
      },
    }, badGeneratedAtResponse);

    assert.equal(badGeneratedAtResponse.statusCode, 400);
    assert.match(badGeneratedAtResponse.payload.error, /Invalid generatedAt/);

    const badCardsResponse = responseRecorder();
    await handler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [{
          positionId: 1,
          cardKey: 'psa:140897946',
          title: 'Gengar VMAX PSA 10',
          currentValueUsdc6: '96000000',
          observations: [
            {
              sourceId: 'primary',
              sourceName: 'Primary',
              cardKey: 'psa:140897946',
              observedAt: '2026-04-17T09:00:00.000Z',
              fetchedAt: '2026-04-17T09:00:00.000Z',
              valueUsdc6: 'not-a-number',
              currency: 'USD',
              confidence: 0.92,
              rawPayloadRef: 'memory://primary',
              sourceUrl: 'https://example.com/primary',
              matchReason: 'exact',
            },
          ],
        }],
      },
    }, badCardsResponse);

    assert.equal(badCardsResponse.statusCode, 400);
    assert.match(badCardsResponse.payload.error, /Invalid .*valueUsdc6/);
  } finally {
    if (previousDir === undefined) {
      delete process.env.GM10_VALUATION_LOCAL_DIR;
    } else {
      process.env.GM10_VALUATION_LOCAL_DIR = previousDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
