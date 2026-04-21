import { fetchPhygitalsCard } from '../server/lib/phygitals.js';

export default async function handler(request, response) {
  try {
    const url = request.query?.url ?? request.query?.slug;
    const card = await fetchPhygitalsCard(url);
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json(card);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to resolve Phygitals card' });
  }
}
