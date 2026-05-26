import {
  normalizeContinuousCommitQuote,
  previewContinuousCommitMint,
} from '../server/lib/continuous-commit.js';

export default async function handler(request, response) {
  try {
    const quote = normalizeContinuousCommitQuote(request.query ?? {});
    const preview = request.query?.navPerTokenUsdt6
      ? previewContinuousCommitMint({
          settlementAmountUsdt6: request.query.settlementAmountUsdt6 ?? quote.settlementAmountRaw,
          navPerTokenUsdt6: request.query.navPerTokenUsdt6,
          mintSpreadBps: request.query.mintSpreadBps ?? -500,
        })
      : null;

    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json({ quote, preview });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to build continuous commit quote',
    });
  }
}
