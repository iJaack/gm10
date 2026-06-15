import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import handler, { createValuationPackHandler } from '../api/valuation-pack.js';

function expectedPackIdPrefix(date) {
  const value = new Date(date);
  const year = value.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const dayOfYear = Math.floor((Date.UTC(year, value.getUTCMonth(), value.getUTCDate()) - startOfYear) / 86_400_000) + 1;
  const week = Math.floor((dayOfYear - 1) / 7) + 1;
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  const hours = String(value.getUTCHours()).padStart(2, '0');
  const minutes = String(value.getUTCMinutes()).padStart(2, '0');
  const seconds = String(value.getUTCSeconds()).padStart(2, '0');

  return `valuation-${year}-W${week}-${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

function fixedPackIdFactory(...ids) {
  let index = 0;
  return () => ids[index++] ?? ids[ids.length - 1];
}

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

function observation(sourceId, valueUsdc6 = '100000000') {
  return {
    sourceId,
    sourceName: sourceId,
    cardKey: 'psa:140897946',
    observedAt: '2026-04-17T09:00:00.000Z',
    fetchedAt: '2026-04-17T09:00:00.000Z',
    valueUsdc6,
    currency: 'USD',
    confidence: 0.92,
    rawPayloadRef: `memory://${sourceId}`,
    sourceUrl: `https://example.com/${sourceId}`,
    matchReason: 'exact',
  };
}

function card(overrides = {}) {
  return {
    positionId: 1,
    cardKey: 'psa:140897946',
    title: 'Gengar VMAX PSA 10',
    currentValueUsdc6: '96000000',
    observations: [
      observation('primary', '100000000'),
      observation('benchmark', '105000000'),
      observation('evidence', '140000000'),
    ],
    ...overrides,
  };
}

async function withUnauthenticatedWrites(fn) {
  const previous = process.env.GM10_VALUATION_ALLOW_UNAUTHENTICATED_WRITES;
  process.env.GM10_VALUATION_ALLOW_UNAUTHENTICATED_WRITES = 'true';
  try {
    return await fn();
  } finally {
    if (previous === undefined) {
      delete process.env.GM10_VALUATION_ALLOW_UNAUTHENTICATED_WRITES;
    } else {
      process.env.GM10_VALUATION_ALLOW_UNAUTHENTICATED_WRITES = previous;
    }
  }
}

test('valuation-pack POST generate creates a pack from submitted cards and observations', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-api-'));
  const previousDir = process.env.GM10_VALUATION_LOCAL_DIR;
  process.env.GM10_VALUATION_LOCAL_DIR = dir;
  try {
    await withUnauthenticatedWrites(async () => {
      const response = responseRecorder();
      await handler({
        method: 'POST',
        body: {
          action: 'generate',
          generatedAt: '2026-04-17T09:00:00.000Z',
          cards: [card()],
        },
      }, response);

      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.payload.pack.cards[0].consensus.status, 'passed');
      assert.equal(response.payload.sourceReadiness.sourceQuality.find((source) => source.sourceId === 'primary').live, 1);
      assert.equal(
        response.payload.sourceReadiness.providers.some((provider) => provider.providerId === 'pokemon-price-tracker'),
        true,
      );

      const getResponse = responseRecorder();
      await handler({ method: 'GET' }, getResponse);
      assert.equal(getResponse.statusCode, 200);
      assert.equal(getResponse.payload.pack.packId, response.payload.pack.packId);
      assert.equal(getResponse.payload.sourceReadiness.sourceQuality.length, 3);
    });
  } finally {
    if (previousDir === undefined) {
      delete process.env.GM10_VALUATION_LOCAL_DIR;
    } else {
      process.env.GM10_VALUATION_LOCAL_DIR = previousDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('valuation-pack POST update-card persists review decisions and submitted tx hashes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-api-'));
  const previousDir = process.env.GM10_VALUATION_LOCAL_DIR;
  process.env.GM10_VALUATION_LOCAL_DIR = dir;
  try {
    await withUnauthenticatedWrites(async () => {
      const localHandler = createValuationPackHandler({
        createPackIdImpl: fixedPackIdFactory('valuation-2026-W16-2026-04-17-090000-a1b2c3'),
      });
      const generateResponse = responseRecorder();
      await localHandler({
        method: 'POST',
        body: {
          action: 'generate',
          generatedAt: '2026-04-17T09:00:00.000Z',
          cards: [card()],
        },
      }, generateResponse);

      assert.equal(generateResponse.statusCode, 200);
      assert.equal(generateResponse.payload.pack.cards[0].decision, 'pending');

      const updateResponse = responseRecorder();
      await localHandler({
        method: 'POST',
        body: {
          action: 'update-card',
          packId: generateResponse.payload.pack.packId,
          positionId: 1,
          decision: 'approved',
          submittedTxHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        },
      }, updateResponse);

      assert.equal(updateResponse.statusCode, 200);
      assert.equal(updateResponse.payload.pack.cards[0].decision, 'approved');
      assert.equal(updateResponse.payload.pack.cards[0].submittedTxHash, '0x2222222222222222222222222222222222222222222222222222222222222222');

      const getResponse = responseRecorder();
      await localHandler({ method: 'GET' }, getResponse);
      assert.equal(getResponse.statusCode, 200);
      assert.equal(getResponse.payload.pack.cards[0].decision, 'approved');
      assert.equal(getResponse.payload.pack.cards[0].submittedTxHash, '0x2222222222222222222222222222222222222222222222222222222222222222');
    });
  } finally {
    if (previousDir === undefined) {
      delete process.env.GM10_VALUATION_LOCAL_DIR;
    } else {
      process.env.GM10_VALUATION_LOCAL_DIR = previousDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('valuation-pack POST update-card rejects malformed review updates before storage', async () => {
  let updateCalls = 0;
  const localHandler = createValuationPackHandler({
    createValuationPackStoreImpl: () => ({
      async getLatestPack() {
        return null;
      },
      async savePack() {},
      async updateCardDecision() {
        updateCalls += 1;
        return null;
      },
    }),
  });

  await withUnauthenticatedWrites(async () => {
    const badPackResponse = responseRecorder();
    await localHandler({
      method: 'POST',
      body: {
        action: 'update-card',
        packId: '../valuation-pack',
        positionId: 1,
        decision: 'approved',
      },
    }, badPackResponse);

    const badTxResponse = responseRecorder();
    await localHandler({
      method: 'POST',
      body: {
        action: 'update-card',
        packId: 'valuation-2026-W16-2026-04-17-090000-a1b2c3',
        positionId: 1,
        decision: 'approved',
        submittedTxHash: '0x1234',
      },
    }, badTxResponse);

    assert.equal(badPackResponse.statusCode, 400);
    assert.equal(badTxResponse.statusCode, 400);
    assert.equal(updateCalls, 0);
  });
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
    await withUnauthenticatedWrites(async () => {
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
          cards: [card({
            observations: [
              observation('primary', 'not-a-number'),
              observation('benchmark', '105000000'),
              observation('evidence', '140000000'),
            ],
          })],
        },
      }, badCardsResponse);

      assert.equal(badCardsResponse.statusCode, 400);
      assert.match(badCardsResponse.payload.error, /Invalid .*valueUsdc6/);
    });
  } finally {
    if (previousDir === undefined) {
      delete process.env.GM10_VALUATION_LOCAL_DIR;
    } else {
      process.env.GM10_VALUATION_LOCAL_DIR = previousDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('valuation-pack rejects malformed cards before discovery', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-api-'));
  const previousDir = process.env.GM10_VALUATION_LOCAL_DIR;
  process.env.GM10_VALUATION_LOCAL_DIR = dir;
  let discoverCalls = 0;
  try {
    await withUnauthenticatedWrites(async () => {
      const localHandler = createValuationPackHandler({
        fetchActiveTreasuryCardsImpl: async () => {
          discoverCalls += 1;
          return [];
        },
      });

      const response = responseRecorder();
      await localHandler({
        method: 'POST',
        body: {
          action: 'generate',
          generatedAt: '2026-04-17T09:00:00.000Z',
          cards: {},
        },
      }, response);

      assert.equal(response.statusCode, 400);
      assert.equal(response.payload.error, 'Invalid cards payload');
      assert.equal(discoverCalls, 0);
    });
  } finally {
    if (previousDir === undefined) {
      delete process.env.GM10_VALUATION_LOCAL_DIR;
    } else {
      process.env.GM10_VALUATION_LOCAL_DIR = previousDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('valuation-pack ignores caller packId and generates a safe packId from generatedAt', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-api-'));
  const previousDir = process.env.GM10_VALUATION_LOCAL_DIR;
  process.env.GM10_VALUATION_LOCAL_DIR = dir;
  try {
    await withUnauthenticatedWrites(async () => {
      const localHandler = createValuationPackHandler({
        createPackIdImpl: fixedPackIdFactory('valuation-2026-W16-2026-04-17-090000-deadbe'),
      });
      const response = responseRecorder();
      await localHandler({
        method: 'POST',
        body: {
          action: 'generate',
          generatedAt: '2026-04-17T09:00:00.000Z',
          packId: '../escape',
          cards: [card()],
        },
      }, response);

      assert.equal(response.statusCode, 200);
      assert.equal(response.payload.pack.packId, expectedPackIdPrefix('2026-04-17T09:00:00.000Z') + '-deadbe');
      assert.equal(response.payload.pack.packId.includes('..'), false);
      assert.equal(response.payload.pack.packId.includes('/'), false);
      assert.notEqual(response.payload.pack.packId, '../escape');
    });
  } finally {
    if (previousDir === undefined) {
      delete process.env.GM10_VALUATION_LOCAL_DIR;
    } else {
      process.env.GM10_VALUATION_LOCAL_DIR = previousDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('valuation-pack POST generate retries safely within the same minute using distinct packIds', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-api-'));
  const previousDir = process.env.GM10_VALUATION_LOCAL_DIR;
  process.env.GM10_VALUATION_LOCAL_DIR = dir;
  try {
    await withUnauthenticatedWrites(async () => {
      const localHandler = createValuationPackHandler({
        createPackIdImpl: fixedPackIdFactory(
          'valuation-2026-W16-2026-04-17-090000-aa11bb',
          'valuation-2026-W16-2026-04-17-090000-cc22dd',
        ),
      });

      const request = {
        method: 'POST',
        body: {
          action: 'generate',
          generatedAt: '2026-04-17T09:00:00.000Z',
          cards: [card()],
        },
      };

      const firstResponse = responseRecorder();
      await localHandler(request, firstResponse);
      assert.equal(firstResponse.statusCode, 200);

      const secondResponse = responseRecorder();
      await localHandler(request, secondResponse);
      assert.equal(secondResponse.statusCode, 200);

      assert.notEqual(firstResponse.payload.pack.packId, secondResponse.payload.pack.packId);
      assert.match(firstResponse.payload.pack.packId, /^valuation-\d{4}-W\d{1,2}-\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9]+$/);
      assert.match(secondResponse.payload.pack.packId, /^valuation-\d{4}-W\d{1,2}-\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9]+$/);
    });
  } finally {
    if (previousDir === undefined) {
      delete process.env.GM10_VALUATION_LOCAL_DIR;
    } else {
      process.env.GM10_VALUATION_LOCAL_DIR = previousDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('valuation-pack GET requires auth and does not read the latest pack without bypass', async () => {
  let readCalls = 0;
  const localHandler = createValuationPackHandler({
    createValuationPackStoreImpl: () => ({
      async getLatestPack() {
        readCalls += 1;
        return null;
      },
      async savePack() {},
    }),
  });

  const response = responseRecorder();
  await localHandler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 401);
  assert.match(response.payload.error, /Unauthorized|auth/i);
  assert.equal(readCalls, 0);
});

test('valuation-pack rejects non-3 observation sets before building a pack', async () => {
  let buildCalls = 0;
  const localHandler = createValuationPackHandler({
    buildValuationPackImpl: () => {
      buildCalls += 1;
      throw new Error('build should not run');
    },
  });

  await withUnauthenticatedWrites(async () => {
    const response = responseRecorder();
    await localHandler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [card({ observations: [observation('primary'), observation('benchmark')] })],
      },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'Invalid cards payload');
    assert.equal(buildCalls, 0);
  });
});

test('valuation-pack rejects duplicate observation source IDs before building a pack', async () => {
  let buildCalls = 0;
  const localHandler = createValuationPackHandler({
    buildValuationPackImpl: () => {
      buildCalls += 1;
      throw new Error('build should not run');
    },
  });

  await withUnauthenticatedWrites(async () => {
    const response = responseRecorder();
    await localHandler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [card({
          observations: [
            observation('primary'),
            observation('primary', '105000000'),
            observation('evidence', '140000000'),
          ],
        })],
      },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'Invalid cards payload');
    assert.equal(buildCalls, 0);
  });
});

test('valuation-pack rejects unexpected observation source IDs before building a pack', async () => {
  let buildCalls = 0;
  const localHandler = createValuationPackHandler({
    buildValuationPackImpl: () => {
      buildCalls += 1;
      throw new Error('build should not run');
    },
  });

  await withUnauthenticatedWrites(async () => {
    const response = responseRecorder();
    await localHandler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [card({
          observations: [
            observation('primary'),
            observation('benchmark', '105000000'),
            observation('third-party', '140000000'),
          ],
        })],
      },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'Invalid cards payload');
    assert.equal(buildCalls, 0);
  });
});

test('valuation-pack rejects whitespace-padded observation source IDs before building a pack', async () => {
  let buildCalls = 0;
  const localHandler = createValuationPackHandler({
    buildValuationPackImpl: () => {
      buildCalls += 1;
      throw new Error('build should not run');
    },
  });

  await withUnauthenticatedWrites(async () => {
    const response = responseRecorder();
    await localHandler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [card({
          observations: [
            observation(' primary '),
            observation('benchmark', '105000000'),
            observation('evidence', '140000000'),
          ],
        })],
      },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'Invalid cards payload');
    assert.equal(buildCalls, 0);
  });
});

test('valuation-pack POST generate requires auth and does not save without bypass', async () => {
  let saveCalls = 0;
  let discoveryCalls = 0;
  const localHandler = createValuationPackHandler({
    createValuationPackStoreImpl: () => ({
      async getLatestPack() {
        return null;
      },
      async savePack() {
        saveCalls += 1;
      },
    }),
    fetchActiveTreasuryCardsImpl: async () => {
      discoveryCalls += 1;
      return [];
    },
  });

  const response = responseRecorder();
  await localHandler({
    method: 'POST',
    body: {
      action: 'generate',
      generatedAt: '2026-04-17T09:00:00.000Z',
      cards: [],
    },
  }, response);

  assert.equal(response.statusCode, 401);
  assert.match(response.payload.error, /Unauthorized|auth/i);
  assert.equal(saveCalls, 0);
  assert.equal(discoveryCalls, 0);
});

test('valuation-pack rejects malformed card array elements before save or discovery', async () => {
  let saveCalls = 0;
  let discoveryCalls = 0;
  const localHandler = createValuationPackHandler({
    createValuationPackStoreImpl: () => ({
      async getLatestPack() {
        return null;
      },
      async savePack() {
        saveCalls += 1;
      },
    }),
    fetchActiveTreasuryCardsImpl: async () => {
      discoveryCalls += 1;
      return [];
    },
  });

  await withUnauthenticatedWrites(async () => {
    const response = responseRecorder();
    await localHandler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [{}],
      },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.match(response.payload.error, /Invalid cards payload/);
    assert.equal(saveCalls, 0);
    assert.equal(discoveryCalls, 0);
  });
});
