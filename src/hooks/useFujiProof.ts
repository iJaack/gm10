import { useMemo } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { GM10_FUND_ABI, GM10_PORTFOLIO_REGISTRY_ABI } from '../data/contracts';
import {
    type FujiContractLink,
    FUJI_PRIMARY_DEPLOYMENT,
    FUJI_PURCHASE_TEST_DEPLOYMENT,
    FUJI_TEST_PORTFOLIO_ARTIFACTS,
    FUJI_TEST_POSITION_IDS,
} from '../data/protocol';

type DeploymentConfig = typeof FUJI_PRIMARY_DEPLOYMENT | typeof FUJI_PURCHASE_TEST_DEPLOYMENT;

function toSnowtraceUrl(address?: `0x${string}`) {
    return `https://testnet.snowtrace.io/address/${address ?? '0x0000000000000000000000000000000000000000'}`;
}

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
    if (!address) return 'Pending';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function useFujiContracts(deployment: DeploymentConfig = FUJI_PRIMARY_DEPLOYMENT) {
    const { data: portfolioRegistry } = useReadContract({
        address: deployment.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'portfolioRegistry',
    });

    const { data: investorAccounting } = useReadContract({
        address: deployment.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'investorAccounting',
    });

    const links = useMemo<readonly FujiContractLink[]>(() => [
        deployment.proxy,
        {
            label: deployment.portfolioRegistry.label,
            address: (portfolioRegistry ?? deployment.portfolioRegistry.address) as `0x${string}`,
            snowtraceUrl: toSnowtraceUrl((portfolioRegistry ?? deployment.portfolioRegistry.address) as `0x${string}`),
        },
        {
            label: deployment.investorAccounting.label,
            address: (investorAccounting ?? deployment.investorAccounting.address) as `0x${string}`,
            snowtraceUrl: toSnowtraceUrl((investorAccounting ?? deployment.investorAccounting.address) as `0x${string}`),
        },
    ], [deployment, investorAccounting, portfolioRegistry]);

    return {
        proxyAddress: deployment.proxy.address,
        portfolioRegistryAddress: (portfolioRegistry ?? deployment.portfolioRegistry.address) as `0x${string}`,
        investorAccountingAddress: (investorAccounting ?? deployment.investorAccounting.address) as `0x${string}`,
        links,
    };
}

export function useFujiRoundState() {
    const { links } = useFujiContracts(FUJI_PRIMARY_DEPLOYMENT);

    const { data: currentRoundId } = useReadContract({
        address: FUJI_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'currentRoundId',
    });

    const roundId = currentRoundId ? Number(currentRoundId) : 1;

    const { data: round } = useReadContract({
        address: FUJI_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'getRound',
        args: [BigInt(roundId)],
    });

    const progress = round && round.targetAmount > 0n
        ? Math.min((Number(round.raisedAmount) / Number(round.targetAmount)) * 100, 100)
        : 0;

    const status = round?.isActive
        ? 'Live on Fuji'
        : round?.isFinalized
            ? 'Round closed'
            : 'Waiting for activation';

    return {
        links,
        roundId,
        round,
        status,
        progress,
        targetLabel: round ? `${Number(formatEther(round.targetAmount)).toLocaleString()} AVAX` : 'Pending',
        raisedLabel: round ? `${Number(formatEther(round.raisedAmount)).toLocaleString()} AVAX` : 'Pending',
        priceLabel: round ? `${Number(formatEther(round.tokenPrice))} AVAX` : 'Pending',
        minMaxLabel: round
            ? `${Number(formatEther(round.minInvestment))} to ${Number(formatEther(round.maxInvestment))} AVAX`
            : 'Pending',
    };
}

export function useFujiPortfolioPositions() {
    const contractState = useFujiContracts(FUJI_PURCHASE_TEST_DEPLOYMENT);

    const { data: stableAccounting } = useReadContract({
        address: FUJI_PURCHASE_TEST_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'stableAccounting',
    });

    const { data: collectiblePositionCount } = useReadContract({
        address: contractState.portfolioRegistryAddress,
        abi: GM10_PORTFOLIO_REGISTRY_ABI,
        functionName: 'collectiblePositionCount',
        query: { enabled: Boolean(contractState.portfolioRegistryAddress) },
    });

    const { data: positionOne } = useReadContract({
        address: contractState.portfolioRegistryAddress,
        abi: GM10_PORTFOLIO_REGISTRY_ABI,
        functionName: 'getCollectiblePosition',
        args: [BigInt(FUJI_TEST_POSITION_IDS[0])],
        query: { enabled: Boolean(contractState.portfolioRegistryAddress) },
    });

    const { data: positionTwo } = useReadContract({
        address: contractState.portfolioRegistryAddress,
        abi: GM10_PORTFOLIO_REGISTRY_ABI,
        functionName: 'getCollectiblePosition',
        args: [BigInt(FUJI_TEST_POSITION_IDS[1])],
        query: { enabled: Boolean(contractState.portfolioRegistryAddress) },
    });

    const positions = useMemo(() => {
        const livePositions = [positionOne, positionTwo];

        return FUJI_TEST_PORTFOLIO_ARTIFACTS.map((artifact, index) => {
            const position = livePositions[index];
            const collectionAddress = position?.evmCollection as `0x${string}` | undefined;

            return {
                ...artifact,
                chain: artifact.chain,
                collectionAddress,
                collectionLabel: formatAddress(collectionAddress),
                snowtraceUrl: toSnowtraceUrl(collectionAddress),
                tokenId: position?.tokenId?.toString() ?? 'Pending',
                acquisition: formatUsdt6(position?.acquisitionPriceUsdt6),
                currentValue: formatUsdt6(position?.currentValueUsdt6),
                statusLabel: position?.status === 1 ? 'Live on Fuji' : 'Pending',
            };
        });
    }, [positionOne, positionTwo]);

    return {
        ...contractState,
        positions,
        collectiblePositionCount: collectiblePositionCount ? Number(collectiblePositionCount) : 0,
        proofSummary: {
            holdingsLabel: `${collectiblePositionCount ? Number(collectiblePositionCount) : 0} recorded positions`,
            holdingsChipLabel: `${collectiblePositionCount ? Number(collectiblePositionCount) : 0} positions`,
            portfolioValueLabel: stableAccounting ? formatUsdt6(stableAccounting[0]) : '$0.00',
            liquidTreasuryLabel: stableAccounting ? formatUsdt6(stableAccounting[2]) : '$0.00',
        },
    };
}
