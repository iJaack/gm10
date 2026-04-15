import { describe, expect, it } from 'vitest';
import { calculatePortfolioValueSummary, dollarsToUsdt6 } from './portfolioMath';

describe('portfolio value summary', () => {
    it('separates cost basis, onchain mark, platform NAV, and unrealized P/L', () => {
        const summary = calculatePortfolioValueSummary([
            { acquisitionPriceUsdt6: 96_000000n, currentValueUsdt6: 100_000000n },
            { acquisitionPriceUsdt6: 250_000000n, currentValueUsdt6: 260_000000n },
        ], { status: 'available', netWorthUsd: 400 });

        expect(summary.costBasisUsdt6).toBe(346_000000n);
        expect(summary.onchainCurrentMarkUsdt6).toBe(360_000000n);
        expect(summary.platformNavUsdt6).toBe(400_000000n);
        expect(summary.unrealizedPnlUsdt6).toBe(54_000000n);
        expect(summary.unrealizedSource).toBe('courtyard');
    });

    it('falls back to onchain current marks when platform NAV is unavailable', () => {
        const summary = calculatePortfolioValueSummary([
            { acquisitionPriceUsdt6: 250_000000n, currentValueUsdt6: 240_000000n },
        ], { status: 'unavailable' });

        expect(summary.platformNavUsdt6).toBeUndefined();
        expect(summary.unrealizedPnlUsdt6).toBe(-10_000000n);
        expect(summary.unrealizedSource).toBe('onchain');
    });

    it('rejects invalid dollar inputs', () => {
        expect(dollarsToUsdt6(-1)).toBeUndefined();
        expect(dollarsToUsdt6(Number.NaN)).toBeUndefined();
    });
});
