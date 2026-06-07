import { describe, expect, it } from 'vitest';
import { calculatePortfolioValueSummary, dollarsToUsdt6 } from './portfolioMath';

describe('portfolio value summary', () => {
    it('separates cost basis, card marks, platform NAV, cash, and strategy P/L', () => {
        const summary = calculatePortfolioValueSummary([
            { acquisitionPriceUsdt6: 96_000000n, currentValueUsdt6: 100_000000n },
            { acquisitionPriceUsdt6: 250_000000n, currentValueUsdt6: 260_000000n },
        ], { status: 'available', netWorthUsd: 400 }, { liquidTreasuryUsdt6: 40_000000n });

        expect(summary.costBasisUsdt6).toBe(346_000000n);
        expect(summary.onchainCurrentMarkUsdt6).toBe(360_000000n);
        expect(summary.platformNavUsdt6).toBe(400_000000n);
        expect(summary.strategyCurrentValueUsdt6).toBe(440_000000n);
        expect(summary.unrealizedPnlUsdt6).toBe(94_000000n);
        expect(summary.unrealizedPnlPercent).toBeCloseTo(27.1676, 4);
        expect(summary.unrealizedPnlDirection).toBe('up');
        expect(summary.unrealizedSource).toBe('courtyard');
    });

    it('falls back to onchain current marks when platform NAV is unavailable', () => {
        const summary = calculatePortfolioValueSummary([
            { acquisitionPriceUsdt6: 250_000000n, currentValueUsdt6: 240_000000n },
        ], { status: 'unavailable' });

        expect(summary.platformNavUsdt6).toBeUndefined();
        expect(summary.strategyCurrentValueUsdt6).toBe(240_000000n);
        expect(summary.unrealizedPnlUsdt6).toBe(-10_000000n);
        expect(summary.unrealizedPnlPercent).toBe(-4);
        expect(summary.unrealizedPnlDirection).toBe('down');
        expect(summary.unrealizedSource).toBe('onchain');
    });

    it('keeps zero cost basis P/L percentage flat', () => {
        const summary = calculatePortfolioValueSummary([], { status: 'unavailable' });

        expect(summary.unrealizedPnlPercent).toBe(0);
        expect(summary.unrealizedPnlDirection).toBe('flat');
    });

    it('rejects invalid dollar inputs', () => {
        expect(dollarsToUsdt6(-1)).toBeUndefined();
        expect(dollarsToUsdt6(Number.NaN)).toBeUndefined();
    });
});
