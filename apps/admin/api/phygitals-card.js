import { fetchPhygitalsCard } from '../server/lib/phygitals.js';

export const runtime = 'edge';
export const preferredRegion = 'fra1';
export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url);
    const url = requestUrl.searchParams.get('url') ?? requestUrl.searchParams.get('slug');
    const card = await fetchPhygitalsCard(url);
    return jsonResponse(card);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unable to resolve Phygitals card' }, 400);
  }
}

export default async function handler(request, response) {
  if (!response) return GET(request);

  try {
    const url = request.query?.url ?? request.query?.slug;
    const card = await fetchPhygitalsCard(url);
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json(card);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to resolve Phygitals card' });
  }
}
