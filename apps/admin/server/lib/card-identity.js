const GENERIC_TITLE_RE = /^(treasury|recorded) card #\d+$/i;

const CURATED_CARD_IDENTITY_BY_POSITION_ID = {
  1: {
    title: '2021 Pokemon Sword & Shield Gengar VMAX',
    subtitle: 'High-Class Deck #002, PSA 10 GEM MINT',
    courtyardUrl: 'https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008',
  },
  2: {
    title: '2023 Pokemon Sv1a-Triplet Beat #080 Magikarp - Art Rare',
    subtitle: 'PSA 10 GEM MINT',
    courtyardUrl: 'https://courtyard.io/asset/3593e6341cbcbc1765b92f4ebe46eb29a63dcb9a861886d2332d4ddce9658286',
  },
  3: {
    title: '2024 Pokemon Sv8a-Terastal Fest EX Umbreon EX',
    subtitle: '#217 Holo Special Art Rare, PSA 10 GEM MINT',
    courtyardUrl: 'https://courtyard.io/asset/90f85586da4ba09bcf5c81b9560c094cfc2d9d3690eed7c9f4b4832056f765d9',
  },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function positionIdFor(position, card) {
  const raw = card?.positionId ?? position?.id;
  const numeric = Number(raw);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

function normalizeGrade(value) {
  const input = String(value ?? '').trim();
  if (!input) return undefined;

  const psaMatch = input.match(/\bPSA\s*(8|9|10)\b/i);
  if (psaMatch) return `psa${psaMatch[1]}`;

  const normalized = input.toLowerCase().replace(/[\s_-]+/g, '');
  if (/^psa(8|9|10)$/.test(normalized)) return normalized;
  if (/^(8|9|10)$/.test(normalized)) return `psa${normalized}`;
  return normalized;
}

function cleanString(value) {
  const stringValue = String(value ?? '').trim();
  return stringValue || undefined;
}

function searchForIdentity(identity) {
  return cleanString(identity.search)
    ?? [identity.title, identity.subtitle].map(cleanString).filter(Boolean).join(' ');
}

function lookupOverride(overrides, positionId, cardKey) {
  if (!isPlainObject(overrides)) return undefined;
  return overrides[String(positionId)] ?? overrides[cardKey];
}

export function extractCourtyardAssetId(value) {
  const input = cleanString(value);
  if (!input) return undefined;

  try {
    const url = new URL(input);
    const parts = url.pathname.split('/').filter(Boolean);
    const assetIndex = parts.indexOf('asset');
    if (assetIndex >= 0 && parts[assetIndex + 1]) {
      return parts[assetIndex + 1];
    }
  } catch {
    // Raw asset ids are accepted below.
  }

  return input;
}

function normalizeIdentity(raw) {
  if (!isPlainObject(raw)) return undefined;

  const title = cleanString(raw.title ?? raw.name);
  const subtitle = cleanString(raw.subtitle ?? raw.set);
  const search = searchForIdentity({ ...raw, title, subtitle });
  const grade = normalizeGrade(raw.grade ?? subtitle ?? title);
  const courtyardAssetId = cleanString(raw.courtyardAssetId)
    ?? extractCourtyardAssetId(raw.courtyardUrl ?? raw.sourceUrl);

  if (!title && !search && !raw.tcgPlayerId && !courtyardAssetId) {
    return undefined;
  }

  return {
    ...raw,
    title,
    subtitle,
    search: cleanString(search),
    grade,
    tcgPlayerId: cleanString(raw.tcgPlayerId),
    courtyardAssetId,
  };
}

export function resolveCardIdentity({
  position,
  card,
  overrides,
} = {}) {
  const positionId = positionIdFor(position, card);
  const cardKey = cleanString(card?.cardKey);
  const override = lookupOverride(overrides, positionId, cardKey);
  const curated = positionId ? CURATED_CARD_IDENTITY_BY_POSITION_ID[positionId] : undefined;

  if (override) {
    return normalizeIdentity(override);
  }

  if (curated) {
    return normalizeIdentity(curated);
  }

  const title = cleanString(card?.title);
  if (title && !GENERIC_TITLE_RE.test(title)) {
    return normalizeIdentity({
      title,
      subtitle: card?.subtitle,
      grade: card?.grade,
      courtyardAssetId: card?.courtyardAssetId,
      courtyardUrl: card?.courtyardUrl,
      tcgPlayerId: card?.tcgPlayerId,
      search: card?.search,
    });
  }

  return undefined;
}
