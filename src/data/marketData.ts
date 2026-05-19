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
    priceSource?: 'onchain' | 'indexed';
    liquidityUsd?: number;
    liquiditySource?: 'onchain' | 'indexed';
    volume24hUsd?: number;
    priceChange24h?: number;
    protocolAvax?: bigint;
    protocolCatch?: bigint;
    fallbackAvax?: bigint;
    fallbackCatch?: bigint;
};

export type CatchMarketData = {
    spotPriceUsd?: number;
    spotPriceSource?: 'onchain' | 'indexed' | 'cached';
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

export type OnchainMarketSnapshot = {
    catchTokenAddress?: string;
    wavaxAddress?: string;
    avaxUsd?: number;
    lfj?: {
        pairAddress?: string;
        token0?: string;
        token1?: string;
        reserve0?: bigint;
        reserve1?: bigint;
    };
    pharaoh?: {
        poolAddress?: string;
        token0?: string;
        token1?: string;
        sqrtPriceX96?: bigint;
        catchBalance?: bigint;
        wavaxBalance?: bigint;
    };
};

export type ProtocolLpValue = {
    hasData: boolean;
    avax: number;
    catchAmount: number;
    usd: number;
};

type OnchainPoolMetrics = {
    pairAddress?: string;
    priceUsd?: number;
    liquidityUsd?: number;
};

function parseNumber(value?: string | number) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function sameAddress(left?: string, right?: string) {
    return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function tokenAmount(value?: bigint) {
    if (value === undefined) return undefined;
    const amount = Number(formatUnits(value, 18));
    return Number.isFinite(amount) ? amount : undefined;
}

function usdValue(amount: number | undefined, priceUsd: number | undefined) {
    return amount !== undefined && priceUsd !== undefined && Number.isFinite(priceUsd) && priceUsd > 0
        ? amount * priceUsd
        : 0;
}

function priceUsdFromAvax(catchAmount: number | undefined, wavaxAmount: number | undefined, avaxUsd: number | undefined) {
    if (catchAmount === undefined || catchAmount <= 0) return undefined;
    if (wavaxAmount === undefined || wavaxAmount <= 0) return undefined;
    if (avaxUsd === undefined || avaxUsd <= 0) return undefined;

    const price = (wavaxAmount / catchAmount) * avaxUsd;
    return Number.isFinite(price) && price > 0 ? price : undefined;
}

function liquidityUsdFromAmounts(
    catchAmount: number | undefined,
    wavaxAmount: number | undefined,
    catchPriceUsd: number | undefined,
    avaxUsd: number | undefined,
) {
    const total = usdValue(catchAmount, catchPriceUsd) + usdValue(wavaxAmount, avaxUsd);
    return total > 0 ? total : undefined;
}

function resolveLfJOnchainMetrics(onchain?: OnchainMarketSnapshot): OnchainPoolMetrics {
    const lfj = onchain?.lfj;
    const catchTokenAddress = onchain?.catchTokenAddress;
    const wavaxAddress = onchain?.wavaxAddress;
    if (!lfj || !catchTokenAddress || !wavaxAddress) return {};

    const catchReserve = sameAddress(lfj.token0, catchTokenAddress)
        ? lfj.reserve0
        : sameAddress(lfj.token1, catchTokenAddress)
            ? lfj.reserve1
            : undefined;
    const wavaxReserve = sameAddress(lfj.token0, wavaxAddress)
        ? lfj.reserve0
        : sameAddress(lfj.token1, wavaxAddress)
            ? lfj.reserve1
            : undefined;
    const catchAmount = tokenAmount(catchReserve);
    const wavaxAmount = tokenAmount(wavaxReserve);
    const priceUsd = priceUsdFromAvax(catchAmount, wavaxAmount, onchain.avaxUsd);

    return {
        pairAddress: lfj.pairAddress,
        priceUsd,
        liquidityUsd: liquidityUsdFromAmounts(catchAmount, wavaxAmount, priceUsd, onchain.avaxUsd),
    };
}

function priceAvaxFromSqrtPriceX96(pharaoh: NonNullable<OnchainMarketSnapshot['pharaoh']>, onchain: OnchainMarketSnapshot) {
    if (!pharaoh.sqrtPriceX96 || !onchain.catchTokenAddress || !onchain.wavaxAddress) return undefined;

    const sqrtRatio = Number(pharaoh.sqrtPriceX96) / (2 ** 96);
    const token1PerToken0 = sqrtRatio * sqrtRatio;
    if (!Number.isFinite(token1PerToken0) || token1PerToken0 <= 0) return undefined;

    if (sameAddress(pharaoh.token0, onchain.catchTokenAddress) && sameAddress(pharaoh.token1, onchain.wavaxAddress)) {
        return token1PerToken0;
    }
    if (sameAddress(pharaoh.token0, onchain.wavaxAddress) && sameAddress(pharaoh.token1, onchain.catchTokenAddress)) {
        return 1 / token1PerToken0;
    }

    return undefined;
}

function resolvePharaohOnchainMetrics(onchain?: OnchainMarketSnapshot): OnchainPoolMetrics {
    const pharaoh = onchain?.pharaoh;
    if (!pharaoh) return {};

    const priceAvax = priceAvaxFromSqrtPriceX96(pharaoh, onchain ?? {});
    const priceUsd = priceAvax !== undefined && onchain?.avaxUsd !== undefined
        ? priceAvax * onchain.avaxUsd
        : undefined;
    const catchAmount = tokenAmount(pharaoh.catchBalance);
    const wavaxAmount = tokenAmount(pharaoh.wavaxBalance);

    return {
        pairAddress: pharaoh.poolAddress,
        priceUsd: priceUsd !== undefined && Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : undefined,
        liquidityUsd: liquidityUsdFromAmounts(catchAmount, wavaxAmount, priceUsd, onchain?.avaxUsd),
    };
}

function resolveOnchainMetrics(venue: 'LFJ' | 'Pharaoh', onchain?: OnchainMarketSnapshot) {
    return venue === 'LFJ' ? resolveLfJOnchainMetrics(onchain) : resolvePharaohOnchainMetrics(onchain);
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

function normalizePool(
    venue: 'LFJ' | 'Pharaoh',
    pair?: DexPair,
    fallback?: MarketFallbackLiquidity,
    onchain?: OnchainMarketSnapshot,
): MarketPool {
    const onchainMetrics = resolveOnchainMetrics(venue, onchain);
    const pairPriceUsd = parseNumber(pair?.priceUsd);
    const pairLiquidityUsd = parseNumber(pair?.liquidity?.usd);
    const protocolAvax = venue === 'LFJ' ? fallback?.traderJoeAvaxWei : fallback?.pharaohAvaxWei;
    const protocolCatch = venue === 'LFJ' ? fallback?.traderJoeCatch18 : fallback?.pharaohCatch18;
    const hasLivePoolData = onchainMetrics.priceUsd !== undefined
        || onchainMetrics.liquidityUsd !== undefined
        || pair !== undefined;

    if (hasLivePoolData) {
        return {
            venue,
            status: 'available',
            pairAddress: onchainMetrics.pairAddress ?? pair?.pairAddress,
            url: pair?.url,
            quoteToken: pair?.quoteToken?.symbol ?? (onchainMetrics.priceUsd !== undefined ? 'WAVAX' : undefined),
            priceUsd: onchainMetrics.priceUsd ?? pairPriceUsd,
            priceSource: onchainMetrics.priceUsd !== undefined ? 'onchain' : pairPriceUsd !== undefined ? 'indexed' : undefined,
            liquidityUsd: onchainMetrics.liquidityUsd ?? pairLiquidityUsd,
            liquiditySource: onchainMetrics.liquidityUsd !== undefined ? 'onchain' : pairLiquidityUsd !== undefined ? 'indexed' : undefined,
            volume24hUsd: parseNumber(pair?.volume?.h24),
            priceChange24h: parseNumber(pair?.priceChange?.h24),
            protocolAvax,
            protocolCatch,
        };
    }

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
        onchain?: OnchainMarketSnapshot;
        fetchedAt?: string;
        lastKnownSpotPriceUsd?: number;
    },
): CatchMarketData {
    const lfjPair = choosePair(pairs, 'LFJ', options.lfjPairAddress);
    const pharaohPair = choosePair(pairs, 'Pharaoh', options.pharaohPoolAddress);
    const lfj = normalizePool('LFJ', lfjPair, options.fallback, options.onchain);
    const pharaoh = normalizePool('Pharaoh', pharaohPair, options.fallback, options.onchain);
    let liveSpotPriceUsd = lfj.priceUsd ?? pharaoh.priceUsd;
    let liveSpotPriceSource = lfj.priceSource ?? pharaoh.priceSource;

    if (liveSpotPriceUsd === undefined) {
        liveSpotPriceUsd = pairs.map((pair) => parseNumber(pair.priceUsd)).find((price) => price !== undefined);
        liveSpotPriceSource = liveSpotPriceUsd !== undefined ? 'indexed' : undefined;
    }

    const lastKnownSpotPriceUsd = options.lastKnownSpotPriceUsd !== undefined
        && Number.isFinite(options.lastKnownSpotPriceUsd)
        && options.lastKnownSpotPriceUsd > 0
        ? options.lastKnownSpotPriceUsd
        : undefined;
    const spotPriceUsd = liveSpotPriceUsd ?? lastKnownSpotPriceUsd;
    const spotPriceSource = liveSpotPriceSource ?? (spotPriceUsd !== undefined ? 'cached' : undefined);

    return {
        spotPriceUsd,
        spotPriceSource,
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
