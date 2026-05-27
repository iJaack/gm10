import { buildContinuousCommitRoute } from '../apps/admin/server/lib/lifi.js';

export default async function handler(request, response) {
    try {
        const route = await buildContinuousCommitRoute({
            fromChainId: request.query?.fromChainId,
            fromToken: request.query?.fromToken,
            fromAmountRaw: request.query?.fromAmountRaw,
            fromAddress: request.query?.fromAddress,
            escrowAddress: request.query?.escrowAddress,
            settlementAddress: request.query?.settlementAddress,
            settlementToken: request.query?.settlementToken,
        });
        response.setHeader('Cache-Control', 'no-store');
        response.status(200).json(route);
    } catch (error) {
        response.status(400).json({
            error: error instanceof Error ? error.message : 'Unable to quote continuous commit route',
        });
    }
}
