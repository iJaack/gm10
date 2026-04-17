import { buildValuationPack } from './lib/valuation.js';
import { fetchActiveTreasuryCards } from './lib/valuation-chain.js';
import { createValuationPackStore } from './lib/valuation-store.js';

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

function weekPackId(date) {
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

  return `valuation-${year}-W${week}-${year}-${month}-${day}-${hours}${minutes}`;
}

function respondError(response, statusCode, message) {
  response.status(statusCode).json({ error: message });
}

export function createValuationPackHandler({
  buildValuationPackImpl = buildValuationPack,
  createValuationPackStoreImpl = createValuationPackStore,
  fetchActiveTreasuryCardsImpl = fetchActiveTreasuryCards,
} = {}) {
  return async function handler(request = {}, response) {
    const store = createValuationPackStoreImpl({
      localDir: process.env.GM10_VALUATION_LOCAL_DIR || process.cwd(),
    });

    response.setHeader('Cache-Control', 'no-store');

    if (request.method === 'GET') {
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

      try {
        const generatedAt = body.generatedAt || new Date().toISOString();
        if (body.cards !== undefined && !Array.isArray(body.cards)) {
          respondError(response, 400, 'Invalid cards payload');
          return;
        }

        const packId = weekPackId(generatedAt);
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
