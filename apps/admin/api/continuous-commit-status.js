import { normalizeContinuousCommitStatus } from '../server/lib/continuous-commit.js';

export default async function handler(request, response) {
  try {
    const status = normalizeContinuousCommitStatus({
      txHash: request.query?.txHash,
      sourceStatus: request.query?.sourceStatus,
      settled: request.query?.settled === 'true',
      minted: request.query?.minted === 'true',
      delivered: request.query?.delivered === 'true',
      failed: request.query?.failed === 'true',
      quote: request.query?.provider ? request.query : undefined,
    });

    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json(status);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to read continuous commit status',
    });
  }
}
