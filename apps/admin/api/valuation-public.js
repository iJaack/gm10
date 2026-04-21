import { createValuationPackStore } from '../server/lib/valuation-store.js';

function respondError(response, statusCode, message) {
  response.status(statusCode).json({ error: message });
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'accept, content-type');
}

function publicCardMark(card, pack) {
  if (
    card?.decision !== 'approved'
    || !card?.submittedTxHash
    || card?.consensus?.status !== 'passed'
    || !card?.consensus?.proposedValueUsdc6
  ) {
    return null;
  }

  return {
    positionId: card.positionId,
    title: card.title,
    valueUsdc6: card.consensus.proposedValueUsdc6,
    generatedAt: pack.generatedAt,
    submittedTxHash: card.submittedTxHash,
    sourceRef: card.sourceRef,
    proofHash: card.proofHash,
  };
}

export function createValuationPublicHandler({
  createValuationPackStoreImpl = createValuationPackStore,
} = {}) {
  return async function handler(request = {}, response) {
    setCorsHeaders(response);
    response.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');

    if (request.method === 'OPTIONS') {
      response.status(204).json({});
      return;
    }

    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET, OPTIONS');
      respondError(response, 405, 'Method not allowed');
      return;
    }

    try {
      const store = createValuationPackStoreImpl({
        localDir: process.env.GM10_VALUATION_LOCAL_DIR || process.cwd(),
      });
      const pack = await store.getLatestPack();
      const marks = (pack?.cards ?? [])
        .map((card) => publicCardMark(card, pack))
        .filter(Boolean);

      response.status(200).json({
        packId: pack?.packId ?? null,
        generatedAt: pack?.generatedAt ?? null,
        marks,
      });
    } catch (error) {
      respondError(response, 500, error instanceof Error ? error.message : 'Unable to load public valuation marks');
    }
  };
}

export default createValuationPublicHandler();
