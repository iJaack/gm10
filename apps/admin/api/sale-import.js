import { inferSaleFromTransaction } from '../server/lib/sale-import.js';

function parseBody(request) {
  if (!request?.body) return {};
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }
  return request.body;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(request);
    const sale = await inferSaleFromTransaction({
      txHash: body.txHash,
      hotWallet: body.hotWallet,
    });
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json({ sale });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to import sale transaction',
    });
  }
}
