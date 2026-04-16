import { formatEther, formatUnits } from 'viem';
import { useBalance, useReadContract } from 'wagmi';
import { FUND_ADMIN_ABI, LIQUIDITY_COORDINATOR_ABI, PROFIT_DISTRIBUTOR_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { calculateRoundRouting, getRoundStatus } from '../lib/rounds.js';

function formatAvax(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return `${Number(formatEther(value)).toLocaleString('en-US', { maximumFractionDigits: 4 })} AVAX`;
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
    const { data: fundLiquidityCoordinator } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'liquidityCoordinator',
    });
    const liquidityCoordinator = MAINNET.liquidityCoordinator ?? fundLiquidityCoordinator;
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
                <StatCard label="Round 1" value={getRoundStatus(round1)} detail={round1 ? `Raised ${formatAvax(round1.raisedAmount)} of ${formatAvax(round1.targetAmount)}` : 'No round data'} />
                <StatCard label="Round 2" value={getRoundStatus(round2)} detail={round2 ? `Raised ${formatAvax(round2.raisedAmount)}; routing bucket ${formatAvax(routing.routingBucket)}` : 'Not created yet'} />
                <StatCard label="Stable treasury" value={stableAccounting ? `${formatUnits(stableAccounting[2], 6)} USDT` : 'Unavailable'} detail={stableAccounting ? `LP accrual ${formatUnits(stableAccounting[5], 6)} USDT` : undefined} />
                <StatCard label="LP deployed" value={`${formatAvax((traderJoeAvaxLp ?? 0n) + (pharaohAvaxLp ?? 0n))}`} detail={`LFJ ${formatAvax(traderJoeAvaxLp)} / Pharaoh ${formatAvax(pharaohAvaxLp)}`} />
                <StatCard label="Profit distributed" value={formatAvax(totalProfitDeposited)} detail="Completed sale profit only, separate from round proceeds allocation." />
            </div>
        </div>
    );
}
