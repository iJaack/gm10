import { describe, expect, it } from 'vitest';
import { getClaimEligibilityState } from './claimState';

describe('claim eligibility state', () => {
    it('blocks disconnected wallets', () => {
        expect(getClaimEligibilityState({
            isConnected: false,
            claimableProfitWei: 1n,
            hasClaimAction: true,
        })).toEqual({
            canClaim: false,
            reason: 'Connect a wallet to check realized profit.',
        });
    });

    it('blocks excluded accounts', () => {
        const state = getClaimEligibilityState({
            isConnected: true,
            isExcluded: true,
            claimableProfitWei: 1n,
            hasClaimAction: true,
        });

        expect(state.canClaim).toBe(false);
        expect(state.reason).toMatch(/excluded/i);
    });

    it('blocks zero claimable profit', () => {
        const state = getClaimEligibilityState({
            isConnected: true,
            claimableProfitWei: 0n,
            hasClaimAction: true,
        });

        expect(state.canClaim).toBe(false);
        expect(state.reason).toMatch(/no realized sale profit/i);
    });

    it('blocks missing claim action even when profit is positive', () => {
        const state = getClaimEligibilityState({
            isConnected: true,
            claimableProfitWei: 1n,
            hasClaimAction: false,
        });

        expect(state.canClaim).toBe(false);
        expect(state.reason).toMatch(/not configured/i);
    });

    it('enables only when connected, eligible, claimable, and configured', () => {
        const state = getClaimEligibilityState({
            isConnected: true,
            isExcluded: false,
            claimableProfitWei: 1n,
            hasClaimAction: true,
        });

        expect(state.canClaim).toBe(true);
    });
});
