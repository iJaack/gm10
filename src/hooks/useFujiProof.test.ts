import { describe, expect, it } from 'vitest';
import { LZ_EID_AVALANCHE, LZ_EID_POLYGON } from '../data/gm10Config';
import {
    deriveFujiRoundState,
    resolveCardCustody,
    resolvePositionCurrentValueUsdt6,
    sortPortfolioActivityNewestFirst,
    type Gm10PortfolioActivity,
} from './useFujiProof';

const AVAX_WEI = 10n ** 18n;
const polygonSafe = '0x39971795266a794a8156271729A07994952a6FAD' as const;
const polygonHotWallet = '0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50' as const;

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

    it('uses the published finalized Round 2 fallback when live round reads are unavailable', () => {
        const state = deriveFujiRoundState({
            round2: undefined,
            now: 1_779_000_000,
            roundId: 2,
        });

        expect(state.status).toBe('Finalized');
        expect(state.roundSource).toBe('published');
        expect(state.isPlanned).toBe(false);
        expect(state.isClosed).toBe(true);
        expect(state.isRoundOpen).toBe(false);
        expect(state.round.raisedAmount).toBe(1_353_983_600_000_000_000_000n);
    });

    it('labels an onchain finalized Round 2 as closed even below the original cap', () => {
        const state = deriveFujiRoundState({
            round2: {
                ...round2Terms,
                raisedAmount: 1_353_983_600_000_000_000_000n,
                isActive: false,
                isFinalized: true,
            },
            now: 1_779_000_000,
            fallbackRound: round2Terms,
            roundId: 2,
        });

        expect(state.status).toBe('Finalized');
        expect(state.roundSource).toBe('onchain');
        expect(state.isClosed).toBe(true);
        expect(state.isRoundOpen).toBe(false);
        expect(state.isCapReached).toBe(false);
    });

});

describe('sortPortfolioActivityNewestFirst', () => {
    it('orders portfolio activity by newest acquisition date first', () => {
        const activity: Gm10PortfolioActivity[] = [
            { id: 'buy-9', type: 'Buy', item: 'Older May card', date: 'May 5, 2026', amount: '$5,300.00', detail: 'Polygon position #9', sortTimestamp: 1_778_016_000 },
            { id: 'buy-8', type: 'Buy', item: 'April card', date: 'Apr 24, 2026', amount: '$1,800.00', detail: 'Polygon position #8', sortTimestamp: 1_777_065_600 },
            { id: 'buy-10', type: 'Buy', item: 'Newest May card', date: 'May 19, 2026', amount: '$4,500.00', detail: 'Polygon position #10', sortTimestamp: 1_779_225_600 },
            { id: 'buy-11', type: 'Buy', item: 'Same-day higher id', date: 'May 19, 2026', amount: '$4,700.00', detail: 'Polygon position #11', sortTimestamp: 1_779_225_600 },
        ];

        expect(sortPortfolioActivityNewestFirst(activity).map((item) => item.id)).toEqual([
            'buy-11',
            'buy-10',
            'buy-9',
            'buy-8',
        ]);
    });
});

describe('resolveCardCustody', () => {
    it('labels active Polygon cards in the hot wallet as pending transfer', () => {
        expect(resolveCardCustody({
            chainEid: LZ_EID_POLYGON,
            registryStatus: 1,
            owner: polygonHotWallet,
            safeAddress: polygonSafe,
            hotWalletAddress: polygonHotWallet,
        })).toMatchObject({
            custodyStatus: 'hot-wallet',
            custodyLabel: 'Hot wallet',
            statusLabel: 'PENDING TRANSFER',
            registryStatusLabel: 'Active',
        });
    });

    it('keeps active Polygon Safe-held cards active', () => {
        expect(resolveCardCustody({
            chainEid: LZ_EID_POLYGON,
            registryStatus: 1,
            owner: polygonSafe.toLowerCase(),
            safeAddress: polygonSafe,
            hotWalletAddress: polygonHotWallet,
        })).toMatchObject({
            custodyStatus: 'safe',
            custodyLabel: 'Safe custody',
            statusLabel: 'Active',
        });
    });

    it('does not override non-active registry statuses', () => {
        expect(resolveCardCustody({
            chainEid: LZ_EID_POLYGON,
            registryStatus: 2,
            owner: polygonHotWallet,
            safeAddress: polygonSafe,
            hotWalletAddress: polygonHotWallet,
        })).toMatchObject({
            custodyStatus: 'external',
            statusLabel: 'Sold',
        });
    });

    it('does not mark non-Polygon positions as pending transfer', () => {
        expect(resolveCardCustody({
            chainEid: LZ_EID_AVALANCHE,
            registryStatus: 1,
            owner: polygonHotWallet,
            safeAddress: polygonSafe,
            hotWalletAddress: polygonHotWallet,
        })).toMatchObject({
            custodyStatus: 'unknown',
            statusLabel: 'Active',
        });
    });
});

describe('resolvePositionCurrentValueUsdt6', () => {
    it('uses public valuation overrides for active positions only', () => {
        expect(resolvePositionCurrentValueUsdt6({
            registryStatus: 1,
            registryCurrentValueUsdt6: 900_000000n,
            valuationOverrideValueUsdt6: 1_100_000000n,
        })).toBe(1_100_000000n);

        expect(resolvePositionCurrentValueUsdt6({
            registryStatus: 2,
            registryCurrentValueUsdt6: 0n,
            valuationOverrideValueUsdt6: 1_100_000000n,
        })).toBe(0n);
    });
});
