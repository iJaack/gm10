import { fetchPhygitalsCard } from '../server/lib/phygitals.js';

export const runtime = 'edge';
export const preferredRegion = 'fra1';

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
