import { buildValuationPack } from './lib/valuation.js';
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

export default async function handler(request = {}, response) {
  const store = createValuationPackStore({
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
      const packId = body.packId || weekPackId(generatedAt);
      const cards = Array.isArray(body.cards) && body.cards.length > 0 ? body.cards : [];
      const pack = buildValuationPack({ packId, generatedAt, cards });

      await store.savePack(pack);
      response.status(200).json({ pack });
    } catch (error) {
      respondError(response, 400, error instanceof Error ? error.message : 'Unable to generate valuation pack');
    }
    return;
  }

  response.setHeader('Allow', 'GET, POST');
  respondError(response, 405, 'Method not allowed');
}
