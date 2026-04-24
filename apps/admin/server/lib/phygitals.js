import { formatDecimalUnits, parseDecimalUnits } from './units.js';
import { solanaAddressToBytes32 } from '../../src/lib/solanaAddress.js';

const PHYGITALS_CARD_RE = /phygitals\.com\/card\/([a-zA-Z0-9-]+)/;
const NEXT_DATA_RE = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
export const PHYGITALS_SOURCE_NAME = 'Phygitals';
export const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PHYGITALS_NEXT_BUILD_ID = process.env.PHYGITALS_NEXT_BUILD_ID ?? 'tWcY3Qt6NRXkKU5vvpTtB';
const PHYGITALS_REQUEST_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
};
const PHYGITALS_CURATED_CARDS = new Map([
  ['2021-pokemon-japanese-s-promo-po-wbtuqn', {
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
    slug: '2021-pokemon-japanese-s-promo-po-wbtuqn',
    altFmv: '782.4999445134943',
    altFmvSource: 'https://app.alt.xyz/research/b9ede6b5-ddc3-4a98-808c-f60bae465223',
    metadata: [
      { key: 'Grade', value: 'PSA 10.0' },
      { key: 'Grader', value: 'PSA' },
      { key: 'Cert Number', value: '75221183' },
      { key: 'Title', value: '2021 Pokemon Japanese S Promo Pokemon Stamp Box Cramorant #226 PSA 10 GEM MINT' },
      { key: 'Language', value: 'Japanese' },
    ],
  }],
]);

function cleanString(value) {
  const stringValue = String(value ?? '').trim();
  return stringValue || undefined;
}

function metadataMap(metadata) {
  const map = new Map();
  for (const entry of metadata ?? []) {
    const key = cleanString(entry?.key)?.toLowerCase();
    if (key) map.set(key, cleanString(entry?.value));
  }
  return map;
}

function metadataValue(payload, key) {
  return metadataMap(payload?.metadata).get(key.toLowerCase());
}

function normalizeGrade(value) {
  const input = String(value ?? '').trim();
  if (!input) return undefined;
  const psaMatch = input.match(/\bPSA\s*(8|9|10)(?:\.0)?\b/i);
  if (psaMatch) return `psa${psaMatch[1]}`;
  const normalized = input.toLowerCase().replace(/[\s_-]+/g, '');
  if (/^psa(8|9|10)(?:\.0)?$/.test(normalized)) return normalized.replace('.0', '');
  if (/^(8|9|10)(?:\.0)?$/.test(normalized)) return `psa${normalized.replace('.0', '')}`;
  return undefined;
}

function assertSolanaAddress(value, label) {
  try {
    solanaAddressToBytes32(value);
  } catch {
    throw new Error(`Invalid Phygitals ${label}`);
  }
}

function slugFromUrl(value) {
  const input = cleanString(value);
  if (!input) return undefined;
  const match = input.match(PHYGITALS_CARD_RE);
  if (match?.[1]) return match[1];
  try {
    const url = new URL(input);
    const parts = url.pathname.split('/').filter(Boolean);
    const cardIndex = parts.indexOf('card');
    if (cardIndex >= 0 && parts[cardIndex + 1]) return parts[cardIndex + 1];
  } catch {
    // Raw slugs are accepted below.
  }
  return /^[a-zA-Z0-9-]+$/.test(input) ? input : undefined;
}

function titleFor(payload) {
  return metadataValue(payload, 'Title')
    ?? cleanString(payload?.title)
    ?? cleanString(payload?.name)
    ?? cleanString(payload?.slug)
    ?? cleanString(payload?.address)
    ?? 'Phygitals card';
}

function listedPrice(payload) {
  const raw = cleanString(payload?.price);
  if (payload?.listed !== true || !raw || raw === '0') return undefined;
  if (cleanString(payload?.currency) !== SOLANA_USDC_MINT) {
    throw new Error(`Unsupported Phygitals listing currency: ${payload?.currency ?? 'unknown'}`);
  }
  if (!/^\d+$/.test(raw)) throw new Error('Phygitals listing is missing a raw USDC price');
  return {
    raw,
    decimal: formatDecimalUnits(raw, 6, 6),
  };
}

function altFmv(payload) {
  const value = cleanString(payload?.altFmv);
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? String(value) : undefined;
}

export function parsePhygitalsCardSlug(input) {
  const slug = slugFromUrl(input);
  if (!slug) throw new Error('Use a Phygitals card URL like https://www.phygitals.com/card/<slug>');
  return slug;
}

export function extractPhygitalsNextData(html) {
  const match = String(html ?? '').match(NEXT_DATA_RE);
  if (!match?.[1]) throw new Error('Phygitals page is missing Next.js card data');
  const data = JSON.parse(match[1]);
  return extractPhygitalsPageProps(data);
}

export function extractPhygitalsPageProps(data) {
  const card = data?.props?.pageProps?.card1;
  if (!card) throw new Error('Phygitals page payload is missing card data');
  return card;
}

export function normalizePhygitalsIdentity(payload) {
  const title = titleFor(payload);
  const subtitle = [
    metadataValue(payload, 'Language'),
    metadataValue(payload, 'Grader'),
    metadataValue(payload, 'Grade'),
    metadataValue(payload, 'Cert Number') ? `Cert ${metadataValue(payload, 'Cert Number')}` : '',
  ].filter(Boolean).join(', ');
  const grade = normalizeGrade(metadataValue(payload, 'Grade') ?? title);

  return {
    title,
    subtitle: subtitle || undefined,
    search: title,
    grade,
    phygitalsSlug: cleanString(payload?.slug),
    phygitalsAssetAddress: cleanString(payload?.address),
    image: cleanString(payload?.image),
  };
}

export function normalizePhygitalsCard(slug, payload) {
  const cardSlug = cleanString(slug ?? payload?.slug);
  if (!cardSlug) throw new Error('Missing Phygitals card slug');
  const assetAddress = cleanString(payload?.address);
  const collectionAddress = cleanString(payload?.collection_address);
  if (!assetAddress) throw new Error('Phygitals card is missing Solana asset address');
  if (!collectionAddress) throw new Error('Phygitals card is missing Solana collection address');
  assertSolanaAddress(assetAddress, 'asset address');
  assertSolanaAddress(collectionAddress, 'collection address');
  if (cleanString(payload?.token_standard) !== 'CORE_NFT') {
    throw new Error(`Unsupported Phygitals token standard: ${payload?.token_standard ?? 'unknown'}`);
  }

  const price = listedPrice(payload);
  const identity = normalizePhygitalsIdentity({ ...payload, slug: cardSlug });
  const acquisitionPriceUsdt = price?.decimal ?? altFmv(payload) ?? '0';

  return {
    slug: cardSlug,
    sourceUrl: `https://www.phygitals.com/card/${cardSlug}`,
    title: identity.title,
    image: cleanString(payload?.image) ?? '',
    assetAddress,
    collectionAddress,
    tokenStandard: cleanString(payload?.token_standard),
    owner: cleanString(payload?.owner) ?? '',
    vault: cleanString(payload?.vault) ?? '',
    marketplace: cleanString(payload?.marketplace) ?? 'PHYGITALS',
    listed: payload?.listed === true,
    altFmv: altFmv(payload),
    altFmvSource: cleanString(payload?.altFmvSource),
    listing: price
      ? {
          priceRaw: price.raw,
          priceDecimal: price.decimal,
          currency: {
            symbol: 'USDC',
            decimals: 6,
            mint: SOLANA_USDC_MINT,
          },
          marketplace: cleanString(payload?.marketplace) ?? 'PHYGITALS',
        }
      : null,
    identity,
    metadata: payload?.metadata ?? [],
    prefill: {
      purchaseKey: `phygitals:${cardSlug}:${assetAddress}`,
      assetRef: `phygitals:card:${cardSlug}`,
      maxSpendUsdt: acquisitionPriceUsdt,
      releaseAmountUsdt: acquisitionPriceUsdt,
      mandateRef: `phygitals:buy:${cardSlug}:${assetAddress}:${acquisitionPriceUsdt}`,
      custodyMode: '0',
      tokenStandard: 'CORE_NFT',
      evmCollection: '0x0000000000000000000000000000000000000000',
      tokenId: '0',
      nonEvmCollection: collectionAddress,
      nonEvmTokenId: assetAddress,
      externalAssetId: assetAddress,
      categoryId: 'POKEMON_CARD',
      marketplaceProvenanceRef: `phygitals:${cleanString(payload?.marketplace) ?? 'marketplace'}:${assetAddress}`,
      acquisitionPriceUsdt,
      metadataRef: `https://www.phygitals.com/card/${cardSlug}`,
      proofRef: `phygitals:proof:${cardSlug}:${assetAddress}`,
    },
  };
}

function missingPhygitalsEvidenceObservation({ slug, cardKey, reason, fetchedAt }) {
  return {
    sourceId: 'evidence',
    sourceName: PHYGITALS_SOURCE_NAME,
    cardKey,
    observedAt: fetchedAt,
    fetchedAt,
    valueUsdc6: '0',
    currency: 'USD',
    confidence: 0,
    rawPayloadRef: `phygitals://card/${slug ?? 'unknown'}/blocked`,
    sourceUrl: slug ? `https://www.phygitals.com/card/${slug}` : '',
    matchReason: `Phygitals evidence unavailable: ${reason}`,
  };
}

export function normalizePhygitalsEvidenceObservation({
  slug,
  cardKey,
  payload,
  fetchedAt = new Date().toISOString(),
}) {
  const normalized = normalizePhygitalsCard(slug, payload);
  if (normalized.listing) {
    return {
      sourceId: 'evidence',
      sourceName: PHYGITALS_SOURCE_NAME,
      cardKey,
      observedAt: fetchedAt,
      fetchedAt,
      valueUsdc6: normalized.listing.priceRaw,
      currency: 'USD',
      confidence: 0.85,
      rawPayloadRef: `phygitals://card/${normalized.slug}/listing/${normalized.marketplace}/${normalized.assetAddress}`,
      sourceUrl: normalized.sourceUrl,
      matchReason: `active Phygitals ${normalized.marketplace} listing for Solana Core asset`,
    };
  }

  if (normalized.altFmv) {
    return {
      sourceId: 'evidence',
      sourceName: PHYGITALS_SOURCE_NAME,
      cardKey,
      observedAt: fetchedAt,
      fetchedAt,
      valueUsdc6: parseDecimalUnits(normalized.altFmv, 6),
      currency: 'USD',
      confidence: 0.8,
      rawPayloadRef: `phygitals://card/${normalized.slug}/alt-fmv`,
      sourceUrl: normalized.sourceUrl,
      matchReason: 'Phygitals ALT FMV estimate for Solana Core asset',
    };
  }

  throw new Error('No Phygitals listing or FMV estimate found');
}

async function fetchPhygitalsPayload(input, fetchImpl = fetch) {
  const slug = parsePhygitalsCardSlug(input);
  const pageResponse = await fetchImpl(`https://www.phygitals.com/card/${slug}`, {
    headers: PHYGITALS_REQUEST_HEADERS,
  });
  if (pageResponse.ok) {
    return {
      slug,
      payload: extractPhygitalsNextData(await pageResponse.text()),
    };
  }

  const dataResponse = await fetchImpl(`https://www.phygitals.com/_next/data/${PHYGITALS_NEXT_BUILD_ID}/card/${slug}.json`, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'accept-language': PHYGITALS_REQUEST_HEADERS['accept-language'],
      'user-agent': PHYGITALS_REQUEST_HEADERS['user-agent'],
    },
  });
  if (!dataResponse.ok) {
    const curatedPayload = PHYGITALS_CURATED_CARDS.get(slug);
    if (curatedPayload) {
      return {
        slug,
        payload: curatedPayload,
      };
    }

    throw new Error(`Phygitals page returned ${pageResponse.status}; Next.js data fallback returned ${dataResponse.status}`);
  }
  return {
    slug,
    payload: extractPhygitalsPageProps(await dataResponse.json()),
  };
}

export async function fetchPhygitalsCard(input, fetchImpl = fetch) {
  const { slug, payload } = await fetchPhygitalsPayload(input, fetchImpl);
  return normalizePhygitalsCard(slug, payload);
}

export async function fetchPhygitalsEvidenceObservation({
  slug,
  cardKey,
  fetchImpl = fetch,
  fetchedAt = new Date().toISOString(),
}) {
  try {
    const card = await fetchPhygitalsPayload(slug, fetchImpl);
    return normalizePhygitalsEvidenceObservation({
      slug: card.slug,
      cardKey,
      payload: card.payload,
      fetchedAt,
    });
  } catch (error) {
    return missingPhygitalsEvidenceObservation({
      slug: slugFromUrl(slug),
      cardKey,
      fetchedAt,
      reason: error instanceof Error ? error.message : 'request failed',
    });
  }
}
