import { describe, expect, it } from 'vitest';
import { LZ_EID_AVALANCHE, LZ_EID_POLYGON } from '../data/gm10Config';
import {
    deriveFujiRoundState,
    isPortfolioHoldingStatus,
    resolvePortfolioActivityForPosition,
    resolveCardCustody,
    resolvePortfolioActivityType,
    resolvePortfolioSaleActivityFromLogs,
    resolveSaleActivityBlockRange,
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

describe('resolvePortfolioActivityType', () => {
    it('renders sold registry positions as sale events in the activity ledger', () => {
        expect(resolvePortfolioActivityType('Sold')).toBe('Sell');
        expect(resolvePortfolioActivityType('Archived')).toBe('Sell');
        expect(resolvePortfolioActivityType('Active')).toBe('Buy');
    });
});

describe('resolvePortfolioActivityForPosition', () => {
    it('tracks a sold card as separate buy and sell activity events', () => {
        const activity = resolvePortfolioActivityForPosition({
            positionId: 1,
            title: 'Gengar VMAX',
            chain: 'Polygon',
            registryStatusLabel: 'Sold',
            acquisition: '$96.00',
            acquisitionDateLabel: 'Apr 15, 2026',
            acquisitionTimestamp: 1_776_211_200,
            currentValue: '$0.00',
            lastValuationLabel: 'Apr 21, 2026',
            lastValuationTimestamp: 1_776_729_600,
        }, {
            saleKey: `0x${'2'.repeat(64)}`,
            netProceedsUsdt6: 999_000000n,
            finalizedAt: 1_776_729_600,
            blockNumber: 87_665_491n,
            logIndex: 12,
        });

        expect(activity).toEqual([
            {
                id: 'buy-1',
                type: 'Buy',
                item: 'Gengar VMAX',
                date: 'Apr 15, 2026',
                amount: '$96.00',
                detail: 'Polygon position #1',
                sortTimestamp: 1_776_211_200,
            },
            {
                id: 'sell-1',
                type: 'Sell',
                item: 'Gengar VMAX',
                date: 'Apr 21, 2026',
                amount: '$999.00',
                detail: 'Polygon position #1 settled net proceeds',
                sortTimestamp: 1_776_729_600,
            },
        ]);
    });

    it('does not present a missing sale event as a zero-dollar sale', () => {
        const activity = resolvePortfolioActivityForPosition({
            positionId: 7,
            title: 'Pikachu & Zekrom GX',
            chain: 'Polygon',
            registryStatusLabel: 'Sold',
            acquisition: '$999.00',
            acquisitionDateLabel: 'Apr 21, 2026',
            acquisitionTimestamp: 1_776_729_600,
            currentValue: '$0.00',
            lastValuationLabel: 'Jun 7, 2026',
            lastValuationTimestamp: 1_780_790_400,
        });

        expect(activity[1]).toMatchObject({
            id: 'sell-7',
            type: 'Sell',
            amount: 'Syncing',
            detail: 'Polygon position #7 sale price syncing from registry',
        });
        expect(activity[1].amount).not.toBe('$0.00');
    });
});

describe('resolvePortfolioSaleActivityFromLogs', () => {
    it('derives finalized sale proceeds from portfolio registry logs', () => {
        const saleKey = `0x${'1'.repeat(64)}` as `0x${string}`;
        const activity = resolvePortfolioSaleActivityFromLogs([{
            args: {
                saleKey,
                positionId: 1n,
                netProceedsUsdt6: 150_000000n,
            },
            blockNumber: 87_665_491n,
            logIndex: 12,
        }], { '87665491': 1_781_104_279n });

        expect(activity[1]).toEqual({
            saleKey,
            netProceedsUsdt6: 150_000000n,
            finalizedAt: 1_781_104_279,
            blockNumber: 87_665_491n,
            logIndex: 12,
        });
    });

    it('keeps the latest finalized sale log for a position', () => {
        const activity = resolvePortfolioSaleActivityFromLogs([
            {
                args: { positionId: 1n, netProceedsUsdt6: 1n },
                blockNumber: 10n,
                logIndex: 5,
            },
            {
                args: { positionId: 1n, netProceedsUsdt6: 2n },
                blockNumber: 10n,
                logIndex: 6,
            },
        ], { '10': 123n });

        expect(activity[1]).toMatchObject({
            netProceedsUsdt6: 2n,
            finalizedAt: 123,
            blockNumber: 10n,
            logIndex: 6,
        });
    });
});

describe('resolveSaleActivityBlockRange', () => {
    it('uses narrow onchain log windows for known finalized sale blocks', () => {
        expect(resolveSaleActivityBlockRange(7, 87_682_496n)).toEqual({
            fromBlock: 87_354_190n,
            toBlock: 87_354_254n,
        });
    });

    it('caps unhinted sale log lookups to a recent fallback range', () => {
        expect(resolveSaleActivityBlockRange(12, 87_682_496n)).toEqual({
            fromBlock: 87_582_496n,
            toBlock: 87_682_496n,
        });
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

describe('isPortfolioHoldingStatus', () => {
    it('keeps only active registry positions in the public portfolio', () => {
        expect(isPortfolioHoldingStatus(1)).toBe(true);
        expect(isPortfolioHoldingStatus(2)).toBe(false);
        expect(isPortfolioHoldingStatus(3)).toBe(false);
        expect(isPortfolioHoldingStatus(0)).toBe(false);
    });
});
