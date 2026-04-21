import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';
import { resolveCardIdentity } from './card-identity.js';
import {
  fetchCourtyardEvidenceObservation,
  fetchCourtyardTokenMetadataIdentity,
} from './courtyard.js';
import { fetchPokemonPriceTrackerObservation } from './pokemon-price-tracker.js';

const DEFAULT_REGISTRY_ADDRESS = '0x02962F73AdFAA792636c62d3D2a76d922c6B052c';
const DEFAULT_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
const MAX_DEFAULT_POSITIONS = 40;

const REGISTRY_ABI = [
  {
    inputs: [],
    name: 'collectiblePositionCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'getCollectiblePosition',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'originPurchaseKey', type: 'bytes32' },
          { name: 'chainEid', type: 'uint32' },
          { name: 'marketplaceId', type: 'bytes32' },
          { name: 'custodyMode', type: 'uint8' },
          { name: 'tokenStandard', type: 'bytes32' },
          { name: 'evmCollection', type: 'address' },
          { name: 'nonEvmCollection', type: 'bytes32' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'nonEvmTokenId', type: 'bytes32' },
          { name: 'externalAssetId', type: 'bytes32' },
          { name: 'categoryId', type: 'bytes32' },
          { name: 'marketplaceProvenanceRef', type: 'bytes32' },
          { name: 'acquisitionPriceUsdt6', type: 'uint256' },
          { name: 'currentValueUsdt6', type: 'uint256' },
          { name: 'lastNavMarkUsdt6', type: 'uint256' },
          { name: 'acquisitionDate', type: 'uint256' },
          { name: 'lastValuationAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'metadataHash', type: 'bytes32' },
          { name: 'proofHash', type: 'bytes32' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

function missingSourceObservation(sourceId, cardKey) {
  const nowIso = new Date().toISOString();
  const sourceName = {
    primary: 'Primary source',
    benchmark: 'Benchmark source',
    evidence: 'Evidence source',
  }[sourceId] ?? `${sourceId} source`;

  return {
    sourceId,
    sourceName,
    cardKey,
    observedAt: nowIso,
    fetchedAt: nowIso,
    valueUsdc6: '0',
    currency: 'USD',
    confidence: 0,
    rawPayloadRef: `missing://${sourceId}`,
    sourceUrl: '',
    matchReason: 'source not configured',
  };
}

function currentMarkBenchmarkObservation(cardKey, currentValueUsdc6, fetchedAt) {
  return {
    sourceId: 'benchmark',
    sourceName: 'Current registry mark',
    cardKey,
    observedAt: fetchedAt,
    fetchedAt,
    valueUsdc6: String(currentValueUsdc6),
    currency: 'USD',
    confidence: 0.8,
    rawPayloadRef: 'registry://current-mark',
    sourceUrl: '',
    matchReason: 'current onchain treasury mark used as continuity benchmark',
  };
}

function isPlaceholderPosition(position) {
  const evmCollection = String(position?.evmCollection ?? '').toLowerCase();
  const tokenId = position?.tokenId?.toString?.() ?? String(position?.tokenId ?? '');
  const currentValueUsdt6 = position?.currentValueUsdt6?.toString?.() ?? String(position?.currentValueUsdt6 ?? '');

  return (
    evmCollection === '0x0000000000000000000000000000000000000000'
    || tokenId === '0'
    || currentValueUsdt6 === '0'
  );
}

function parseCourtyardAssetMap(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function lookupOverride(overrides, card) {
  return overrides[String(card.positionId)] ?? overrides[card.cardKey];
}

function replaceObservation(observations, replacement) {
  return observations.map((observation) => (
    observation.sourceId === replacement.sourceId ? replacement : observation
  ));
}

async function fetchPositionMetadataIdentity({ position, card, fetchImpl }) {
  try {
    return await fetchCourtyardTokenMetadataIdentity({
      chain: 'polygon',
      contract: position?.evmCollection,
      tokenId: position?.tokenId ?? card?.tokenId,
      fetchImpl,
    });
  } catch {
    return undefined;
  }
}

export function normalizeRegistryPosition(position, { fetchedAt = new Date().toISOString() } = {}) {
  if (!position || Number(position.status) !== 1 || isPlaceholderPosition(position)) {
    return null;
  }

  const positionId = Number(position.id);
  const tokenId = position.tokenId?.toString?.() ?? String(position.tokenId ?? '');
  const evmCollection = String(position.evmCollection ?? '').toLowerCase();
  const cardKey = `${evmCollection}:${tokenId}`;
  const currentValueUsdc6 = position.currentValueUsdt6.toString();

  return {
    positionId,
    cardKey,
    title: `Treasury card #${positionId}`,
    currentValueUsdc6,
    observations: [
      missingSourceObservation('primary', cardKey),
      currentMarkBenchmarkObservation(cardKey, currentValueUsdc6, fetchedAt),
      missingSourceObservation('evidence', cardKey),
    ],
  };
}

export async function fetchActiveTreasuryCards({
  registryAddress,
  rpcUrl,
  maxPositions = MAX_DEFAULT_POSITIONS,
  client,
  fetchImpl = fetch,
  courtyardAssetMap,
  cardIdentityOverrides,
  pokemonPriceTrackerCardMap,
  pokemonPriceTrackerApiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY,
  nowMs = Date.now(),
  fetchedAt = new Date(nowMs).toISOString(),
} = {}) {
  const resolvedRegistryAddress =
    registryAddress
    ?? process.env.GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS
    ?? process.env.VITE_GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS
    ?? DEFAULT_REGISTRY_ADDRESS;
  const resolvedRpcUrl =
    rpcUrl
    ?? process.env.AVALANCHE_RPC_URL
    ?? process.env.GM10_AVALANCHE_RPC_URL
    ?? DEFAULT_RPC_URL;

  const publicClient = client ?? createPublicClient({
    chain: avalanche,
    transport: http(resolvedRpcUrl),
  });
  const resolvedCourtyardAssetMap = parseCourtyardAssetMap(courtyardAssetMap);
  const resolvedCardIdentityOverrides = parseCourtyardAssetMap(
    cardIdentityOverrides ?? pokemonPriceTrackerCardMap,
  );
  const resolvedPokemonPriceTrackerCardMap = parseCourtyardAssetMap(pokemonPriceTrackerCardMap);

  const count = await publicClient.readContract({
    address: resolvedRegistryAddress,
    abi: REGISTRY_ABI,
    functionName: 'collectiblePositionCount',
  });
  const limit = Math.min(Number(count), Number(maxPositions));
  const cards = [];

  for (let index = 1; index <= limit; index += 1) {
    const position = await publicClient.readContract({
      address: resolvedRegistryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getCollectiblePosition',
      args: [BigInt(index)],
    });
    const card = normalizeRegistryPosition(position, { fetchedAt });
    if (card) {
      let cardIdentity = resolveCardIdentity({
        position,
        card,
        overrides: resolvedCardIdentityOverrides,
      });
      if (!cardIdentity) {
        cardIdentity = await fetchPositionMetadataIdentity({ position, card, fetchImpl });
      }
      if (cardIdentity?.title) {
        card.title = cardIdentity.title;
      }

      const courtyardAssetId = lookupOverride(resolvedCourtyardAssetMap, card)
        ?? cardIdentity?.courtyardAssetId;
      if (courtyardAssetId) {
        const evidence = await fetchCourtyardEvidenceObservation({
          assetId: String(courtyardAssetId),
          cardKey: card.cardKey,
          fetchImpl,
          nowMs,
          fetchedAt,
        });
        card.observations = replaceObservation(card.observations, evidence);
      }
      const pokemonPriceTrackerConfig = lookupOverride(resolvedPokemonPriceTrackerCardMap, card)
        ?? cardIdentity;
      if (pokemonPriceTrackerConfig) {
        const primary = await fetchPokemonPriceTrackerObservation({
          cardKey: card.cardKey,
          cardConfig: pokemonPriceTrackerConfig,
          apiKey: pokemonPriceTrackerApiKey,
          fetchImpl,
          fetchedAt,
        });
        card.observations = replaceObservation(card.observations, primary);
      }
      cards.push(card);
    }
  }

  return cards;
}
