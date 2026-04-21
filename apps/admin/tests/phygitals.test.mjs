import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractPhygitalsNextData,
  extractPhygitalsPageProps,
  fetchPhygitalsCard,
  fetchPhygitalsEvidenceObservation,
  normalizePhygitalsCard,
  normalizePhygitalsEvidenceObservation,
  parsePhygitalsCardSlug,
  SOLANA_USDC_MINT,
} from '../server/lib/phygitals.js';

const slug = '2021-pokemon-japanese-s-promo-po-wbtuqn';

function card(overrides = {}) {
  return {
    address: '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP',
    collection_address: 'phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC',
    token_standard: 'CORE_NFT',
    currency: SOLANA_USDC_MINT,
    price: '725000000',
    listed: true,
    marketplace: 'TENSOR',
    owner: '4eCkfFGKowXvuoTwyQYci48mXAKZtvQ1ETt9wdRbkCgq',
    vault: 'fanatics',
    image: 'https://gateway.irys.xyz/67aWLdD8Fosh6Yr3pCdwbafzRc9SJ1e47v4VLCsV8vz4',
    slug,
    altFmv: '782.4999445134943',
    altFmvSource: 'https://app.alt.xyz/research/b9ede6b5-ddc3-4a98-808c-f60bae465223',
    metadata: [
      { key: 'Grade', value: 'PSA 10.0' },
      { key: 'Grader', value: 'PSA' },
      { key: 'Cert Number', value: '75221183' },
      { key: 'Title', value: '2021 Pokemon Japanese S Promo Pokemon Stamp Box Cramorant #226 PSA 10 GEM MINT' },
      { key: 'Language', value: 'Japanese' },
    ],
    ...overrides,
  };
}

test('parses Phygitals card URLs and slugs', () => {
  assert.equal(parsePhygitalsCardSlug(`https://www.phygitals.com/card/${slug}`), slug);
  assert.equal(parsePhygitalsCardSlug(`https://phygitals.com/card/${slug}`), slug);
  assert.equal(parsePhygitalsCardSlug(slug), slug);
  assert.throws(() => parsePhygitalsCardSlug('https://example.com/nope'), /Phygitals card URL/);
});

test('extracts card payload from Next.js page data', () => {
  const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { card1: card() } } })}</script></html>`;
  assert.equal(extractPhygitalsNextData(html).address, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
  assert.equal(extractPhygitalsPageProps({ props: { pageProps: { card1: card() } } }).address, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
});

test('normalizes live Phygitals listing into Solana position prefill', () => {
  const normalized = normalizePhygitalsCard(slug, card());

  assert.equal(normalized.title, '2021 Pokemon Japanese S Promo Pokemon Stamp Box Cramorant #226 PSA 10 GEM MINT');
  assert.equal(normalized.assetAddress, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
  assert.equal(normalized.collectionAddress, 'phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC');
  assert.equal(normalized.listing.priceRaw, '725000000');
  assert.equal(normalized.listing.priceDecimal, '725');
  assert.equal(normalized.identity.grade, 'psa10');
  assert.equal(normalized.prefill.tokenStandard, 'CORE_NFT');
  assert.equal(normalized.prefill.evmCollection, '0x0000000000000000000000000000000000000000');
  assert.equal(normalized.prefill.nonEvmCollection, 'phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC');
  assert.equal(normalized.prefill.nonEvmTokenId, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
});

test('normalizes Phygitals listing into valuation evidence', () => {
  const observation = normalizePhygitalsEvidenceObservation({
    slug,
    cardKey: 'solana:phygZDQZJZVHvJGYPGoKPYUtXw7mstSYtTtcuh8LJcC:9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP',
    payload: card(),
    fetchedAt: '2026-04-21T14:00:00.000Z',
  });

  assert.equal(observation.sourceId, 'evidence');
  assert.equal(observation.sourceName, 'Phygitals');
  assert.equal(observation.valueUsdc6, '725000000');
  assert.equal(observation.confidence, 0.85);
  assert.equal(observation.rawPayloadRef, `phygitals://card/${slug}/listing/TENSOR/9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP`);
  assert.match(observation.matchReason, /Solana Core asset/);
});

test('falls back to Phygitals ALT FMV when the card is not listed', () => {
  const observation = normalizePhygitalsEvidenceObservation({
    slug,
    cardKey: 'solana:card',
    payload: card({ listed: false, price: '0' }),
    fetchedAt: '2026-04-21T14:00:00.000Z',
  });

  assert.equal(observation.valueUsdc6, '782499944');
  assert.equal(observation.confidence, 0.8);
  assert.equal(observation.rawPayloadRef, `phygitals://card/${slug}/alt-fmv`);
});

test('fetches and normalizes a Phygitals card page', async () => {
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { card1: card() } } })}</script>`;
  const normalized = await fetchPhygitalsCard(`https://www.phygitals.com/card/${slug}`, async (url, options) => {
    assert.equal(String(url), `https://www.phygitals.com/card/${slug}`);
    assert.match(options.headers['user-agent'], /Mozilla\/5\.0/);
    assert.match(options.headers.accept, /text\/html/);
    return {
      ok: true,
      text: async () => html,
    };
  });

  assert.equal(normalized.slug, slug);
  assert.equal(normalized.listing.priceDecimal, '725');
});

test('falls back to Next.js card data when Phygitals blocks the HTML page', async () => {
  const requestedUrls = [];
  const normalized = await fetchPhygitalsCard(`https://www.phygitals.com/card/${slug}`, async (url, options) => {
    requestedUrls.push(String(url));
    if (requestedUrls.length === 1) {
      assert.match(options.headers.accept, /text\/html/);
      return {
        ok: false,
        status: 403,
        text: async () => '',
      };
    }
    assert.match(String(url), new RegExp(`/_next/data/.+/card/${slug}\\.json$`));
    assert.match(options.headers.accept, /application\/json/);
    return {
      ok: true,
      json: async () => ({ props: { pageProps: { card1: card() } } }),
    };
  });

  assert.equal(normalized.assetAddress, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
  assert.equal(requestedUrls.length, 2);
});

test('uses curated Phygitals card data when Vercel-origin requests are blocked', async () => {
  const normalized = await fetchPhygitalsCard(`https://www.phygitals.com/card/${slug}`, async () => ({
    ok: false,
    status: 403,
    text: async () => '',
  }));

  assert.equal(normalized.slug, slug);
  assert.equal(normalized.assetAddress, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
  assert.equal(normalized.listing.priceDecimal, '725');
});

test('Phygitals evidence adapter fails closed when the page request is blocked', async () => {
  const observation = await fetchPhygitalsEvidenceObservation({
    slug: 'unknown-phygitals-card',
    cardKey: 'solana:card',
    fetchedAt: '2026-04-21T14:00:00.000Z',
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      text: async () => '',
    }),
  });

  assert.equal(observation.sourceName, 'Phygitals');
  assert.equal(observation.valueUsdc6, '0');
  assert.equal(observation.confidence, 0);
  assert.match(observation.matchReason, /Phygitals page returned 403/);
});
