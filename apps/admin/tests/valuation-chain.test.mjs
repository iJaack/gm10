import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRegistryPosition } from '../server/lib/valuation-chain.js';
import { createValuationPackHandler } from '../api/valuation-pack.js';
import { solanaAddressToBytes32 } from '../src/lib/solanaAddress.js';

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

function missingObservation(sourceId, cardKey) {
  return {
    sourceId,
    sourceName: `${sourceId} source`,
    cardKey,
    observedAt: '2026-04-17T09:00:00.000Z',
    fetchedAt: '2026-04-17T09:00:00.000Z',
    valueUsdc6: '0',
    currency: 'USD',
    confidence: 0,
    rawPayloadRef: `missing://${sourceId}`,
    sourceUrl: '',
    matchReason: 'source not configured',
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

test('normalizeRegistryPosition maps active registry tuple to valuation card input', () => {
  const card = normalizeRegistryPosition(
    {
      id: 1n,
      evmCollection: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
      tokenId: 123n,
      currentValueUsdt6: 96000000n,
      status: 1,
    },
    { fetchedAt: '2026-04-17T09:00:00.000Z' },
  );

  assert.equal(card.positionId, 1);
  assert.equal(card.cardKey, '0x251be3a17af4892035c37ebf5890f4a4d889dcad:123');
  assert.equal(card.title, 'Treasury card #1');
  assert.equal(card.currentValueUsdc6, '96000000');
  assert.equal(card.observations.length, 3);
  assert.equal(card.observations[0].matchReason, 'source not configured');
  assert.equal(card.observations[1].sourceId, 'benchmark');
  assert.equal(card.observations[1].sourceName, 'Current registry mark');
  assert.equal(card.observations[1].valueUsdc6, '96000000');
  assert.equal(card.observations[1].confidence, 0.8);
  assert.equal(card.observations[1].observedAt, '2026-04-17T09:00:00.000Z');
  assert.match(card.observations[1].matchReason, /continuity benchmark/);
});

test('normalizeRegistryPosition maps active Solana registry tuple to valuation card input', () => {
  const card = normalizeRegistryPosition(
    {
      id: 9n,
      chainEid: 30168,
      evmCollection: '0x0000000000000000000000000000000000000000',
      tokenId: 0n,
      nonEvmCollection: solanaAddressToBytes32('phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC'),
      nonEvmTokenId: solanaAddressToBytes32('9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP'),
      currentValueUsdt6: 725000000n,
      status: 1,
    },
    { fetchedAt: '2026-04-21T14:00:00.000Z' },
  );

  assert.equal(card.positionId, 9);
  assert.equal(card.cardKey, 'solana:phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC:9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
  assert.equal(card.chainEid, 30168);
  assert.equal(card.nonEvmCollection, 'phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC');
  assert.equal(card.nonEvmTokenId, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
  assert.equal(card.phygitalsAssetAddress, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
  assert.equal(card.currentValueUsdc6, '725000000');
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

test('normalizeRegistryPosition returns null for active placeholder positions', () => {
  assert.equal(
    normalizeRegistryPosition({
      id: 3n,
      evmCollection: '0x0000000000000000000000000000000000000000',
      tokenId: 0n,
      currentValueUsdt6: 0n,
      status: 1,
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

  await withUnauthenticatedWrites(async () => {
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
            observations: [
              observation('primary', '100000000'),
              observation('benchmark', '105000000'),
              observation('evidence', '140000000'),
            ],
          }],
        },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(discoveryCalls, 0);
    assert.equal(savedPacks[0].cards.length, 1);
  });
});

test('valuation-pack POST generate discovers cards when submitted cards are empty', async () => {
  let discoveryCalls = 0;
  const discoveredCards = [{
    positionId: 7,
    cardKey: '0xabc:7',
    title: 'Treasury card #7',
    currentValueUsdc6: '0',
    observations: [
      missingObservation('primary', '0xabc:7'),
      missingObservation('benchmark', '0xabc:7'),
      missingObservation('evidence', '0xabc:7'),
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

  await withUnauthenticatedWrites(async () => {
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
});

test('valuation-pack POST generate passes card identity overrides to discovery', async () => {
  let discoveryOptions;
  const handler = createValuationPackHandler({
    createValuationPackStoreImpl: () => ({
      async getLatestPack() {
        return null;
      },
      async savePack() {},
    }),
    fetchActiveTreasuryCardsImpl: async (options) => {
      discoveryOptions = options;
      return [];
    },
  });

  await withUnauthenticatedWrites(async () => {
    const response = responseRecorder();
    await handler(
      {
        method: 'POST',
        body: {
          action: 'generate',
          generatedAt: '2026-04-17T09:00:00.000Z',
          cards: [],
          cardIdentityOverrides: {
            1: {
              title: 'Runtime Gengar VMAX',
              grade: 'psa10',
              courtyardAssetId: 'runtime-courtyard-id',
            },
          },
        },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(discoveryOptions.cardIdentityOverrides, {
      1: {
        title: 'Runtime Gengar VMAX',
        grade: 'psa10',
        courtyardAssetId: 'runtime-courtyard-id',
      },
    });
  });
});

test('valuation-pack returns 500 when treasury card discovery fails', async () => {
  const handler = createValuationPackHandler({
    createValuationPackStoreImpl: () => ({
      async getLatestPack() {
        return null;
      },
      async savePack() {},
    }),
    fetchActiveTreasuryCardsImpl: async () => {
      throw new Error('RPC unavailable');
    },
  });

  await withUnauthenticatedWrites(async () => {
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

    assert.equal(response.statusCode, 500);
    assert.equal(response.payload.error, 'RPC unavailable');
  });
});

test('fetchActiveTreasuryCards enriches providers from resolved card identity without env maps', async () => {
  const reads = {
    collectiblePositionCount: 1n,
    getCollectiblePosition: {
      id: 1n,
      evmCollection: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
      tokenId: 123n,
      currentValueUsdt6: 96000000n,
      status: 1,
    },
  };
  const client = {
    async readContract({ functionName }) {
      return reads[functionName];
    },
  };
  let pokemonRequestUrl = '';
  const { fetchActiveTreasuryCards } = await import('../server/lib/valuation-chain.js');
  const cards = await fetchActiveTreasuryCards({
    client,
    pokemonPriceTrackerApiKey: 'free-key',
    fetchImpl: async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('api.courtyard.io')) {
        return {
          ok: true,
          json: async () => ({
            title: 'Gengar VMAX PSA 10',
            chain: 'polygon',
            contract: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
            token_id: '123',
            listing_data: [{
              side: 'sell',
              orderId: 'order-1',
              expiration: '2026-04-22T17:06:49Z',
              price: {
                currency: {
                  contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
                  symbol: 'USDC',
                  decimals: 6,
                },
                amount: {
                  raw: '98000000',
                  decimal: 98,
                },
              },
            }],
          }),
        };
      }

      pokemonRequestUrl = requestUrl;
      return {
        ok: true,
        json: async () => ({
          data: [{
            tcgPlayerId: '253266',
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
    nowMs: Date.parse('2026-04-20T11:30:00Z'),
    fetchedAt: '2026-04-20T11:30:00.000Z',
  });

  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, '2021 Pokemon Sword & Shield Gengar VMAX');
  assert.match(pokemonRequestUrl, /search=2021\+Pokemon\+Sword/);
  assert.match(pokemonRequestUrl, /includeEbay=true/);

  const primary = cards[0].observations.find((entry) => entry.sourceId === 'primary');
  assert.equal(primary.sourceName, 'PokemonPriceTracker');
  assert.equal(primary.rawPayloadRef, 'pokemon-price-tracker://cards/253266/psa10');

  const evidence = cards[0].observations.find((entry) => entry.sourceId === 'evidence');
  assert.equal(evidence.sourceName, 'Courtyard');
  assert.equal(evidence.rawPayloadRef, 'courtyard://asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008/order/order-1');
});

test('fetchActiveTreasuryCards enriches evidence from Courtyard asset map', async () => {
  const reads = {
    collectiblePositionCount: 1n,
    getCollectiblePosition: {
      id: 1n,
      evmCollection: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
      tokenId: 123n,
      currentValueUsdt6: 96000000n,
      status: 1,
    },
  };
  const client = {
    async readContract({ functionName }) {
      return reads[functionName];
    },
  };
  const card = (await import('../server/lib/valuation-chain.js')).fetchActiveTreasuryCards;
  const cards = await card({
    client,
    courtyardAssetMap: { 1: 'courtyard-asset-1' },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        title: 'Gengar VMAX PSA 10',
        chain: 'polygon',
        contract: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
        token_id: '123',
        listing_data: [{
          side: 'sell',
          orderId: 'order-1',
          expiration: '2026-04-22T17:06:49Z',
          price: {
            currency: {
              contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
              symbol: 'USDC',
              decimals: 6,
            },
            amount: {
              raw: '98000000',
              decimal: 98,
            },
          },
        }],
      }),
    }),
    nowMs: Date.parse('2026-04-15T19:00:00Z'),
    fetchedAt: '2026-04-15T19:00:00.000Z',
  });

  assert.equal(cards.length, 1);
  const evidence = cards[0].observations.find((entry) => entry.sourceId === 'evidence');
  assert.equal(evidence.sourceName, 'Courtyard');
  assert.equal(evidence.valueUsdc6, '98000000');
  assert.equal(evidence.rawPayloadRef, 'courtyard://asset/courtyard-asset-1/order/order-1');
});

test('fetchActiveTreasuryCards resolves unknown cards from Courtyard token metadata', async () => {
  const reads = {
    collectiblePositionCount: 1n,
    getCollectiblePosition: {
      id: 4n,
      evmCollection: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
      tokenId: 99724554287076862395749030940005299488361633132955214507221291083177224387445n,
      currentValueUsdt6: 335000000n,
      status: 1,
    },
  };
  const client = {
    async readContract({ functionName }) {
      return reads[functionName];
    },
  };
  const { fetchActiveTreasuryCards } = await import('../server/lib/valuation-chain.js');
  const cards = await fetchActiveTreasuryCards({
    client,
    pokemonPriceTrackerApiKey: '',
    fetchImpl: async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('/metadata.json')) {
        return {
          ok: true,
          json: async () => ({
            collection_name: 'Graded Cards',
            name: '2023 Pokémon Sword and Shield Crown Zenith #GG70 Arceus Vstar - Full Art Secret (PSA 10 GEM MINT)',
            external_url: 'https://courtyard.io/asset/dc7a18f55ca39d20e4e6493dbb0d3227d2891f9955b62918aa9c1a7ff8c13b75',
          }),
        };
      }

      assert.match(requestUrl, /index\/asset\/dc7a18f55ca39d20e4e6493dbb0d3227d2891f9955b62918aa9c1a7ff8c13b75$/);
      return {
        ok: true,
        json: async () => ({
          title: 'Arceus Vstar PSA 10',
          chain: 'polygon',
          contract: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
          token_id: '99724554287076862395749030940005299488361633132955214507221291083177224387445',
          listing_data: [],
          fmv_estimate_usd: 335,
        }),
      };
    },
    nowMs: Date.parse('2026-04-20T11:30:00Z'),
    fetchedAt: '2026-04-20T11:30:00.000Z',
  });

  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, '2023 Pokémon Sword and Shield Crown Zenith #GG70 Arceus Vstar - Full Art Secret (PSA 10 GEM MINT)');
  const evidence = cards[0].observations.find((entry) => entry.sourceId === 'evidence');
  assert.equal(evidence.sourceName, 'Courtyard');
  assert.equal(evidence.valueUsdc6, '335000000');
  assert.equal(evidence.rawPayloadRef, 'courtyard://asset/dc7a18f55ca39d20e4e6493dbb0d3227d2891f9955b62918aa9c1a7ff8c13b75/fmv_estimate_usd');
});

test('fetchActiveTreasuryCards enriches Solana positions with Phygitals evidence', async () => {
  const slug = '2021-pokemon-japanese-s-promo-po-wbtuqn';
  const reads = {
    collectiblePositionCount: 1n,
    getCollectiblePosition: {
      id: 9n,
      chainEid: 30168,
      evmCollection: '0x0000000000000000000000000000000000000000',
      tokenId: 0n,
      nonEvmCollection: solanaAddressToBytes32('phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC'),
      nonEvmTokenId: solanaAddressToBytes32('9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP'),
      currentValueUsdt6: 725000000n,
      status: 1,
    },
  };
  const client = {
    async readContract({ functionName }) {
      return reads[functionName];
    },
  };
  const { fetchActiveTreasuryCards } = await import('../server/lib/valuation-chain.js');
  const cards = await fetchActiveTreasuryCards({
    client,
    phygitalsCardMap: { 9: `https://www.phygitals.com/card/${slug}` },
    pokemonPriceTrackerApiKey: '',
    fetchImpl: async (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('api.courtyard.io')) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      assert.equal(requestUrl, `https://www.phygitals.com/card/${slug}`);
      return {
        ok: true,
        text: async () => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
          props: {
            pageProps: {
              card1: {
                address: '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP',
                collection_address: 'phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC',
                token_standard: 'CORE_NFT',
                currency: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                price: '725000000',
                listed: true,
                marketplace: 'TENSOR',
                slug,
                metadata: [
                  { key: 'Title', value: '2021 Pokemon Japanese S Promo Pokemon Stamp Box Cramorant #226 PSA 10 GEM MINT' },
                  { key: 'Grade', value: 'PSA 10.0' },
                ],
              },
            },
          },
        })}</script>`,
      };
    },
    nowMs: Date.parse('2026-04-21T14:00:00Z'),
    fetchedAt: '2026-04-21T14:00:00.000Z',
  });

  assert.equal(cards.length, 1);
  assert.equal(cards[0].cardKey, 'solana:phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC:9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
  const evidence = cards[0].observations.find((entry) => entry.sourceId === 'evidence');
  assert.equal(evidence.sourceName, 'Phygitals');
  assert.equal(evidence.valueUsdc6, '725000000');
  assert.equal(evidence.rawPayloadRef, `phygitals://card/${slug}/listing/TENSOR/9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP`);
});

test('fetchActiveTreasuryCards enriches primary source from runtime PokemonPriceTracker identity override', async () => {
  const reads = {
    collectiblePositionCount: 1n,
    getCollectiblePosition: {
      id: 1n,
      evmCollection: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
      tokenId: 123n,
      currentValueUsdt6: 96000000n,
      status: 1,
    },
  };
  const client = {
    async readContract({ functionName }) {
      return reads[functionName];
    },
  };
  const { fetchActiveTreasuryCards } = await import('../server/lib/valuation-chain.js');
  const cards = await fetchActiveTreasuryCards({
    client,
    pokemonPriceTrackerCardMap: { 1: { tcgPlayerId: '490294', grade: 'psa10' } },
    pokemonPriceTrackerApiKey: 'free-key',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        data: [{
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
    }),
    nowMs: Date.parse('2026-04-20T11:30:00Z'),
    fetchedAt: '2026-04-20T11:30:00.000Z',
  });

  assert.equal(cards.length, 1);
  const primary = cards[0].observations.find((entry) => entry.sourceId === 'primary');
  assert.equal(primary.sourceName, 'PokemonPriceTracker');
  assert.equal(primary.valueUsdc6, '125500000');
  assert.equal(primary.rawPayloadRef, 'pokemon-price-tracker://cards/490294/psa10');
});
