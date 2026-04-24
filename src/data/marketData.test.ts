import { describe, expect, it } from 'vitest';
import { normalizeCatchMarketData, type DexPair } from './marketData';

const pairs: DexPair[] = [
    {
        chainId: 'avalanche',
        dexId: 'traderjoe',
        pairAddress: '0x1111111111111111111111111111111111111111',
        priceUsd: '0.022',
        quoteToken: { symbol: 'AVAX' },
        liquidity: { usd: 10_000 },
        volume: { h24: 500 },
        priceChange: { h24: 1.5 },
    },
    {
        chainId: 'avalanche',
        dexId: 'pharaoh',
        pairAddress: '0x2222222222222222222222222222222222222222',
        priceUsd: '0.023',
        quoteToken: { symbol: 'USDC' },
        liquidity: { usd: 8_000 },
        volume: { h24: 250 },
        priceChange: { h24: -0.4 },
    },
];

describe('market data normalization', () => {
    it('selects LFJ and Pharaoh pools from token pairs', () => {
        const market = normalizeCatchMarketData(pairs, { fetchedAt: '2026-04-15T22:00:00.000Z' });

        expect(market.status).toBe('available');
        expect(market.spotPriceUsd).toBe(0.022);
        expect(market.lfj.status).toBe('available');
        expect(market.lfj.pairAddress).toBe('0x1111111111111111111111111111111111111111');
        expect(market.pharaoh.status).toBe('available');
        expect(market.pharaoh.pairAddress).toBe('0x2222222222222222222222222222222222222222');
    });

    it('keeps protocol LP counters alongside available DEX pool data', () => {
        const market = normalizeCatchMarketData(pairs, {
            fallback: {
                traderJoeAvaxWei: 1n,
                traderJoeCatch18: 2n,
                pharaohAvaxWei: 3n,
                pharaohCatch18: 4n,
            },
        });

        expect(market.lfj.liquidityUsd).toBe(10_000);
        expect(market.lfj.protocolAvax).toBe(1n);
        expect(market.pharaoh.protocolCatch).toBe(4n);
    });

    it('uses configured pair addresses before venue matching', () => {
        const market = normalizeCatchMarketData(pairs, {
            lfjPairAddress: '0x2222222222222222222222222222222222222222',
        });

        expect(market.lfj.pairAddress).toBe('0x2222222222222222222222222222222222222222');
    });

    it('falls back to protocol liquidity totals when DEX data is missing', () => {
        const market = normalizeCatchMarketData([], {
            fallback: {
                traderJoeAvaxWei: 1n,
                traderJoeCatch18: 2n,
                pharaohAvaxWei: 3n,
                pharaohCatch18: 4n,
            },
        });

        expect(market.status).toBe('unavailable');
        expect(market.lfj.fallbackAvax).toBe(1n);
        expect(market.pharaoh.fallbackCatch).toBe(4n);
    });
});
