import { useMemo } from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { CHAINLINK_AGGREGATOR_V3_ABI, FUND_ADMIN_ABI, LIQUIDITY_COORDINATOR_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { AdminPage, LedgerPanel, MetricCard, OperatorSummaryGrid, ReadHealthPanel, ReconciliationTable, liveStatus } from '../components/AdminPrimitives';
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

export function DashboardPanel() {
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
        <AdminPage
            eyebrow="Operator console"
            title="Admin dashboard"
            description="Spendable card budget, routed funds, round-close math, and read health in one first-screen view."
            statusItems={statusItems}
        >
            <OperatorSummaryGrid>
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
            </OperatorSummaryGrid>

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
        </AdminPage>
    );
}
