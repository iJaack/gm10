import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCourtyardAsset, parseCourtyardAssetId } from '../api/lib/courtyard.js';

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
