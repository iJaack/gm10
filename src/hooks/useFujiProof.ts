import { useMemo } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { metadataForPosition } from '../data/cardPortfolio';
import { GM10_FUND_ABI, GM10_PORTFOLIO_REGISTRY_ABI } from '../data/contracts';
import { calculatePortfolioValueSummary, type PlatformNavState } from '../data/portfolioMath';
import {
    GM10_EXPLORER_BASE_URL,
    GM10_PRIMARY_DEPLOYMENT,
    ROUND_1_END_AT,
    ROUND_1_START_AT,
    type Gm10ContractLink,
} from '../data/gm10Config';
import { BUY_PAGE_DEFAULTS } from '../data/protocol';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const MAX_PUBLIC_POSITIONS = 40;
const DEFAULT_PLATFORM_NAV: PlatformNavState = { status: 'unavailable' };

function formatUsdt6(value?: bigint) {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
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

function chainLabel(chainEid?: number) {
    if (chainEid === 30109) return 'Polygon';
    if (chainEid === 30106) return 'Avalanche';
    return chainEid ? `LayerZero EID ${chainEid}` : 'Unknown chain';
}

function positionStatusLabel(status: number) {
    if (status === 1) return 'Active';
    if (status === 2) return 'Sold';
    if (status === 3) return 'Archived';
    return 'Pending';
}

function formatDate(timestamp: bigint) {
    if (timestamp === 0n) return 'Pending';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(Number(timestamp) * 1000));
}

type CollectiblePositionTuple = {
    id: bigint;
    chainEid: number;
    evmCollection: `0x${string}`;
    tokenId: bigint;
    acquisitionPriceUsdt6: bigint;
    currentValueUsdt6: bigint;
    lastNavMarkUsdt6: bigint;
    acquisitionDate: bigint;
    lastValuationAt: bigint;
    status: number;
};

export type Gm10PortfolioPosition = {
    positionId: number;
    title: string;
    subtitle?: string;
    imageSrc: string;
    imageAlt: string;
    note?: string;
    chain: string;
    collectionAddress?: `0x${string}`;
    collectionLabel: string;
    snowtraceUrl: string;
    tokenId: string;
    acquisition: string;
    currentValue: string;
    lastNavMark: string;
    acquisitionDateLabel: string;
    lastValuationLabel: string;
    statusLabel: string;
    acquisitionPriceUsdt6: bigint;
    currentValueUsdt6: bigint;
    courtyardUrl?: string;
    proofUrl?: string;
};

export type Gm10PortfolioActivity = {
    id: string;
    type: 'Buy' | 'Sell' | 'Mark update' | 'Custody move';
    item: string;
    date: string;
    amount: string;
    detail: string;
};

function normalizePosition(raw: CollectiblePositionTuple): Gm10PortfolioPosition {
    const positionId = Number(raw.id);
    const metadata = metadataForPosition(positionId);

    return {
        positionId,
        title: metadata.title,
        subtitle: metadata.subtitle,
        imageSrc: metadata.imageSrc,
        imageAlt: metadata.imageAlt,
        note: metadata.note,
        chain: chainLabel(Number(raw.chainEid)),
        collectionAddress: raw.evmCollection,
        collectionLabel: formatAddress(raw.evmCollection),
        snowtraceUrl: explorerUrl(raw.evmCollection),
        tokenId: raw.tokenId.toString(),
        acquisition: formatUsdt6(raw.acquisitionPriceUsdt6),
        currentValue: formatUsdt6(raw.currentValueUsdt6),
        lastNavMark: formatUsdt6(raw.lastNavMarkUsdt6),
        acquisitionDateLabel: formatDate(raw.acquisitionDate),
        lastValuationLabel: formatDate(raw.lastValuationAt),
        statusLabel: positionStatusLabel(Number(raw.status)),
        acquisitionPriceUsdt6: raw.acquisitionPriceUsdt6,
        currentValueUsdt6: raw.currentValueUsdt6,
        courtyardUrl: metadata.courtyardUrl,
        proofUrl: metadata.proofUrl,
    };
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

export function useFujiPortfolioPositions(platformNav: PlatformNavState = DEFAULT_PLATFORM_NAV) {
    const contractState = useFujiContracts(GM10_PRIMARY_DEPLOYMENT);
    const { address } = useAccount();

    const { data: collectiblePositionCount } = useReadContract({
        address: contractState.portfolioRegistryAddress ?? ZERO_ADDRESS,
        abi: GM10_PORTFOLIO_REGISTRY_ABI,
        functionName: 'collectiblePositionCount',
        query: { enabled: Boolean(contractState.portfolioRegistryAddress) },
    });

    const positionIds = useMemo(() => {
        const count = collectiblePositionCount ? Math.min(Number(collectiblePositionCount), MAX_PUBLIC_POSITIONS) : 0;
        return Array.from({ length: count }, (_, index) => BigInt(index + 1));
    }, [collectiblePositionCount]);

    const positionContracts = useMemo(() => positionIds.map((positionId) => ({
        address: contractState.portfolioRegistryAddress ?? ZERO_ADDRESS,
        abi: GM10_PORTFOLIO_REGISTRY_ABI,
        functionName: 'getCollectiblePosition',
        args: [positionId],
    } as const)), [contractState.portfolioRegistryAddress, positionIds]);

    const { data: positionReads } = useReadContracts({
        contracts: positionContracts,
        query: { enabled: Boolean(contractState.portfolioRegistryAddress && positionContracts.length > 0) },
    });

    const { data: stableAccounting } = useReadContract({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'stableAccounting',
        query: { enabled: Boolean(contractState.proxyAddress) },
    });

    const { data: navPerToken } = useReadContract({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'navPerTokenUsdt6',
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

    const positions = useMemo(() => (positionReads ?? [])
        .flatMap((read) => {
            if (read.status !== 'success' || !read.result) return [];
            return [normalizePosition(read.result as CollectiblePositionTuple)];
        })
        .sort((a, b) => a.positionId - b.positionId), [positionReads]);

    const valueSummary = useMemo(
        () => calculatePortfolioValueSummary(positions, platformNav),
        [platformNav, positions],
    );

    const activity = useMemo<Gm10PortfolioActivity[]>(() => positions
        .map((position) => ({
            id: `buy-${position.positionId}`,
            type: 'Buy' as const,
            item: position.title,
            date: position.acquisitionDateLabel,
            amount: position.acquisition,
            detail: `${position.chain} position #${position.positionId}`,
        }))
        .sort((a, b) => b.id.localeCompare(a.id)), [positions]);

    return {
        ...contractState,
        positions,
        activity,
        valueSummary,
        stableAccounting,
        navPerToken,
        referenceNav,
        circulatingSupply,
        profitEligibleSupply,
        claimableProfit,
        collectiblePositionCount: collectiblePositionCount ? Number(collectiblePositionCount) : positions.length,
        proofSummary: {
            holdingsLabel: positions.length > 0 ? `${positions.length} recorded card positions` : 'No recorded card positions yet.',
            holdingsChipLabel: `${positions.length} acquired card${positions.length === 1 ? '' : 's'}`,
            costBasisLabel: formatUsdt6(valueSummary.costBasisUsdt6),
            onchainCurrentMarkLabel: formatUsdt6(valueSummary.onchainCurrentMarkUsdt6),
            platformNavLabel: valueSummary.platformNavUsdt6 !== undefined ? formatUsdt6(valueSummary.platformNavUsdt6) : 'Unavailable',
            unrealizedPnlLabel: formatUsdt6(valueSummary.unrealizedPnlUsdt6),
            unrealizedSourceLabel: valueSummary.unrealizedSource === 'courtyard' ? 'Courtyard profile NAV' : 'Onchain registry mark',
            portfolioValueLabel: stableAccounting ? formatUsdt6(stableAccounting[0]) : '$0.00',
            liquidTreasuryLabel: stableAccounting ? formatUsdt6(stableAccounting[2]) : '$0.00',
            referenceNavLabel: referenceNav !== undefined ? formatUsdt6(referenceNav) : '$0.00',
            navPerTokenLabel: navPerToken !== undefined ? formatUsdt6(navPerToken) : '$0.00',
            circulatingSupplyLabel: circulatingSupply !== undefined ? `${Number(formatUnits(circulatingSupply, 18)).toLocaleString('en-US')} CATCH` : '0 CATCH',
            profitEligibleSupplyLabel: profitEligibleSupply !== undefined ? `${Number(formatUnits(profitEligibleSupply, 18)).toLocaleString('en-US')} CATCH` : '0 CATCH',
            claimableProfitLabel: claimableProfit !== undefined ? `${Number(formatEther(claimableProfit)).toLocaleString('en-US')} AVAX` : 'Connect wallet',
        },
    };
}
