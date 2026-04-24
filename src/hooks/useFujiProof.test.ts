import { describe, expect, it } from 'vitest';
import { deriveFujiRoundState } from './useFujiProof';

const AVAX_WEI = 10n ** 18n;

const round2Terms = {
    roundId: 2n,
    targetAmount: 5_000n * AVAX_WEI,
    raisedAmount: 0n,
    tokenPrice: 3_500_000_000_000_000n,
    minInvestment: AVAX_WEI / 10n,
    maxInvestment: 500n * AVAX_WEI,
    startTime: 1_776_351_600n,
    endTime: 1_778_943_600n,
    isActive: false,
    isFinalized: false,
};

describe('deriveFujiRoundState', () => {
    it('labels planned round 2 as setup in progress during the configured window', () => {
        const state = deriveFujiRoundState({
            round2: undefined,
            now: 1_777_000_000,
            fallbackRound: round2Terms,
            roundId: 2,
        });

        expect(state.status).toBe('Round 2 setup in progress');
        expect(state.isPlanned).toBe(true);
        expect(state.isUpcoming).toBe(false);
        expect(state.isClosed).toBe(false);
        expect(state.isRoundOpen).toBe(false);
    });

});
