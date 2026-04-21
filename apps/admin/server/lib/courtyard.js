import { parseUsdc6 } from './valuation.js';

const COURTYARD_ASSET_RE = /courtyard\.io\/asset\/([a-zA-Z0-9]+)/;
const POLYGON_USDC = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';
const COURTYARD_SOURCE_NAME = 'Courtyard';

function cleanString(value) {
  const stringValue = String(value ?? '').trim();
  return stringValue || undefined;
}

function normalizeGrade(value) {
  const input = String(value ?? '').trim();
  if (!input) return undefined;

  const psaMatch = input.match(/\bPSA\s*(8|9|10)\b/i);
  if (psaMatch) return `psa${psaMatch[1]}`;

  const gemMintMatch = input.match(/\b(8|9|10)\s+GEM\s+MINT\b/i);
  if (gemMintMatch) return `psa${gemMintMatch[1]}`;

  const normalized = input.toLowerCase().replace(/[\s_-]+/g, '');
  if (/^psa(8|9|10)$/.test(normalized)) return normalized;
  if (/^(8|9|10)$/.test(normalized)) return `psa${normalized}`;
  return undefined;
}

function assetIdFromUrl(value) {
  const input = cleanString(value);
  if (!input) return undefined;
  try {
    return parseCourtyardAssetId(input);
  } catch {
    return undefined;
  }
}

function tokenIdToHex(tokenId) {
  const raw = BigInt(String(tokenId ?? '').trim());
  if (raw < 0n) throw new Error('Invalid Courtyard token id');
  return `0x${raw.toString(16).padStart(64, '0')}`;
}

export function parseCourtyardAssetId(input) {
  const value = String(input ?? '').trim();
  if (!value) throw new Error('Missing Courtyard asset URL');
  const match = value.match(COURTYARD_ASSET_RE);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9]{32,}$/.test(value)) return value;
  throw new Error('Use a Courtyard asset URL like https://courtyard.io/asset/<id>');
}

export function normalizeCourtyardTokenMetadataIdentity(payload) {
  const title = cleanString(payload?.name ?? payload?.title);
  if (!title) return undefined;

  const subtitle = cleanString(payload?.collection_name ?? payload?.collection);
  const gradeAttribute = (payload?.attributes ?? []).find?.((attribute) => {
    return String(attribute?.trait_type ?? attribute?.name ?? '').toLowerCase() === 'grade';
  });
  const grade = normalizeGrade(gradeAttribute?.value ?? payload?.grade ?? title);
  const courtyardUrl = cleanString(payload?.external_url ?? payload?.externalUrl);

  return {
    title,
    subtitle,
    search: title,
    grade,
    courtyardUrl,
    courtyardAssetId: assetIdFromUrl(courtyardUrl),
    image: cleanString(payload?.image),
  };
}

export async function fetchCourtyardTokenMetadataIdentity({
  chain = 'polygon',
  contract,
  tokenId,
  fetchImpl = fetch,
} = {}) {
  if (!contract || tokenId === undefined || tokenId === null) {
    return undefined;
  }

  const tokenIdHex = tokenIdToHex(tokenId);
  const response = await fetchImpl(`https://api.courtyard.io/index/token/${chain}/${contract}/${tokenIdHex}/metadata.json`, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      referer: 'https://courtyard.io/',
      'user-agent': 'GM10ValuationBot/1.0 (+https://gm10.xyz)',
    },
  });
  if (!response.ok) {
    throw new Error(`Courtyard token metadata returned ${response.status}`);
  }

  return normalizeCourtyardTokenMetadataIdentity(await response.json());
}

function firstActiveListing(listings, nowMs = Date.now()) {
  return [...(listings ?? [])]
    .filter((listing) => String(listing.side).toLowerCase() === 'sell')
    .filter((listing) => {
      const expiry = Date.parse(listing.expiration || listing.validUntil || '');
      return Number.isFinite(expiry) && expiry > nowMs;
    })
    .sort((a, b) => Number(a.price?.amount?.decimal ?? Infinity) - Number(b.price?.amount?.decimal ?? Infinity))[0];
}

export function normalizeCourtyardAsset(assetId, payload, nowMs = Date.now()) {
  const listing = firstActiveListing(payload?.listing_data, nowMs);
  if (!listing) throw new Error('No active Courtyard sell listing found');

  const currency = listing.price?.currency;
  const amount = listing.price?.amount;
  const currencyContract = String(currency?.contract ?? '').toLowerCase();
  if (String(payload?.chain ?? '').toLowerCase() !== 'polygon') {
    throw new Error(`Unsupported Courtyard chain: ${payload?.chain ?? 'unknown'}`);
  }
  if (String(currency?.symbol ?? '').toUpperCase() !== 'USDC' || currencyContract !== POLYGON_USDC) {
    throw new Error(`Unsupported listing currency: ${currency?.symbol ?? 'unknown'}`);
  }
  if (!payload?.contract || !payload?.token_id) {
    throw new Error('Courtyard asset is missing collection contract or token id');
  }

  const priceRaw = String(amount?.raw ?? '');
  const priceDecimal = String(amount?.decimal ?? '');
  if (!priceRaw || !priceDecimal) throw new Error('Courtyard listing is missing price');

  const expiration = listing.expiration || listing.validUntil;
  const expiresAtMs = Date.parse(expiration);
  const expiresSoon = Number.isFinite(expiresAtMs) && expiresAtMs - nowMs <= 24 * 60 * 60 * 1000;
  const title = payload.title || payload.name || payload.collectible_id || assetId;
  const orderId = String(listing.orderId ?? '');

  return {
    assetId,
    sourceUrl: `https://courtyard.io/asset/${assetId}`,
    title,
    image: payload.image || payload.cropped_image || payload.asset_pictures?.[0] || '',
    collectionName: payload.collection || '',
    collectionContract: payload.contract,
    tokenId: String(payload.token_id),
    collectibleId: payload.collectible_id || '',
    metadataUrl: payload.metadata_url || '',
    chain: payload.chain,
    attributes: payload.attributes ?? [],
    listing: {
      orderId,
      side: listing.side,
      priceDecimal,
      priceRaw,
      currency: {
        symbol: currency.symbol,
        decimals: currency.decimals,
        contract: currency.contract,
      },
      maker: listing.maker || '',
      kind: listing.kind || '',
      source: listing.source?.name || listing.source?.domain || 'Courtyard',
      expiration,
      expiresSoon,
    },
    prefill: {
      purchaseKey: `courtyard:${assetId}:${orderId}`,
      assetRef: `courtyard:asset:${assetId}`,
      maxSpendUsdt: priceDecimal,
      releaseAmountUsdt: priceDecimal,
      mandateRef: `courtyard:buy:${assetId}:${orderId}:${priceDecimal}:${expiration}`,
      custodyMode: '0',
      tokenStandard: 'ERC721',
      evmCollection: payload.contract,
      tokenId: String(payload.token_id),
      nonEvmCollection: '',
      nonEvmTokenId: '',
      externalAssetId: assetId,
      categoryId: 'POKEMON_CARD',
      marketplaceProvenanceRef: `courtyard:order:${orderId}`,
      acquisitionPriceUsdt: priceDecimal,
      metadataRef: payload.metadata_url || `https://courtyard.io/asset/${assetId}`,
      proofRef: `courtyard:proof:${assetId}:${orderId}:${expiration}`,
    },
  };
}

function missingCourtyardEvidenceObservation({ assetId, cardKey, reason, fetchedAt }) {
  return {
    sourceId: 'evidence',
    sourceName: COURTYARD_SOURCE_NAME,
    cardKey,
    observedAt: fetchedAt,
    fetchedAt,
    valueUsdc6: '0',
    currency: 'USD',
    confidence: 0,
    rawPayloadRef: `courtyard://asset/${assetId}/blocked`,
    sourceUrl: assetId ? `https://courtyard.io/asset/${assetId}` : '',
    matchReason: `Courtyard evidence unavailable: ${reason}`,
  };
}

export function normalizeCourtyardEvidenceObservation({
  assetId,
  cardKey,
  payload,
  nowMs = Date.now(),
  fetchedAt = new Date(nowMs).toISOString(),
}) {
  try {
    const normalized = normalizeCourtyardAsset(assetId, payload, nowMs);

    return {
      sourceId: 'evidence',
      sourceName: COURTYARD_SOURCE_NAME,
      cardKey,
      observedAt: fetchedAt,
      fetchedAt,
      valueUsdc6: normalized.listing.priceRaw,
      currency: 'USD',
      confidence: normalized.listing.expiresSoon ? 0.75 : 0.85,
      rawPayloadRef: `courtyard://asset/${assetId}/order/${normalized.listing.orderId}`,
      sourceUrl: normalized.sourceUrl,
      matchReason: `active Courtyard sell listing ${normalized.listing.orderId || 'unknown'} for vaulted asset`,
    };
  } catch (error) {
    const fmvEstimate = Number(payload?.fmv_estimate_usd);
    if (!Number.isFinite(fmvEstimate) || fmvEstimate <= 0) {
      throw error;
    }

    return {
      sourceId: 'evidence',
      sourceName: COURTYARD_SOURCE_NAME,
      cardKey,
      observedAt: fetchedAt,
      fetchedAt,
      valueUsdc6: parseUsdc6(String(fmvEstimate)),
      currency: 'USD',
      confidence: 0.8,
      rawPayloadRef: `courtyard://asset/${assetId}/fmv_estimate_usd`,
      sourceUrl: `https://courtyard.io/asset/${assetId}`,
      matchReason: 'Courtyard FMV estimate for vaulted asset',
    };
  }
}

export async function fetchCourtyardEvidenceObservation({
  assetId,
  cardKey,
  fetchImpl = fetch,
  nowMs = Date.now(),
  fetchedAt = new Date(nowMs).toISOString(),
}) {
  try {
    const response = await fetchImpl(`https://api.courtyard.io/index/asset/${assetId}`, {
      headers: {
        accept: 'application/json,text/plain,*/*',
        referer: 'https://courtyard.io/',
        'user-agent': 'GM10ValuationBot/1.0 (+https://gm10.xyz)',
      },
    });
    if (!response.ok) {
      throw new Error(`Courtyard API returned ${response.status}`);
    }
    const payload = await response.json();
    return normalizeCourtyardEvidenceObservation({ assetId, cardKey, payload, nowMs, fetchedAt });
  } catch (error) {
    return missingCourtyardEvidenceObservation({
      assetId,
      cardKey,
      fetchedAt,
      reason: error instanceof Error ? error.message : 'request failed',
    });
  }
}

export async function fetchCourtyardAsset(assetId, fetchImpl = fetch) {
  const response = await fetchImpl(`https://api.courtyard.io/index/asset/${assetId}`, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      referer: 'https://courtyard.io/',
      'user-agent': 'Mozilla/5.0',
    },
  });
  if (!response.ok) {
    throw new Error(`Courtyard API returned ${response.status}`);
  }
  const payload = await response.json();
  return normalizeCourtyardAsset(assetId, payload);
}
