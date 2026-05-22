import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchOpenSeaCourtyardCatalog,
  fetchCourtyardDeals,
  isHighGradePokemon,
  normalizeCourtyardDeal,
  normalizeCourtyardGrade,
  rankCourtyardDeals,
} from '../server/lib/courtyard-deals.js';

function item(overrides = {}) {
  return {
    title: '2023 Pokemon Scarlet & Violet Charizard ex #199 (10 GEM MINT)',
    category: 'Pokémon',
    grade: '10 GEM MINT',
    assetUrl: 'https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008',
    imageUrl: 'https://example.com/card.png',
    priceUsd: 80,
    fmvEstimateUsd: 120,
    sellerName: 'seller-1',
    certNumber: '12345678',
    listedAt: '2026-05-20T12:00:00.000Z',
    ...overrides,
  };
}

test('normalizes Courtyard high-grade labels', () => {
  assert.equal(normalizeCourtyardGrade('10 GEM MINT'), '10 GEM MINT');
  assert.equal(normalizeCourtyardGrade('Grade: 10 PRISTINE'), '10 PRISTINE');
  assert.equal(normalizeCourtyardGrade('10 PRISINTE'), '10 PRISTINE');
  assert.equal(normalizeCourtyardGrade('PSA 9 MINT'), undefined);
});

test('filters for Pokemon and high grades only', () => {
  assert.equal(isHighGradePokemon(item()), true);
  assert.equal(isHighGradePokemon(item({ category: 'Sports' })), false);
  assert.equal(isHighGradePokemon(item({ grade: '9 MINT' })), false);
  assert.equal(isHighGradePokemon(item({ category: '', title: 'Pokemon card 10 PRISTINE' })), false);
});

test('normalizes a deal with budget status and upside', () => {
  const deal = normalizeCourtyardDeal(item(), {
    nowMs: Date.parse('2026-05-21T12:00:00.000Z'),
    budgetUsdt6: '100000000',
  });

  assert.equal(deal.assetId, '1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008');
  assert.equal(deal.grade, '10 GEM MINT');
  assert.equal(deal.priceUsdt6, '80000000');
  assert.equal(deal.fmvUsd, 120);
  assert.equal(deal.upsideUsd, 40);
  assert.equal(Math.round(deal.discountPct), 33);
  assert.equal(deal.fitStatus, 'fits');
});

test('marks deals over the current liquid treasury budget', () => {
  const deal = normalizeCourtyardDeal(item({ priceUsd: 110 }), {
    budgetUsdt6: '100000000',
  });

  assert.equal(deal.fitStatus, 'over_budget');
  assert.match(deal.blockedReason, /exceeds current liquid treasury budget/);
});

test('ranks fit deals by score before over-budget deals', () => {
  const deals = rankCourtyardDeals([
    item({ title: 'small upside', priceUsd: 70, fmvEstimateUsd: 90 }),
    item({ title: 'over budget large upside', priceUsd: 150, fmvEstimateUsd: 300 }),
    item({ title: 'best fit', priceUsd: 80, fmvEstimateUsd: 140 }),
    item({ title: 'sold', sold: true, priceUsd: 10, fmvEstimateUsd: 100 }),
  ], {
    budgetUsdt6: '100000000',
    nowMs: Date.parse('2026-05-21T12:00:00.000Z'),
  });

  assert.deepEqual(deals.map((deal) => deal.title), ['best fit', 'small upside', 'over budget large upside']);
});

test('fetchCourtyardDeals reads a configured JSON catalog feed', async () => {
  const deals = await fetchCourtyardDeals({
    sourceUrl: 'https://example.com/catalog.json',
    budgetUsdt6: '100000000',
    fetchImpl: async (url) => {
      assert.equal(String(url), 'https://example.com/catalog.json');
      return {
        ok: true,
        json: async () => ({ items: [item()] }),
      };
    },
  });

  assert.equal(deals.length, 1);
  assert.equal(deals[0].title, item().title);
});

test('fetchOpenSeaCourtyardCatalog enumerates high-grade Pokemon listings', async () => {
  const requestedListingTraits = [];
  const catalog = await fetchOpenSeaCourtyardCatalog({
    openSeaApiKey: 'test-key',
    openSeaPageLimit: 2,
    openSeaMaxPages: 1,
    fetchImpl: async (url, init = {}) => {
      assert.equal(init.headers['x-api-key'], 'test-key');
      const requestUrl = new URL(String(url));

      if (requestUrl.pathname.endsWith('/best')) {
        const traits = JSON.parse(requestUrl.searchParams.get('traits'));
        requestedListingTraits.push(traits);
        const grade = traits.find((trait) => trait.traitType === 'Grade')?.value;
        const tokenId = grade === '10 PRISTINE' ? '222' : '111';
        return {
          ok: true,
          json: async () => ({
            listings: [{
              chain: 'matic',
              status: 'ACTIVE',
              order_hash: `order-${tokenId}`,
              order_created_at: 1779359437,
              price: { current: { currency: 'USDC', decimals: 6, value: grade === '10 PRISTINE' ? '95000000' : '80000000' } },
              protocol_data: {
                parameters: {
                  offerer: '0xseller',
                  offer: [{
                    token: '0x251be3a17af4892035c37ebf5890f4a4d889dcad',
                    identifierOrCriteria: tokenId,
                  }],
                },
              },
            }],
          }),
        };
      }

      if (requestUrl.pathname.endsWith('/nfts/batch')) {
        const body = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            nfts: body.identifiers.map((identifier) => ({
              identifier: identifier.token_id,
              name: identifier.token_id === '222' ? 'Pokemon Lugia 10 PRISTINE' : 'Pokemon Charizard 10 GEM MINT',
              opensea_url: `https://opensea.io/item/polygon/${identifier.contract_address}/${identifier.token_id}`,
              image_url: `https://example.com/${identifier.token_id}.png`,
              traits: [
                { trait_type: 'Category', value: 'Pokémon' },
                { trait_type: 'Grade', value: identifier.token_id === '222' ? '10 PRISTINE' : '10 GEM MINT' },
              ],
            })),
          }),
        };
      }

      throw new Error(`Unexpected OpenSea URL: ${url}`);
    },
  });

  assert.equal(catalog.source, 'opensea-courtyard-marketplace');
  assert.equal(catalog.items.length, 2);
  assert.deepEqual(requestedListingTraits.map((traits) => traits.map((trait) => trait.value)), [
    ['Pokémon', '10 GEM MINT'],
    ['Pokémon', '10 PRISTINE'],
  ]);

  const deals = rankCourtyardDeals(catalog, { budgetUsdt6: '100000000' });
  assert.deepEqual(deals.map((deal) => deal.grade), ['10 GEM MINT', '10 PRISTINE']);
  assert.equal(deals[0].assetUrl, 'https://opensea.io/item/polygon/0x251be3a17af4892035c37ebf5890f4a4d889dcad/111');
});

test('fetchOpenSeaCourtyardCatalog falls back when OpenSea trait filters fail', async () => {
  const catalog = await fetchOpenSeaCourtyardCatalog({
    openSeaApiKey: 'test-key',
    openSeaPageLimit: 2,
    openSeaMaxPages: 1,
    fetchImpl: async (url) => {
      const requestUrl = new URL(String(url));

      if (requestUrl.pathname.endsWith('/best') && requestUrl.searchParams.has('traits')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ errors: ['Internal server error'] }),
        };
      }

      if (requestUrl.pathname.endsWith('/best')) {
        return {
          ok: true,
          json: async () => ({
            listings: [{
              chain: 'matic',
              status: 'ACTIVE',
              order_hash: 'order-333',
              order_created_at: 1779359437,
              price: { current: { currency: 'USDC', decimals: 6, value: '90000000' } },
              protocol_data: {
                parameters: {
                  offerer: '0xseller',
                  offer: [{
                    token: '0x251be3a17af4892035c37ebf5890f4a4d889dcad',
                    identifierOrCriteria: '333',
                  }],
                },
              },
            }],
          }),
        };
      }

      if (requestUrl.pathname.endsWith('/nfts/batch')) {
        return {
          ok: true,
          json: async () => ({
            nfts: [{
              identifier: '333',
              name: 'Pokemon Rayquaza 10 GEM MINT',
              opensea_url: 'https://opensea.io/item/polygon/0x251be3a17af4892035c37ebf5890f4a4d889dcad/333',
              traits: [
                { trait_type: 'Category', value: 'Pokémon' },
                { trait_type: 'Grade', value: '10 GEM MINT' },
              ],
            }],
          }),
        };
      }

      throw new Error(`Unexpected OpenSea URL: ${url}`);
    },
  });

  assert.equal(catalog.items.length, 1);
  assert.match(catalog.warnings[0], /trait filters failed/);
  const deals = rankCourtyardDeals(catalog, { budgetUsdt6: '100000000' });
  assert.equal(deals[0].title, 'Pokemon Rayquaza 10 GEM MINT');
});

test('fetchCourtyardDeals can crawl a backend catalog source directly', async () => {
  const responses = new Map([
    ['https://source.example/robots.txt', { status: 404, body: '' }],
    ['https://source.example/start', { status: 200, body: '<a href="/deal">deal</a>' }],
    ['https://source.example/deal', {
      status: 200,
      body: `<!doctype html>
        <html>
          <head>
            <title>Pokemon Mewtwo 10 GEM MINT</title>
            <script type="application/ld+json">
              {"@context":"https://schema.org","@type":"Product","name":"Pokemon Mewtwo 10 GEM MINT","offers":{"@type":"Offer","priceCurrency":"USD","price":75}}
            </script>
          </head>
          <body>Category: Pokemon Grade: 10 GEM MINT FMV $125</body>
        </html>`,
    }],
  ]);

  const deals = await fetchCourtyardDeals({
    startUrls: ['https://source.example/start'],
    maxPages: 10,
    maxDepth: 1,
    budgetUsdt6: '100000000',
    fetchImpl: async (url) => {
      const response = responses.get(String(url));
      return {
        ok: Boolean(response?.status && response.status >= 200 && response.status < 300),
        status: response?.status ?? 404,
        headers: { get: () => 'text/html' },
        text: async () => response?.body ?? '',
      };
    },
  });

  assert.equal(deals.length, 1);
  assert.equal(deals[0].title, 'Pokemon Mewtwo 10 GEM MINT');
  assert.equal(deals[0].priceUsd, 75);
  assert.equal(deals[0].fitStatus, 'fits');
});
