import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  crawlCourtyardCatalog,
  extractCatalogItemFromHtml,
  extractLinks,
  parseRobotsTxt,
  writeCourtyardCatalog,
} from '../server/lib/courtyard-catalog-crawler.js';

function productHtml({
  title = '2023 Pokemon Scarlet & Violet Charizard ex #199 10 GEM MINT',
  price = 80,
  fmv = 120,
  category = 'Pokemon',
  grade = '10 GEM MINT',
} = {}) {
  return `<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <meta property="og:image" content="https://example.com/card.png">
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "${title}",
            "image": "https://example.com/card-jsonld.png",
            "offers": { "@type": "Offer", "priceCurrency": "USD", "price": ${price} }
          }
        </script>
      </head>
      <body>
        <a href="/next">next</a>
        <section>Category: ${category}</section>
        <section>Grade: ${grade}</section>
        <section>Fair Market Value $${fmv}</section>
      </body>
    </html>`;
}

test('extractCatalogItemFromHtml normalizes product pages into catalog items', () => {
  const item = extractCatalogItemFromHtml(productHtml(), 'https://source.example/cards/1');

  assert.equal(item.title, '2023 Pokemon Scarlet & Violet Charizard ex #199 10 GEM MINT');
  assert.equal(item.category, 'Pokemon');
  assert.equal(item.grade, '10 GEM MINT');
  assert.equal(item.assetUrl, 'https://source.example/cards/1');
  assert.equal(item.imageUrl, 'https://example.com/card-jsonld.png');
  assert.equal(item.priceUsd, 80);
  assert.equal(item.fmvEstimateUsd, 120);
});

test('extractCatalogItemFromHtml rejects non-Pokemon or low-grade pages', () => {
  assert.equal(extractCatalogItemFromHtml(productHtml({ title: 'Sports card 10 GEM MINT', category: 'Sports' }), 'https://source.example/cards/1'), undefined);
  assert.equal(extractCatalogItemFromHtml(productHtml({ title: 'Pokemon card PSA 9 MINT', grade: '9 MINT' }), 'https://source.example/cards/2'), undefined);
});

test('extractLinks returns normalized http links without fragments', () => {
  const links = extractLinks('<a href="/a#top">A</a><a href="mailto:x@example.com">mail</a><a href="https://other.example/b">B</a>', 'https://source.example/root');

  assert.deepEqual(links, ['https://source.example/a', 'https://other.example/b']);
});

test('parseRobotsTxt blocks disallowed paths', () => {
  const robots = parseRobotsTxt('User-agent: *\nDisallow: /private\n');

  assert.equal(robots.isAllowed('https://source.example/cards/1'), true);
  assert.equal(robots.isAllowed('https://source.example/private/1'), false);
});

test('crawlCourtyardCatalog crawls same-origin authorized pages and writes output', async () => {
  const responses = new Map([
    ['https://source.example/robots.txt', { status: 404, body: '' }],
    ['https://source.example/start', { status: 200, body: '<a href="/deal">deal</a><a href="https://other.example/deal">other</a>' }],
    ['https://source.example/deal', { status: 200, body: productHtml({ title: 'Pokemon Umbreon 10 PRISTINE', price: 90, fmv: 140 }) }],
  ]);
  const catalog = await crawlCourtyardCatalog({
    startUrls: ['https://source.example/start'],
    maxPages: 10,
    maxDepth: 1,
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

  assert.equal(catalog.items.length, 1);
  assert.equal(catalog.items[0].title, 'Pokemon Umbreon 10 PRISTINE');
  assert.equal(catalog.crawl.pagesVisited, 2);

  const dir = await mkdtemp(join(tmpdir(), 'gm10-crawler-'));
  try {
    const outPath = join(dir, 'catalog.json');
    await writeCourtyardCatalog(catalog, outPath);
    const stored = JSON.parse(await readFile(outPath, 'utf8'));
    assert.equal(stored.items.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
