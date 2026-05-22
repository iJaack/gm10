import { fetchCourtyardDeals } from '../server/lib/courtyard-deals.js';

function parseLimit(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : undefined;
}

function parseBudget(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  if (!/^\d+$/.test(raw)) throw new Error('budgetUsdt6 must be a non-negative integer');
  return raw;
}

export default async function handler(request, response) {
  try {
    const deals = await fetchCourtyardDeals({
      budgetUsdt6: parseBudget(request.query?.budgetUsdt6),
      limit: parseLimit(request.query?.limit),
    });
    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    response.status(200).json({
      source: 'courtyard-deals-backend',
      deals,
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to scan Courtyard deals',
      deals: [],
    });
  }
}
