import { useEffect, useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useReadContracts } from 'wagmi';
import {
    CHAINLINK_AGGREGATOR_V3_ABI,
    GM10_ERC20_ABI,
    GM10_LFJ_PAIR_ABI,
    GM10_LIQUIDITY_COORDINATOR_ABI,
    GM10_PHARAOH_POOL_ABI,
} from '../data/contracts';
import { GM10_MARKET_CONFIG } from '../data/gm10Config';
import { normalizeCatchMarketData, type DexPair } from '../data/marketData';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const CATCH_MARKET_PRICE_CACHE_KEY = 'gm10.catch.lastKnownSpotPriceUsd';

function readCachedSpotPriceUsd() {
    if (typeof window === 'undefined') return undefined;

    try {
        const raw = window.localStorage.getItem(CATCH_MARKET_PRICE_CACHE_KEY);
        if (!raw) return undefined;
        const price = Number(raw);
        return Number.isFinite(price) && price > 0 ? price : undefined;
    } catch {
        return undefined;
    }
}

function writeCachedSpotPriceUsd(price: number) {
    if (typeof window === 'undefined' || !Number.isFinite(price) || price <= 0) return;

    try {
        window.localStorage.setItem(CATCH_MARKET_PRICE_CACHE_KEY, String(price));
    } catch {
        // Storage may be unavailable in private browsing or tests.
    }
}

export function useCatchMarketData() {
    const [pairs, setPairs] = useState<readonly DexPair[]>([]);
    const [fetchedAt, setFetchedAt] = useState<string>();
    const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
    const [cachedSpotPriceUsd, setCachedSpotPriceUsd] = useState<number | undefined>(() => (
        readCachedSpotPriceUsd() ?? GM10_MARKET_CONFIG.lastKnownSpotPriceUsd
    ));

    const liquidityAddress = GM10_MARKET_CONFIG.liquidityCoordinatorAddress ?? ZERO_ADDRESS;
    const { data: liquidityReads } = useReadContracts({
        contracts: [
            { address: liquidityAddress, abi: GM10_LIQUIDITY_COORDINATOR_ABI, functionName: 'traderJoeLpDeployedAvaxWei' },
            { address: liquidityAddress, abi: GM10_LIQUIDITY_COORDINATOR_ABI, functionName: 'traderJoeLpTokenDeployed18' },
            { address: liquidityAddress, abi: GM10_LIQUIDITY_COORDINATOR_ABI, functionName: 'pharaohLpDeployedAvaxWei' },
            { address: liquidityAddress, abi: GM10_LIQUIDITY_COORDINATOR_ABI, functionName: 'pharaohLpTokenDeployed18' },
        ],
        query: { enabled: Boolean(GM10_MARKET_CONFIG.liquidityCoordinatorAddress) },
    });
    const lfjPairAddress = GM10_MARKET_CONFIG.lfjPairAddress ?? ZERO_ADDRESS;
    const pharaohPoolAddress = GM10_MARKET_CONFIG.pharaohPoolAddress ?? ZERO_ADDRESS;
    const catchTokenAddress = GM10_MARKET_CONFIG.catchTokenAddress ?? ZERO_ADDRESS;
    const wavaxAddress = GM10_MARKET_CONFIG.wavaxAddress ?? ZERO_ADDRESS;
    const avaxUsdFeedAddress = GM10_MARKET_CONFIG.avaxUsdFeedAddress ?? ZERO_ADDRESS;
    const { data: onchainReads } = useReadContracts({
        contracts: [
            { address: lfjPairAddress, abi: GM10_LFJ_PAIR_ABI, functionName: 'token0' },
            { address: lfjPairAddress, abi: GM10_LFJ_PAIR_ABI, functionName: 'token1' },
            { address: lfjPairAddress, abi: GM10_LFJ_PAIR_ABI, functionName: 'getReserves' },
            { address: pharaohPoolAddress, abi: GM10_PHARAOH_POOL_ABI, functionName: 'token0' },
            { address: pharaohPoolAddress, abi: GM10_PHARAOH_POOL_ABI, functionName: 'token1' },
            { address: pharaohPoolAddress, abi: GM10_PHARAOH_POOL_ABI, functionName: 'slot0' },
            { address: catchTokenAddress, abi: GM10_ERC20_ABI, functionName: 'balanceOf', args: [pharaohPoolAddress] },
            { address: wavaxAddress, abi: GM10_ERC20_ABI, functionName: 'balanceOf', args: [pharaohPoolAddress] },
            { address: avaxUsdFeedAddress, abi: CHAINLINK_AGGREGATOR_V3_ABI, functionName: 'latestRoundData' },
        ],
        query: {
            enabled: Boolean(
                GM10_MARKET_CONFIG.lfjPairAddress
                && GM10_MARKET_CONFIG.pharaohPoolAddress
                && GM10_MARKET_CONFIG.catchTokenAddress
                && GM10_MARKET_CONFIG.wavaxAddress
                && GM10_MARKET_CONFIG.avaxUsdFeedAddress,
            ),
        },
    });

    useEffect(() => {
        if (!GM10_MARKET_CONFIG.dexscreenerTokenUrl) return;
        const controller = new AbortController();

        async function loadMarketData() {
            try {
                setFetchStatus('loading');
                const response = await fetch(GM10_MARKET_CONFIG.dexscreenerTokenUrl!, {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error(`Market data returned ${response.status}`);
                const payload = await response.json() as { pairs?: DexPair[] };
                setPairs(payload.pairs ?? []);
                setFetchedAt(new Date().toISOString());
                setFetchStatus('ready');
            } catch {
                if (!controller.signal.aborted) setFetchStatus('failed');
            }
        }

        void loadMarketData();

        return () => controller.abort();
    }, []);

    const fallback = useMemo(() => ({
        traderJoeAvaxWei: liquidityReads?.[0]?.status === 'success' ? liquidityReads[0].result as bigint : undefined,
        traderJoeCatch18: liquidityReads?.[1]?.status === 'success' ? liquidityReads[1].result as bigint : undefined,
        pharaohAvaxWei: liquidityReads?.[2]?.status === 'success' ? liquidityReads[2].result as bigint : undefined,
        pharaohCatch18: liquidityReads?.[3]?.status === 'success' ? liquidityReads[3].result as bigint : undefined,
    }), [liquidityReads]);

    const onchain = useMemo(() => {
        const result = <T,>(index: number) => (
            onchainReads?.[index]?.status === 'success' ? onchainReads[index].result as T : undefined
        );
        const lfjReserves = result<readonly [bigint, bigint, number]>(2);
        const pharaohSlot0 = result<readonly [bigint, number, number, number, number, number, boolean]>(5);
        const avaxUsdRoundData = result<readonly [bigint, bigint, bigint, bigint, bigint]>(8);
        const avaxUsd = avaxUsdRoundData?.[1] !== undefined && avaxUsdRoundData[1] > 0n
            ? Number(formatUnits(avaxUsdRoundData[1], 8))
            : undefined;

        return {
            catchTokenAddress: GM10_MARKET_CONFIG.catchTokenAddress,
            wavaxAddress: GM10_MARKET_CONFIG.wavaxAddress,
            avaxUsd,
            lfj: {
                pairAddress: GM10_MARKET_CONFIG.lfjPairAddress,
                token0: result<string>(0),
                token1: result<string>(1),
                reserve0: lfjReserves?.[0],
                reserve1: lfjReserves?.[1],
            },
            pharaoh: {
                poolAddress: GM10_MARKET_CONFIG.pharaohPoolAddress,
                token0: result<string>(3),
                token1: result<string>(4),
                sqrtPriceX96: pharaohSlot0?.[0],
                catchBalance: result<bigint>(6),
                wavaxBalance: result<bigint>(7),
            },
        };
    }, [onchainReads]);

    const marketData = useMemo(() => (
        normalizeCatchMarketData(pairs, {
            lfjPairAddress: GM10_MARKET_CONFIG.lfjPairAddress,
            pharaohPoolAddress: GM10_MARKET_CONFIG.pharaohPoolAddress,
            fallback,
            onchain,
            fetchedAt,
            lastKnownSpotPriceUsd: cachedSpotPriceUsd,
        })
    ), [cachedSpotPriceUsd, fallback, fetchedAt, onchain, pairs]);

    useEffect(() => {
        if (marketData.spotPriceSource === 'cached' || marketData.spotPriceUsd === undefined) return;

        writeCachedSpotPriceUsd(marketData.spotPriceUsd);
        setCachedSpotPriceUsd((current) => (
            current === marketData.spotPriceUsd ? current : marketData.spotPriceUsd
        ));
    }, [marketData.spotPriceSource, marketData.spotPriceUsd]);

    return {
        ...marketData,
        isLoading: fetchStatus === 'idle' || fetchStatus === 'loading',
        error: fetchStatus === 'failed' ? 'Market data unavailable' : undefined,
    };
}
