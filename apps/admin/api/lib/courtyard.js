const COURTYARD_ASSET_RE = /courtyard\.io\/asset\/([a-zA-Z0-9]+)/;
const POLYGON_USDC = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';

export function parseCourtyardAssetId(input) {
  const value = String(input ?? '').trim();
  if (!value) throw new Error('Missing Courtyard asset URL');
  const match = value.match(COURTYARD_ASSET_RE);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9]{32,}$/.test(value)) return value;
  throw new Error('Use a Courtyard asset URL like https://courtyard.io/asset/<id>');
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
