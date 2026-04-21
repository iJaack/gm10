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
  assert.equal(response.headers['cache-control'], 's-maxage=30, stale-while-revalidate=120');
  assert.deepEqual(response.payload, {
    packId: 'valuation-public-test',
    generatedAt: '2026-04-21T10:00:00.000Z',
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
