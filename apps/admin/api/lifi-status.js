import { AVALANCHE_CHAIN_ID, POLYGON_CHAIN_ID } from './lib/lifi.js';

export default async function handler(request, response) {
  try {
    const txHash = String(request.query?.txHash ?? '').trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new Error('Missing LI.FI source transaction hash');

    const url = new URL('https://li.quest/v1/status');
    url.searchParams.set('txHash', txHash);
    url.searchParams.set('fromChain', String(AVALANCHE_CHAIN_ID));
    url.searchParams.set('toChain', String(POLYGON_CHAIN_ID));
    if (request.query?.bridge) url.searchParams.set('bridge', String(request.query.bridge));

    const statusResponse = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'gm10-admin',
      },
    });
    const payload = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) {
      throw new Error(payload?.message || payload?.error || `LI.FI API returned ${statusResponse.status}`);
    }

    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json(payload);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to check LI.FI status' });
  }
}
