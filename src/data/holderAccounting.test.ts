import { describe, expect, it } from 'vitest';
import { resolveHolderAccounting } from './holderAccounting';

describe('holder accounting fallback resolution', () => {
    it('derives profit-eligible supply from total supply and excluded balances when upgrade helpers are absent', () => {
        const accounting = resolveHolderAccounting({
            totalSupply: 568_471_504761904761904732n,
            excludedBalances: [
                8_229_802848780784936340n,
                36_645_848322699796190612n,
                2n,
            ],
        });

        expect(accounting.profitEligibleSupply).toBe(523_595_853590424180777778n);
        expect(accounting.excludedSupply).toBe(44_875_651171480581126954n);
    });

    it('derives V6 holder accounting without trusting removed legacy helper values', () => {
        const accounting = resolveHolderAccounting({
            totalSupply: 1_000n,
            excludedBalances: [500n],
            navPerToken: 22_773n,
            profitEligibleSupply: 777n,
            referenceNav: 99_999n,
            totalProfitDeposited: 12n,
            hasProfitDistributor: true,
        });

        expect(accounting.profitEligibleSupply).toBe(500n);
        expect(accounting.excludedSupply).toBe(500n);
        expect(accounting.referenceNav).toBe(22_773n);
        expect(accounting.totalProfitDeposited).toBe(0n);
    });

    it('falls back to live NAV and zero deposited profit for the current V6 upgrade surface', () => {
        const accounting = resolveHolderAccounting({
            navPerToken: 22_773n,
            hasProfitDistributor: false,
        });

        expect(accounting.referenceNav).toBe(22_773n);
        expect(accounting.totalProfitDeposited).toBe(0n);
    });

    it('defaults deposited holder profit to zero while the public claim module is absent', () => {
        const accounting = resolveHolderAccounting({});

        expect(accounting.totalProfitDeposited).toBe(0n);
    });

    it('clamps derived profit-eligible supply at zero when excluded balances exceed total supply', () => {
        const accounting = resolveHolderAccounting({
            totalSupply: 100n,
            excludedBalances: [75n, 50n],
        });

        expect(accounting.profitEligibleSupply).toBe(0n);
        expect(accounting.excludedSupply).toBe(125n);
    });

    it('keeps profit-eligible supply undefined until total supply is available', () => {
        const accounting = resolveHolderAccounting({
            excludedBalances: [25n, 50n],
            navPerToken: 22_773n,
        });

        expect(accounting.profitEligibleSupply).toBeUndefined();
        expect(accounting.excludedSupply).toBe(75n);
        expect(accounting.referenceNav).toBe(22_773n);
        expect(accounting.totalProfitDeposited).toBe(0n);
    });
});
