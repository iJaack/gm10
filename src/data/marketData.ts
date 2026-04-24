import { formatEther, formatUnits } from 'viem';

export type DexPair = {
    chainId?: string;
    dexId?: string;
    pairAddress?: string;
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
    protocolAvax?: bigint;
    protocolCatch?: bigint;
    fallbackAvax?: bigint;
    fallbackCatch?: bigint;
};

export type CatchMarketData = {
    spotPriceUsd?: number;
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

export type ProtocolLpValue = {
    hasData: boolean;
    avax: number;
    catchAmount: number;
    usd: number;
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

function normalizePool(venue: 'LFJ' | 'Pharaoh', pair?: DexPair, fallback?: MarketFallbackLiquidity): MarketPool {
    if (pair) {
        return {
            venue,
            status: 'available',
            pairAddress: pair.pairAddress,
            url: pair.url,
            quoteToken: pair.quoteToken?.symbol,
            priceUsd: parseNumber(pair.priceUsd),
            liquidityUsd: parseNumber(pair.liquidity?.usd),
            volume24hUsd: parseNumber(pair.volume?.h24),
            priceChange24h: parseNumber(pair.priceChange?.h24),
            protocolAvax: venue === 'LFJ' ? fallback?.traderJoeAvaxWei : fallback?.pharaohAvaxWei,
            protocolCatch: venue === 'LFJ' ? fallback?.traderJoeCatch18 : fallback?.pharaohCatch18,
        };
    }

    const protocolAvax = venue === 'LFJ' ? fallback?.traderJoeAvaxWei : fallback?.pharaohAvaxWei;
    const protocolCatch = venue === 'LFJ' ? fallback?.traderJoeCatch18 : fallback?.pharaohCatch18;

    return {
        venue,
        status: 'unavailable',
        protocolAvax,
        protocolCatch,
        fallbackAvax: protocolAvax,
        fallbackCatch: protocolCatch,
    };
}

export function normalizeCatchMarketData(
    pairs: readonly DexPair[],
    options: {
        lfjPairAddress?: string;
        pharaohPoolAddress?: string;
        fallback?: MarketFallbackLiquidity;
        fetchedAt?: string;
    },
): CatchMarketData {
    const lfjPair = choosePair(pairs, 'LFJ', options.lfjPairAddress);
    const pharaohPair = choosePair(pairs, 'Pharaoh', options.pharaohPoolAddress);
    const lfj = normalizePool('LFJ', lfjPair, options.fallback);
    const pharaoh = normalizePool('Pharaoh', pharaohPair, options.fallback);
    const spotPriceUsd = lfj.priceUsd ?? pharaoh.priceUsd ?? pairs.map((pair) => parseNumber(pair.priceUsd)).find((price) => price !== undefined);

    return {
        spotPriceUsd,
        lfj,
        pharaoh,
        fetchedAt: options.fetchedAt,
        status: spotPriceUsd !== undefined || lfj.status === 'available' || pharaoh.status === 'available' ? 'available' : 'unavailable',
    };
}

export function resolveProtocolLpValue(pool: MarketPool, avaxUsd: number): ProtocolLpValue {
    const avaxWei = pool.protocolAvax ?? pool.fallbackAvax;
    const catchWei = pool.protocolCatch ?? pool.fallbackCatch;
    const hasAvax = avaxWei !== undefined;
    const hasCatch = catchWei !== undefined;
    const avax = hasAvax ? Number(formatEther(avaxWei)) : 0;
    const catchAmount = hasCatch ? Number(formatUnits(catchWei, 18)) : 0;
    const avaxUsdValue = avaxUsd > 0 ? avax * avaxUsd : 0;
    const catchUsdValue = pool.priceUsd !== undefined ? catchAmount * pool.priceUsd : 0;

    return {
        hasData: hasAvax || hasCatch,
        avax,
        catchAmount,
        usd: avaxUsdValue + catchUsdValue,
    };
}
