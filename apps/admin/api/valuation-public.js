import { buildValuationPack } from '../server/lib/valuation.js';
import { fetchActiveTreasuryCards } from '../server/lib/valuation-chain.js';
import { createValuationPackStore } from '../server/lib/valuation-store.js';

function respondError(response, statusCode, message) {
  response.status(statusCode).json({ error: message });
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'accept, content-type');
}

function publicCardMark(card, pack, { requireSubmitted = true } = {}) {
  if (
    card?.consensus?.status !== 'passed'
    || !card?.consensus?.proposedValueUsdc6
  ) {
    return null;
  }
  if (requireSubmitted && (card?.decision !== 'approved' || !card?.submittedTxHash)) {
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

async function buildLivePublicPack({ buildValuationPackImpl, fetchActiveTreasuryCardsImpl }) {
  const generatedAt = new Date().toISOString();
  const cards = await fetchActiveTreasuryCardsImpl();
  return buildValuationPackImpl({
    packId: `public-live-${generatedAt.replace(/[^0-9A-Za-z]/g, '')}`,
    generatedAt,
    cards,
  });
}

export function createValuationPublicHandler({
  buildValuationPackImpl = buildValuationPack,
  createValuationPackStoreImpl = createValuationPackStore,
  fetchActiveTreasuryCardsImpl = fetchActiveTreasuryCards,
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
        .map((card) => publicCardMark(card, pack, { requireSubmitted: true }))
        .filter(Boolean);
      if (marks.length === 0) {
        const livePack = await buildLivePublicPack({ buildValuationPackImpl, fetchActiveTreasuryCardsImpl });
        const liveMarks = (livePack.cards ?? [])
          .map((card) => publicCardMark(card, livePack, { requireSubmitted: false }))
          .filter(Boolean);

        response.status(200).json({
          packId: livePack.packId,
          generatedAt: livePack.generatedAt,
          source: 'live',
          marks: liveMarks,
        });
        return;
      }

      response.status(200).json({
        packId: pack?.packId ?? null,
        generatedAt: pack?.generatedAt ?? null,
        source: 'submitted',
        marks,
      });
    } catch (error) {
      respondError(response, 500, error instanceof Error ? error.message : 'Unable to load public valuation marks');
    }
  };
}

export default createValuationPublicHandler();
