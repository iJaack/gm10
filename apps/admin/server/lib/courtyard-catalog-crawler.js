import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_USER_AGENT = 'gm10-admin-catalog-crawler/1.0';
const HIGH_GRADE_RE = /\b10\s+(?:GEM\s+MINT|PRISTINE|PRISINTE)\b/i;
const POKEMON_RE = /\bPok[eé]mon\b/i;
const MONEY_RE = /(?:\$|USD\s*)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;

function cleanText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

function captureMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return undefined;
}

function captureTitle(html) {
  return cleanText(captureMeta(html, 'og:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
}

function parseJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Ignore malformed page-provided JSON-LD.
    }
  }
  return blocks;
}

function flattenJsonLd(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== 'object') return [];
  return [value, ...flattenJsonLd(value['@graph'])];
}

function firstJsonLdProduct(blocks) {
  return blocks
    .flatMap(flattenJsonLd)
    .find((entry) => {
      const type = Array.isArray(entry?.['@type']) ? entry['@type'].join(' ') : entry?.['@type'];
      return String(type ?? '').toLowerCase().includes('product');
    });
}

function numericAmount(value) {
  const numeric = Number(String(value ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function extractPriceFromText(text) {
  const match = text.match(MONEY_RE);
  return numericAmount(match?.[1]);
}

function extractFmvFromText(text) {
  const match = text.match(/(?:FMV|Fair Market Value)[^$0-9]{0,24}(?:\$|USD\s*)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
  return numericAmount(match?.[1]);
}

export function extractCatalogItemFromHtml(html, pageUrl) {
  const text = cleanText(html);
  if (!POKEMON_RE.test(text) || !HIGH_GRADE_RE.test(text)) return undefined;

  const jsonLdProduct = firstJsonLdProduct(parseJsonLdBlocks(html));
  const title = cleanText(jsonLdProduct?.name ?? captureTitle(html));
  const grade = text.match(HIGH_GRADE_RE)?.[0]?.toUpperCase().replace(/\s+/g, ' ');
  const offer = Array.isArray(jsonLdProduct?.offers) ? jsonLdProduct.offers[0] : jsonLdProduct?.offers;
  const priceUsd = numericAmount(offer?.price) ?? extractPriceFromText(text);
  if (!title || !priceUsd) return undefined;

  return {
    title,
    category: 'Pokemon',
    grade,
    assetUrl: pageUrl,
    imageUrl: cleanText(
      (Array.isArray(jsonLdProduct?.image) ? jsonLdProduct.image[0] : jsonLdProduct?.image)
      ?? captureMeta(html, 'og:image'),
    ),
    priceUsd,
    fmvEstimateUsd: extractFmvFromText(text),
    listedAt: new Date().toISOString(),
  };
}

export function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html))) {
    const normalized = normalizeUrl(match[1], baseUrl);
    if (normalized) links.push(normalized);
  }
  return unique(links);
}

export function parseRobotsTxt(text) {
  const disallow = [];
  let applies = false;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const cleaned = line.replace(/#.*/, '').trim();
    if (!cleaned) continue;
    const [rawKey, ...rest] = cleaned.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      applies = value === '*' || value.toLowerCase().includes('gm10');
    } else if (applies && key === 'disallow' && value) {
      disallow.push(value);
    }
  }
  return {
    isAllowed(url) {
      const pathname = new URL(url).pathname;
      return !disallow.some((path) => pathname.startsWith(path));
    },
  };
}

async function fetchRobots(origin, fetchImpl, userAgent) {
  try {
    const response = await fetchImpl(`${origin}/robots.txt`, {
      headers: { 'user-agent': userAgent, accept: 'text/plain,*/*' },
    });
    if (!response.ok) return parseRobotsTxt('');
    return parseRobotsTxt(await response.text());
  } catch {
    return parseRobotsTxt('');
  }
}

async function fetchHtml(url, fetchImpl, userAgent) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': userAgent,
    },
  });
  if (!response.ok) throw new Error(`Catalog crawl request returned ${response.status} for ${url}`);
  const contentType = response.headers?.get?.('content-type') ?? '';
  if (contentType && !contentType.toLowerCase().includes('html')) return '';
  return response.text();
}

function sameOriginFilter(startOrigins, url) {
  return startOrigins.has(new URL(url).origin);
}

export async function crawlCourtyardCatalog({
  startUrls,
  maxPages = 100,
  maxDepth = 2,
  sameOrigin = true,
  respectRobots = true,
  fetchImpl = fetch,
  userAgent = DEFAULT_USER_AGENT,
} = {}) {
  const starts = unique((startUrls ?? []).map((url) => normalizeUrl(url)).filter(Boolean));
  if (!starts.length) throw new Error('At least one authorized catalog start URL is required.');

  const startOrigins = new Set(starts.map((url) => new URL(url).origin));
  const robotsByOrigin = new Map();
  const visited = new Set();
  const queued = starts.map((url) => ({ url, depth: 0 }));
  const items = [];
  const errors = [];

  while (queued.length && visited.size < maxPages) {
    const next = queued.shift();
    if (!next || visited.has(next.url)) continue;
    if (sameOrigin && !sameOriginFilter(startOrigins, next.url)) continue;
    visited.add(next.url);

    try {
      const origin = new URL(next.url).origin;
      if (!robotsByOrigin.has(origin)) {
        robotsByOrigin.set(origin, respectRobots ? await fetchRobots(origin, fetchImpl, userAgent) : parseRobotsTxt(''));
      }
      if (!robotsByOrigin.get(origin).isAllowed(next.url)) continue;

      const html = await fetchHtml(next.url, fetchImpl, userAgent);
      const item = extractCatalogItemFromHtml(html, next.url);
      if (item) items.push(item);

      if (next.depth < maxDepth) {
        for (const link of extractLinks(html, next.url)) {
          if (!visited.has(link) && (!sameOrigin || sameOriginFilter(startOrigins, link))) {
            queued.push({ url: link, depth: next.depth + 1 });
          }
        }
      }
    } catch (error) {
      errors.push({ url: next.url, error: error instanceof Error ? error.message : 'crawl failed' });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'gm10-authorized-catalog-crawler',
    startUrls: starts,
    items,
    crawl: {
      pagesVisited: visited.size,
      maxPages,
      maxDepth,
      sameOrigin,
      respectRobots,
      errors,
    },
  };
}

export async function writeCourtyardCatalog(catalog, outPath) {
  if (!outPath) throw new Error('Missing output path for catalog crawl.');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return outPath;
}
