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

function mergeMarksByPosition(primaryMarks, fallbackMarks) {
  const seen = new Set();
  const merged = [];

  for (const mark of [...primaryMarks, ...fallbackMarks]) {
    const key = Number(mark?.positionId);
    if (!Number.isInteger(key) || seen.has(key)) continue;
    seen.add(key);
    merged.push(mark);
  }

  return merged.sort((left, right) => Number(left.positionId) - Number(right.positionId));
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
    response.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');

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
      let pack = null;
      try {
        pack = await store.getLatestPack();
      } catch {
        pack = null;
      }
      const submittedMarks = (pack?.cards ?? [])
        .map((card) => publicCardMark(card, pack, { requireSubmitted: true }))
        .filter(Boolean);
      let livePack;
      let liveError;
      try {
        livePack = await buildLivePublicPack({ buildValuationPackImpl, fetchActiveTreasuryCardsImpl });
      } catch (error) {
        liveError = error;
      }
      const liveMarks = (livePack?.cards ?? [])
        .map((card) => publicCardMark(card, livePack, { requireSubmitted: false }))
        .filter(Boolean);

      if (liveMarks.length > 0) {
        response.status(200).json({
          packId: livePack.packId,
          submittedPackId: pack?.packId ?? null,
          generatedAt: livePack.generatedAt,
          source: 'live',
          marks: mergeMarksByPosition(liveMarks, submittedMarks),
        });
        return;
      }

      if (!livePack && submittedMarks.length === 0) {
        throw liveError ?? new Error('Unable to generate live public valuation marks');
      }

      if (submittedMarks.length === 0) {
        response.status(200).json({
          packId: livePack.packId,
          generatedAt: livePack.generatedAt,
          source: 'live',
          marks: [],
        });
        return;
      }

      response.status(200).json({
        packId: pack?.packId ?? null,
        generatedAt: pack?.generatedAt ?? null,
        source: 'submitted',
        marks: submittedMarks,
      });
    } catch (error) {
      respondError(response, 500, error instanceof Error ? error.message : 'Unable to load public valuation marks');
    }
  };
}

export default createValuationPublicHandler();
