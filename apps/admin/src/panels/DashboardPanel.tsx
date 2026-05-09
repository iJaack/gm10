import { useMemo } from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { CHAINLINK_AGGREGATOR_V3_ABI, FUND_ADMIN_ABI, LIQUIDITY_COORDINATOR_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { MetricCard, PageHeader, ReadHealthPanel, ReconciliationTable, StatusStrip } from '../components/AdminPrimitives';
import {
    accountingBucketRows,
    aggregateLpDeployment,
    chainlinkPriceStatus,
    configuredAddressMetric,
    formatAvax,
    formatToken6,
    formatUsdt6,
    READ_STATUS,
    resolveLiquidTreasuryMetric,
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
    const liquidTreasury = useMemo(() => resolveLiquidTreasuryMetric({
        walletBalancesWei: [
            fundBalanceRead.data?.value,
            treasuryBalanceRead.data?.value,
            liquidityCoordinatorBalanceRead.data?.value,
            courtyardWorkflowBalanceRead.data?.value,
            teamWalletBalanceRead.data?.value,
        ],
        avaxUsd: priceStatus.avaxUsd ?? 0,
        stableAccountingLiquidTreasury: stableAccountingRead.data?.[2],
    }), [
        courtyardWorkflowBalanceRead.data?.value,
        fundBalanceRead.data?.value,
        liquidityCoordinatorBalanceRead.data?.value,
        pharaohLpRead.data,
        priceStatus.avaxUsd,
        stableAccountingRead.data,
        teamWalletBalanceRead.data?.value,
        treasuryBalanceRead.data?.value,
    ]);
    const lpDeployment = aggregateLpDeployment(traderJoeLpRead.data, pharaohLpRead.data);
    const round2 = round2Read.data;
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

    const statusItems = [
        { label: `Round ${currentRoundRead.data?.toString() ?? 'unknown'} ${getRoundStatus(round2).toLowerCase()}`, status: round2 ? READ_STATUS.live : READ_STATUS.unavailable },
        { label: readFailures === 0 ? 'Live reads OK' : `${readFailures} read issue${readFailures === 1 ? '' : 's'}`, status: readFailures === 0 ? READ_STATUS.live : READ_STATUS.partial },
        { label: priceStatus.updatedAt ? `Chainlink ${new Date(priceStatus.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}` : 'Chainlink unavailable', status: priceStatus.status },
        { label: '2 configured sources', status: READ_STATUS.configured },
    ];

    const reconciliationRows = [
        {
            metric: 'Liquid treasury',
            live: liquidTreasury.sourceLabel,
            stored: formatUsdt6(stableAccountingRead.data?.[2]),
            status: liquidTreasury.status,
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
                eyebrow="Decision console"
                title="Admin dashboard"
                description="Live fund, treasury, liquidity, and accounting status with explicit source labels for configured fallbacks and degraded reads."
            />
            <StatusStrip items={statusItems} />

            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <div className="grid gap-4 md:grid-cols-2">
                    <MetricCard
                        label="Liquid treasury"
                        value={formatUsdt6(liquidTreasury.value)}
                        status={liquidTreasury.status}
                        sourceLabel={liquidTreasury.sourceLabel}
                        accent={liquidTreasury.status === READ_STATUS.live ? 'green' : 'yellow'}
                        detail={
                            <>
                                Stored accounting {formatUsdt6(stableAccountingRead.data?.[2])}
                                {'warning' in liquidTreasury && liquidTreasury.warning ? <span className="text-amber-100"> · warning: {liquidTreasury.warning}</span> : null}
                            </>
                        }
                    />
                    <MetricCard
                        label="Round 2"
                        value={`${formatAvax(round2?.raisedAmount)} / ${formatAvax(round2?.targetAmount)}`}
                        status={round2 ? READ_STATUS.live : READ_STATUS.unavailable}
                        sourceLabel={round2 ? getRoundStatus(round2) : 'round unavailable'}
                        accent="blue"
                        detail={
                            <div className="grid gap-2">
                                <div className="h-2 overflow-hidden rounded bg-black/40">
                                    <div className="h-full bg-[var(--accent-blue)]" style={{ width: roundProgressWidth(round2?.raisedAmount, round2?.targetAmount) }} />
                                </div>
                                <div>{roundProgressLabel(round2?.raisedAmount, round2?.targetAmount)} raised · routing bucket {formatAvax(routing.routingBucket)}</div>
                            </div>
                        }
                    />
                    <MetricCard
                        label="Fund AVAX"
                        value={formatAvax(fundBalanceRead.data?.value)}
                        status={fundBalanceRead.data ? READ_STATUS.live : READ_STATUS.unavailable}
                        sourceLabel={fundBalanceRead.data ? 'live balance' : 'unavailable'}
                        accent="yellow"
                        detail="Raised funds remain in-contract until treasury withdrawal."
                    />
                    <MetricCard
                        label="Treasury Safe"
                        value={formatAvax(treasuryBalanceRead.data?.value)}
                        status={treasuryAddress.status}
                        sourceLabel={treasuryAddress.sourceLabel}
                        detail={<span className="break-all font-mono">{treasuryAddress.value}</span>}
                    />
                    <MetricCard
                        label="LP deployed"
                        value={formatAvax(lpDeployment.total)}
                        status={lpDeployment.status}
                        sourceLabel={lpDeployment.sourceLabel}
                        accent={lpDeployment.status === READ_STATUS.live ? 'green' : 'yellow'}
                        detail={`LFJ ${formatAvax(lpDeployment.traderJoe)} · Pharaoh ${formatAvax(lpDeployment.pharaoh)}`}
                    />
                    <MetricCard
                        label="Contract accounting"
                        value={formatToken6(stableAccountingRead.data?.[2])}
                        status={stableAccountingRead.data ? READ_STATUS.live : READ_STATUS.unavailable}
                        sourceLabel={stableAccountingRead.data ? 'stableAccounting' : 'unavailable'}
                        detail={`Holder claims ${formatToken6(stableAccountingRead.data?.[6])} · LP buy ${formatToken6(stableAccountingRead.data?.[4])} · LP AVAX side ${formatToken6(stableAccountingRead.data?.[5])}`}
                    />
                </div>

                <ReadHealthPanel
                    rows={[
                        { label: 'Fund balance', value: fundBalanceRead.data ? 'live' : 'unavailable', status: fundBalanceRead.data ? READ_STATUS.live : READ_STATUS.unavailable, detail: MAINNET.fundProxy },
                        { label: 'Treasury Safe', value: 'configured', status: READ_STATUS.configured, detail: MAINNET.treasurySafe },
                        { label: 'Liquidity coordinator', value: liquidityAddress.sourceLabel, status: liquidityAddress.status, detail: liquidityAddress.value },
                        { label: 'LP venue reads', value: lpDeployment.sourceLabel, status: lpDeployment.status, detail: `LFJ ${formatAvax(lpDeployment.traderJoe)} / Pharaoh ${formatAvax(lpDeployment.pharaoh)}` },
                        { label: 'Profit distributor', value: 'not wired', status: READ_STATUS.unavailable, detail: 'Use stableAccounting sale-profit buckets until a real distributor address exists.' },
                        { label: 'Treasury getter', value: 'unavailable', status: READ_STATUS.unavailable, detail: 'The deployed fund proxy does not expose treasury() as a reliable getter.' },
                    ]}
                />
            </div>

            <ReconciliationTable rows={reconciliationRows} />
        </div>
    );
}
