import { useEffect, useMemo, useState } from 'react';
import { formatEther, formatUnits, parseAbiItem } from 'viem';
import { polygon } from 'wagmi/chains';
import { useAccount, useBalance, usePublicClient, useReadContract, useReadContracts } from 'wagmi';
import { metadataForPosition, type CardMetadata } from '../data/cardPortfolio';
import { CHAINLINK_AGGREGATOR_V3_ABI, GM10_ERC20_ABI, GM10_ERC721_ABI, GM10_FUND_ABI, GM10_PORTFOLIO_REGISTRY_ABI, GM10_TOKENOMICS_CONTROLLER_ABI } from '../data/contracts';
import { calculatePortfolioValueSummary, type PlatformNavState } from '../data/portfolioMath';
import {
    normalizePublicValuationOverrides,
    publicValuationUrl,
    type PublicValuationOverride,
    type PublicValuationResponse,
} from '../data/publicValuation';
import {
    GM10_EXPLORER_BASE_URL,
    GM10_EXPLORER_TX_BASE_URL,
    GM10_COURTYARD_CUSTODY,
    GM10_CHAIN_ID,
    GM10_MARKET_CONFIG,
    GM10_PRIMARY_DEPLOYMENT,
    GM10_TREASURY_WALLETS,
    LZ_EID_POLYGON,
    ROUND_2_END_AT,
    ROUND_2_START_AT,
    collectionExplorerUrl,
    type Gm10ContractLink,
} from '../data/gm10Config';
import { resolveHolderAccounting } from '../data/holderAccounting';
import { BUY_PAGE_DEFAULTS } from '../data/protocol';
import { resolveLiquidTreasuryUsdt6 } from '../data/treasuryMath';
import { useAvaxPrice } from './useAvaxPrice';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const MAX_PUBLIC_POSITIONS = 40;
const DEFAULT_PLATFORM_NAV: PlatformNavState = { status: 'unavailable' };
const AVAX_WEI = 10n ** 18n;
const PUBLIC_VALUATION_REFRESH_INTERVAL_MS = 30_000;
const ROUND_STATE_REFRESH_INTERVAL_MS = 15_000;
const SALE_ACTIVITY_REFRESH_INTERVAL_MS = 30_000;
const PORTFOLIO_REGISTRY_EVENTS_FROM_BLOCK = 85_000_000n;
const PORTFOLIO_REGISTRY_LOG_CHUNK_SIZE = 1_000_000n;
const SALE_FINALIZED_EVENT = parseAbiItem('event SaleFinalized(bytes32 indexed saleKey, uint256 indexed positionId, uint256 markedValueUsdt6, uint256 netProceedsUsdt6)');

const ROUND_2_PLANNED_ROUND = {
    roundId: BigInt(BUY_PAGE_DEFAULTS.roundId),
    targetAmount: 5_000n * AVAX_WEI,
    raisedAmount: 1_353_983_600_000_000_000_000n,
    tokenPrice: 3_500_000_000_000_000n,
    minInvestment: AVAX_WEI / 10n,
    maxInvestment: 500n * AVAX_WEI,
    startTime: BigInt(ROUND_2_START_AT),
    endTime: BigInt(ROUND_2_END_AT),
    isActive: false,
    isFinalized: true,
} as const;

export type Gm10RoundData = {
    roundId: bigint;
    targetAmount: bigint;
    raisedAmount: bigint;
    tokenPrice: bigint;
    minInvestment: bigint;
    maxInvestment: bigint;
    startTime: bigint;
    endTime: bigint;
    isActive: boolean;
    isFinalized: boolean;
};

function hasRoundData<T extends { targetAmount: bigint }>(round?: T): round is T {
    return Boolean(round && round.targetAmount > 0n);
}

export function deriveFujiRoundState({
    round2,
    now = Math.floor(Date.now() / 1000),
    fallbackRound = ROUND_2_PLANNED_ROUND,
    roundId = BUY_PAGE_DEFAULTS.roundId,
}: {
    round2?: Gm10RoundData;
    now?: number;
    fallbackRound?: Gm10RoundData;
    roundId?: number;
}) {
    const hasOnchainRound2 = hasRoundData(round2);
    const round = hasOnchainRound2 ? round2 : fallbackRound;
    const isPublishedFallback = !hasOnchainRound2 && Boolean(fallbackRound.isFinalized);
    const startsAt = Number(round.startTime);
    const endsAt = Number(round.endTime);
    const raisedAmount = round.raisedAmount;
    const targetAmount = round.targetAmount;
    const capReached = targetAmount > 0n && raisedAmount >= targetAmount;
    const isUpcoming = now < startsAt;
    const isClosedByTime = now > endsAt;
    const isClosed = (hasOnchainRound2 || isPublishedFallback) && (capReached || isClosedByTime || Boolean(round.isFinalized));
    const isRoundOpen = hasOnchainRound2 && Boolean(round.isActive) && !isUpcoming && !isClosed;

    const plannedStatus = isUpcoming
        ? 'Round 2 setup pending'
        : isClosedByTime
            ? 'Round 2 setup delayed'
            : 'Round 2 setup in progress';
    const status = isPublishedFallback
        ? 'Finalized'
        : !hasOnchainRound2
        ? plannedStatus
        : isClosed
        ? capReached || Boolean(round.isFinalized)
            ? 'Finalized'
            : 'Closed'
        : isUpcoming
            ? 'Upcoming'
            : isRoundOpen
                ? 'Open'
                : 'Inactive';

    return {
        roundId,
        round,
        roundSource: hasOnchainRound2 ? 'onchain' as const : isPublishedFallback ? 'published' as const : 'planned' as const,
        isPlanned: !hasOnchainRound2 && !isPublishedFallback,
        status,
        isUpcoming,
        isClosed,
        isCapReached: capReached,
        isRoundOpen,
        startsAt,
        endsAt,
    };
}

function formatUsdt6(value?: bigint) {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(formatUnits(value, 6)));
}

function formatPercent(value: number) {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
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

export function isPortfolioHoldingStatus(status: number) {
    return status === 1;
}

export function resolvePositionCurrentValueUsdt6({
    registryStatus,
    registryCurrentValueUsdt6,
    valuationOverrideValueUsdt6,
}: {
    registryStatus: number;
    registryCurrentValueUsdt6: bigint;
    valuationOverrideValueUsdt6?: bigint;
}) {
    return registryStatus === 1
        ? valuationOverrideValueUsdt6 ?? registryCurrentValueUsdt6
        : registryCurrentValueUsdt6;
}

function formatDate(timestamp: bigint) {
    if (timestamp === 0n) return 'Pending';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(Number(timestamp) * 1000));
}

function formatOptionalIsoDate(value?: string) {
    if (!value) return undefined;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return undefined;
    return formatDate(BigInt(Math.floor(timestamp / 1000)));
}

export type Gm10PortfolioSaleActivity = {
    saleKey?: `0x${string}`;
    netProceedsUsdt6: bigint;
    finalizedAt: number;
    blockNumber: bigint;
    logIndex: number;
};

type SaleFinalizedLogForActivity = {
    args?: {
        saleKey?: `0x${string}`;
        positionId?: bigint;
        netProceedsUsdt6?: bigint;
    };
    blockNumber?: bigint | null;
    logIndex?: number | bigint | string | null;
};

export function resolvePortfolioSaleActivityFromLogs(
    logs: readonly SaleFinalizedLogForActivity[],
    blockTimestamps: Record<string, bigint | number | undefined>,
) {
    const activityByPositionId: Record<number, Gm10PortfolioSaleActivity> = {};

    logs.forEach((log) => {
        const positionIdBigInt = log.args?.positionId;
        const netProceedsUsdt6 = log.args?.netProceedsUsdt6;
        const blockNumber = log.blockNumber;
        if (positionIdBigInt === undefined || netProceedsUsdt6 === undefined || blockNumber === undefined || blockNumber === null) return;

        const positionId = Number(positionIdBigInt);
        if (!Number.isSafeInteger(positionId) || positionId <= 0) return;

        const timestamp = blockTimestamps[blockNumber.toString()];
        const finalizedAt = typeof timestamp === 'bigint' ? Number(timestamp) : Number(timestamp ?? 0);
        const logIndex = Number(log.logIndex ?? 0);
        const current = activityByPositionId[positionId];
        const isOlderLog = current
            && (current.blockNumber > blockNumber || (current.blockNumber === blockNumber && current.logIndex >= logIndex));
        if (isOlderLog) return;

        activityByPositionId[positionId] = {
            saleKey: log.args?.saleKey,
            netProceedsUsdt6,
            finalizedAt,
            blockNumber,
            logIndex,
        };
    });

    return activityByPositionId;
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
    metadataHash: `0x${string}`;
    proofHash: `0x${string}`;
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
    acquisitionTimestamp: number;
    lastValuationLabel: string;
    statusLabel: string;
    registryStatusLabel: string;
    custodyStatus: 'safe' | 'hot-wallet' | 'external' | 'unknown';
    custodyLabel: string;
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
    sortTimestamp?: number;
};

export function sortPortfolioActivityNewestFirst(activity: Gm10PortfolioActivity[]) {
    return [...activity].sort((a, b) => {
        const aTime = a.sortTimestamp ?? 0;
        const bTime = b.sortTimestamp ?? 0;
        if (aTime !== bTime) return bTime - aTime;
        return b.id.localeCompare(a.id);
    });
}

export function resolvePortfolioActivityType(registryStatusLabel: string): Gm10PortfolioActivity['type'] {
    return registryStatusLabel === 'Sold' || registryStatusLabel === 'Archived' ? 'Sell' : 'Buy';
}

function positionMetadataKey(raw: CollectiblePositionTuple) {
    return `${Number(raw.chainEid)}:${raw.evmCollection.toLowerCase()}:${raw.tokenId.toString()}`;
}

function normalizeAddress(value?: `0x${string}` | string) {
    return value?.toLowerCase();
}

export function resolveCardCustody({
    chainEid,
    registryStatus,
    owner,
    safeAddress = GM10_COURTYARD_CUSTODY.polygonSafe.address,
    hotWalletAddress = GM10_COURTYARD_CUSTODY.polygonHotWallet.address,
}: {
    chainEid: number;
    registryStatus: number;
    owner?: `0x${string}` | string;
    safeAddress?: `0x${string}`;
    hotWalletAddress?: `0x${string}`;
}): Pick<Gm10PortfolioPosition, 'custodyStatus' | 'custodyLabel' | 'statusLabel' | 'registryStatusLabel'> {
    const registryStatusLabel = positionStatusLabel(registryStatus);
    if (registryStatus !== 1 || chainEid !== LZ_EID_POLYGON) {
        return {
            custodyStatus: registryStatus === 1 ? 'unknown' : 'external',
            custodyLabel: registryStatusLabel,
            statusLabel: registryStatusLabel,
            registryStatusLabel,
        };
    }

    const normalizedOwner = normalizeAddress(owner);
    if (normalizedOwner && normalizedOwner === normalizeAddress(hotWalletAddress)) {
        return {
            custodyStatus: 'hot-wallet',
            custodyLabel: 'Hot wallet',
            statusLabel: 'PENDING TRANSFER',
            registryStatusLabel,
        };
    }

    if (normalizedOwner && normalizedOwner === normalizeAddress(safeAddress)) {
        return {
            custodyStatus: 'safe',
            custodyLabel: 'Safe custody',
            statusLabel: registryStatusLabel,
            registryStatusLabel,
        };
    }

    return {
        custodyStatus: 'unknown',
        custodyLabel: 'Custody checking',
        statusLabel: registryStatusLabel,
        registryStatusLabel,
    };
}

function normalizePosition(
    raw: CollectiblePositionTuple,
    liveMetadata?: CardMetadata,
    valuationOverride?: PublicValuationOverride,
    owner?: `0x${string}`,
): Gm10PortfolioPosition {
    const positionId = Number(raw.id);
    const metadata = metadataForPosition(positionId, liveMetadata);
    const activeValuationOverride = Number(raw.status) === 1 ? valuationOverride : undefined;
    const currentValueUsdt6 = resolvePositionCurrentValueUsdt6({
        registryStatus: Number(raw.status),
        registryCurrentValueUsdt6: raw.currentValueUsdt6,
        valuationOverrideValueUsdt6: activeValuationOverride?.valueUsdt6,
    });
    const lastValuationLabel = formatOptionalIsoDate(activeValuationOverride?.generatedAt) ?? formatDate(raw.lastValuationAt);
    const custody = resolveCardCustody({
        chainEid: Number(raw.chainEid),
        registryStatus: Number(raw.status),
        owner,
    });

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
        snowtraceUrl: collectionExplorerUrl(Number(raw.chainEid), raw.evmCollection, raw.tokenId),
        tokenId: raw.tokenId.toString(),
        acquisition: formatUsdt6(raw.acquisitionPriceUsdt6),
        currentValue: formatUsdt6(currentValueUsdt6),
        lastNavMark: formatUsdt6(raw.lastNavMarkUsdt6),
        acquisitionDateLabel: formatDate(raw.acquisitionDate),
        acquisitionTimestamp: Number(raw.acquisitionDate),
        lastValuationLabel,
        ...custody,
        acquisitionPriceUsdt6: raw.acquisitionPriceUsdt6,
        currentValueUsdt6,
        courtyardUrl: metadata.courtyardUrl,
        proofUrl: activeValuationOverride?.submittedTxHash
            ? `${GM10_EXPLORER_TX_BASE_URL}/${activeValuationOverride.submittedTxHash}`
            : metadata.proofUrl,
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
        query: { enabled: Boolean(proxyAddress), refetchInterval: ROUND_STATE_REFRESH_INTERVAL_MS },
    });

    const { data: round2 } = useReadContract({
        address: proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'getRound',
        args: [BigInt(BUY_PAGE_DEFAULTS.roundId)],
        query: { enabled: Boolean(proxyAddress), refetchInterval: ROUND_STATE_REFRESH_INTERVAL_MS },
    });

    const { data: round1Archive } = useReadContract({
        address: proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'getRound',
        args: [1n],
        query: { enabled: Boolean(proxyAddress), refetchInterval: ROUND_STATE_REFRESH_INTERVAL_MS },
    });

    const derivedRound = deriveFujiRoundState({
        round2: hasRoundData(round2) ? round2 : undefined,
        now: Math.floor(Date.now() / 1000),
        fallbackRound: ROUND_2_PLANNED_ROUND,
        roundId: BUY_PAGE_DEFAULTS.roundId,
    });
    const { round } = derivedRound;
    const raisedAmount = round.raisedAmount;
    const targetAmount = round.targetAmount;

    const progress = targetAmount > 0n
        ? Math.min((Number(raisedAmount) / Number(targetAmount)) * 100, 100)
        : 0;

    return {
        links,
        currentRoundId: currentRoundId ? Number(currentRoundId) : undefined,
        ...derivedRound,
        archiveRound: hasRoundData(round1Archive) ? round1Archive : undefined,
        progress,
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
    const publicClient = usePublicClient({ chainId: GM10_CHAIN_ID });
    const fallbackAvaxUsd = useAvaxPrice();
    const [liveMetadataByKey, setLiveMetadataByKey] = useState<Record<string, CardMetadata>>({});
    const [publicValuationOverrides, setPublicValuationOverrides] = useState<Record<number, PublicValuationOverride>>({});
    const [saleActivityByPositionId, setSaleActivityByPositionId] = useState<Record<number, Gm10PortfolioSaleActivity>>({});

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

    const { data: avaxUsdRoundData } = useReadContract({
        address: GM10_MARKET_CONFIG.avaxUsdFeedAddress ?? ZERO_ADDRESS,
        abi: CHAINLINK_AGGREGATOR_V3_ABI,
        functionName: 'latestRoundData',
        query: { enabled: Boolean(GM10_MARKET_CONFIG.avaxUsdFeedAddress) },
    });

    const { data: fundTreasuryBalance } = useBalance({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        query: { enabled: Boolean(contractState.proxyAddress) },
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
        address: GM10_MARKET_CONFIG.tokenomicsControllerAddress ?? contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_MARKET_CONFIG.tokenomicsControllerAddress ? GM10_TOKENOMICS_CONTROLLER_ABI : GM10_FUND_ABI,
        functionName: 'profitEligibleSupply18',
        query: { enabled: Boolean(GM10_MARKET_CONFIG.tokenomicsControllerAddress || contractState.proxyAddress) },
    });
    const excludedSupplyAddresses = useMemo(() => {
        const addresses = [
            contractState.proxyAddress,
            GM10_TREASURY_WALLETS.treasurySafe.address,
            GM10_TREASURY_WALLETS.liquidityCoordinator.address,
            GM10_TREASURY_WALLETS.courtyardWorkflow.address,
            GM10_TREASURY_WALLETS.teamWallet.address,
            GM10_MARKET_CONFIG.lfjPairAddress,
            GM10_MARKET_CONFIG.pharaohPoolAddress,
        ].filter((value): value is `0x${string}` => Boolean(value && value !== ZERO_ADDRESS));
        const seen = new Set<string>();

        return addresses.filter((value) => {
            const key = value.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [contractState.proxyAddress]);
    const { data: excludedSupplyReads } = useReadContracts({
        contracts: excludedSupplyAddresses.map((excludedAddress) => ({
            address: GM10_MARKET_CONFIG.catchTokenAddress ?? ZERO_ADDRESS,
            abi: GM10_ERC20_ABI,
            functionName: 'balanceOf',
            args: [excludedAddress],
        })),
        query: { enabled: Boolean(GM10_MARKET_CONFIG.catchTokenAddress && excludedSupplyAddresses.length > 0) },
    });
    const excludedSupplyBalances = useMemo(() => (excludedSupplyReads ?? []).map((read) => (
        read.status === 'success' ? read.result as bigint : undefined
    )), [excludedSupplyReads]);

    const { data: claimableProfit } = useReadContract({
        address: contractState.proxyAddress ?? ZERO_ADDRESS,
        abi: GM10_FUND_ABI,
        functionName: 'claimableProfit',
        args: [address ?? ZERO_ADDRESS],
        query: { enabled: Boolean(contractState.proxyAddress && address) },
    });

    const rawPositions = useMemo(() => (positionReads ?? [])
        .flatMap((read) => {
            if (read.status !== 'success' || !read.result) return [];
            return [read.result as CollectiblePositionTuple];
        })
        .sort((a, b) => Number(a.id) - Number(b.id)), [positionReads]);
    const holdingRawPositions = useMemo(() => rawPositions.filter((position) => (
        isPortfolioHoldingStatus(Number(position.status))
    )), [rawPositions]);

    const custodyReadPositions = useMemo(() => holdingRawPositions.filter((position) => (
        Number(position.chainEid) === LZ_EID_POLYGON
        && position.evmCollection !== ZERO_ADDRESS
    )), [holdingRawPositions]);

    const custodyContracts = useMemo(() => custodyReadPositions.map((position) => ({
        address: position.evmCollection,
        abi: GM10_ERC721_ABI,
        functionName: 'ownerOf',
        args: [position.tokenId],
        chainId: polygon.id,
    } as const)), [custodyReadPositions]);

    const { data: custodyReads } = useReadContracts({
        contracts: custodyContracts,
        query: {
            enabled: custodyContracts.length > 0,
            refetchInterval: 30_000,
        },
    });

    const ownerByPositionKey = useMemo(() => {
        const owners: Record<string, `0x${string}`> = {};
        (custodyReads ?? []).forEach((read, index) => {
            const raw = custodyReadPositions[index];
            if (!raw || read.status !== 'success' || !read.result) return;
            owners[positionMetadataKey(raw)] = read.result as `0x${string}`;
        });
        return owners;
    }, [custodyReadPositions, custodyReads]);

    const liveMetadataRequestKey = useMemo(() => rawPositions
        .map(positionMetadataKey)
        .join('|'), [rawPositions]);

    useEffect(() => {
        const positionsToResolve = rawPositions;
        if (positionsToResolve.length === 0) {
            setLiveMetadataByKey({});
            return;
        }

        const controller = new AbortController();
        async function loadMetadata() {
            try {
                const response = await fetch('/api/nft-metadata', {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'content-type': 'application/json', accept: 'application/json' },
                    body: JSON.stringify({
                        positions: positionsToResolve.map((position) => ({
                            positionId: Number(position.id),
                            chainEid: Number(position.chainEid),
                            collection: position.evmCollection,
                            tokenId: position.tokenId.toString(),
                        })),
                    }),
                });

                if (!response.ok) throw new Error(`NFT metadata returned ${response.status}`);
                const payload = await response.json() as {
                    positions?: Array<{ ok: boolean; metadata?: CardMetadata & { positionId?: number } }>;
                };
                const next: Record<string, CardMetadata> = {};
                for (const item of payload.positions ?? []) {
                    if (!item.ok || !item.metadata?.positionId) continue;
                    const raw = positionsToResolve.find((position) => Number(position.id) === item.metadata?.positionId);
                    if (!raw) continue;
                    next[positionMetadataKey(raw)] = item.metadata;
                }
                setLiveMetadataByKey(next);
            } catch {
                if (!controller.signal.aborted) setLiveMetadataByKey({});
            }
        }

        void loadMetadata();
        return () => controller.abort();
    }, [liveMetadataRequestKey, rawPositions]);

    useEffect(() => {
        let activeController: AbortController | undefined;
        let disposed = false;

        async function loadPublicValuations() {
            activeController?.abort();
            const controller = new AbortController();
            activeController = controller;
            try {
                const response = await fetch(publicValuationUrl(), {
                    signal: controller.signal,
                    headers: { accept: 'application/json' },
                });
                if (!response.ok) throw new Error(`Public valuation marks returned ${response.status}`);
                const payload = await response.json() as PublicValuationResponse;
                if (!disposed && activeController === controller) {
                    setPublicValuationOverrides(normalizePublicValuationOverrides(payload));
                }
            } catch {
                if (!controller.signal.aborted && !disposed) setPublicValuationOverrides((current) => current);
            }
        }

        void loadPublicValuations();
        const intervalId = window.setInterval(() => {
            void loadPublicValuations();
        }, PUBLIC_VALUATION_REFRESH_INTERVAL_MS);

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
            activeController?.abort();
        };
    }, []);

    useEffect(() => {
        let disposed = false;

        async function loadSaleActivity() {
            if (!publicClient || !contractState.portfolioRegistryAddress) {
                setSaleActivityByPositionId({});
                return;
            }

            try {
                const latestBlock = await publicClient.getBlockNumber();
                if (latestBlock < PORTFOLIO_REGISTRY_EVENTS_FROM_BLOCK) {
                    if (!disposed) setSaleActivityByPositionId({});
                    return;
                }

                const logs: SaleFinalizedLogForActivity[] = [];
                let fromBlock = PORTFOLIO_REGISTRY_EVENTS_FROM_BLOCK;
                while (fromBlock <= latestBlock) {
                    const toBlock = fromBlock + PORTFOLIO_REGISTRY_LOG_CHUNK_SIZE > latestBlock
                        ? latestBlock
                        : fromBlock + PORTFOLIO_REGISTRY_LOG_CHUNK_SIZE;
                    const chunk = await publicClient.getLogs({
                        address: contractState.portfolioRegistryAddress,
                        event: SALE_FINALIZED_EVENT,
                        fromBlock,
                        toBlock,
                    });
                    logs.push(...(chunk as SaleFinalizedLogForActivity[]));
                    fromBlock = toBlock + 1n;
                }

                const blockNumbers = Array.from(new Set(logs
                    .map((log) => log.blockNumber)
                    .filter((blockNumber): blockNumber is bigint => typeof blockNumber === 'bigint')
                    .map((blockNumber) => blockNumber.toString())));
                const blockEntries = await Promise.all(blockNumbers.map(async (blockNumberString) => {
                    const blockNumber = BigInt(blockNumberString);
                    const block = await publicClient.getBlock({ blockNumber });
                    return [blockNumberString, block.timestamp] as const;
                }));
                const blockTimestamps = Object.fromEntries(blockEntries);

                if (!disposed) {
                    setSaleActivityByPositionId(resolvePortfolioSaleActivityFromLogs(logs, blockTimestamps));
                }
            } catch {
                if (!disposed) setSaleActivityByPositionId((current) => current);
            }
        }

        void loadSaleActivity();
        const intervalId = window.setInterval(() => {
            void loadSaleActivity();
        }, SALE_ACTIVITY_REFRESH_INTERVAL_MS);

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, [contractState.portfolioRegistryAddress, publicClient]);

    const positions = useMemo(() => holdingRawPositions
        .map((raw) => normalizePosition(
            raw,
            liveMetadataByKey[positionMetadataKey(raw)],
            publicValuationOverrides[Number(raw.id)],
            ownerByPositionKey[positionMetadataKey(raw)],
        ))
        .sort((a, b) => a.positionId - b.positionId), [holdingRawPositions, liveMetadataByKey, ownerByPositionKey, publicValuationOverrides]);
    const activityPositions = useMemo(() => rawPositions
        .map((raw) => normalizePosition(
            raw,
            liveMetadataByKey[positionMetadataKey(raw)],
            publicValuationOverrides[Number(raw.id)],
            ownerByPositionKey[positionMetadataKey(raw)],
        ))
        .sort((a, b) => a.positionId - b.positionId), [liveMetadataByKey, ownerByPositionKey, publicValuationOverrides, rawPositions]);

    const avaxUsd = avaxUsdRoundData && avaxUsdRoundData[1] > 0n
        ? Number(formatUnits(avaxUsdRoundData[1], 8))
        : fallbackAvaxUsd;
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
    const valueSummary = useMemo(
        () => calculatePortfolioValueSummary(positions, platformNav, { liquidTreasuryUsdt6 }),
        [liquidTreasuryUsdt6, platformNav, positions],
    );
    const hasPublicValuationOverrides = Object.keys(publicValuationOverrides).length > 0;

    const activity = useMemo<Gm10PortfolioActivity[]>(() => sortPortfolioActivityNewestFirst(activityPositions
        .map((position) => {
            const activityType = resolvePortfolioActivityType(position.registryStatusLabel);
            const saleActivity = activityType === 'Sell'
                ? saleActivityByPositionId[position.positionId]
                : undefined;

            return {
                id: `${activityType.toLowerCase()}-${position.positionId}`,
                type: activityType,
                item: position.title,
                date: saleActivity ? formatDate(BigInt(saleActivity.finalizedAt)) : position.acquisitionDateLabel,
                amount: saleActivity ? formatUsdt6(saleActivity.netProceedsUsdt6) : position.acquisition,
                detail: saleActivity
                    ? `${position.chain} position #${position.positionId} settled net proceeds`
                    : `${position.chain} position #${position.positionId}`,
                sortTimestamp: saleActivity?.finalizedAt ?? position.acquisitionTimestamp,
            };
        })), [activityPositions, saleActivityByPositionId]);
    const holderAccounting = useMemo(() => resolveHolderAccounting({
        totalSupply: circulatingSupply,
        profitEligibleSupply,
        excludedBalances: excludedSupplyBalances,
        referenceNav,
        navPerToken,
    }), [
        circulatingSupply,
        excludedSupplyBalances,
        navPerToken,
        profitEligibleSupply,
        referenceNav,
    ]);

    return {
        ...contractState,
        positions,
        activity,
        valueSummary,
        stableAccounting,
        navPerToken,
        referenceNav: holderAccounting.referenceNav,
        circulatingSupply,
        profitEligibleSupply: holderAccounting.profitEligibleSupply,
        claimableProfit,
        collectiblePositionCount: collectiblePositionCount ? Number(collectiblePositionCount) : positions.length,
        proofSummary: {
            holdingsLabel: positions.length > 0 ? `${positions.length} recorded card positions` : 'No recorded card positions yet.',
            holdingsChipLabel: `${positions.length} acquired card${positions.length === 1 ? '' : 's'}`,
            costBasisLabel: formatUsdt6(valueSummary.costBasisUsdt6),
            onchainCurrentMarkLabel: formatUsdt6(valueSummary.onchainCurrentMarkUsdt6),
            strategyCurrentValueLabel: formatUsdt6(valueSummary.strategyCurrentValueUsdt6),
            platformNavLabel: valueSummary.platformNavUsdt6 !== undefined ? formatUsdt6(valueSummary.platformNavUsdt6) : 'Unavailable',
            unrealizedPnlLabel: formatUsdt6(valueSummary.unrealizedPnlUsdt6),
            unrealizedPnlPercentLabel: formatPercent(valueSummary.unrealizedPnlPercent),
            unrealizedPnlDirection: valueSummary.unrealizedPnlDirection,
            unrealizedSourceLabel: valueSummary.unrealizedSource === 'courtyard'
                ? 'Courtyard profile NAV'
                : hasPublicValuationOverrides
                    ? 'Submitted FMV marks'
                    : 'Onchain registry mark',
            portfolioValueLabel: formatUsdt6(valueSummary.onchainCurrentMarkUsdt6),
            liquidTreasuryLabel: formatUsdt6(liquidTreasuryUsdt6),
            referenceNavLabel: holderAccounting.referenceNav !== undefined ? formatUsdt6(holderAccounting.referenceNav) : '$0.00',
            navPerTokenLabel: navPerToken !== undefined ? formatUsdt6(navPerToken) : '$0.00',
            circulatingSupplyLabel: circulatingSupply !== undefined ? `${Number(formatUnits(circulatingSupply, 18)).toLocaleString('en-US')} CATCH` : '0 CATCH',
            profitEligibleSupplyLabel: holderAccounting.profitEligibleSupply !== undefined ? `${Number(formatUnits(holderAccounting.profitEligibleSupply, 18)).toLocaleString('en-US')} CATCH` : '0 CATCH',
            claimableProfitLabel: claimableProfit !== undefined ? `${Number(formatEther(claimableProfit)).toLocaleString('en-US')} AVAX` : 'Connect wallet',
        },
    };
}
