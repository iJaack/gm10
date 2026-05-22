import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchOpenSeaCourtyardAsset,
  fetchCourtyardEvidenceObservation,
  fetchCourtyardTokenMetadataIdentity,
  normalizeOpenSeaCourtyardAsset,
  normalizeCourtyardAsset,
  normalizeCourtyardEvidenceObservation,
  normalizeCourtyardTokenMetadataIdentity,
  parseCourtyardAssetId,
  parseOpenSeaCourtyardListing,
} from '../server/lib/courtyard.js';

const now = Date.parse('2026-04-15T19:00:00Z');

function asset(overrides = {}) {
  return {
    title: '2021 Pokémon Sword & Shield Gengar Vmax High-Class Deck #002 Gengar Vmax - Full Art (PSA 10 GEM MINT)',
    chain: 'polygon',
    contract: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
    token_id: '12270903783453537438203864491123478447842616940074277421789389749807920013320',
    collectible_id: 'CY_PSA_140897946',
    collection: 'Graded Cards',
    image: 'https://example.com/gengar.png',
    metadata_url: 'https://example.com/metadata.json',
    attributes: [{ name: 'Grade', value: '10 GEM MINT' }],
    listing_data: [
      {
        side: 'sell',
        orderId: '6125783',
        expiration: '2026-04-22T17:06:49Z',
        price: {
          currency: {
            contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            symbol: 'USDC',
            decimals: 6,
          },
          amount: {
            raw: '96000000',
            decimal: 96,
          },
        },
      },
    ],
    ...overrides,
  };
}

test('parses Courtyard asset URLs and raw ids', () => {
  assert.equal(
    parseCourtyardAssetId('https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008'),
    '1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008',
  );
  assert.equal(parseCourtyardAssetId('1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008'), '1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008');
  assert.throws(() => parseCourtyardAssetId('https://example.com/nope'), /Courtyard asset URL/);
});

function openSeaListing(overrides = {}) {
  return {
    order_hash: '0x405cf68ef1b79461634fb67c849ca0bedde0830a9c32427d98a9c6ef8de3b07e',
    price: { current: { currency: 'USDC', decimals: 6, value: '6000000' } },
    protocol_data: {
      parameters: {
        offerer: '0xd684c1e59808a6849ec62aa0bd23ec34f6d15e94',
        endTime: '1781687476',
        consideration: [{ token: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' }],
      },
    },
    ...overrides,
  };
}

function openSeaNft(overrides = {}) {
  return {
    identifier: '25043976234190055590601260383950715875219064639637600832759536856631367823548',
    name: "Destined Rivals #104/182 Cynthia's Garchomp ex",
    metadata_url: 'https://api.courtyard.io/index/token/polygon/0x251/0x375e/metadata.json',
    opensea_url: 'https://opensea.io/assets/polygon/0x251be3a17af4892035c37ebf5890f4a4d889dcad/25043976234190055590601260383950715875219064639637600832759536856631367823548',
    image_url: 'https://example.com/card.png',
    traits: [
      { trait_type: 'Category', value: 'Pokémon' },
      { trait_type: 'Grade', value: '10 GEM MINT' },
    ],
    ...overrides,
  };
}

test('parses OpenSea Courtyard item URLs', () => {
  assert.deepEqual(parseOpenSeaCourtyardListing('https://opensea.io/item/polygon/0x251be3a17af4892035c37ebf5890f4a4d889dcad/123'), {
    contract: '0x251be3a17af4892035c37ebf5890f4a4d889dcad',
    tokenId: '123',
  });
  assert.throws(() => parseOpenSeaCourtyardListing('https://example.com/nope'), /OpenSea Courtyard item URL/);
});

test('normalizes an OpenSea Courtyard listing into wizard prefill data', () => {
  const normalized = normalizeOpenSeaCourtyardAsset({
    contract: '0x251be3a17af4892035c37ebf5890f4a4d889dcad',
    tokenId: openSeaNft().identifier,
    nft: openSeaNft(),
    listing: openSeaListing(),
    nowMs: now,
  });

  assert.equal(normalized.assetId, openSeaNft().identifier);
  assert.equal(normalized.listing.orderId, '0x405cf68ef1b79461634fb67c849ca0bedde0830a9c32427d98a9c6ef8de3b07e');
  assert.equal(normalized.listing.priceDecimal, '6');
  assert.equal(normalized.listing.priceRaw, '6000000');
  assert.equal(normalized.listing.currency.contract, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
  assert.equal(normalized.prefill.purchaseKey, `opensea:${openSeaNft().identifier}:0x405cf68ef1b79461634fb67c849ca0bedde0830a9c32427d98a9c6ef8de3b07e`);
  assert.equal(normalized.prefill.releaseAmountUsdt, '6');
  assert.equal(normalized.prefill.marketplaceProvenanceRef, 'opensea:order:0x405cf68ef1b79461634fb67c849ca0bedde0830a9c32427d98a9c6ef8de3b07e');
});

test('fetches OpenSea NFT and best listing for Courtyard wizard resolution', async () => {
  const seen = [];
  const asset = await fetchOpenSeaCourtyardAsset({
    input: `https://opensea.io/item/polygon/0x251be3a17af4892035c37ebf5890f4a4d889dcad/${openSeaNft().identifier}`,
    openSeaApiKey: 'test-key',
    fetchImpl: async (url, init = {}) => {
      seen.push(String(url));
      assert.equal(init.headers['x-api-key'], 'test-key');
      if (String(url).includes('/listings/')) {
        return { ok: true, json: async () => openSeaListing() };
      }
      return { ok: true, json: async () => ({ nft: openSeaNft() }) };
    },
    nowMs: now,
  });

  assert.equal(asset.title, openSeaNft().name);
  assert.equal(asset.sourceUrl, openSeaNft().opensea_url);
  assert.equal(seen.length, 2);
});

test('normalizes the current Gengar listing shape', () => {
  const normalized = normalizeCourtyardAsset('1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008', asset(), now);
  assert.equal(normalized.listing.orderId, '6125783');
  assert.equal(normalized.listing.priceDecimal, '96');
  assert.equal(normalized.listing.priceRaw, '96000000');
  assert.equal(normalized.collectionContract, '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD');
  assert.equal(normalized.tokenId, '12270903783453537438203864491123478447842616940074277421789389749807920013320');
  assert.equal(normalized.prefill.purchaseKey, 'courtyard:1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008:6125783');
  assert.equal(normalized.prefill.releaseAmountUsdt, '96');
});

test('rejects missing, expired, and unsupported listings', () => {
  assert.throws(() => normalizeCourtyardAsset('asset', asset({ listing_data: [] }), now), /No active/);
  assert.throws(() => normalizeCourtyardAsset('asset', asset({ listing_data: [{ ...asset().listing_data[0], expiration: '2026-04-14T00:00:00Z' }] }), now), /No active/);
  assert.throws(
    () => normalizeCourtyardAsset('asset', asset({ listing_data: [{ ...asset().listing_data[0], price: { ...asset().listing_data[0].price, currency: { contract: '0x0000000000000000000000000000000000000000', symbol: 'DAI', decimals: 18 } } }] }), now),
    /Unsupported listing currency/,
  );
  assert.throws(() => normalizeCourtyardAsset('asset', asset({ chain: 'ethereum' }), now), /Unsupported Courtyard chain/);
});

test('normalizes Courtyard asset listing into valuation evidence observation', () => {
  const observation = normalizeCourtyardEvidenceObservation({
    assetId: '1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008',
    cardKey: '0x251be3a17af4892035c37ebf5890f4a4d889dcad:12270903783453537438203864491123478447842616940074277421789389749807920013320',
    payload: asset(),
    nowMs: now,
    fetchedAt: '2026-04-15T19:00:00.000Z',
  });

  assert.equal(observation.sourceId, 'evidence');
  assert.equal(observation.sourceName, 'Courtyard');
  assert.equal(observation.valueUsdc6, '96000000');
  assert.equal(observation.currency, 'USD');
  assert.equal(observation.confidence, 0.85);
  assert.equal(observation.rawPayloadRef, 'courtyard://asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008/order/6125783');
  assert.equal(observation.sourceUrl, 'https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008');
  assert.match(observation.matchReason, /active Courtyard sell listing/);
});

test('normalizes Courtyard FMV estimate when no active listing exists', () => {
  const observation = normalizeCourtyardEvidenceObservation({
    assetId: '1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008',
    cardKey: '0x251be3a17af4892035c37ebf5890f4a4d889dcad:12270903783453537438203864491123478447842616940074277421789389749807920013320',
    payload: asset({
      listing_data: [],
      fmv_estimate_usd: 96,
    }),
    nowMs: now,
    fetchedAt: '2026-04-15T19:00:00.000Z',
  });

  assert.equal(observation.sourceId, 'evidence');
  assert.equal(observation.sourceName, 'Courtyard');
  assert.equal(observation.valueUsdc6, '96000000');
  assert.equal(observation.currency, 'USD');
  assert.equal(observation.confidence, 0.8);
  assert.equal(observation.rawPayloadRef, 'courtyard://asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008/fmv_estimate_usd');
  assert.equal(observation.sourceUrl, 'https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008');
  assert.match(observation.matchReason, /Courtyard FMV estimate/);
});

test('Courtyard evidence scraper fails closed when the asset request is blocked', async () => {
  const observation = await fetchCourtyardEvidenceObservation({
    assetId: '1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008',
    cardKey: '0xabc:1',
    fetchedAt: '2026-04-15T19:00:00.000Z',
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
    }),
  });

  assert.equal(observation.sourceId, 'evidence');
  assert.equal(observation.valueUsdc6, '0');
  assert.equal(observation.confidence, 0);
  assert.equal(observation.rawPayloadRef, 'courtyard://asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008/blocked');
  assert.match(observation.matchReason, /Courtyard evidence unavailable: Courtyard API returned 403/);
});

test('normalizes Courtyard token metadata into card identity hints', () => {
  const identity = normalizeCourtyardTokenMetadataIdentity({
    collection_name: 'Graded Cards',
    name: '2023 Pokémon Sword and Shield Crown Zenith #GG70 Arceus Vstar - Full Art Secret (PSA 10 GEM MINT)',
    external_url: 'https://courtyard.io/asset/dc7a18f55ca39d20e4e6493dbb0d3227d2891f9955b62918aa9c1a7ff8c13b75',
    image: 'https://static.courtyard.io/graded-cards-renders/PSA%2099466810/nft_image.jpg',
  });

  assert.equal(identity.title, '2023 Pokémon Sword and Shield Crown Zenith #GG70 Arceus Vstar - Full Art Secret (PSA 10 GEM MINT)');
  assert.equal(identity.subtitle, 'Graded Cards');
  assert.equal(identity.grade, 'psa10');
  assert.equal(identity.courtyardAssetId, 'dc7a18f55ca39d20e4e6493dbb0d3227d2891f9955b62918aa9c1a7ff8c13b75');
});

test('fetches Courtyard token metadata using Polygon token id hex form', async () => {
  let requestUrl = '';
  const identity = await fetchCourtyardTokenMetadataIdentity({
    chain: 'polygon',
    contract: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
    tokenId: '99724554287076862395749030940005299488361633132955214507221291083177224387445',
    fetchImpl: async (url) => {
      requestUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          collection_name: 'Graded Cards',
          name: '2023 Pokémon Sword and Shield Crown Zenith #GG70 Arceus Vstar - Full Art Secret (PSA 10 GEM MINT)',
          external_url: 'https://courtyard.io/asset/dc7a18f55ca39d20e4e6493dbb0d3227d2891f9955b62918aa9c1a7ff8c13b75',
        }),
      };
    },
  });

  assert.match(requestUrl, /index\/token\/polygon\/0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD\/0xdc7a18f55ca39d20e4e6493dbb0d3227d2891f9955b62918aa9c1a7ff8c13b75\/metadata\.json$/);
  assert.equal(identity.title, '2023 Pokémon Sword and Shield Crown Zenith #GG70 Arceus Vstar - Full Art Secret (PSA 10 GEM MINT)');
  assert.equal(identity.courtyardAssetId, 'dc7a18f55ca39d20e4e6493dbb0d3227d2891f9955b62918aa9c1a7ff8c13b75');
});
