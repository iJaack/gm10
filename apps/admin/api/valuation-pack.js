import { randomBytes } from 'node:crypto';
import { buildValuationPack } from './lib/valuation.js';
import { authorizeValuationPackRead, authorizeValuationPackWrite } from './lib/valuation-auth.js';
import { fetchActiveTreasuryCards } from './lib/valuation-chain.js';
import { createValuationPackStore } from './lib/valuation-store.js';

const REQUIRED_SOURCE_IDS = ['benchmark', 'evidence', 'primary'];

function parseBody(request) {
  const body = request?.body;
  if (!body) {
    return undefined;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  return body;
}

function formatUtcPackStamp(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid generatedAt');
  }

  const year = value.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const dayOfYear = Math.floor((Date.UTC(year, value.getUTCMonth(), value.getUTCDate()) - startOfYear) / 86_400_000) + 1;
  const week = Math.floor((dayOfYear - 1) / 7) + 1;
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  const hours = String(value.getUTCHours()).padStart(2, '0');
  const minutes = String(value.getUTCMinutes()).padStart(2, '0');
  const seconds = String(value.getUTCSeconds()).padStart(2, '0');

  return `valuation-${year}-W${week}-${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

function createValuationPackId(date) {
  return `${formatUtcPackStamp(date)}-${randomBytes(3).toString('hex')}`;
}

function respondError(response, statusCode, message) {
  response.status(statusCode).json({ error: message });
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && Number.isFinite(value) && value > 0;
}

function validateObservation(observation) {
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
    return false;
  }

  const stringFields = [
    'sourceId',
    'sourceName',
    'cardKey',
    'observedAt',
    'fetchedAt',
    'valueUsdc6',
    'currency',
    'rawPayloadRef',
    'sourceUrl',
    'matchReason',
  ];

  return isNonEmptyString(observation.sourceId)
    && observation.sourceId === observation.sourceId.trim()
    && stringFields.every((field) => typeof observation[field] === 'string')
    && Number.isFinite(observation.confidence);
}

function hasDistinctSourceIds(observations) {
  const sourceIds = observations.map((observation) => observation.sourceId);
  return new Set(sourceIds).size === observations.length;
}

function hasRequiredSourceIds(observations) {
  const sourceIds = observations.map((observation) => observation.sourceId).sort();
  return sourceIds.length === REQUIRED_SOURCE_IDS.length
    && sourceIds.every((sourceId, index) => sourceId === REQUIRED_SOURCE_IDS[index]);
}

function validateCard(card) {
  return Boolean(card)
    && typeof card === 'object'
    && !Array.isArray(card)
    && isPositiveInteger(card.positionId)
    && isNonEmptyString(card.cardKey)
    && isNonEmptyString(card.title)
    && isNonEmptyString(card.currentValueUsdc6)
    && Array.isArray(card.observations)
    && card.observations.length === 3
    && card.observations.every(validateObservation)
    && hasDistinctSourceIds(card.observations)
    && hasRequiredSourceIds(card.observations);
}

function validateCardsPayload(cards) {
  if (cards === undefined) {
    return true;
  }

  return Array.isArray(cards) && cards.every(validateCard);
}

export function createValuationPackHandler({
  authorizeValuationPackReadImpl = authorizeValuationPackRead,
  authorizeValuationPackWriteImpl = authorizeValuationPackWrite,
  buildValuationPackImpl = buildValuationPack,
  createValuationPackStoreImpl = createValuationPackStore,
  createPackIdImpl = createValuationPackId,
  fetchActiveTreasuryCardsImpl = fetchActiveTreasuryCards,
} = {}) {
  return async function handler(request = {}, response) {
    const store = createValuationPackStoreImpl({
      localDir: process.env.GM10_VALUATION_LOCAL_DIR || process.cwd(),
    });

    response.setHeader('Cache-Control', 'no-store');

    if (request.method === 'GET') {
      const authResult = await authorizeValuationPackReadImpl(request);
      if (!authResult.ok) {
        respondError(response, authResult.statusCode ?? 401, authResult.message ?? 'Unauthorized valuation pack request');
        return;
      }

      const pack = await store.getLatestPack();
      response.status(200).json({ pack });
      return;
    }

    if (request.method === 'POST') {
      const body = parseBody(request);
      if (!body || body.action !== 'generate') {
        respondError(response, 400, 'Unsupported valuation-pack action');
        return;
      }

      const authResult = await authorizeValuationPackWriteImpl(request);
      if (!authResult.ok) {
        respondError(response, authResult.statusCode ?? 401, authResult.message ?? 'Unauthorized valuation pack request');
        return;
      }

      try {
        const generatedAt = body.generatedAt || new Date().toISOString();
        if (!validateCardsPayload(body.cards)) {
          respondError(response, 400, 'Invalid cards payload');
          return;
        }

        const packId = createPackIdImpl(generatedAt);
        const submittedCards = Array.isArray(body.cards) ? body.cards : [];
        const cards = submittedCards.length > 0
          ? submittedCards
          : await fetchActiveTreasuryCardsImpl().catch((error) => {
            throw Object.assign(new Error(error instanceof Error ? error.message : 'Unable to fetch treasury cards'), { statusCode: 500 });
          });
        const pack = buildValuationPackImpl({ packId, generatedAt, cards });

        try {
          await store.savePack(pack);
        } catch (error) {
          respondError(response, 500, error instanceof Error ? error.message : 'Unable to save valuation pack');
          return;
        }
        response.status(200).json({ pack });
      } catch (error) {
        const statusCode = error?.statusCode === 500 ? 500 : 400;
        respondError(response, statusCode, error instanceof Error ? error.message : 'Unable to generate valuation pack');
      }
      return;
    }

    response.setHeader('Allow', 'GET, POST');
    respondError(response, 405, 'Method not allowed');
  };
}

export default createValuationPackHandler();
