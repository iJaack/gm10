import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRegistryPosition } from '../api/lib/valuation-chain.js';
import { createValuationPackHandler } from '../api/valuation-pack.js';

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

test('normalizeRegistryPosition maps active registry tuple to valuation card input', () => {
  const card = normalizeRegistryPosition({
    id: 1n,
    evmCollection: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
    tokenId: 123n,
    currentValueUsdt6: 96000000n,
    status: 1,
  });

  assert.equal(card.positionId, 1);
  assert.equal(card.cardKey, '0x251be3a17af4892035c37ebf5890f4a4d889dcad:123');
  assert.equal(card.title, 'Treasury card #1');
  assert.equal(card.currentValueUsdc6, '96000000');
  assert.equal(card.observations.length, 3);
  assert.equal(card.observations[0].matchReason, 'source not configured');
});

test('normalizeRegistryPosition returns null for sold or empty positions', () => {
  assert.equal(
    normalizeRegistryPosition({
      id: 2n,
      evmCollection: '0x0000000000000000000000000000000000000000',
      tokenId: 0n,
      currentValueUsdt6: 0n,
      status: 3,
    }),
    null,
  );
});

test('valuation-pack POST generate uses submitted cards without discovery', async () => {
  let discoveryCalls = 0;
  const savedPacks = [];
  const handler = createValuationPackHandler({
    createValuationPackStoreImpl: () => ({
      async getLatestPack() {
        return savedPacks.at(-1) ?? null;
      },
      async savePack(pack) {
        savedPacks.push(pack);
      },
    }),
    fetchActiveTreasuryCardsImpl: async () => {
      discoveryCalls += 1;
      return [];
    },
  });

  const response = responseRecorder();
  await handler(
    {
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [{
          positionId: 1,
          cardKey: 'psa:140897946',
          title: 'Gengar VMAX PSA 10',
          currentValueUsdc6: '96000000',
          observations: [{
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
          }],
        }],
      },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(discoveryCalls, 0);
  assert.equal(savedPacks[0].cards.length, 1);
});

test('valuation-pack POST generate discovers cards when submitted cards are empty', async () => {
  let discoveryCalls = 0;
  const discoveredCards = [{
    positionId: 7,
    cardKey: '0xabc:7',
    title: 'Treasury card #7',
    currentValueUsdc6: '0',
    observations: [
      {
        sourceId: 'primary',
        sourceName: 'Primary source',
        cardKey: '0xabc:7',
        observedAt: '2026-04-17T09:00:00.000Z',
        fetchedAt: '2026-04-17T09:00:00.000Z',
        valueUsdc6: '0',
        currency: 'USD',
        confidence: 0,
        rawPayloadRef: 'missing://primary',
        sourceUrl: '',
        matchReason: 'source not configured',
      },
    ],
  }];
  const handler = createValuationPackHandler({
    createValuationPackStoreImpl: () => ({
      async getLatestPack() {
        return null;
      },
      async savePack() {},
    }),
    fetchActiveTreasuryCardsImpl: async () => {
      discoveryCalls += 1;
      return discoveredCards;
    },
  });

  const response = responseRecorder();
  await handler(
    {
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [],
      },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(discoveryCalls, 1);
  assert.equal(response.payload.pack.cards.length, 1);
  assert.equal(response.payload.pack.cards[0].positionId, 7);
});
