import { buildSolanaFundingQuote, buildSolanaUsdcFundingQuote } from '../server/lib/lifi.js';
import { parseDecimalUnits } from '../server/lib/units.js';

function sourceAmountRaw(query) {
  if (query?.fromAmountRaw) return String(query.fromAmountRaw);
  if (query?.fromAmountAvax) return parseDecimalUnits(query.fromAmountAvax, 18);
  throw new Error('Missing AVAX source amount');
}

export default async function handler(request, response) {
  try {
    if (request.query?.toToken === 'USDC' || request.query?.toAmountRaw || request.query?.toAmountUsdc) {
      const quote = await buildSolanaUsdcFundingQuote({
        usdcRaw: request.query?.toAmountRaw ? String(request.query.toAmountRaw) : parseDecimalUnits(request.query?.toAmountUsdc, 6),
        fromAddress: request.query?.fromAddress,
        toAddress: request.query?.toAddress,
      });
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json(quote);
      return;
    }

    const quote = await buildSolanaFundingQuote({
      fromAmountRaw: sourceAmountRaw(request.query),
      fromAddress: request.query?.fromAddress,
      toAddress: request.query?.toAddress,
    });
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json(quote);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to quote LI.FI Solana route' });
  }
}
