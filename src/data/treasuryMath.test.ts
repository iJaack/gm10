import { describe, expect, it } from 'vitest';
import {
    avaxWeiToUsdt6,
    resolveLiquidTreasuryUsdt6,
    sumTreasuryWalletBalancesUsdt6,
} from './treasuryMath';

const AVAX = 10n ** 18n;

describe('treasury math', () => {
    it('converts native AVAX wallet balances to USDT6 at the current AVAX/USD price', () => {
        expect(avaxWeiToUsdt6(2n * AVAX, 9.29)).toBe(18_580_000n);
    });

    it('sums every configured treasury wallet before formatting the liquid treasury', () => {
        const balances = [
            1_271n * AVAX,
            1n * AVAX,
            0n,
            0n,
            AVAX / 5n,
        ];

        expect(sumTreasuryWalletBalancesUsdt6(balances, 9.29)).toBe(11_818_738_000n);
    });

    it('falls back to stable accounting until all wallet balance reads are available', () => {
        expect(resolveLiquidTreasuryUsdt6({
            walletBalancesWei: [1n * AVAX, undefined],
            avaxUsd: 9.29,
            stableAccountingLiquidTreasury: 8_856_316_567n,
        })).toBe(8_856_316_567n);
    });
});
