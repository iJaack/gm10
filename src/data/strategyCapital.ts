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

export type CardPurchaseConversionRoute = {
    transactionHash: `0x${string}`;
    tool: string;
    destinationChain: 'Avalanche' | 'Polygon';
    destinationUsdcRaw: bigint;
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

export const CARD_PURCHASE_CONVERSION_ROUTES = [
    {
        transactionHash: '0x9b52eca5acfb5b875979ef06b302f47056fd3fef1a5e1cc0314996a1b67128c8',
        tool: 'mayanMCTP',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 96_863_798n,
    },
    {
        transactionHash: '0x2733948f2bd5a56f824c1667614bc88c5e466172efecf743465c8ec33e3810e4',
        tool: 'celercirclefast',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 252_423_050n,
    },
    {
        transactionHash: '0xbcfda8669e9bdc53f4f42082cc864dbdfa55f40fa67bd646341158100e3a223a',
        tool: 'celercirclefast',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 647_527_982n,
    },
    {
        transactionHash: '0x925bbce728a374852f8d13cc7a6799699a8ba5c19d2d69fa8dae45837386955e',
        tool: 'celercircle',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 336_494_166n,
    },
    {
        transactionHash: '0x63332a125359a98fb59079fa8f55f32028c1ec4cdc005a2a640de57c9a168f95',
        tool: 'celercirclefast',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 603_467_303n,
    },
    {
        transactionHash: '0xac3324edfe2f5905ac6a04a4fe583c89840e50594a8da50df9773363c821a7c4',
        tool: 'squid',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 176_853_789n,
    },
    {
        transactionHash: '0xb617deb3633330d9574f447da99bc676a0bdc0596723f42df174110bef8e1743',
        tool: 'celercircle',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 1_003_775_422n,
    },
    {
        transactionHash: '0x51bf1714f05d62d85609300544a1baafcecc6db08792a8c146fcf0cf7c419ae4',
        tool: 'fly',
        destinationChain: 'Avalanche',
        destinationUsdcRaw: 1_790_027_855n,
    },
    {
        transactionHash: '0xcccd62b9a85b186e847cc10f7d1e9cd939f875ee8f01d2a9f884fea88d31e199',
        tool: 'celercircle',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 5_323_832_765n,
    },
    {
        transactionHash: '0xad14cd0b899e81188217c0914fe9ed872fdeec08d70985abd679a90140307e7d',
        tool: 'celercircle',
        destinationChain: 'Polygon',
        destinationUsdcRaw: 4_522_638_987n,
    },
] as const satisfies readonly CardPurchaseConversionRoute[];

export const CARD_PURCHASE_CONVERSION_BASIS_USDT6 = CARD_PURCHASE_CONVERSION_ROUTES.reduce(
    (total, route) => total + route.destinationUsdcRaw,
    0n,
);

export const CARD_PURCHASE_CONVERSION_BASIS_USD = bigintFixedToNumber(CARD_PURCHASE_CONVERSION_BASIS_USDT6, USDT6);

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
