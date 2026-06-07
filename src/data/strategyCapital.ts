import { FINALIZED_RAISE_ARCHIVE, ROUND_2_CLOSE_LEDGER } from './protocol';

const AVAX_WEI = 1_000_000_000_000_000_000n;
const USDT6 = 1_000_000n;
const ROUND_MATCH_EPSILON_AVAX = 0.0001;

export type RecordedContinuousCapitalEvent = {
    blockNumber: bigint;
    transactionHash: `0x${string}`;
    avaxWei: bigint;
    settlementUsdt6: bigint;
};

export type StrategyCapitalRoundSource = 'onchain' | 'published' | 'planned';

export type StrategyCapitalInput = {
    archiveRaisedAvax: number;
    roundRaisedAvax: number;
    roundSource?: StrategyCapitalRoundSource;
    roundIsFinalized?: boolean;
    roundIsClosed?: boolean;
    continuousAvaxWei?: bigint;
    continuousSettlementUsdt6?: bigint;
};

export type StrategyCapitalTotals = {
    historicalCommitmentUsd: number;
    continuousRaisedAvax: number;
    continuousCommitmentUsd: number;
    totalRaisedAvax: number;
    totalCommitmentUsd: number;
};

export const RECORDED_CONTINUOUS_CAPITAL_EVENTS = [
    {
        blockNumber: 86_525_949n,
        transactionHash: '0x28519b63565e6f56579535fa06eddedec3014a66b029af869b26f22e0847c189',
        avaxWei: 4_454_610_102_977_543_742n,
        settlementUsdt6: 40_866_198n,
    },
    {
        blockNumber: 87_228_001n,
        transactionHash: '0x449b5951631d1dcaf5a239a06192c662d7d32fd5b40a8e5015b00d6b195f6928',
        avaxWei: 50_000_000_000_000_000_000n,
        settlementUsdt6: 361_079_810n,
    },
] as const satisfies readonly RecordedContinuousCapitalEvent[];

export const RECORDED_CONTINUOUS_CAPITAL_TOTALS = RECORDED_CONTINUOUS_CAPITAL_EVENTS.reduce(
    (totals, event) => ({
        avaxWei: totals.avaxWei + event.avaxWei,
        usdt6: totals.usdt6 + event.settlementUsdt6,
    }),
    { avaxWei: 0n, usdt6: 0n },
);

export const RECORDED_CONTINUOUS_CAPITAL_LAST_BLOCK =
    RECORDED_CONTINUOUS_CAPITAL_EVENTS[RECORDED_CONTINUOUS_CAPITAL_EVENTS.length - 1]?.blockNumber ?? 0n;

function bigintFixedToNumber(value: bigint, scale: bigint) {
    const whole = value / scale;
    const fraction = value % scale;
    return Number(whole) + Number(fraction) / Number(scale);
}

function matchesRecordedRound2Close(raisedAvax: number) {
    return Math.abs(raisedAvax - ROUND_2_CLOSE_LEDGER.raisedAvax) < ROUND_MATCH_EPSILON_AVAX;
}

function shouldUseRecordedRound2CommitmentUsd(input: StrategyCapitalInput) {
    if (input.roundSource === 'published') return true;
    if (!matchesRecordedRound2Close(input.roundRaisedAvax)) return false;
    return input.roundIsFinalized === true || input.roundIsClosed === true || input.roundSource === 'onchain';
}

export function computeStrategyCapitalTotals(input: StrategyCapitalInput): StrategyCapitalTotals {
    const round1CommitmentUsd = input.archiveRaisedAvax > 0
        ? FINALIZED_RAISE_ARCHIVE.rounds[0].commitmentUsd
        : 0;
    const round2CommitmentUsd = shouldUseRecordedRound2CommitmentUsd(input)
        ? FINALIZED_RAISE_ARCHIVE.rounds[1].commitmentUsd
        : 0;
    const continuousRaisedAvax = input.continuousAvaxWei !== undefined
        ? bigintFixedToNumber(input.continuousAvaxWei, AVAX_WEI)
        : 0;
    const continuousCommitmentUsd = input.continuousSettlementUsdt6 !== undefined
        ? bigintFixedToNumber(input.continuousSettlementUsdt6, USDT6)
        : 0;
    const historicalCommitmentUsd = round1CommitmentUsd + round2CommitmentUsd;

    return {
        historicalCommitmentUsd,
        continuousRaisedAvax,
        continuousCommitmentUsd,
        totalRaisedAvax: input.archiveRaisedAvax + input.roundRaisedAvax + continuousRaisedAvax,
        totalCommitmentUsd: historicalCommitmentUsd + continuousCommitmentUsd,
    };
}
