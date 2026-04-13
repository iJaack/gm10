import { useMemo } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { GM10_FUND_ABI } from '../data/contracts';
import {
    GM10_EXPLORER_BASE_URL,
    GM10_POSITION_IDS,
    GM10_PRIMARY_DEPLOYMENT,
    ROUND_1_END_AT,
    ROUND_1_START_AT,
    type Gm10ContractLink,
} from '../data/gm10Config';
import { BUY_PAGE_DEFAULTS } from '../data/protocol';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function formatUsdt6(value?: bigint) {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(formatUnits(value, 6)));
}

function formatAddress(address?: `0x${string}`) {
    if (!address) return 'Pending deployment';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function explorerUrl(address?: `0x${string}`) {
    return address ? `${GM10_EXPLORER_BASE_URL}/${address}` : GM10_EXPLORER_BASE_URL;
}

export function useFujiContracts(deployment = GM10_PRIMARY_DEPLOYMENT) {
    const proxyAddress = deployment.proxy.address;

    const { data: portfolioRegistry } = useReadContract({
        address: proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'portfolioRegistry',
        query: { enabled: Boolean(proxyAddress) },
    });

    const { data: investorAccounting } = useReadContract({
        address: proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'investorAccounting',
        query: { enabled: Boolean(proxyAddress) },
    });

    const links = useMemo<readonly Gm10ContractLink[]>(() => [
        deployment.proxy,
        {
            label: deployment.portfolioRegistry.label,
            address: (portfolioRegistry ?? deployment.portfolioRegistry.address) as `0x${string}` | undefined,
            snowtraceUrl: explorerUrl((portfolioRegistry ?? deployment.portfolioRegistry.address) as `0x${string}` | undefined),
        },
        {
            label: deployment.investorAccounting.label,
            address: (investorAccounting ?? deployment.investorAccounting.address) as `0x${string}` | undefined,
            snowtraceUrl: explorerUrl((investorAccounting ?? deployment.investorAccounting.address) as `0x${string}` | undefined),
        },
    ], [deployment, investorAccounting, portfolioRegistry]);

    return {
        proxyAddress,
        portfolioRegistryAddress: (portfolioRegistry ?? deployment.portfolioRegistry.address) as `0x${string}` | undefined,
        investorAccountingAddress: (investorAccounting ?? deployment.investorAccounting.address) as `0x${string}` | undefined,
        links,
    };
}

export function useFujiRoundState() {
    const { links, proxyAddress } = useFujiContracts(GM10_PRIMARY_DEPLOYMENT);

    const { data: currentRoundId } = useReadContract({
        address: proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'currentRoundId',
        query: { enabled: Boolean(proxyAddress) },
    });

    const roundId = currentRoundId ? Number(currentRoundId) : 1;

    const { data: round } = useReadContract({
        address: proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'getRound',
        args: [BigInt(roundId)],
        query: { enabled: Boolean(proxyAddress) },
    });

    const now = Math.floor(Date.now() / 1000);
    const startsAt = round ? Number(round.startTime) : ROUND_1_START_AT;
    const endsAt = round ? Number(round.endTime) : ROUND_1_END_AT;
    const raisedAmount = round ? round.raisedAmount : 0n;
    const targetAmount = round ? round.targetAmount : BigInt(Math.floor(BUY_PAGE_DEFAULTS.targetAvax * 1e18));
    const capReached = targetAmount > 0n && raisedAmount >= targetAmount;
    const isUpcoming = now < startsAt;
    const isClosedByTime = now > endsAt;
    const isClosed = capReached || isClosedByTime || Boolean(round?.isFinalized);
    const isRoundOpen = Boolean(round?.isActive ?? true) && !isUpcoming && !isClosed;

    const status = isClosed
        ? 'Closed'
        : isUpcoming
            ? 'Upcoming'
            : isRoundOpen
                ? 'Open'
                : 'Inactive';

    const progress = targetAmount > 0n
        ? Math.min((Number(raisedAmount) / Number(targetAmount)) * 100, 100)
        : 0;

    return {
        links,
        roundId,
        round,
        status,
        progress,
        isUpcoming,
        isClosed,
        isCapReached: capReached,
        isRoundOpen,
        startsAt,
        endsAt,
        targetLabel: round ? `${Number(formatEther(round.targetAmount)).toLocaleString('en-US')} AVAX` : `${BUY_PAGE_DEFAULTS.targetAvax.toLocaleString('en-US')} AVAX`,
        raisedLabel: round ? `${Number(formatEther(round.raisedAmount)).toLocaleString('en-US')} AVAX` : '0 AVAX',
        priceLabel: round ? `${Number(formatEther(round.tokenPrice))} AVAX` : `${BUY_PAGE_DEFAULTS.priceAvax} AVAX`,
        minMaxLabel: round
            ? `${Number(formatEther(round.minInvestment))} to ${Number(formatEther(round.maxInvestment))} AVAX`
            : `${BUY_PAGE_DEFAULTS.minAvax} to ${BUY_PAGE_DEFAULTS.maxAvax} AVAX`,
    };
}

export function useFujiPortfolioPositions() {
    const contractState = useFujiContracts(GM10_PRIMARY_DEPLOYMENT);
    const { address } = useAccount();

    const { data: stableAccounting } = useReadContract({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'stableAccounting',
        query: { enabled: Boolean(contractState.proxyAddress) },
    });

    const { data: referenceNav } = useReadContract({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'referenceNavPerTokenUsdt6',
        query: { enabled: Boolean(contractState.proxyAddress) },
    });

    const { data: circulatingSupply } = useReadContract({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'totalSupply',
        query: { enabled: Boolean(contractState.proxyAddress) },
    });

    const { data: profitEligibleSupply } = useReadContract({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'profitEligibleSupply18',
        query: { enabled: Boolean(contractState.proxyAddress) },
    });

    const { data: claimableProfit } = useReadContract({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'claimableProfit',
        args: [address ?? ZERO_ADDRESS],
        query: { enabled: Boolean(contractState.proxyAddress && address) },
    });

    const positionLinks = useMemo(() => {
        return GM10_POSITION_IDS.map((positionId) => ({
            positionId,
            chain: 'Avalanche Mainnet',
            collectionAddress: undefined,
            collectionLabel: formatAddress(undefined),
            snowtraceUrl: GM10_EXPLORER_BASE_URL,
            tokenId: 'Pending',
            acquisition: '$0.00',
            currentValue: '$0.00',
            statusLabel: 'Pending settlement',
        }));
    }, []);

    return {
        ...contractState,
        positions: positionLinks,
        collectiblePositionCount: 0,
        proofSummary: {
            holdingsLabel: 'Acquired cards will be shown here at the end of the fundraising round.',
            holdingsChipLabel: '0 acquired cards',
            portfolioValueLabel: stableAccounting ? formatUsdt6(stableAccounting[0]) : '$0.00',
            liquidTreasuryLabel: stableAccounting ? formatUsdt6(stableAccounting[2]) : '$0.00',
            referenceNavLabel: referenceNav !== undefined ? formatUsdt6(referenceNav) : '$0.00',
            circulatingSupplyLabel: circulatingSupply !== undefined ? `${Number(formatUnits(circulatingSupply, 18)).toLocaleString('en-US')} CATCH` : '0 CATCH',
            profitEligibleSupplyLabel: profitEligibleSupply !== undefined ? `${Number(formatUnits(profitEligibleSupply, 18)).toLocaleString('en-US')} CATCH` : '0 CATCH',
            claimableProfitLabel: claimableProfit !== undefined ? `${Number(formatEther(claimableProfit)).toLocaleString('en-US')} AVAX` : 'Connect wallet',
        },
    };
}
