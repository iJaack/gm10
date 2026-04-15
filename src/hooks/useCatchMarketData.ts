import { useEffect, useMemo, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { GM10_LIQUIDITY_COORDINATOR_ABI } from '../data/contracts';
import { GM10_MARKET_CONFIG } from '../data/gm10Config';
import { normalizeCatchMarketData, type CatchMarketData, type DexPair } from '../data/marketData';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const unavailableMarket: CatchMarketData = {
    status: 'unavailable',
    lfj: { venue: 'LFJ', status: 'unavailable' },
    pharaoh: { venue: 'Pharaoh', status: 'unavailable' },
};

export function useCatchMarketData() {
    const [pairs, setPairs] = useState<readonly DexPair[]>([]);
    const [fetchedAt, setFetchedAt] = useState<string>();
    const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');

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

    const marketData = useMemo(() => {
        if (!pairs.length && fetchStatus === 'idle') return unavailableMarket;

        return normalizeCatchMarketData(pairs, {
            lfjPairAddress: GM10_MARKET_CONFIG.lfjPairAddress,
            pharaohPoolAddress: GM10_MARKET_CONFIG.pharaohPoolAddress,
            fallback,
            fetchedAt,
        });
    }, [fallback, fetchedAt, fetchStatus, pairs]);

    return {
        ...marketData,
        isLoading: fetchStatus === 'idle' || fetchStatus === 'loading',
        error: fetchStatus === 'failed' ? 'Market data unavailable' : undefined,
    };
}
