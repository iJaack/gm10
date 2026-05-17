import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { CHAINLINK_AGGREGATOR_V3_ABI, FUND_ADMIN_ABI, LIQUIDITY_COORDINATOR_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { MetricCard, PageHeader, ReadHealthPanel, ReconciliationTable, StatusChip, StatusStrip } from '../components/AdminPrimitives';
import {
    accountingBucketRows,
    aggregateLpDeployment,
    avaxUsdToUsdt6,
    chainlinkPriceStatus,
    configuredAddressMetric,
    formatAvax,
    formatToken6,
    formatUsdt6,
    READ_STATUS,
    resolveCardBuyingBudgetMetric,
    resolveTrackedWalletAggregateMetric,
} from '../lib/adminMetrics.js';
import { calculateRoundRouting, getRoundStatus } from '../lib/rounds.js';

type DashboardNavigationTarget = 'Rounds' | 'Operations' | 'Courtyard Wizard' | 'Valuation';
type DashboardPanelProps = {
    onNavigate: (tab: DashboardNavigationTarget) => void;
};

function roundProgressLabel(raised?: bigint, target?: bigint) {
    if (raised === undefined || target === undefined || target === 0n) return 'Unavailable';
    const pct = Number((raised * 10_000n) / target) / 100;
    return `${pct.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function roundProgressWidth(raised?: bigint, target?: bigint) {
    if (raised === undefined || target === undefined || target === 0n) return '0%';
    const pct = Number((raised * 10_000n) / target) / 100;
    return `${Math.max(0, Math.min(100, pct))}%`;
}

function liveStatus(value: unknown) {
    return value !== undefined && value !== null ? READ_STATUS.live : READ_STATUS.unavailable;
}

function LedgerPanel({
    title,
    caption,
    rows,
}: {
    title: string;
    caption: string;
    rows: Array<{ label: string; value: ReactNode; status: typeof READ_STATUS[keyof typeof READ_STATUS]; detail?: ReactNode }>;
}) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{caption}</p>
                </div>
            </div>
            <div className="grid gap-2">
                {rows.map((row) => (
                    <div key={row.label} className="grid gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-200">{row.label}</div>
                            {row.detail ? <div className="mt-1 text-[0.7rem] leading-4 text-gray-500">{row.detail}</div> : null}
                        </div>
                        <div className="font-mono text-sm tabular-nums text-white">{row.value}</div>
                        <StatusChip status={row.status} />
                    </div>
                ))}
            </div>
        </section>
    );
}

function NextActionsPanel({ onNavigate }: DashboardPanelProps) {
    const actions: Array<{
        label: string;
        detail: string;
        target: DashboardNavigationTarget;
        primary?: boolean;
    }> = [
        {
            label: 'Buy / source cards',
            detail: 'Open Courtyard listing resolution, funding, custody, and position recording.',
            target: 'Courtyard Wizard',
            primary: true,
        },
        {
            label: 'Check valuation',
            detail: 'Review card marks, evidence, NAV, and public valuation inputs.',
            target: 'Valuation',
        },
        {
            label: 'Funding / operations',
            detail: 'Review workflow balances, routing gates, and execution readiness.',
            target: 'Operations',
        },
        {
            label: 'Round close',
            detail: 'Inspect current round status, dust close, finalization, and routing math.',
            target: 'Rounds',
        },
    ];

    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-3">
                <div className="label-font text-[0.58rem] text-gray-500">Next actions</div>
                <h2 className="mt-2 text-base font-semibold text-white">Operator shortcuts</h2>
            </div>
            <div className="grid gap-2">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={() => onNavigate(action.target)}
                        className={`group grid gap-1 rounded-md border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/60 ${
                            action.primary
                                ? 'border-[var(--accent)]/60 bg-[var(--accent)] text-[#0b0a14] hover:bg-[#ffd75b]'
                                : 'border-white/10 bg-black/20 text-white hover:border-white/20 hover:bg-white/[0.06]'
                        }`}
                    >
                        <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                            {action.label}
                            <span aria-hidden="true" className="text-base leading-none transition-transform group-hover:translate-x-0.5">{'->'}</span>
                        </span>
                        <span className={`text-xs leading-5 ${action.primary ? 'text-black/65' : 'text-gray-500'}`}>{action.detail}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}

export function DashboardPanel({ onNavigate }: DashboardPanelProps) {
    const currentRoundRead = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'currentRoundId',
    });
    const round1Read = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'getRound',
        args: [1n],
    });
    const round2Read = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'getRound',
        args: [2n],
    });
    const stableAccountingRead = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'stableAccounting',
    });
    const fundBalanceRead = useBalance({ address: MAINNET.fundProxy });
    const treasuryBalanceRead = useBalance({ address: MAINNET.treasurySafe });
    const avaxUsdRead = useReadContract({
        address: MAINNET.avaxUsdFeed,
        abi: CHAINLINK_AGGREGATOR_V3_ABI,
        functionName: 'latestRoundData',
    });
    const liquidityCoordinatorBalanceRead = useBalance({ address: MAINNET.liquidityCoordinator });
    const courtyardWorkflowBalanceRead = useBalance({ address: MAINNET.courtyardWorkflow });
    const teamWalletBalanceRead = useBalance({ address: MAINNET.teamWallet });

    const traderJoeLpRead = useReadContract({
        address: MAINNET.liquidityCoordinator,
        abi: LIQUIDITY_COORDINATOR_ABI,
        functionName: 'traderJoeLpDeployedAvaxWei',
    });
    const pharaohLpRead = useReadContract({
        address: MAINNET.liquidityCoordinator,
        abi: LIQUIDITY_COORDINATOR_ABI,
        functionName: 'pharaohLpDeployedAvaxWei',
    });

    const priceStatus = chainlinkPriceStatus(avaxUsdRead.data);
    const cardBuyingBudget = useMemo(() => resolveCardBuyingBudgetMetric({
        fundBalanceWei: fundBalanceRead.data?.value,
        avaxUsd: priceStatus.avaxUsd,
    }), [
        fundBalanceRead.data?.value,
        priceStatus.avaxUsd,
    ]);
    const trackedWalletAggregate = useMemo(() => resolveTrackedWalletAggregateMetric({
        walletBalancesWei: [
            fundBalanceRead.data?.value,
            treasuryBalanceRead.data?.value,
            liquidityCoordinatorBalanceRead.data?.value,
            courtyardWorkflowBalanceRead.data?.value,
            teamWalletBalanceRead.data?.value,
        ],
        avaxUsd: priceStatus.avaxUsd,
        stableAccountingLiquidTreasury: stableAccountingRead.data?.[2],
    }), [
        courtyardWorkflowBalanceRead.data?.value,
        fundBalanceRead.data?.value,
        liquidityCoordinatorBalanceRead.data?.value,
        priceStatus.avaxUsd,
        stableAccountingRead.data,
        teamWalletBalanceRead.data?.value,
        treasuryBalanceRead.data?.value,
    ]);
    const lpDeployment = aggregateLpDeployment(traderJoeLpRead.data, pharaohLpRead.data);
    const round2 = round2Read.data;
    const round2Status = getRoundStatus(round2);
    const routing = calculateRoundRouting(round2?.raisedAmount ?? 0n);
    const treasuryAddress = configuredAddressMetric(MAINNET.treasurySafe, 'configured Safe');
    const liquidityAddress = configuredAddressMetric(MAINNET.liquidityCoordinator, 'configured coordinator');
    const readFailures = [
        currentRoundRead.isError,
        round1Read.isError,
        round2Read.isError,
        stableAccountingRead.isError,
        fundBalanceRead.isError,
        treasuryBalanceRead.isError,
        avaxUsdRead.isError,
        liquidityCoordinatorBalanceRead.isError,
        courtyardWorkflowBalanceRead.isError,
        teamWalletBalanceRead.isError,
        traderJoeLpRead.isError,
        pharaohLpRead.isError,
    ].filter(Boolean).length;
    const priceLabel = priceStatus.avaxUsd ? `${formatUsdt6(avaxUsdToUsdt6(priceStatus.avaxUsd))}/AVAX` : 'price unavailable';

    const statusItems = [
        { label: cardBuyingBudget.balanceWei !== undefined ? 'Card budget live' : 'Card budget unavailable', status: cardBuyingBudget.status },
        { label: `Round ${currentRoundRead.data?.toString() ?? 'unknown'} ${round2Status.toLowerCase()}`, status: round2 ? READ_STATUS.live : READ_STATUS.unavailable },
        { label: priceStatus.updatedAt ? `Chainlink ${new Date(priceStatus.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}` : 'Chainlink unavailable', status: priceStatus.status },
        { label: readFailures === 0 ? 'Live reads OK' : `${readFailures} read issue${readFailures === 1 ? '' : 's'}`, status: readFailures === 0 ? READ_STATUS.live : READ_STATUS.partial },
    ];

    const routedFundsRows = [
        {
            label: 'Treasury Safe dust',
            value: formatAvax(treasuryBalanceRead.data?.value),
            status: liveStatus(treasuryBalanceRead.data?.value),
            detail: 'Post-routing Safe balance; excluded from the card-buying budget.',
        },
        {
            label: 'Team wallet',
            value: formatAvax(teamWalletBalanceRead.data?.value),
            status: liveStatus(teamWalletBalanceRead.data?.value),
            detail: 'Separated team allocation; not spendable for card purchases.',
        },
        {
            label: 'LFJ routed allocation',
            value: formatAvax(routing.lfj),
            status: round2 ? READ_STATUS.live : READ_STATUS.unavailable,
            detail: `Round-close allocation. Coordinator read: ${formatAvax(lpDeployment.traderJoe)}.`,
        },
        {
            label: 'Pharaoh routed allocation',
            value: formatAvax(routing.pharaoh),
            status: round2 ? READ_STATUS.live : READ_STATUS.unavailable,
            detail: `Round-close allocation. Coordinator read: ${formatAvax(lpDeployment.pharaoh)}.`,
        },
        {
            label: 'Courtyard workflow',
            value: formatAvax(courtyardWorkflowBalanceRead.data?.value),
            status: liveStatus(courtyardWorkflowBalanceRead.data?.value),
            detail: 'Funding lane for marketplace execution.',
        },
        {
            label: 'Liquidity coordinator',
            value: formatAvax(liquidityCoordinatorBalanceRead.data?.value),
            status: liveStatus(liquidityCoordinatorBalanceRead.data?.value),
            detail: 'Configured coordinator wallet balance, separate from fund treasury.',
        },
        {
            label: 'Tracked wallet aggregate',
            value: formatUsdt6(trackedWalletAggregate.value),
            status: trackedWalletAggregate.status,
            detail: 'Secondary all-wallet view; do not use as the card-buying budget.',
        },
    ];

    const roundCloseRows = [
        {
            label: 'Raised',
            value: `${formatAvax(round2?.raisedAmount)} / ${formatAvax(round2?.targetAmount)}`,
            status: round2 ? READ_STATUS.live : READ_STATUS.unavailable,
            detail: (
                <div className="grid gap-2">
                    <div className="h-2 overflow-hidden rounded bg-black/40">
                        <div className="h-full bg-[var(--accent-blue)]" style={{ width: roundProgressWidth(round2?.raisedAmount, round2?.targetAmount) }} />
                    </div>
                    <span>{roundProgressLabel(round2?.raisedAmount, round2?.targetAmount)} of target.</span>
                </div>
            ),
        },
        {
            label: 'Status',
            value: round2Status,
            status: round2 ? READ_STATUS.live : READ_STATUS.unavailable,
            detail: 'Latest relevant round used for close and routing math.',
        },
        {
            label: 'Strategy treasury',
            value: formatAvax(routing.strategyTreasury),
            status: round2 ? READ_STATUS.live : READ_STATUS.unavailable,
            detail: 'Raised amount after team and liquidity routing buckets.',
        },
        {
            label: 'Team allocation',
            value: formatAvax(routing.team),
            status: round2 ? READ_STATUS.live : READ_STATUS.unavailable,
            detail: '5% round allocation.',
        },
        {
            label: 'LFJ allocation',
            value: formatAvax(routing.lfj),
            status: round2 ? READ_STATUS.live : READ_STATUS.unavailable,
            detail: 'Half of the 10% liquidity bucket.',
        },
        {
            label: 'Pharaoh allocation',
            value: formatAvax(routing.pharaoh),
            status: round2 ? READ_STATUS.live : READ_STATUS.unavailable,
            detail: 'Half of the 10% liquidity bucket.',
        },
    ];

    const reconciliationRows = [
        {
            metric: 'Card buying budget',
            live: cardBuyingBudget.sourceLabel,
            stored: 'fund balance only',
            status: cardBuyingBudget.status,
        },
        {
            metric: 'Tracked wallet aggregate',
            live: trackedWalletAggregate.sourceLabel,
            stored: formatUsdt6(stableAccountingRead.data?.[2]),
            status: trackedWalletAggregate.status,
        },
        ...accountingBucketRows(stableAccountingRead.data).slice(1).map((row) => ({
            metric: row.label,
            live: row.source,
            stored: formatUsdt6(row.value),
            status: row.value !== undefined ? READ_STATUS.live : READ_STATUS.unavailable,
        })),
    ];

    return (
        <div className="grid gap-6">
            <PageHeader
                eyebrow="Operator console"
                title="Admin dashboard"
                description="Spendable card budget, routed funds, round-close math, and read health in one first-screen view."
            />
            <StatusStrip items={statusItems} />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)_minmax(22rem,0.9fr)]">
                <MetricCard
                    label="Card buying budget"
                    value={
                        <div className="grid gap-2">
                            <span className="text-3xl tabular-nums">{formatAvax(cardBuyingBudget.balanceWei, { maximumFractionDigits: 6 })}</span>
                            <span className="text-base font-semibold text-gray-300">{formatUsdt6(cardBuyingBudget.usdValue)}</span>
                        </div>
                    }
                    status={cardBuyingBudget.status}
                    sourceLabel={cardBuyingBudget.sourceLabel}
                    accent={cardBuyingBudget.status === READ_STATUS.live ? 'green' : 'yellow'}
                    detail={
                        <div className="grid gap-1">
                            <span>Hard max from the fund contract only at {priceLabel}.</span>
                            <span>Excludes team wallet, Safe dust, LP, and workflow balances.</span>
                            {'warning' in cardBuyingBudget && cardBuyingBudget.warning ? <span className="text-amber-100">Warning: {cardBuyingBudget.warning}</span> : null}
                        </div>
                    }
                />
                <NextActionsPanel onNavigate={onNavigate} />
                <ReadHealthPanel
                    title="Read health"
                    rows={[
                        { label: 'Fund balance', value: fundBalanceRead.data ? 'live' : 'unavailable', status: liveStatus(fundBalanceRead.data?.value), detail: MAINNET.fundProxy },
                        { label: 'Treasury Safe', value: treasuryAddress.sourceLabel, status: treasuryAddress.status, detail: treasuryAddress.value },
                        { label: 'Chainlink AVAX/USD', value: priceStatus.sourceLabel, status: priceStatus.status, detail: priceLabel },
                        { label: 'Liquidity coordinator', value: liquidityAddress.sourceLabel, status: liquidityAddress.status, detail: liquidityAddress.value },
                        { label: 'LP venue reads', value: lpDeployment.sourceLabel, status: lpDeployment.status, detail: `LFJ ${formatAvax(lpDeployment.traderJoe)} / Pharaoh ${formatAvax(lpDeployment.pharaoh)}` },
                    ]}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <LedgerPanel
                    title="Routed funds"
                    caption="Separated balances so team, ops, LP, and workflow funds do not inflate card-buying capacity."
                    rows={routedFundsRows}
                />
                <LedgerPanel
                    title="Round 2 close ledger"
                    caption="Routing math from the finalized round, using the same calculation as execution flows."
                    rows={roundCloseRows}
                />
            </div>

            <ReconciliationTable rows={reconciliationRows} />

            <MetricCard
                label="Contract accounting"
                value={formatToken6(stableAccountingRead.data?.[2])}
                status={stableAccountingRead.data ? READ_STATUS.live : READ_STATUS.unavailable}
                sourceLabel={stableAccountingRead.data ? 'stableAccounting' : 'unavailable'}
                detail={`Holder claims ${formatToken6(stableAccountingRead.data?.[6])} · LP buy ${formatToken6(stableAccountingRead.data?.[4])} · LP AVAX side ${formatToken6(stableAccountingRead.data?.[5])}`}
            />
        </div>
    );
}
