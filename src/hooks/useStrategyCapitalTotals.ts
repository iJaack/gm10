import { useEffect, useRef, useState } from 'react';
import { formatEther } from 'viem';
import { usePublicClient } from 'wagmi';
import { GM10_FUND_ABI } from '../data/contracts';
import { GM10_PRIMARY_DEPLOYMENT } from '../data/gm10Config';
import { ROUND_2_CLOSE_LEDGER } from '../data/protocol';
import {
    RECORDED_CONTINUOUS_CAPITAL_LAST_BLOCK,
    RECORDED_CONTINUOUS_CAPITAL_TOTALS,
    computeStrategyCapitalTotals,
    type StrategyCapitalRoundSource,
} from '../data/strategyCapital';

const CAPITAL_REFRESH_INTERVAL_MS = 5_000;
const CAPITAL_EVENT_BLOCK_CHUNK = 2_000n;
const CAPITAL_EVENT_BATCH_SIZE = 12;
const CONTINUOUS_EVENTS_FROM_BLOCK = RECORDED_CONTINUOUS_CAPITAL_LAST_BLOCK + 1n;
const FALLBACK_ROUND_1_RAISED_AVAX = 500;
const LEGACY_CONTINUOUS_SETTLEMENT_USDT6_PER_AVAX = 9_500_000n;

export type ContinuousCapitalTotals = {
    avaxWei: bigint;
    usdt6: bigint;
};

type RoundStateForStrategyCapital = {
    archiveRound?: { raisedAmount: bigint };
    round?: { raisedAmount: bigint; isFinalized?: boolean };
    roundSource?: StrategyCapitalRoundSource;
    isClosed?: boolean;
};

export function useContinuousSettlementTotals() {
    const publicClient = usePublicClient();
    const [totals, setTotals] = useState<ContinuousCapitalTotals | undefined>(RECORDED_CONTINUOUS_CAPITAL_TOTALS);
    const proxyAddress = GM10_PRIMARY_DEPLOYMENT.proxy.address;
    const processedThroughBlockRef = useRef<bigint | undefined>(RECORDED_CONTINUOUS_CAPITAL_LAST_BLOCK);
    const totalsRef = useRef<ContinuousCapitalTotals>(RECORDED_CONTINUOUS_CAPITAL_TOTALS);

    useEffect(() => {
        if (!publicClient || !proxyAddress) return undefined;
        const client = publicClient;
        let cancelled = false;
        let refreshing = false;
        processedThroughBlockRef.current = RECORDED_CONTINUOUS_CAPITAL_LAST_BLOCK;
        totalsRef.current = RECORDED_CONTINUOUS_CAPITAL_TOTALS;
        setTotals(RECORDED_CONTINUOUS_CAPITAL_TOTALS);

        async function refresh() {
            if (refreshing) return;
            refreshing = true;
            try {
                const latestBlock = await client.getBlockNumber();
                let fromBlock = processedThroughBlockRef.current !== undefined
                    ? processedThroughBlockRef.current + 1n
                    : BigInt(ROUND_2_CLOSE_LEDGER.finalizedBlock);
                if (CONTINUOUS_EVENTS_FROM_BLOCK > fromBlock) fromBlock = CONTINUOUS_EVENTS_FROM_BLOCK;
                if (fromBlock > latestBlock) {
                    if (!cancelled) setTotals(totalsRef.current);
                    return;
                }
                const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
                while (fromBlock <= latestBlock) {
                    const toBlock = fromBlock + CAPITAL_EVENT_BLOCK_CHUNK > latestBlock
                        ? latestBlock
                        : fromBlock + CAPITAL_EVENT_BLOCK_CHUNK;
                    ranges.push({ fromBlock, toBlock });
                    fromBlock = toBlock + 1n;
                }
                const avaxEvents: Array<{ args: { commitId?: `0x${string}`; avaxAmountWei?: bigint; settlementAmountUsdt6?: bigint } }> = [];
                const settlementEvents: Array<{ args: { commitId?: `0x${string}`; settlementAmountUsdt6?: bigint } }> = [];
                for (let i = 0; i < ranges.length; i += CAPITAL_EVENT_BATCH_SIZE) {
                    const batch = ranges.slice(i, i + CAPITAL_EVENT_BATCH_SIZE);
                    const [nextAvaxEvents, nextSettlementEvents] = await Promise.all([
                        Promise.all(batch.map((range) => client.getContractEvents({
                            address: proxyAddress,
                            abi: GM10_FUND_ABI,
                            eventName: 'ContinuousMintAvaxSettled',
                            fromBlock: range.fromBlock,
                            toBlock: range.toBlock,
                        }))),
                        Promise.all(batch.map((range) => client.getContractEvents({
                            address: proxyAddress,
                            abi: GM10_FUND_ABI,
                            eventName: 'ContinuousMintSettled',
                            fromBlock: range.fromBlock,
                            toBlock: range.toBlock,
                        }))),
                    ]);
                    avaxEvents.push(...nextAvaxEvents.flat());
                    settlementEvents.push(...nextSettlementEvents.flat());
                }
                if (cancelled) return;
                const avaxCommitIds = new Set(
                    avaxEvents
                        .filter((event) => event.args.avaxAmountWei !== undefined)
                        .map((event) => event.args.commitId)
                        .filter((commitId): commitId is `0x${string}` => Boolean(commitId)),
                );
                let avaxWei = avaxEvents.reduce((sum, event) => sum + (event.args.avaxAmountWei ?? 0n), 0n);
                let usdt6 = avaxEvents.reduce((sum, event) => sum + (event.args.avaxAmountWei !== undefined ? (event.args.settlementAmountUsdt6 ?? 0n) : 0n), 0n);
                const unmatchedSettlementUsdt6 = settlementEvents.reduce((sum, event) => {
                    if (event.args.commitId && avaxCommitIds.has(event.args.commitId)) return sum;
                    return sum + (event.args.settlementAmountUsdt6 ?? 0n);
                }, 0n);
                usdt6 += unmatchedSettlementUsdt6;
                if (avaxWei === 0n && unmatchedSettlementUsdt6 > 0n) {
                    avaxWei = unmatchedSettlementUsdt6 * 1_000_000_000_000_000_000n / LEGACY_CONTINUOUS_SETTLEMENT_USDT6_PER_AVAX;
                }
                totalsRef.current = {
                    avaxWei: totalsRef.current.avaxWei + avaxWei,
                    usdt6: totalsRef.current.usdt6 + usdt6,
                };
                processedThroughBlockRef.current = latestBlock;
                setTotals(totalsRef.current);
            } catch {
                if (!cancelled && processedThroughBlockRef.current === undefined) setTotals(undefined);
            } finally {
                refreshing = false;
            }
        }

        void refresh();
        const interval = window.setInterval(refresh, CAPITAL_REFRESH_INTERVAL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [publicClient, proxyAddress]);

    return totals;
}

export function useStrategyCapitalTotals(round: RoundStateForStrategyCapital) {
    const continuousSettlementTotals = useContinuousSettlementTotals();
    const archiveRaisedAvax = round.archiveRound ? Number(formatEther(round.archiveRound.raisedAmount)) : FALLBACK_ROUND_1_RAISED_AVAX;
    const roundRaisedAvax = round.roundSource === 'onchain' && round.round
        ? Number(formatEther(round.round.raisedAmount))
        : round.roundSource === 'published'
            ? ROUND_2_CLOSE_LEDGER.raisedAvax
            : 0;

    return computeStrategyCapitalTotals({
        archiveRaisedAvax,
        roundRaisedAvax,
        roundSource: round.roundSource,
        roundIsFinalized: Boolean(round.round?.isFinalized),
        roundIsClosed: round.isClosed,
        continuousAvaxWei: continuousSettlementTotals?.avaxWei,
        continuousSettlementUsdt6: continuousSettlementTotals?.usdt6,
    });
}
