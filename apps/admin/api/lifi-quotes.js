import { buildFundingQuotes } from './lib/lifi.js';

export default async function handler(request, response) {
  try {
    const quotes = await buildFundingQuotes({
      usdcRaw: request.query?.usdcRaw,
      fromAddress: request.query?.fromAddress,
      toAddress: request.query?.toAddress,
    });
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json(quotes);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to quote LI.FI routes' });
  }
}
