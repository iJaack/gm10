import { useMemo } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { getClaimEligibilityState } from '../data/claimState';
import {
    CHAINLINK_AGGREGATOR_V3_ABI,
    GM10_ERC20_ABI,
    GM10_FUND_ABI,
    GM10_INVESTOR_ACCOUNTING_ABI,
    GM10_PROFIT_DISTRIBUTOR_ABI,
} from '../data/contracts';
import { GM10_MARKET_CONFIG, GM10_TREASURY_WALLETS } from '../data/gm10Config';
import { resolveLiquidTreasuryUsdt6 } from '../data/treasuryMath';
import { useFujiContracts } from './useFujiProof';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const HAS_PUBLIC_CLAIM_ACTION = false;

function formatUsdt6(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(formatUnits(value, 6)));
}

function formatSignedUsdt6(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    const prefix = value > 0n ? '+' : '';
    return `${prefix}${formatUsdt6(value)}`;
}

function formatCatch(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return `${Number(formatUnits(value, 18)).toLocaleString('en-US', { maximumFractionDigits: 4 })} CATCH`;
}

function formatAvax(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return `${Number(formatEther(value)).toLocaleString('en-US', { maximumFractionDigits: 6 })} AVAX`;
}

export function useHolderDashboard() {
    const { address, isConnected } = useAccount();
    const contracts = useFujiContracts();
    const account = address ?? ZERO_ADDRESS;

    const { data: profitDistributor } = useReadContract({
        address: contracts.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'profitDistributor',
        query: { enabled: Boolean(contracts.proxyAddress) },
    });

    const { data: navPerToken } = useReadContract({
        address: contracts.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'navPerTokenUsdt6',
        query: { enabled: Boolean(contracts.proxyAddress) },
    });

    const { data: referenceNav } = useReadContract({
        address: contracts.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'referenceNavPerTokenUsdt6',
        query: { enabled: Boolean(contracts.proxyAddress) },
    });

    const { data: totalSupply } = useReadContract({
        address: contracts.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'totalSupply',
        query: { enabled: Boolean(contracts.proxyAddress) },
    });

    const { data: profitEligibleSupply } = useReadContract({
        address: contracts.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'profitEligibleSupply18',
        query: { enabled: Boolean(contracts.proxyAddress) },
    });

    const { data: stableAccounting } = useReadContract({
        address: contracts.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'stableAccounting',
        query: { enabled: Boolean(contracts.proxyAddress) },
    });
    const { data: avaxUsdRoundData } = useReadContract({
        address: GM10_MARKET_CONFIG.avaxUsdFeedAddress ?? ZERO_ADDRESS,
        abi: CHAINLINK_AGGREGATOR_V3_ABI,
        functionName: 'latestRoundData',
        query: { enabled: Boolean(GM10_MARKET_CONFIG.avaxUsdFeedAddress) },
    });
    const { data: fundTreasuryBalance } = useBalance({
        address: contracts.proxyAddress ?? ZERO_ADDRESS,
        query: { enabled: Boolean(contracts.proxyAddress) },
    });
    const { data: treasurySafeBalance } = useBalance({
        address: GM10_TREASURY_WALLETS.treasurySafe.address ?? ZERO_ADDRESS,
        query: { enabled: Boolean(GM10_TREASURY_WALLETS.treasurySafe.address) },
    });
    const { data: liquidityCoordinatorBalance } = useBalance({
        address: GM10_TREASURY_WALLETS.liquidityCoordinator.address ?? ZERO_ADDRESS,
        query: { enabled: Boolean(GM10_TREASURY_WALLETS.liquidityCoordinator.address) },
    });
    const { data: courtyardWorkflowBalance } = useBalance({
        address: GM10_TREASURY_WALLETS.courtyardWorkflow.address ?? ZERO_ADDRESS,
        query: { enabled: Boolean(GM10_TREASURY_WALLETS.courtyardWorkflow.address) },
    });
    const { data: teamWalletBalance } = useBalance({
        address: GM10_TREASURY_WALLETS.teamWallet.address ?? ZERO_ADDRESS,
        query: { enabled: Boolean(GM10_TREASURY_WALLETS.teamWallet.address) },
    });

    const { data: catchBalance } = useReadContract({
        address: GM10_MARKET_CONFIG.catchTokenAddress ?? ZERO_ADDRESS,
        abi: GM10_ERC20_ABI,
        functionName: 'balanceOf',
        args: [account],
        query: { enabled: Boolean(GM10_MARKET_CONFIG.catchTokenAddress && isConnected) },
    });

    const { data: fundClaimableProfit } = useReadContract({
        address: contracts.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'claimableProfit',
        args: [account],
        query: { enabled: Boolean(contracts.proxyAddress && isConnected) },
    });

    const distributorAddress = profitDistributor && profitDistributor !== ZERO_ADDRESS
        ? profitDistributor as `0x${string}`
        : undefined;

    const { data: isExcluded } = useReadContract({
        address: distributorAddress ?? ZERO_ADDRESS,
        abi: GM10_PROFIT_DISTRIBUTOR_ABI,
        functionName: 'excludedFromProfitShare',
        args: [account],
        query: { enabled: Boolean(distributorAddress && isConnected) },
    });

    const { data: distributorClaimableProfit } = useReadContract({
        address: distributorAddress ?? ZERO_ADDRESS,
        abi: GM10_PROFIT_DISTRIBUTOR_ABI,
        functionName: 'claimableProfit',
        args: [account],
        query: { enabled: Boolean(distributorAddress && isConnected) },
    });

    const { data: totalProfitDeposited } = useReadContract({
        address: distributorAddress ?? ZERO_ADDRESS,
        abi: GM10_PROFIT_DISTRIBUTOR_ABI,
        functionName: 'totalProfitDepositedWei',
        query: { enabled: Boolean(distributorAddress) },
    });

    const { data: investorPnl } = useReadContract({
        address: contracts.investorAccountingAddress ?? ZERO_ADDRESS,
        abi: GM10_INVESTOR_ACCOUNTING_ABI,
        functionName: 'getInvestorPnl',
        args: [account, navPerToken ?? 0n],
        query: { enabled: Boolean(contracts.investorAccountingAddress && isConnected && navPerToken !== undefined) },
    });

    const claimableProfit = distributorClaimableProfit ?? fundClaimableProfit;
    const claimState = useMemo(() => getClaimEligibilityState({
        isConnected,
        isExcluded,
        claimableProfitWei: claimableProfit,
        hasClaimAction: HAS_PUBLIC_CLAIM_ACTION,
    }), [claimableProfit, isConnected, isExcluded]);
    const avaxUsd = avaxUsdRoundData && avaxUsdRoundData[1] > 0n
        ? Number(formatUnits(avaxUsdRoundData[1], 8))
        : 0;
    const liquidTreasuryUsdt6 = useMemo(() => resolveLiquidTreasuryUsdt6({
        walletBalancesWei: [
            fundTreasuryBalance?.value,
            treasurySafeBalance?.value,
            liquidityCoordinatorBalance?.value,
            courtyardWorkflowBalance?.value,
            teamWalletBalance?.value,
        ],
        avaxUsd,
        stableAccountingLiquidTreasury: stableAccounting?.[2],
    }), [
        avaxUsd,
        courtyardWorkflowBalance?.value,
        fundTreasuryBalance?.value,
        liquidityCoordinatorBalance?.value,
        stableAccounting,
        teamWalletBalance?.value,
        treasurySafeBalance?.value,
    ]);

    return {
        account: address,
        isConnected,
        claimState,
        labels: {
            totalSupply: formatCatch(totalSupply),
            profitEligibleSupply: formatCatch(profitEligibleSupply),
            referenceNav: formatUsdt6(referenceNav),
            navPerToken: formatUsdt6(navPerToken),
            catchBalance: isConnected ? formatCatch(catchBalance) : 'Connect wallet',
            claimableProfit: isConnected ? formatAvax(claimableProfit) : 'Connect wallet',
            claimedProfit: isConnected ? formatAvax(investorPnl?.claimedProfitWei) : 'Connect wallet',
            totalProfitDeposited: formatAvax(totalProfitDeposited),
            currentReferenceValue: isConnected ? formatUsdt6(investorPnl?.currentReferenceValueUsdt6) : 'Connect wallet',
            unrealizedReferencePnl: isConnected ? formatSignedUsdt6(investorPnl?.unrealizedReferencePnlUsdt6) : 'Connect wallet',
            remainingCostBasis: isConnected ? formatUsdt6(investorPnl?.remainingCostBasisUsdt6) : 'Connect wallet',
            liquidTreasury: formatUsdt6(liquidTreasuryUsdt6),
            holderDistributionAccrued: stableAccounting ? formatUsdt6(stableAccounting[6]) : 'Unavailable',
            // stableAccounting[4] = liquidityCatchBuyAccrued — sale-profit funds reserved to market-buy $CATCH for LP.
            liquidityCatchBuyAccrued: stableAccounting ? formatUsdt6(stableAccounting[4]) : 'Unavailable',
            // stableAccounting[5] = liquidityAvaxPairingAccrued — sale-profit funds reserved for the AVAX side of LP.
            liquidityAvaxPairingAccrued: stableAccounting ? formatUsdt6(stableAccounting[5]) : 'Unavailable',
        },
        raw: {
            profitDistributor: distributorAddress,
            isExcluded,
            claimableProfit,
            catchBalance,
            investorPnl,
            referenceNav,
            navPerToken,
        },
    };
}
