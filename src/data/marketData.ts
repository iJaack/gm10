export type DexPair = {
    chainId?: string;
    dexId?: string;
    pairAddress?: string;
    pairCreatedAt?: number;
    url?: string;
    priceUsd?: string;
    baseToken?: { symbol?: string; address?: string };
    quoteToken?: { symbol?: string; address?: string };
    liquidity?: { usd?: number; base?: number; quote?: number };
    volume?: { h24?: number };
    priceChange?: { h24?: number };
};

export type MarketPool = {
    venue: 'LFJ' | 'Pharaoh';
    status: 'available' | 'unavailable';
    pairAddress?: string;
    url?: string;
    quoteToken?: string;
    priceUsd?: number;
    liquidityUsd?: number;
    volume24hUsd?: number;
    priceChange24h?: number;
    hasReliable24hChange?: boolean;
    fallbackAvax?: bigint;
    fallbackCatch?: bigint;
};

export type CatchMarketData = {
    spotPriceUsd?: number;
    priceChange24h?: number;
    lfj: MarketPool;
    pharaoh: MarketPool;
    fetchedAt?: string;
    status: 'available' | 'unavailable';
};

export type MarketFallbackLiquidity = {
    traderJoeAvaxWei?: bigint;
    traderJoeCatch18?: bigint;
    pharaohAvaxWei?: bigint;
    pharaohCatch18?: bigint;
};

function parseNumber(value?: string | number) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function sameAddress(left?: string, right?: string) {
    return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function pairMatchesVenue(pair: DexPair, venue: 'LFJ' | 'Pharaoh') {
    const dexId = pair.dexId?.toLowerCase() ?? '';
    const url = pair.url?.toLowerCase() ?? '';

    if (venue === 'LFJ') {
        return dexId.includes('traderjoe') || dexId.includes('joe') || dexId.includes('lfj') || url.includes('lfj');
    }

    return dexId.includes('pharaoh') || url.includes('pharaoh');
}

function choosePair(
    pairs: readonly DexPair[],
    venue: 'LFJ' | 'Pharaoh',
    configuredAddress?: string,
) {
    const avalanchePairs = pairs.filter((pair) => !pair.chainId || pair.chainId.toLowerCase() === 'avalanche');
    const configured = avalanchePairs.find((pair) => sameAddress(pair.pairAddress, configuredAddress));
    if (configured) return configured;

    return avalanchePairs
        .filter((pair) => pairMatchesVenue(pair, venue))
        .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function hasReliable24hChange(pair: DexPair, nowMs: number) {
    if (!pair.pairCreatedAt) return true;
    return nowMs - pair.pairCreatedAt >= ONE_DAY_MS;
}

function weightedPriceChange(pools: readonly MarketPool[]) {
    const available = pools.filter((pool) => pool.priceChange24h !== undefined);
    if (!available.length) return undefined;

    const totalWeight = available.reduce((sum, pool) => {
        const weight = pool.volume24hUsd && pool.volume24hUsd > 0
            ? pool.volume24hUsd
            : pool.liquidityUsd && pool.liquidityUsd > 0
                ? pool.liquidityUsd
                : 1;
        return sum + weight;
    }, 0);

    return available.reduce((sum, pool) => {
        const weight = pool.volume24hUsd && pool.volume24hUsd > 0
            ? pool.volume24hUsd
            : pool.liquidityUsd && pool.liquidityUsd > 0
                ? pool.liquidityUsd
                : 1;
        return sum + (pool.priceChange24h ?? 0) * (weight / totalWeight);
    }, 0);
}

function normalizePool(
    venue: 'LFJ' | 'Pharaoh',
    pair: DexPair | undefined,
    fallback: MarketFallbackLiquidity | undefined,
    nowMs: number,
): MarketPool {
    if (pair) {
        const reliable24h = hasReliable24hChange(pair, nowMs);
        return {
            venue,
            status: 'available',
            pairAddress: pair.pairAddress,
            url: pair.url,
            quoteToken: pair.quoteToken?.symbol,
            priceUsd: parseNumber(pair.priceUsd),
            liquidityUsd: parseNumber(pair.liquidity?.usd),
            volume24hUsd: parseNumber(pair.volume?.h24),
            priceChange24h: reliable24h ? parseNumber(pair.priceChange?.h24) : undefined,
            hasReliable24hChange: reliable24h,
        };
    }

    return {
        venue,
        status: 'unavailable',
        fallbackAvax: venue === 'LFJ' ? fallback?.traderJoeAvaxWei : fallback?.pharaohAvaxWei,
        fallbackCatch: venue === 'LFJ' ? fallback?.traderJoeCatch18 : fallback?.pharaohCatch18,
    };
}

export function normalizeCatchMarketData(
    pairs: readonly DexPair[],
    options: {
        lfjPairAddress?: string;
        pharaohPoolAddress?: string;
        fallback?: MarketFallbackLiquidity;
        fetchedAt?: string;
        nowMs?: number;
    },
): CatchMarketData {
    const nowMs = options.nowMs ?? Date.now();
    const lfjPair = choosePair(pairs, 'LFJ', options.lfjPairAddress);
    const pharaohPair = choosePair(pairs, 'Pharaoh', options.pharaohPoolAddress);
    const lfj = normalizePool('LFJ', lfjPair, options.fallback, nowMs);
    const pharaoh = normalizePool('Pharaoh', pharaohPair, options.fallback, nowMs);
    const spotPriceUsd = lfj.priceUsd ?? pharaoh.priceUsd ?? pairs.map((pair) => parseNumber(pair.priceUsd)).find((price) => price !== undefined);

    return {
        spotPriceUsd,
        priceChange24h: weightedPriceChange([lfj, pharaoh]),
        lfj,
        pharaoh,
        fetchedAt: options.fetchedAt,
        status: spotPriceUsd !== undefined || lfj.status === 'available' || pharaoh.status === 'available' ? 'available' : 'unavailable',
    };
}
