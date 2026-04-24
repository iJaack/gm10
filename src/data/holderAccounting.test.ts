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

    it('preserves explicit onchain profit eligibility when the contract exposes it', () => {
        const accounting = resolveHolderAccounting({
            totalSupply: 1_000n,
            profitEligibleSupply: 777n,
            excludedBalances: [500n],
        });

        expect(accounting.profitEligibleSupply).toBe(777n);
        expect(accounting.excludedSupply).toBe(500n);
    });

    it('falls back to live NAV and zero deposited profit for the current V6 upgrade surface', () => {
        const accounting = resolveHolderAccounting({
            navPerToken: 22_773n,
            hasProfitDistributor: false,
        });

        expect(accounting.referenceNav).toBe(22_773n);
        expect(accounting.totalProfitDeposited).toBe(0n);
    });

    it('keeps profit deposited unavailable while a distributor read is expected but missing', () => {
        const accounting = resolveHolderAccounting({
            hasProfitDistributor: true,
        });

        expect(accounting.totalProfitDeposited).toBeUndefined();
    });
});
