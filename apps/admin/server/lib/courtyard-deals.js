import { parseCourtyardAssetId } from './courtyard.js';
import { crawlCourtyardCatalog } from './courtyard-catalog-crawler.js';
import { parseUsdc6, formatUsdc6 } from './valuation.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const HIGH_GRADE_LABELS = new Set(['10GEMMINT', '10PRISTINE', '10PRISINTE']);
const COURTYARD_OPENSEA_COLLECTION = 'courtyard-nft';
const COURTYARD_OPENSEA_CONTRACT = '0x251be3a17af4892035c37ebf5890f4a4d889dcad';
const COURTYARD_OPENSEA_CHAIN = 'matic';
const OPENSEA_HIGH_GRADES = ['10 GEM MINT', '10 PRISTINE'];
const OPENSEA_STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'USD']);

let cachedCatalog = null;

function parseCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function cacheKey(kind, value) {
  return `${kind}:${JSON.stringify(value)}`;
}

function cleanString(value) {
  const stringValue = String(value ?? '').trim();
  return stringValue || undefined;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function normalizeLabel(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function categoryText(item) {
  const categories = [
    item?.category,
    item?.category_name,
    item?.categoryName,
    item?.assetCategory,
    ...(Array.isArray(item?.categories) ? item.categories : []),
  ];
  return categories.map((value) => String(value ?? '')).join(' ');
}

export function isPokemonCategory(item) {
  return normalizeLabel(categoryText(item)).includes('POKEMON');
}

export function normalizeCourtyardGrade(value) {
  const normalized = normalizeLabel(value);
  if (!normalized) return undefined;
  if (normalized.includes('10GEMMINT')) return '10 GEM MINT';
  if (normalized.includes('10PRISTINE') || normalized.includes('10PRISINTE')) return '10 PRISTINE';
  return undefined;
}

function gradeFromItem(item) {
  return firstDefined(
    item?.grade,
    item?.grade_label,
    item?.gradeLabel,
    item?.condition,
    item?.title,
    item?.name,
    item?.attributes?.find?.((attribute) => normalizeLabel(attribute?.trait_type ?? attribute?.name) === 'GRADE')?.value,
  );
}

export function isHighGradePokemon(item) {
  const grade = normalizeCourtyardGrade(gradeFromItem(item));
  return Boolean(isPokemonCategory(item) && grade && HIGH_GRADE_LABELS.has(normalizeLabel(grade)));
}

function numericAmount(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const numeric = Number(String(value).replace(/[$,]/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return undefined;
}

function usdcRawFromAmount(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return parseUsdc6(String(amount));
}

function extractAssetUrl(item) {
  return cleanString(firstDefined(
    item?.assetUrl,
    item?.asset_url,
    item?.courtyardUrl,
    item?.courtyard_url,
    item?.url,
    item?.permalink,
    item?.link,
    item?.sourceUrl,
    item?.source_url,
  ));
}

function extractAssetId(item, assetUrl) {
  const explicitId = cleanString(firstDefined(item?.courtyardAssetId, item?.courtyard_asset_id, item?.assetId, item?.asset_id, item?.collectible_id));
  for (const candidate of [assetUrl, explicitId]) {
    try {
      return parseCourtyardAssetId(candidate);
    } catch {
      // Continue with the next candidate.
    }
  }
  return undefined;
}

function traitValue(item, traitType) {
  const normalizedTrait = normalizeLabel(traitType);
  return cleanString(item?.traits?.find?.((trait) => normalizeLabel(trait?.trait_type ?? trait?.name) === normalizedTrait)?.value);
}

function openseaPriceUsd(listing) {
  const current = listing?.price?.current;
  const symbol = String(current?.currency ?? '').toUpperCase();
  const decimals = Number(current?.decimals);
  const raw = current?.value;
  if (!OPENSEA_STABLE_SYMBOLS.has(symbol) || !Number.isFinite(decimals) || raw === undefined || raw === null) return undefined;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return numeric / 10 ** decimals;
}

function openseaListingTokenId(listing, contract = COURTYARD_OPENSEA_CONTRACT) {
  const wantedContract = String(contract).toLowerCase();
  const offer = listing?.protocol_data?.parameters?.offer ?? [];
  const item = offer.find((entry) => String(entry?.token ?? '').toLowerCase() === wantedContract) ?? offer[0];
  return cleanString(item?.identifierOrCriteria);
}

function openseaItemUrl({ tokenId, contract = COURTYARD_OPENSEA_CONTRACT }) {
  return `https://opensea.io/item/polygon/${contract}/${tokenId}`;
}

async function fetchOpenSeaJson(path, { apiKey, fetchImpl, method = 'GET', body } = {}) {
  const response = await fetchImpl(`https://api.opensea.io${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'user-agent': 'gm10-admin-courtyard-deals',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.errors?.[0] ?? payload?.error ?? payload?.message ?? `OpenSea returned ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function openSeaListingsPath({ slug, grade, limit, cursor }) {
  const params = new URLSearchParams({
    limit: String(limit),
    traits: JSON.stringify([
      { traitType: 'Category', value: 'Pokémon' },
      { traitType: 'Grade', value: grade },
    ]),
  });
  if (cursor) params.set('next.value', cursor);
  return `/api/v2/listings/collection/${encodeURIComponent(slug)}/best?${params.toString()}`;
}

function openSeaUnfilteredListingsPath({ slug, limit, cursor }) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('next.value', cursor);
  return `/api/v2/listings/collection/${encodeURIComponent(slug)}/best?${params.toString()}`;
}

async function fetchOpenSeaNfts({ listings, contract, chain, apiKey, fetchImpl }) {
  const identifiers = listings
    .map((listing) => openseaListingTokenId(listing, contract))
    .filter(Boolean)
    .map((tokenId) => ({ chain, contract_address: contract, token_id: tokenId }));
  if (!identifiers.length) return new Map();

  const payload = await fetchOpenSeaJson('/api/v2/nfts/batch', {
    apiKey,
    fetchImpl,
    method: 'POST',
    body: { identifiers },
  });
  return new Map((payload?.nfts ?? []).map((nft) => [String(nft.identifier), nft]));
}

function normalizeOpenSeaListing(listing, nft, fallbackGrade, { contract }) {
  const tokenId = cleanString(nft?.identifier) ?? openseaListingTokenId(listing, contract);
  if (!tokenId) return undefined;

  const priceUsd = openseaPriceUsd(listing);
  if (!priceUsd) return undefined;

  const listedAtMs = Number(listing?.order_created_at);
  const listedAt = Number.isFinite(listedAtMs) && listedAtMs > 0
    ? new Date(listedAtMs * 1000).toISOString()
    : undefined;
  const url = cleanString(nft?.opensea_url) ?? openseaItemUrl({ tokenId, contract });

  return {
    assetId: tokenId,
    title: cleanString(nft?.name) ?? `Courtyard token ${tokenId}`,
    category: traitValue(nft, 'Category') ?? 'Pokémon',
    grade: traitValue(nft, 'Grade') ?? fallbackGrade,
    assetUrl: url,
    imageUrl: cleanString(nft?.display_image_url ?? nft?.image_url ?? nft?.original_image_url),
    priceUsd,
    seller: cleanString(listing?.protocol_data?.parameters?.offerer),
    serialNumber: traitValue(nft, 'Serial'),
    listedAt,
    marketplace: 'OpenSea',
    sourceUrl: url,
  };
}

export async function fetchOpenSeaCourtyardCatalog({
  openSeaApiKey = process.env.OPENSEA_API_KEY,
  openSeaCollectionSlug = process.env.COURTYARD_OPENSEA_COLLECTION_SLUG ?? COURTYARD_OPENSEA_COLLECTION,
  openSeaContract = process.env.COURTYARD_OPENSEA_CONTRACT ?? COURTYARD_OPENSEA_CONTRACT,
  openSeaChain = process.env.COURTYARD_OPENSEA_CHAIN ?? COURTYARD_OPENSEA_CHAIN,
  openSeaPageLimit = parsePositiveInt(process.env.COURTYARD_OPENSEA_PAGE_LIMIT, 50),
  openSeaMaxPages = parsePositiveInt(process.env.COURTYARD_OPENSEA_MAX_PAGES, 2),
  fetchImpl = fetch,
} = {}) {
  if (!openSeaApiKey) throw new Error('Set OPENSEA_API_KEY to fetch Courtyard marketplace listings from OpenSea.');

  const pageLimit = Math.max(1, Math.min(200, Number(openSeaPageLimit) || 50));
  const maxPages = Math.max(1, Math.min(10, Number(openSeaMaxPages) || 2));
  const items = [];
  const traitFilterErrors = [];

  for (const grade of OPENSEA_HIGH_GRADES) {
    let cursor = '';
    for (let page = 0; page < maxPages; page += 1) {
      let payload;
      try {
        payload = await fetchOpenSeaJson(openSeaListingsPath({
          slug: openSeaCollectionSlug,
          grade,
          limit: pageLimit,
          cursor,
        }), { apiKey: openSeaApiKey, fetchImpl });
      } catch (error) {
        traitFilterErrors.push(error instanceof Error ? error.message : 'OpenSea trait-filtered listing request failed');
        break;
      }
      const listings = payload?.listings ?? [];
      const nftsByTokenId = await fetchOpenSeaNfts({
        listings,
        contract: openSeaContract,
        chain: openSeaChain,
        apiKey: openSeaApiKey,
        fetchImpl,
      });

      for (const listing of listings) {
        const tokenId = openseaListingTokenId(listing, openSeaContract);
        const item = normalizeOpenSeaListing(listing, nftsByTokenId.get(String(tokenId)), grade, { contract: openSeaContract });
        if (item) items.push(item);
      }

      cursor = cleanString(payload?.next) ?? '';
      if (!cursor || !listings.length) break;
    }
  }

  if (!items.length && traitFilterErrors.length) {
    let cursor = '';
    for (let page = 0; page < maxPages; page += 1) {
      const payload = await fetchOpenSeaJson(openSeaUnfilteredListingsPath({
        slug: openSeaCollectionSlug,
        limit: pageLimit,
        cursor,
      }), { apiKey: openSeaApiKey, fetchImpl });
      const listings = payload?.listings ?? [];
      const nftsByTokenId = await fetchOpenSeaNfts({
        listings,
        contract: openSeaContract,
        chain: openSeaChain,
        apiKey: openSeaApiKey,
        fetchImpl,
      });

      for (const listing of listings) {
        const tokenId = openseaListingTokenId(listing, openSeaContract);
        const grade = traitValue(nftsByTokenId.get(String(tokenId)), 'Grade');
        const item = normalizeOpenSeaListing(listing, nftsByTokenId.get(String(tokenId)), grade, { contract: openSeaContract });
        if (item) items.push(item);
      }

      cursor = cleanString(payload?.next) ?? '';
      if (!cursor || !listings.length) break;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'opensea-courtyard-marketplace',
    items,
    warnings: traitFilterErrors.length ? [`OpenSea trait filters failed; used unfiltered listing fallback: ${traitFilterErrors[0]}`] : [],
  };
}

function isInactiveListing(item) {
  const status = normalizeLabel(firstDefined(item?.status, item?.listingStatus, item?.saleStatus, item?.state));
  if (item?.sold === true || item?.isSold === true) return true;
  return ['SOLD', 'ENDED', 'EXPIRED', 'UNLISTED', 'CANCELLED', 'CANCELED'].some((blocked) => status.includes(blocked));
}

export function normalizeCourtyardDeal(item, { nowMs = Date.now(), budgetUsdt6 } = {}) {
  if (!item || typeof item !== 'object') return undefined;
  if (!isHighGradePokemon(item)) return undefined;
  if (isInactiveListing(item)) return undefined;

  const assetUrl = extractAssetUrl(item);
  const assetId = extractAssetId(item, assetUrl);
  if (!assetUrl && !assetId) return undefined;

  const priceUsd = numericAmount(
    item?.priceUsd,
    item?.price_usd,
    item?.price,
    item?.listingPriceUsd,
    item?.listing_price_usd,
    item?.listing?.priceUsd,
    item?.listing?.price?.amount?.decimal,
  );
  const fmvUsd = numericAmount(
    item?.fmvUsd,
    item?.fmv_usd,
    item?.fmvEstimateUsd,
    item?.fmv_estimate_usd,
    item?.fairMarketValueUsd,
    item?.fair_market_value_usd,
    item?.fmv,
  );
  const priceUsdt6 = usdcRawFromAmount(priceUsd);
  if (!priceUsdt6) return undefined;

  const budgetRaw = budgetUsdt6 !== undefined ? BigInt(String(budgetUsdt6)) : undefined;
  const priceRaw = BigInt(priceUsdt6);
  const fitsBudget = budgetRaw === undefined || priceRaw <= budgetRaw;
  const upsideUsd = Number.isFinite(fmvUsd) ? fmvUsd - priceUsd : undefined;
  const discountPct = Number.isFinite(upsideUsd) && Number.isFinite(fmvUsd) && fmvUsd > 0
    ? (upsideUsd / fmvUsd) * 100
    : undefined;
  const createdAt = Date.parse(firstDefined(item?.listedAt, item?.listed_at, item?.createdAt, item?.created_at) ?? '');
  const agePenalty = Number.isFinite(createdAt) && nowMs - createdAt > 7 * 24 * 60 * 60 * 1000 ? 0.9 : 1;
  const confidence = Number.isFinite(fmvUsd) ? 0.82 * agePenalty : 0.55;
  const score = (Number.isFinite(upsideUsd) ? upsideUsd : 0) * confidence;

  return {
    assetId: assetId ?? '',
    assetUrl: assetUrl ?? `https://courtyard.io/asset/${assetId}`,
    title: cleanString(firstDefined(item?.title, item?.name, item?.cardName, item?.card_name)) ?? assetId ?? 'Courtyard asset',
    category: 'Pokemon',
    grade: normalizeCourtyardGrade(gradeFromItem(item)),
    image: cleanString(firstDefined(item?.image, item?.imageUrl, item?.image_url, item?.thumbnail, item?.thumbnailUrl)) ?? '',
    priceUsd,
    priceUsdt6,
    fmvUsd: Number.isFinite(fmvUsd) ? fmvUsd : undefined,
    upsideUsd: Number.isFinite(upsideUsd) ? upsideUsd : undefined,
    discountPct: Number.isFinite(discountPct) ? discountPct : undefined,
    confidence,
    score,
    seller: cleanString(firstDefined(item?.seller, item?.sellerName, item?.seller_name, item?.owner)) ?? '',
    serialNumber: cleanString(firstDefined(item?.serialNumber, item?.serial_number, item?.certNumber, item?.cert_number)) ?? '',
    listedAt: cleanString(firstDefined(item?.listedAt, item?.listed_at, item?.createdAt, item?.created_at)) ?? '',
    fitStatus: fitsBudget ? 'fits' : 'over_budget',
    blockedReason: fitsBudget ? '' : `Price ${formatUsdc6(priceUsdt6)} USDT exceeds current liquid treasury budget`,
  };
}

export function rankCourtyardDeals(items, { budgetUsdt6, limit = DEFAULT_LIMIT, nowMs = Date.now() } = {}) {
  const normalizedLimit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || DEFAULT_LIMIT));
  return asArray(items)
    .map((item) => normalizeCourtyardDeal(item, { budgetUsdt6, nowMs }))
    .filter(Boolean)
    .sort((left, right) => {
      if (left.fitStatus !== right.fitStatus) return left.fitStatus === 'fits' ? -1 : 1;
      if (right.score !== left.score) return right.score - left.score;
      return left.priceUsd - right.priceUsd;
    })
    .slice(0, normalizedLimit);
}

async function fetchJsonUrl(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'gm10-admin-courtyard-deals',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || payload?.message || `Catalog source returned ${response.status}`);
  return payload;
}

export async function fetchCourtyardCatalog({
  sourceUrl = process.env.COURTYARD_DEALS_CATALOG_URL,
  sourceJson = process.env.COURTYARD_DEALS_CATALOG_JSON,
  openSeaApiKey = process.env.OPENSEA_API_KEY,
  openSeaCollectionSlug = process.env.COURTYARD_OPENSEA_COLLECTION_SLUG,
  openSeaContract = process.env.COURTYARD_OPENSEA_CONTRACT,
  openSeaChain = process.env.COURTYARD_OPENSEA_CHAIN,
  openSeaPageLimit = process.env.COURTYARD_OPENSEA_PAGE_LIMIT,
  openSeaMaxPages = process.env.COURTYARD_OPENSEA_MAX_PAGES,
  startUrls = parseCsv(process.env.COURTYARD_CATALOG_START_URLS),
  maxPages = parsePositiveInt(process.env.COURTYARD_CATALOG_MAX_PAGES, 100),
  maxDepth = parsePositiveInt(process.env.COURTYARD_CATALOG_MAX_DEPTH, 2),
  sameOrigin = parseBoolean(process.env.COURTYARD_CATALOG_SAME_ORIGIN, true),
  respectRobots = parseBoolean(process.env.COURTYARD_CATALOG_RESPECT_ROBOTS, true),
  fetchImpl = fetch,
  nowMs = Date.now(),
} = {}) {
  if (sourceJson) return JSON.parse(sourceJson);
  if (sourceUrl) {
    const key = cacheKey('url', sourceUrl);
    if (cachedCatalog?.key === key && cachedCatalog.expiresAt > nowMs) return cachedCatalog.payload;
    const payload = await fetchJsonUrl(sourceUrl, fetchImpl);
    cachedCatalog = { key, payload, expiresAt: nowMs + CATALOG_CACHE_TTL_MS };
    return payload;
  }

  if (openSeaApiKey) {
    const openSeaConfig = { openSeaCollectionSlug, openSeaContract, openSeaChain, openSeaPageLimit, openSeaMaxPages };
    const key = cacheKey('opensea', openSeaConfig);
    if (cachedCatalog?.key === key && cachedCatalog.expiresAt > nowMs) return cachedCatalog.payload;
    const payload = await fetchOpenSeaCourtyardCatalog({
      openSeaApiKey,
      openSeaCollectionSlug,
      openSeaContract,
      openSeaChain,
      openSeaPageLimit,
      openSeaMaxPages,
      fetchImpl,
    });
    cachedCatalog = { key, payload, expiresAt: nowMs + CATALOG_CACHE_TTL_MS };
    return payload;
  }

  if (!startUrls.length) {
    throw new Error('Set OPENSEA_API_KEY, COURTYARD_CATALOG_START_URLS, or COURTYARD_DEALS_CATALOG_URL before scanning deals.');
  }

  const crawlConfig = { startUrls, maxPages, maxDepth, sameOrigin, respectRobots };
  const key = cacheKey('crawl', crawlConfig);
  if (cachedCatalog?.key === key && cachedCatalog.expiresAt > nowMs) return cachedCatalog.payload;

  const payload = await crawlCourtyardCatalog({ ...crawlConfig, fetchImpl });
  cachedCatalog = { key, payload, expiresAt: nowMs + CATALOG_CACHE_TTL_MS };
  return payload;
}

export async function fetchCourtyardDeals(options = {}) {
  const catalog = await fetchCourtyardCatalog(options);
  return rankCourtyardDeals(catalog, options);
}
