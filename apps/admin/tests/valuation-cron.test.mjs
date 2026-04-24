import assert from 'node:assert/strict';
import test from 'node:test';
import { createValuationCronHandler } from '../api/valuation-cron.js';

function responseRecorder() {
  return {
    statusCode: 200,
    payload: undefined,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
    },
  };
}

test('valuation-cron fails closed in production when CRON_SECRET is missing', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousCronSecret = process.env.CRON_SECRET;
  let called = false;
  process.env.NODE_ENV = 'production';
  delete process.env.CRON_SECRET;

  try {
    const handler = createValuationCronHandler({
      valuationPackHandlerImpl: async () => {
        called = true;
      },
    });

    const response = responseRecorder();
    await handler({ method: 'GET' }, response);

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.payload, { error: 'Unauthorized cron request' });
    assert.equal(called, false);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousCronSecret;
    }
  }
});
