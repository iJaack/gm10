import { useMemo } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useBalance, useReadContract } from 'wagmi';
import { CHAINLINK_AGGREGATOR_V3_ABI, FUND_ADMIN_ABI, LIQUIDITY_COORDINATOR_ABI, PROFIT_DISTRIBUTOR_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { calculateRoundRouting, getRoundStatus } from '../lib/rounds.js';

const AVAX_WEI = 10n ** 18n;
const USDT6 = 1_000_000n;

function formatAvax(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return `${Number(formatEther(value)).toLocaleString('en-US', { maximumFractionDigits: 4 })} AVAX`;
}

function formatUsdt6(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return Number(formatUnits(value, 6)).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function avaxUsdToUsdt6(avaxUsd: number) {
    if (!Number.isFinite(avaxUsd) || avaxUsd <= 0) return 0n;
    return BigInt(Math.round(avaxUsd * Number(USDT6)));
}

function avaxWeiToUsdt6(balanceWei: bigint, avaxUsd: number) {
    return (balanceWei * avaxUsdToUsdt6(avaxUsd)) / AVAX_WEI;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</div>
            <div className="mt-2 break-words text-xl font-bold text-white">{value}</div>
            {detail ? <div className="mt-2 text-xs leading-5 text-gray-400">{detail}</div> : null}
        </div>
    );
}

export function DashboardPanel() {
    const { data: currentRoundId } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'currentRoundId',
    });
    const { data: round1 } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'getRound',
        args: [1n],
    });
    const { data: round2 } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'getRound',
        args: [2n],
    });
    const { data: stableAccounting } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'stableAccounting',
    });
    const { data: treasuryAddress } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'treasury',
    });
    const effectiveTreasuryAddress = (treasuryAddress ?? MAINNET.treasurySafe) as `0x${string}`;
    const { data: fundBalance } = useBalance({ address: MAINNET.fundProxy });
    const { data: treasuryBalance } = useBalance({ address: effectiveTreasuryAddress });
    const { data: avaxUsdRoundData } = useReadContract({
        address: MAINNET.avaxUsdFeed,
        abi: CHAINLINK_AGGREGATOR_V3_ABI,
        functionName: 'latestRoundData',
    });
    const { data: fundLiquidityCoordinator } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'liquidityCoordinator',
    });
    const liquidityCoordinator = MAINNET.liquidityCoordinator ?? fundLiquidityCoordinator;
    const { data: liquidityCoordinatorBalance } = useBalance({ address: liquidityCoordinator as `0x${string}` });
    const { data: courtyardWorkflowBalance } = useBalance({ address: MAINNET.courtyardWorkflow });
    const { data: teamWalletBalance } = useBalance({ address: MAINNET.teamWallet });

    const { data: profitDistributor } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'profitDistributor',
    });
    const { data: totalProfitDeposited } = useReadContract({
        address: profitDistributor as `0x${string}`,
        abi: PROFIT_DISTRIBUTOR_ABI,
        functionName: 'totalProfitDepositedWei',
        query: { enabled: Boolean(profitDistributor) },
    });
    const avaxUsd = avaxUsdRoundData && avaxUsdRoundData[1] > 0n
        ? Number(formatUnits(avaxUsdRoundData[1], 8))
        : undefined;
    const liquidTreasuryUsdt6 = useMemo(() => {
        if (avaxUsd === undefined) return undefined;
        const walletBalances = [
            fundBalance?.value,
            treasuryBalance?.value,
            liquidityCoordinatorBalance?.value,
            courtyardWorkflowBalance?.value,
            teamWalletBalance?.value,
        ];
        if (walletBalances.some((balance) => balance === undefined)) return undefined;
        const totalWei = walletBalances.reduce<bigint>((total, balance) => total + (balance ?? 0n), 0n);
        return avaxWeiToUsdt6(totalWei, avaxUsd);
    }, [
        avaxUsd,
        courtyardWorkflowBalance?.value,
        fundBalance?.value,
        liquidityCoordinatorBalance?.value,
        teamWalletBalance?.value,
        treasuryBalance?.value,
    ]);
    const { data: traderJoeAvaxLp } = useReadContract({
        address: liquidityCoordinator as `0x${string}`,
        abi: LIQUIDITY_COORDINATOR_ABI,
        functionName: 'traderJoeLpDeployedAvaxWei',
        query: { enabled: Boolean(liquidityCoordinator) },
    });
    const { data: pharaohAvaxLp } = useReadContract({
        address: liquidityCoordinator as `0x${string}`,
        abi: LIQUIDITY_COORDINATOR_ABI,
        functionName: 'pharaohLpDeployedAvaxWei',
        query: { enabled: Boolean(liquidityCoordinator) },
    });

    const routing = calculateRoundRouting(round2?.raisedAmount ?? 0n);

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Admin dashboard</h1>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                    Live operational status for rounds, treasury, liquidity, and post-raise actions.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Fund proxy" value={MAINNET.fundProxy} detail={`Current round: ${currentRoundId?.toString() ?? 'Unavailable'}`} />
                <StatCard label="Treasury Safe" value={effectiveTreasuryAddress} detail={`Safe balance: ${treasuryBalance ? formatAvax(treasuryBalance.value) : 'Unavailable'}`} />
                <StatCard label="Fund AVAX" value={fundBalance ? formatAvax(fundBalance.value) : 'Unavailable'} detail="Raised funds remain in-contract until treasury withdrawal." />
                <StatCard
                    label="Liquid treasury"
                    value={formatUsdt6(liquidTreasuryUsdt6)}
                    detail={avaxUsd !== undefined
                        ? `${formatAvax(fundBalance?.value)} fund + ${formatAvax(treasuryBalance?.value)} Safe + ${formatAvax(liquidityCoordinatorBalance?.value)} liquidity + ${formatAvax(courtyardWorkflowBalance?.value)} Courtyard + ${formatAvax(teamWalletBalance?.value)} team @ ${formatUsdt6(avaxUsdToUsdt6(avaxUsd))}/AVAX`
                        : 'Waiting for Chainlink AVAX/USD'}
                />
                <StatCard label="Round 1" value={getRoundStatus(round1)} detail={round1 ? `Raised ${formatAvax(round1.raisedAmount)} of ${formatAvax(round1.targetAmount)}` : 'No round data'} />
                <StatCard label="Round 2" value={getRoundStatus(round2)} detail={round2 ? `Raised ${formatAvax(round2.raisedAmount)}; routing bucket ${formatAvax(routing.routingBucket)}` : 'Not created yet'} />
                <StatCard label="Contract accounting" value={stableAccounting ? `${formatUnits(stableAccounting[2], 6)} USDT` : 'Unavailable'} detail={stableAccounting ? `Stored liquid treasury field; LP accrual ${formatUnits(stableAccounting[5], 6)} USDT` : undefined} />
                <StatCard label="LP deployed" value={`${formatAvax((traderJoeAvaxLp ?? 0n) + (pharaohAvaxLp ?? 0n))}`} detail={`LFJ ${formatAvax(traderJoeAvaxLp)} / Pharaoh ${formatAvax(pharaohAvaxLp)}`} />
                <StatCard label="Profit distributed" value={formatAvax(totalProfitDeposited)} detail="Completed sale profit only, separate from round proceeds allocation." />
            </div>
        </div>
    );
}
