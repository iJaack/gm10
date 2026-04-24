import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { ChainType, type WidgetConfig } from '@lifi/widget';
import { formatEther, formatUnits, isAddress, keccak256, padHex, parseEther, parseUnits, stringToHex, zeroHash } from 'viem';
import { useAccount, useBalance, useReadContract, useSendTransaction, useSwitchChain, useWriteContract } from 'wagmi';
import { MARKETPLACE_CHECKLIST_ITEMS, summarizeMarketplaceChecklist } from '../data/marketplaceChecklist';
import { CHAINLINK_AGGREGATOR_V3_ABI, COURTYARD_WORKFLOW_ABI, FUND_ADMIN_ABI, LIQUIDITY_COORDINATOR_ABI, PROFIT_DISTRIBUTOR_ABI, REGISTRY_ABI } from '../abis';
import { LZ_EID, MAINNET } from '../addresses';
import { TxButton, TxResult } from '../components/TxButton';
import { bytes32ToSolanaAddress, nonEvmSafeInputToBytes32 } from '../lib/solanaAddress.js';

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000' as const;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const COURTYARD_MARKETPLACE_ID = keccak256(stringToHex('COURTYARD'));
const PHYGITALS_MARKETPLACE_ID = keccak256(stringToHex('PHYGITALS'));
const PURCHASE_STATUS = ['None', 'Approved', 'Legacy funds released', 'Funding confirmed', 'Executed', 'Position recorded', 'Cancelled'] as const;
const SALE_STATUS = ['None', 'Approved', 'Executed', 'External proceeds pending', 'Proceeds received', 'Finalized', 'Cancelled'] as const;
const COURTYARD_CHECKLIST_SUMMARY = summarizeMarketplaceChecklist(MARKETPLACE_CHECKLIST_ITEMS.map((item) => item.id));
const POLYGON_CHAIN_ID = 137;
const AVALANCHE_CHAIN_ID = 43114;
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const DEFAULT_SOLANA_MULTISIG = 'GWE93fpg5M4vsfYnpW21pD3t1pQx4XktcAzwhPqYRaTG';
const AVAX_WEI = 10n ** 18n;
const USDT6 = 1_000_000n;
const LiFiWidget = lazy(() => import('@lifi/widget').then((mod) => ({ default: mod.LiFiWidget })));

type Bytes32 = `0x${string}`;

type LifiTransactionRequest = {
    to?: `0x${string}`;
    data?: `0x${string}`;
    value?: string;
    chainId?: number;
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
};

type CourtyardAsset = {
    assetId: string;
    sourceUrl: string;
    title: string;
    image: string;
    collectionName: string;
    collectionContract: string;
    tokenId: string;
    collectibleId: string;
    metadataUrl: string;
    listing: {
        orderId: string;
        priceDecimal: string;
        priceRaw: string;
        currency: { symbol: string; contract: string; decimals: number };
        expiration: string;
        expiresSoon: boolean;
    };
    prefill: {
        purchaseKey: string;
        assetRef: string;
        maxSpendUsdt: string;
        releaseAmountUsdt: string;
        mandateRef: string;
        custodyMode: string;
        tokenStandard: string;
        evmCollection: string;
        tokenId: string;
        nonEvmCollection: string;
        nonEvmTokenId: string;
        externalAssetId: string;
        categoryId: string;
        marketplaceProvenanceRef: string;
        acquisitionPriceUsdt: string;
        metadataRef: string;
        proofRef: string;
    };
};

type PhygitalsCard = {
    slug: string;
    sourceUrl: string;
    title: string;
    image: string;
    assetAddress: string;
    collectionAddress: string;
    tokenStandard: string;
    owner: string;
    vault: string;
    marketplace: string;
    listed: boolean;
    altFmv?: string;
    altFmvSource?: string;
    listing: {
        priceDecimal: string;
        priceRaw: string;
        currency: { symbol: string; mint: string; decimals: number };
        marketplace: string;
    } | null;
    prefill: {
        purchaseKey: string;
        assetRef: string;
        maxSpendUsdt: string;
        releaseAmountUsdt: string;
        mandateRef: string;
        custodyMode: string;
        tokenStandard: string;
        evmCollection: string;
        tokenId: string;
        nonEvmCollection: string;
        nonEvmTokenId: string;
        externalAssetId: string;
        categoryId: string;
        marketplaceProvenanceRef: string;
        acquisitionPriceUsdt: string;
        metadataRef: string;
        proofRef: string;
    };
};

type FundingQuote = {
    kind: string;
    tool: string;
    fromAmountAvax: string;
    sourceGasAvax: string;
    totalInputAvax: string;
    toAmountRaw: string;
    toAmountMinRaw: string;
    toAmountUsd: string;
    executionDuration: number;
    enoughOutput: boolean;
    transactionRequest: LifiTransactionRequest | null;
};

type FundingQuotes = {
    usdc: FundingQuote;
    summary: {
        totalAvax: string;
        bufferedAvax: string;
        bufferBps: number;
    };
};

type SolanaFundingQuote = {
    sol: FundingQuote;
};

type PurchaseForm = {
    key: string;
    assetRef: string;
    maxSpendUsdt: string;
    releaseAmountUsdt: string;
    mandateRef: string;
    executionRef: string;
    settlementRef: string;
    proofRef: string;
};

type PositionForm = {
    custodyMode: string;
    tokenStandard: string;
    evmCollection: string;
    tokenId: string;
    nonEvmCollection: string;
    nonEvmTokenId: string;
    externalAssetId: string;
    categoryId: string;
    marketplaceProvenanceRef: string;
    acquisitionPriceUsdt: string;
    metadataRef: string;
    proofRef: string;
};

type SaleForm = {
    key: string;
    positionId: string;
    minNetProceedsUsdt: string;
    mandateRef: string;
    grossProceedsUsdt: string;
    marketplaceFeesUsdt: string;
    bridgeFeesUsdt: string;
    executionRef: string;
    proceedsRef: string;
    proofRef: string;
    netProceedsUsdt: string;
    nativeProceedsAvax: string;
    settlementMode: 'stable' | 'native' | 'external';
    stableProceedsToken: string;
    stableProceedsAmount: string;
    pullStableFromCaller: boolean;
    sourceChainEid: string;
    sourceToken: string;
    sourceTokenAmount: string;
    sourceTokenDecimals: string;
    sourceProceedsRef: string;
};

function bytes32FromInput(value: string, emptyValue: Bytes32 = zeroHash): Bytes32 {
    const trimmed = value.trim();
    if (!trimmed) return emptyValue;
    if (BYTES32_RE.test(trimmed)) return trimmed as Bytes32;
    return keccak256(stringToHex(trimmed));
}

function bytes32FromAssetInput(value: string, emptyValue: Bytes32 = zeroHash): Bytes32 {
    const trimmed = value.trim();
    if (!trimmed) return emptyValue;
    if (BYTES32_RE.test(trimmed)) return trimmed as Bytes32;
    try {
        return nonEvmSafeInputToBytes32(trimmed) as Bytes32;
    } catch {
        return bytes32FromInput(trimmed, emptyValue);
    }
}

function labelBytes32(value: string): Bytes32 {
    return padHex(stringToHex(value.trim().slice(0, 31) || 'POLYGON'), { size: 32, dir: 'right' });
}

function formatNonEvmSafe(value: `0x${string}` | undefined) {
    if (!value || value === zeroHash) return 'Unavailable';
    try {
        return bytes32ToSolanaAddress(value);
    } catch {
        return value;
    }
}

function formatRawUnits(value: string | undefined, decimals: number) {
    try {
        return formatUnits(BigInt(value ?? '0'), decimals);
    } catch {
        return '0';
    }
}

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

function parseUsdt6Input(value: string): bigint {
    return parseUnits(value.trim() || '0', 6);
}

function parseUintInput(value: string): bigint {
    return BigInt(value.trim() || '0');
}

function statusLabel(labels: readonly string[], value: unknown) {
    const index = typeof value === 'bigint' ? Number(value) : typeof value === 'number' ? value : -1;
    return labels[index] ?? 'Unknown';
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
            <div className="grid gap-3">{children}</div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    mono,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    mono?: boolean;
    type?: string;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">{label}</span>
            <input
                className={`rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0] ${mono ? 'font-mono' : ''}`}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                type={type}
            />
        </label>
    );
}

export function OperationsPanel() {
    const [exclusionAddress, setExclusionAddress] = useState('');
    const [excluded, setExcluded] = useState(true);
    const [marketplaceLabel, setMarketplaceLabel] = useState('COURTYARD');
    const [marketplaceApproved, setMarketplaceApproved] = useState(true);
    const [solanaSafe, setSolanaSafe] = useState(DEFAULT_SOLANA_MULTISIG);
    const [solanaSafeError, setSolanaSafeError] = useState('');
    const [solanaFundingDestination, setSolanaFundingDestination] = useState(DEFAULT_SOLANA_MULTISIG);
    const [solanaFundingAmountAvax, setSolanaFundingAmountAvax] = useState('4');
    const [solanaFundingQuote, setSolanaFundingQuote] = useState<SolanaFundingQuote | null>(null);
    const [solanaFundingError, setSolanaFundingError] = useState('');
    const [solanaFundingLoading, setSolanaFundingLoading] = useState(false);
    const [solanaFundingTxHash, setSolanaFundingTxHash] = useState<`0x${string}` | undefined>();
    const [phygitalsUrl, setPhygitalsUrl] = useState('https://www.phygitals.com/card/2021-pokemon-japanese-s-promo-po-wbtuqn');
    const [phygitalsCard, setPhygitalsCard] = useState<PhygitalsCard | null>(null);
    const [phygitalsError, setPhygitalsError] = useState('');
    const [phygitalsLoading, setPhygitalsLoading] = useState(false);
    const [polygonSafe, setPolygonSafe] = useState<string>(MAINNET.polygonCourtyardSafe ?? '');
    const [polygonHotWallet, setPolygonHotWallet] = useState<string>(MAINNET.polygonCourtyardHotWallet ?? '');
    const [treasuryWithdrawalAvax, setTreasuryWithdrawalAvax] = useState('');
    const [treasuryWithdrawalReason, setTreasuryWithdrawalReason] = useState('Fund Polygon Courtyard Hot Wallet');
    const [courtyardUrl, setCourtyardUrl] = useState('');
    const [autopilotAsset, setAutopilotAsset] = useState<CourtyardAsset | null>(null);
    const [fundingQuotes, setFundingQuotes] = useState<FundingQuotes | null>(null);
    const [autopilotError, setAutopilotError] = useState('');
    const [autopilotLoading, setAutopilotLoading] = useState(false);
    const [lifiUsdcFromAmount, setLifiUsdcFromAmount] = useState('');
    const [purchase, setPurchase] = useState<PurchaseForm>({
        key: 'courtyard-purchase-1',
        assetRef: '',
        maxSpendUsdt: '',
        releaseAmountUsdt: '',
        mandateRef: '',
        executionRef: '',
        settlementRef: '',
        proofRef: '',
    });
    const [position, setPosition] = useState<PositionForm>({
        custodyMode: '0',
        tokenStandard: 'ERC721',
        evmCollection: ADDRESS_ZERO,
        tokenId: '0',
        nonEvmCollection: '',
        nonEvmTokenId: '',
        externalAssetId: '',
        categoryId: 'POKEMON_CARD',
        marketplaceProvenanceRef: '',
        acquisitionPriceUsdt: '',
        metadataRef: '',
        proofRef: '',
    });
    const [sale, setSale] = useState<SaleForm>({
        key: 'courtyard-sale-1',
        positionId: '1',
        minNetProceedsUsdt: '',
        mandateRef: '',
        grossProceedsUsdt: '',
        marketplaceFeesUsdt: '',
        bridgeFeesUsdt: '',
        executionRef: '',
        proceedsRef: '',
        proofRef: '',
        netProceedsUsdt: '',
        nativeProceedsAvax: '',
        settlementMode: 'stable',
        stableProceedsToken: POLYGON_USDC,
        stableProceedsAmount: '',
        pullStableFromCaller: false,
        sourceChainEid: '',
        sourceToken: '',
        sourceTokenAmount: '',
        sourceTokenDecimals: '18',
        sourceProceedsRef: '',
    });
    const [mode, setMode] = useState<'round' | 'profit' | 'marketplace' | 'courtyard' | 'lp'>('round');

    const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
    const { sendTransactionAsync, isPending: isSolanaFundingPending, error: solanaFundingSendError } = useSendTransaction();
    const { chainId } = useAccount();
    const { switchChainAsync } = useSwitchChain();

    const { data: stableAccounting } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'stableAccounting',
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });

    const { data: profitDistributor } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'profitDistributor',
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });

    const { data: fundLiquidityCoordinator } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'liquidityCoordinator',
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });

    const liquidityCoordinator = MAINNET.liquidityCoordinator ?? fundLiquidityCoordinator;

    const { data: treasuryAddress } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'treasury',
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });
    const effectiveTreasuryAddress = (treasuryAddress ?? MAINNET.treasurySafe) as `0x${string}` | undefined;

    const { data: fundBalance } = useBalance({
        address: MAINNET.fundProxy as `0x${string}`,
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });
    const { data: treasuryBalance } = useBalance({
        address: effectiveTreasuryAddress,
        query: { enabled: Boolean(effectiveTreasuryAddress) },
    });
    const { data: liquidityCoordinatorBalance } = useBalance({
        address: liquidityCoordinator as `0x${string}`,
        query: { enabled: Boolean(liquidityCoordinator) },
    });
    const { data: courtyardWorkflowBalance } = useBalance({
        address: MAINNET.courtyardWorkflow,
        query: { enabled: Boolean(MAINNET.courtyardWorkflow) },
    });
    const { data: teamWalletBalance } = useBalance({
        address: MAINNET.teamWallet,
        query: { enabled: Boolean(MAINNET.teamWallet) },
    });
    const { data: avaxUsdRoundData } = useReadContract({
        address: MAINNET.avaxUsdFeed,
        abi: CHAINLINK_AGGREGATOR_V3_ABI,
        functionName: 'latestRoundData',
        query: { enabled: Boolean(MAINNET.avaxUsdFeed) },
    });
    const avaxUsd = avaxUsdRoundData && avaxUsdRoundData[1] > 0n
        ? Number(formatUnits(avaxUsdRoundData[1], 8))
        : undefined;
    const liveLiquidTreasuryUsdt6 = useMemo(() => {
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
    const liveLiquidTreasuryDetail = avaxUsd !== undefined
        ? `${formatAvax(fundBalance?.value)} fund + ${formatAvax(treasuryBalance?.value)} Safe + ${formatAvax(liquidityCoordinatorBalance?.value)} liquidity + ${formatAvax(courtyardWorkflowBalance?.value)} Courtyard + ${formatAvax(teamWalletBalance?.value)} team @ ${formatUsdt6(avaxUsdToUsdt6(avaxUsd))}/AVAX`
        : 'Waiting for Chainlink AVAX/USD';

    const { data: referenceNav } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'referenceNavPerTokenUsdt6',
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });

    const { data: round1Data } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'getRound',
        args: [1n],
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });

    const { data: eligibleSupply } = useReadContract({
        address: profitDistributor as `0x${string}`,
        abi: PROFIT_DISTRIBUTOR_ABI,
        functionName: 'eligibleSupply',
        query: { enabled: Boolean(profitDistributor) },
    });

    const { data: cumulativeProfitPerToken } = useReadContract({
        address: profitDistributor as `0x${string}`,
        abi: PROFIT_DISTRIBUTOR_ABI,
        functionName: 'cumulativeProfitPerTokenWei18',
        query: { enabled: Boolean(profitDistributor) },
    });

    const { data: totalProfitDeposited } = useReadContract({
        address: profitDistributor as `0x${string}`,
        abi: PROFIT_DISTRIBUTOR_ABI,
        functionName: 'totalProfitDepositedWei',
        query: { enabled: Boolean(profitDistributor) },
    });

    const { data: exclusionState } = useReadContract({
        address: profitDistributor as `0x${string}`,
        abi: PROFIT_DISTRIBUTOR_ABI,
        functionName: 'excludedFromProfitShare',
        args: [exclusionAddress as `0x${string}`],
        query: { enabled: Boolean(profitDistributor) && /^0x[a-fA-F0-9]{40}$/.test(exclusionAddress) },
    });

    const { data: accountClaimable } = useReadContract({
        address: profitDistributor as `0x${string}`,
        abi: PROFIT_DISTRIBUTOR_ABI,
        functionName: 'claimableProfit',
        args: [exclusionAddress as `0x${string}`],
        query: { enabled: Boolean(profitDistributor) && /^0x[a-fA-F0-9]{40}$/.test(exclusionAddress) },
    });

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

    const { data: traderJoeTokenLp } = useReadContract({
        address: liquidityCoordinator as `0x${string}`,
        abi: LIQUIDITY_COORDINATOR_ABI,
        functionName: 'traderJoeLpTokenDeployed18',
        query: { enabled: Boolean(liquidityCoordinator) },
    });

    const { data: pharaohTokenLp } = useReadContract({
        address: liquidityCoordinator as `0x${string}`,
        abi: LIQUIDITY_COORDINATOR_ABI,
        functionName: 'pharaohLpTokenDeployed18',
        query: { enabled: Boolean(liquidityCoordinator) },
    });

    const marketplaceId = useMemo(
        () => bytes32FromInput(marketplaceLabel || 'COURTYARD'),
        [marketplaceLabel],
    );
    const purchaseKey = useMemo(() => bytes32FromInput(purchase.key), [purchase.key]);
    const saleKey = useMemo(() => bytes32FromInput(sale.key), [sale.key]);

    const { data: polygonChainSafe } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'getChainSafe',
        args: [LZ_EID.POLYGON_MAINNET],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) },
    });

    const { data: solanaChainSafe } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'getChainSafe',
        args: [LZ_EID.SOLANA_MAINNET],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) },
    });

    const { data: courtyardMarketplaceApproved } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'isMarketplaceApproved',
        args: [COURTYARD_MARKETPLACE_ID],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) },
    });

    const { data: phygitalsMarketplaceApproved } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'isMarketplaceApproved',
        args: [PHYGITALS_MARKETPLACE_ID],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) },
    });

    const { data: purchaseAuthorization } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'getPurchaseAuthorization',
        args: [purchaseKey],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) && Boolean(purchase.key.trim()) },
    });

    const { data: saleAuthorization } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'getSaleAuthorization',
        args: [saleKey],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) && Boolean(sale.key.trim()) },
    });

    const lifiUsdcWidgetConfig = useMemo<WidgetConfig>(
        () => ({
            integrator: 'gm10-admin',
            fromChain: AVALANCHE_CHAIN_ID,
            toChain: POLYGON_CHAIN_ID,
            fromToken: ADDRESS_ZERO,
            toToken: POLYGON_USDC,
            fromAmount: lifiUsdcFromAmount || undefined,
            toAddress: {
                name: 'GM10 Polygon Courtyard Hot Wallet',
                address: polygonHotWallet,
                chainType: ChainType.EVM,
            },
            chains: {
                allow: [AVALANCHE_CHAIN_ID, POLYGON_CHAIN_ID],
            },
            disabledUI: ['toAddress', 'toToken'],
            hiddenUI: ['appearance', 'language', 'reverseTokensButton'],
            requiredUI: ['toAddress'],
            routePriority: 'CHEAPEST',
            slippage: 0.005,
            variant: 'wide',
            subvariant: 'split',
            subvariantOptions: {
                split: 'bridge',
            },
            appearance: 'dark',
            buildUrl: false,
            keyPrefix: 'gm10-courtyard-lifi-usdc',
            theme: {
                container: {
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)',
                },
            },
        }),
        [lifiUsdcFromAmount, polygonHotWallet],
    );

    const round1 = round1Data;
    const round1Status = !round1
        ? 'Unavailable'
        : round1.isFinalized || round1.raisedAmount >= round1.targetAmount
          ? 'Finalized'
          : BigInt(Math.floor(Date.now() / 1000)) >= round1.endTime
              ? 'Ended, ready to finalize'
              : 'Still open or upcoming';
    const canFinalizeRound1 = Boolean(
        MAINNET.fundProxy &&
        round1 &&
        !round1.isFinalized &&
        round1.raisedAmount < round1.targetAmount &&
        BigInt(Math.floor(Date.now() / 1000)) >= round1.endTime,
    );

    function submitFinalizeRound1() {
        if (!MAINNET.fundProxy) return;
        reset();
        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'finalizeRound',
            args: [1n],
        });
    }

    function submitExclusion() {
        if (!MAINNET.fundProxy || !/^0x[a-fA-F0-9]{40}$/.test(exclusionAddress)) return;
        reset();
        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'setProfitShareExclusion',
            args: [exclusionAddress as `0x${string}`, excluded],
        });
    }

    function submitMarketplace() {
        if (!MAINNET.portfolioRegistry) return;
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'setMarketplaceApproval',
            args: [marketplaceId, marketplaceApproved],
        });
    }

    function submitPhygitalsSolanaSafe() {
        if (!MAINNET.portfolioRegistry || !solanaSafe.trim()) return;

        let nonEvmSafe: Bytes32;
        try {
            nonEvmSafe = nonEvmSafeInputToBytes32(solanaSafe) as Bytes32;
        } catch (error) {
            setSolanaSafeError(error instanceof Error ? error.message : 'Invalid Solana multisig address');
            return;
        }

        setSolanaSafeError('');
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'setChainSafe',
            args: [
                LZ_EID.SOLANA_MAINNET,
                ADDRESS_ZERO,
                nonEvmSafe,
                labelBytes32('SOLANA'),
                true,
            ],
        });
    }

    function submitCourtyardPolygonSafe() {
        if (!MAINNET.courtyardWorkflow || !ADDRESS_RE.test(polygonSafe)) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'configureCourtyardChain',
            args: [
                LZ_EID.POLYGON_MAINNET,
                polygonSafe as `0x${string}`,
                zeroHash,
                labelBytes32('POLYGON'),
                true,
            ],
        });
    }

    function submitTreasuryWithdrawal() {
        if (!MAINNET.fundProxy || !effectiveTreasuryAddress || !treasuryWithdrawalAvax.trim()) return;
        reset();
        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'withdrawFromTreasury',
            args: [
                effectiveTreasuryAddress,
                parseEther(treasuryWithdrawalAvax.trim()),
                treasuryWithdrawalReason.trim() || 'Fund Polygon Courtyard Hot Wallet',
            ],
        });
    }

    function updatePurchase<K extends keyof PurchaseForm>(key: K, value: PurchaseForm[K]) {
        setPurchase((current) => ({ ...current, [key]: value }));
    }

    function updatePosition<K extends keyof PositionForm>(key: K, value: PositionForm[K]) {
        setPosition((current) => ({ ...current, [key]: value }));
    }

    function updateSale<K extends keyof SaleForm>(key: K, value: SaleForm[K]) {
        setSale((current) => ({ ...current, [key]: value }));
    }

    async function resolveCourtyardAutopilot() {
        setAutopilotError('');
        setAutopilotLoading(true);
        setAutopilotAsset(null);
        setFundingQuotes(null);
        try {
            if (!effectiveTreasuryAddress || !ADDRESS_RE.test(polygonSafe) || !ADDRESS_RE.test(polygonHotWallet)) {
                throw new Error('Configure the Avalanche treasury Safe, Polygon custody Safe, and Polygon Hot Wallet before resolving funding.');
            }
            const assetResponse = await fetch(`/api/courtyard-asset?url=${encodeURIComponent(courtyardUrl.trim())}`);
            const assetPayload = await assetResponse.json();
            if (!assetResponse.ok) throw new Error(assetPayload.error || 'Unable to resolve Courtyard listing');
            const asset = assetPayload as CourtyardAsset;

            const quoteParams = new URLSearchParams({
                usdcRaw: asset.listing.priceRaw,
                fromAddress: effectiveTreasuryAddress,
                toAddress: polygonHotWallet,
            });
            const quoteResponse = await fetch(`/api/lifi-quotes?${quoteParams.toString()}`);
            const quotePayload = await quoteResponse.json();
            if (!quoteResponse.ok) throw new Error(quotePayload.error || 'Unable to quote LI.FI funding routes');
            const quotes = quotePayload as FundingQuotes;
            if (!quotes.usdc.enoughOutput) {
                throw new Error('LI.FI quote output is below the target amount.');
            }

            setAutopilotAsset(asset);
            setFundingQuotes(quotes);
            setTreasuryWithdrawalAvax(quotes.summary.bufferedAvax);
            setTreasuryWithdrawalReason(`Fund Courtyard purchase ${asset.assetId}`);
            setLifiUsdcFromAmount(quotes.usdc.fromAmountAvax);
            setPurchase({
                key: asset.prefill.purchaseKey,
                assetRef: asset.prefill.assetRef,
                maxSpendUsdt: asset.prefill.maxSpendUsdt,
                releaseAmountUsdt: asset.prefill.releaseAmountUsdt,
                mandateRef: asset.prefill.mandateRef,
                executionRef: '',
                settlementRef: '',
                proofRef: '',
            });
            setPosition({
                custodyMode: asset.prefill.custodyMode,
                tokenStandard: asset.prefill.tokenStandard,
                evmCollection: asset.prefill.evmCollection,
                tokenId: asset.prefill.tokenId,
                nonEvmCollection: asset.prefill.nonEvmCollection,
                nonEvmTokenId: asset.prefill.nonEvmTokenId,
                externalAssetId: asset.prefill.externalAssetId,
                categoryId: asset.prefill.categoryId,
                marketplaceProvenanceRef: asset.prefill.marketplaceProvenanceRef,
                acquisitionPriceUsdt: asset.prefill.acquisitionPriceUsdt,
                metadataRef: asset.prefill.metadataRef,
                proofRef: asset.prefill.proofRef,
            });
        } catch (caught) {
            setAutopilotError(caught instanceof Error ? caught.message : 'Unable to prepare Courtyard autopilot');
        } finally {
            setAutopilotLoading(false);
        }
    }

    async function quoteSolanaFunding() {
        setSolanaFundingError('');
        setSolanaFundingLoading(true);
        try {
            if (!effectiveTreasuryAddress) throw new Error('Avalanche treasury Safe is unavailable.');
            const params = new URLSearchParams({
                fromAmountAvax: solanaFundingAmountAvax.trim(),
                fromAddress: effectiveTreasuryAddress,
                toAddress: solanaFundingDestination.trim(),
            });
            const response = await fetch(`/api/lifi-solana-quote?${params.toString()}`);
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Unable to quote LI.FI Solana route');
            const quote = payload as SolanaFundingQuote;
            if (!quote.sol.transactionRequest?.to) throw new Error('LI.FI did not return an executable Solana funding route.');
            setSolanaFundingQuote(quote);
            return quote;
        } catch (caught) {
            setSolanaFundingQuote(null);
            setSolanaFundingError(caught instanceof Error ? caught.message : 'Unable to prepare Solana funding');
            return null;
        } finally {
            setSolanaFundingLoading(false);
        }
    }

    async function ensureAvalanche() {
        if (chainId !== AVALANCHE_CHAIN_ID && switchChainAsync) {
            await switchChainAsync({ chainId: AVALANCHE_CHAIN_ID });
        }
    }

    async function submitSolanaFunding() {
        setSolanaFundingError('');
        setSolanaFundingTxHash(undefined);
        try {
            const quote = await quoteSolanaFunding();
            const tx = quote?.sol.transactionRequest;
            if (!tx?.to) throw new Error('LI.FI route is missing a transaction request. Refresh the quote.');
            await ensureAvalanche();
            const hash = await sendTransactionAsync({
                to: tx.to,
                data: tx.data,
                value: BigInt(tx.value ?? '0'),
                gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
                gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
                maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : undefined,
            });
            setSolanaFundingTxHash(hash);
        } catch (caught) {
            setSolanaFundingError(caught instanceof Error ? caught.message : 'LI.FI Solana transaction was not submitted');
        }
    }

    async function resolvePhygitalsCard() {
        setPhygitalsError('');
        setPhygitalsLoading(true);
        setPhygitalsCard(null);
        try {
            const response = await fetch(`/api/phygitals-card?url=${encodeURIComponent(phygitalsUrl.trim())}`);
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Unable to resolve Phygitals card');
            const card = payload as PhygitalsCard;
            setPhygitalsCard(card);
            setPurchase({
                key: card.prefill.purchaseKey,
                assetRef: card.prefill.assetRef,
                maxSpendUsdt: card.prefill.maxSpendUsdt,
                releaseAmountUsdt: card.prefill.releaseAmountUsdt,
                mandateRef: card.prefill.mandateRef,
                executionRef: `phygitals:execution:${card.slug}:${card.assetAddress}`,
                settlementRef: `phygitals:settlement:${card.slug}:${card.assetAddress}`,
                proofRef: card.prefill.proofRef,
            });
            setPosition({
                custodyMode: card.prefill.custodyMode,
                tokenStandard: card.prefill.tokenStandard,
                evmCollection: card.prefill.evmCollection,
                tokenId: card.prefill.tokenId,
                nonEvmCollection: card.prefill.nonEvmCollection,
                nonEvmTokenId: card.prefill.nonEvmTokenId,
                externalAssetId: card.prefill.externalAssetId,
                categoryId: card.prefill.categoryId,
                marketplaceProvenanceRef: card.prefill.marketplaceProvenanceRef,
                acquisitionPriceUsdt: card.prefill.acquisitionPriceUsdt,
                metadataRef: card.prefill.metadataRef,
                proofRef: card.prefill.proofRef,
            });
            setMarketplaceLabel('PHYGITALS');
            setMarketplaceApproved(true);
        } catch (caught) {
            setPhygitalsError(caught instanceof Error ? caught.message : 'Unable to prepare Phygitals card');
        } finally {
            setPhygitalsLoading(false);
        }
    }

    function submitAuthorizePurchase() {
        if (!MAINNET.portfolioRegistry) return;
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'authorizePurchaseV2',
            args: [
                purchaseKey,
                LZ_EID.POLYGON_MAINNET,
                COURTYARD_MARKETPLACE_ID,
                bytes32FromInput(purchase.assetRef),
                POLYGON_USDC,
                parseUsdt6Input(purchase.maxSpendUsdt),
                bytes32FromInput(purchase.mandateRef),
            ],
        });
    }

    function submitAuthorizePhygitalsPurchase() {
        if (!MAINNET.portfolioRegistry || !purchase.key.trim()) return;
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'authorizePurchase',
            args: [
                purchaseKey,
                LZ_EID.SOLANA_MAINNET,
                PHYGITALS_MARKETPLACE_ID,
                bytes32FromInput(purchase.assetRef),
                parseUsdt6Input(purchase.maxSpendUsdt),
                bytes32FromInput(purchase.mandateRef),
            ],
        });
    }

    function submitRecordPhygitalsExecution() {
        if (!MAINNET.portfolioRegistry || !purchase.key.trim()) return;
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'recordPurchaseExecution',
            args: [
                purchaseKey,
                bytes32FromInput(purchase.executionRef),
                bytes32FromInput(purchase.settlementRef),
                bytes32FromInput(purchase.proofRef),
            ],
        });
    }

    function submitRecordPhygitalsPosition() {
        if (!MAINNET.fundProxy || !purchase.key.trim()) return;
        reset();
        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'recordCollectiblePosition',
            args: [
                purchaseKey,
                {
                    custodyMode: Number(position.custodyMode),
                    tokenStandard: bytes32FromInput(position.tokenStandard),
                    evmCollection: isAddress(position.evmCollection) ? position.evmCollection : ADDRESS_ZERO,
                    nonEvmCollection: bytes32FromAssetInput(position.nonEvmCollection),
                    tokenId: parseUintInput(position.tokenId),
                    nonEvmTokenId: bytes32FromAssetInput(position.nonEvmTokenId),
                    externalAssetId: bytes32FromAssetInput(position.externalAssetId),
                    categoryId: bytes32FromInput(position.categoryId),
                    marketplaceProvenanceRef: bytes32FromInput(position.marketplaceProvenanceRef),
                    acquisitionPriceUsdt6: parseUsdt6Input(position.acquisitionPriceUsdt),
                    metadataHash: bytes32FromInput(position.metadataRef),
                    proofHash: bytes32FromInput(position.proofRef),
                },
            ],
        });
    }

    function submitConfirmPurchaseFunding() {
        if (!MAINNET.fundProxy || !purchase.key.trim()) return;
        reset();
        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'confirmPurchaseFunding',
            args: [
                purchaseKey,
                POLYGON_USDC,
                parseUsdt6Input(purchase.releaseAmountUsdt),
                LZ_EID.POLYGON_MAINNET,
                polygonSafe as `0x${string}`,
                bytes32FromInput(purchase.settlementRef),
                bytes32FromInput(purchase.proofRef),
            ],
        });
    }

    function submitRecordPurchaseExecution() {
        if (!MAINNET.portfolioRegistry) return;
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'recordPurchaseExecution',
            args: [
                purchaseKey,
                bytes32FromInput(purchase.executionRef),
                bytes32FromInput(purchase.settlementRef),
                bytes32FromInput(purchase.proofRef),
            ],
        });
    }

    function submitRecordPosition() {
        if (!MAINNET.fundProxy) return;
        reset();
        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'recordCollectiblePosition',
            args: [
                purchaseKey,
                {
                    custodyMode: Number(position.custodyMode),
                    tokenStandard: bytes32FromInput(position.tokenStandard),
                    evmCollection: isAddress(position.evmCollection) ? position.evmCollection : ADDRESS_ZERO,
                    nonEvmCollection: bytes32FromInput(position.nonEvmCollection),
                    tokenId: parseUintInput(position.tokenId),
                    nonEvmTokenId: bytes32FromInput(position.nonEvmTokenId),
                    externalAssetId: bytes32FromAssetInput(position.externalAssetId),
                    categoryId: bytes32FromInput(position.categoryId),
                    marketplaceProvenanceRef: bytes32FromInput(position.marketplaceProvenanceRef),
                    acquisitionPriceUsdt6: parseUsdt6Input(position.acquisitionPriceUsdt),
                    metadataHash: bytes32FromInput(position.metadataRef),
                    proofHash: bytes32FromInput(position.proofRef),
                },
            ],
        });
    }

    function submitAuthorizeSale() {
        if (!MAINNET.portfolioRegistry) return;
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'authorizeSale',
            args: [
                saleKey,
                parseUintInput(sale.positionId),
                COURTYARD_MARKETPLACE_ID,
                parseUsdt6Input(sale.minNetProceedsUsdt),
                bytes32FromInput(sale.mandateRef),
            ],
        });
    }

    function submitRecordSaleExecution() {
        if (!MAINNET.portfolioRegistry) return;
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'recordSaleExecution',
            args: [
                saleKey,
                parseUsdt6Input(sale.grossProceedsUsdt),
                parseUsdt6Input(sale.marketplaceFeesUsdt),
                parseUsdt6Input(sale.bridgeFeesUsdt),
                bytes32FromInput(sale.executionRef),
                bytes32FromInput(sale.proceedsRef),
                bytes32FromInput(sale.proofRef),
            ],
        });
    }

    function submitConfirmSaleProceeds() {
        if (!MAINNET.fundProxy) return;
        reset();
        if (sale.settlementMode === 'native') {
            writeContract({
                address: MAINNET.fundProxy,
                abi: FUND_ADMIN_ABI,
                functionName: 'confirmNativeSaleProceeds',
                args: [saleKey, bytes32FromInput(sale.proceedsRef), bytes32FromInput(sale.proofRef)],
                value: parseEther(sale.nativeProceedsAvax.trim() || '0'),
            });
            return;
        }
        if (sale.settlementMode === 'stable') {
            writeContract({
                address: MAINNET.fundProxy,
                abi: FUND_ADMIN_ABI,
                functionName: 'confirmStableSaleProceeds',
                args: [
                    saleKey,
                    (isAddress(sale.stableProceedsToken) ? sale.stableProceedsToken : POLYGON_USDC) as `0x${string}`,
                    parseUnits(sale.stableProceedsAmount.trim() || '0', 6),
                    sale.pullStableFromCaller,
                    bytes32FromInput(sale.proceedsRef),
                    bytes32FromInput(sale.proofRef),
                ],
            });
            return;
        }
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'recordExternalSaleProceeds',
            args: [
                saleKey,
                Number(sale.sourceChainEid || '0'),
                (isAddress(sale.sourceToken) ? sale.sourceToken : ADDRESS_ZERO) as `0x${string}`,
                parseUnits(sale.sourceTokenAmount.trim() || '0', Number(sale.sourceTokenDecimals || '18')),
                Number(sale.sourceTokenDecimals || '18'),
                bytes32FromInput(sale.sourceProceedsRef),
                bytes32FromInput(sale.proofRef),
            ],
        });
    }

    function submitFinalizeSale() {
        if (!MAINNET.fundProxy) return;
        reset();
        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'finalizeSale',
            args: [saleKey],
        });
    }

    const polygonSafeConfigured = Boolean(
        polygonChainSafe?.enabled &&
        polygonChainSafe.evmSafe &&
        polygonChainSafe.evmSafe.toLowerCase() === polygonSafe.toLowerCase(),
    );
    const polygonHotWalletConfigured = ADDRESS_RE.test(polygonHotWallet);
    const courtyardApproved = courtyardMarketplaceApproved === true;
    const autopilotReady = Boolean(
        autopilotAsset &&
        fundingQuotes &&
        polygonSafeConfigured &&
        polygonHotWalletConfigured &&
        courtyardApproved &&
        fundingQuotes.usdc.enoughOutput,
    );

    return (
        <div className="grid gap-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-4 text-lg font-bold text-white">Profit participation operations</h2>
                <p className="mb-3 text-xs leading-5 text-gray-400">
                    This surface tracks the sale-profit model: holder claim eligibility, cumulative AVAX distributions,
                    LP replenishment accruals, and the mainnet marketplace approval list for operator-assisted card workflow execution.
                </p>
                <div className="grid gap-2 text-xs text-gray-400">
                    <div>Fund proxy: {MAINNET.fundProxy ?? 'Pending env config'}</div>
                    <div>Portfolio registry: {MAINNET.portfolioRegistry ?? 'Pending env config'}</div>
                    <div>Profit distributor: {profitDistributor ?? 'Pending module wiring'}</div>
                    <div>Liquidity coordinator: {liquidityCoordinator ?? 'Pending module wiring'}</div>
                    <div>Courtyard workflow: {MAINNET.courtyardWorkflow ?? 'Pending env config'}</div>
                    <div>Stored reference NAV/token: {referenceNav !== undefined ? `${formatUnits(referenceNav, 6)} USDT` : 'Unavailable'}</div>
                    <div>Live liquid treasury: {formatUsdt6(liveLiquidTreasuryUsdt6)}</div>
                    <div className="pl-3 text-gray-500">{liveLiquidTreasuryDetail}</div>
                    <div>Stored accounting treasury: {stableAccounting ? `${formatUnits(stableAccounting[2], 6)} USDT` : 'Unavailable'}</div>
                    <div>Holder claim bucket: {stableAccounting ? `${formatUnits(stableAccounting[6], 6)} USDT` : 'Unavailable'}</div>
                    <div>LP $CATCH market-buy bucket: {stableAccounting ? `${formatUnits(stableAccounting[4], 6)} USDT` : 'Unavailable'}</div>
                    <div>LP AVAX pairing bucket: {stableAccounting ? `${formatUnits(stableAccounting[5], 6)} USDT` : 'Unavailable'}</div>
                    <div>Profit-eligible supply: {eligibleSupply !== undefined ? `${formatUnits(eligibleSupply, 18)} CATCH` : 'Unavailable'}</div>
                    <div>Cumulative profit per token: {cumulativeProfitPerToken !== undefined ? `${formatEther(cumulativeProfitPerToken)} AVAX` : 'Unavailable'}</div>
                    <div>Total AVAX distributed: {totalProfitDeposited !== undefined ? `${formatEther(totalProfitDeposited)} AVAX` : 'Unavailable'}</div>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="mb-5 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('round')}
                        className={`rounded-lg px-3 py-2 text-sm ${mode === 'round' ? 'bg-[#4fa8e0] text-[#0b0a14]' : 'bg-black/30 text-gray-300'}`}
                    >
                        Round 1
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('profit')}
                        className={`rounded-lg px-3 py-2 text-sm ${mode === 'profit' ? 'bg-[#4fa8e0] text-[#0b0a14]' : 'bg-black/30 text-gray-300'}`}
                    >
                        Holder Claims
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('marketplace')}
                        className={`rounded-lg px-3 py-2 text-sm ${mode === 'marketplace' ? 'bg-[#4fa8e0] text-[#0b0a14]' : 'bg-black/30 text-gray-300'}`}
                    >
                        Marketplace
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('courtyard')}
                        className={`rounded-lg px-3 py-2 text-sm ${mode === 'courtyard' ? 'bg-[#4fa8e0] text-[#0b0a14]' : 'bg-black/30 text-gray-300'}`}
                    >
                        Courtyard
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('lp')}
                        className={`rounded-lg px-3 py-2 text-sm ${mode === 'lp' ? 'bg-[#4fa8e0] text-[#0b0a14]' : 'bg-black/30 text-gray-300'}`}
                    >
                        LP
                    </button>
                </div>

                {mode === 'round' ? (
                    <div className="grid gap-4">
                        <p className="text-xs leading-5 text-gray-400">
                            Use this if Round 1 reaches its end timestamp without filling the cap. If a buy fills the cap, the fund auto-finalizes inside that investment transaction.
                        </p>
                        <div className="grid gap-2 text-xs text-gray-400">
                            <div>Round ID: 1</div>
                            <div>Status: {round1Status}</div>
                            <div>Target: {round1 ? `${formatEther(round1.targetAmount)} AVAX` : 'Unavailable'}</div>
                            <div>Raised: {round1 ? `${formatEther(round1.raisedAmount)} AVAX` : 'Unavailable'}</div>
                            <div>Price: {round1 ? `${formatEther(round1.tokenPrice)} AVAX/CATCH` : 'Unavailable'}</div>
                            <div>Start: {round1 ? new Date(Number(round1.startTime) * 1000).toISOString() : 'Unavailable'}</div>
                            <div>End: {round1 ? new Date(Number(round1.endTime) * 1000).toISOString() : 'Unavailable'}</div>
                            <div>Active: {round1 ? String(round1.isActive) : 'Unavailable'}</div>
                            <div>Finalized: {round1 ? String(round1.isFinalized) : 'Unavailable'}</div>
                        </div>
                        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                            Finalizing executes the fixed close flow: 10% of raised AVAX goes to LP, split 50/50 between Trader Joe and Pharaoh. The Trader Joe pair and Pharaoh pool are created if needed.
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <TxButton onClick={submitFinalizeRound1} txHash={txHash} isPending={isPending} disabled={!canFinalizeRound1}>
                                Finalize Round 1
                            </TxButton>
                        </div>
                    </div>
                ) : mode === 'profit' ? (
                    <div className="grid gap-4">
                        <p className="text-xs leading-5 text-gray-400">
                            Exclude protocol-controlled wallets from the 40% holder claim bucket. Circulating holders stay eligible by default.
                        </p>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400">Wallet address</span>
                            <input
                                className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                                placeholder="0x..."
                                value={exclusionAddress}
                                onChange={(event) => setExclusionAddress(event.target.value)}
                            />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white">
                            <input
                                type="checkbox"
                                checked={excluded}
                                onChange={(event) => setExcluded(event.target.checked)}
                                className="h-4 w-4 accent-[#4fa8e0]"
                            />
                            Excluded from profit share
                        </label>
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Current exclusion: {exclusionState === undefined ? 'Unknown' : exclusionState ? 'Excluded' : 'Eligible'}</div>
                            <div>Current claimable AVAX: {accountClaimable !== undefined ? formatEther(accountClaimable) : 'Unavailable'}</div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <TxButton onClick={submitExclusion} txHash={txHash} isPending={isPending} disabled={!MAINNET.fundProxy || !/^0x[a-fA-F0-9]{40}$/.test(exclusionAddress)}>
                                Save exclusion state
                            </TxButton>
                        </div>
                    </div>
                ) : mode === 'marketplace' ? (
                    <div className="grid gap-4">
                        <p className="text-xs leading-5 text-gray-400">
                            Approve supported marketplaces in the portfolio registry. `COURTYARD` stays the default label for the first operator-assisted workflow.
                        </p>
                        <Section title="Reusable marketplace checklist">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4fa8e0]">Canonical venue gates</div>
                                    <p className="mt-1 text-xs leading-5 text-gray-400">
                                        Every new marketplace adapter must clear these gates before execution work starts.
                                    </p>
                                </div>
                                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                                    {COURTYARD_CHECKLIST_SUMMARY.completed} / {COURTYARD_CHECKLIST_SUMMARY.total} covered by Courtyard
                                </div>
                            </div>
                            <div className="divide-y divide-white/10">
                                {MARKETPLACE_CHECKLIST_ITEMS.map((item, index) => (
                                    <div key={item.id} className="grid gap-2 py-3 md:grid-cols-[2.25rem_1fr] md:gap-3">
                                        <div className="font-mono text-xs text-gray-500">{String(index + 1).padStart(2, '0')}</div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                                                <span className="text-[0.66rem] uppercase tracking-[0.14em] text-emerald-200">Required</span>
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-gray-400">{item.gate}</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {item.requiredEvidence.map((evidence) => (
                                                    <span key={evidence} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.68rem] leading-none text-gray-300">
                                                        {evidence}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-[0.72rem] leading-5 text-gray-500">
                                                Courtyard fixture: {item.courtyardFixture}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                                Acceptance: all required evidence has a durable reference or an explicit unavailable fallback before the next venue is implemented.
                            </div>
                        </Section>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400">Marketplace label</span>
                            <input
                                className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                                placeholder="COURTYARD"
                                value={marketplaceLabel}
                                onChange={(event) => setMarketplaceLabel(event.target.value.toUpperCase())}
                            />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white">
                            <input
                                type="checkbox"
                                checked={marketplaceApproved}
                                onChange={(event) => setMarketplaceApproved(event.target.checked)}
                                className="h-4 w-4 accent-[#4fa8e0]"
                            />
                            Approved
                        </label>
                        <div className="text-xs text-gray-400">Marketplace ID: {marketplaceId}</div>
                        <div className="flex flex-wrap gap-3">
                            <TxButton onClick={submitMarketplace} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry}>
                                Save marketplace approval
                            </TxButton>
                        </div>

                        <Section title="Phygitals Solana custody">
                            <div className="grid gap-1 text-xs text-gray-400">
                                <div>Solana EID: {LZ_EID.SOLANA_MAINNET}</div>
                                <div className="break-all">Solana multisig: {formatNonEvmSafe(solanaChainSafe?.nonEvmSafe)}</div>
                                <div>Solana custody enabled: {solanaChainSafe ? String(solanaChainSafe.enabled) : 'Unavailable'}</div>
                                <div>PHYGITALS marketplace approved: {phygitalsMarketplaceApproved === undefined ? 'Unavailable' : String(phygitalsMarketplaceApproved)}</div>
                                <div>PHYGITALS marketplace ID: {PHYGITALS_MARKETPLACE_ID}</div>
                            </div>
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                Phygitals positions are Solana Metaplex Core assets. Configure the Squads multisig as the
                                non-EVM custody Safe; the EVM Safe slot is stored as zero address.
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                <Field
                                    label="Solana Squads multisig"
                                    value={solanaSafe}
                                    onChange={(value) => {
                                        setSolanaSafe(value);
                                        setSolanaSafeError('');
                                    }}
                                    placeholder="Base58 Solana address"
                                    mono
                                />
                                <TxButton
                                    onClick={submitPhygitalsSolanaSafe}
                                    txHash={txHash}
                                    isPending={isPending}
                                    disabled={!MAINNET.portfolioRegistry || !solanaSafe.trim()}
                                >
                                    Configure Solana Safe
                                </TxButton>
                            </div>
                            {solanaSafeError ? (
                                <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                                    {solanaSafeError}
                                </div>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => {
                                    setMarketplaceLabel('PHYGITALS');
                                    setMarketplaceApproved(true);
                                }}
                                className="w-fit rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10"
                            >
                                Prepare PHYGITALS approval
                            </button>

                            <div className="border-t border-white/10 pt-3">
                                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                                    <Field
                                        label="Phygitals card URL"
                                        value={phygitalsUrl}
                                        onChange={(value) => {
                                            setPhygitalsUrl(value);
                                            setPhygitalsCard(null);
                                            setPhygitalsError('');
                                        }}
                                        placeholder="https://www.phygitals.com/card/..."
                                        mono
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void resolvePhygitalsCard()}
                                        disabled={phygitalsLoading || !phygitalsUrl.trim()}
                                        className="rounded-lg bg-[#4fa8e0] px-4 py-2 text-sm font-semibold text-[#0b0a14] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {phygitalsLoading ? 'Resolving...' : 'Resolve Phygitals card'}
                                    </button>
                                </div>
                                {phygitalsError ? (
                                    <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                                        {phygitalsError}
                                    </div>
                                ) : null}
                                {phygitalsCard ? (
                                    <div className="mt-3 grid gap-4 md:grid-cols-[120px_1fr]">
                                        {phygitalsCard.image ? (
                                            <img
                                                src={phygitalsCard.image}
                                                alt={phygitalsCard.title}
                                                className="aspect-[3/4] w-full max-w-[120px] rounded-lg object-cover"
                                            />
                                        ) : null}
                                        <div className="grid gap-1 text-xs text-gray-400">
                                            <div className="text-sm font-semibold text-white">{phygitalsCard.title}</div>
                                            <div>Price: {phygitalsCard.listing ? `${phygitalsCard.listing.priceDecimal} ${phygitalsCard.listing.currency.symbol}` : `${phygitalsCard.altFmv ?? '0'} ALT FMV`}</div>
                                            <div>Marketplace: {phygitalsCard.marketplace}</div>
                                            <div>Vault: {phygitalsCard.vault || 'Unavailable'}</div>
                                            <div className="break-all">Asset: {phygitalsCard.assetAddress}</div>
                                            <div className="break-all">Collection: {phygitalsCard.collectionAddress}</div>
                                            <div className="break-all">Prepared purchase key: {purchase.key}</div>
                                            <div>Authorization status: {purchaseAuthorization ? statusLabel(PURCHASE_STATUS, purchaseAuthorization.status) : 'Unavailable'}</div>
                                        </div>
                                    </div>
                                ) : null}
                                <div className="mt-3 grid gap-2 text-xs text-gray-400">
                                    <div>PHYGITALS purchase chain: Solana mainnet EID {LZ_EID.SOLANA_MAINNET}</div>
                                    <div>Destination Safe: {formatNonEvmSafe(solanaChainSafe?.nonEvmSafe)}</div>
                                    <div>Position token standard: {position.tokenStandard}</div>
                                    <div className="break-all">Position asset: {position.nonEvmTokenId || 'Resolve a Phygitals card'}</div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3">
                                    <TxButton
                                        onClick={submitAuthorizePhygitalsPurchase}
                                        txHash={txHash}
                                        isPending={isPending}
                                        disabled={!MAINNET.portfolioRegistry || !purchase.key.trim() || !phygitalsCard}
                                    >
                                        Authorize Phygitals purchase
                                    </TxButton>
                                    <TxButton
                                        onClick={submitRecordPhygitalsExecution}
                                        txHash={txHash}
                                        isPending={isPending}
                                        disabled={!MAINNET.portfolioRegistry || !purchase.key.trim() || !purchase.executionRef || !phygitalsCard}
                                    >
                                        Record execution
                                    </TxButton>
                                    <TxButton
                                        onClick={submitRecordPhygitalsPosition}
                                        txHash={txHash}
                                        isPending={isPending}
                                        disabled={!MAINNET.fundProxy || !purchase.key.trim() || !position.nonEvmTokenId || !phygitalsCard}
                                    >
                                        Record Solana position
                                    </TxButton>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-3">
                                <div className="mb-3 grid gap-1 text-xs text-gray-400">
                                    <div>Avalanche treasury Safe: {effectiveTreasuryAddress ?? 'Unavailable'}</div>
                                    <div>Source asset: AVAX on Avalanche</div>
                                    <div>Destination asset: SOL on Solana</div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-[minmax(9rem,12rem)_1fr]">
                                    <Field
                                        label="Source amount (AVAX)"
                                        value={solanaFundingAmountAvax}
                                        onChange={(value) => {
                                            setSolanaFundingAmountAvax(value);
                                            setSolanaFundingQuote(null);
                                            setSolanaFundingError('');
                                        }}
                                        placeholder="4"
                                        type="number"
                                    />
                                    <Field
                                        label="Solana recipient"
                                        value={solanaFundingDestination}
                                        onChange={(value) => {
                                            setSolanaFundingDestination(value);
                                            setSolanaFundingQuote(null);
                                            setSolanaFundingError('');
                                        }}
                                        placeholder="Base58 Solana address"
                                        mono
                                    />
                                </div>
                                {solanaFundingQuote ? (
                                    <div className="mt-3 grid gap-1 text-xs text-gray-400">
                                        <div>Route: {solanaFundingQuote.sol.tool || 'LI.FI'}</div>
                                        <div>Estimated receive: {formatRawUnits(solanaFundingQuote.sol.toAmountRaw, 9)} SOL</div>
                                        <div>Minimum receive: {formatRawUnits(solanaFundingQuote.sol.toAmountMinRaw, 9)} SOL</div>
                                        <div>Estimated source gas: {solanaFundingQuote.sol.sourceGasAvax} AVAX</div>
                                    </div>
                                ) : null}
                                {solanaFundingError ? (
                                    <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                                        {solanaFundingError}
                                    </div>
                                ) : null}
                                <div className="mt-3 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => void quoteSolanaFunding()}
                                        disabled={solanaFundingLoading || !effectiveTreasuryAddress || !solanaFundingAmountAvax.trim() || !solanaFundingDestination.trim()}
                                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-50"
                                    >
                                        {solanaFundingLoading ? 'Quoting...' : 'Refresh LI.FI SOL quote'}
                                    </button>
                                    <TxButton
                                        onClick={() => void submitSolanaFunding()}
                                        txHash={solanaFundingTxHash}
                                        isPending={isSolanaFundingPending || solanaFundingLoading}
                                        disabled={!effectiveTreasuryAddress || !solanaFundingAmountAvax.trim() || !solanaFundingDestination.trim()}
                                    >
                                        Submit LI.FI SOL route
                                    </TxButton>
                                </div>
                                <TxResult hash={solanaFundingTxHash} error={solanaFundingSendError} />
                            </div>
                        </Section>
                    </div>
                ) : mode === 'courtyard' ? (
                    <div className="grid gap-4">
                        <p className="text-xs leading-5 text-gray-400">
                            Courtyard does not support Safe transactions directly. Fund and operate the Privy Polygon Hot Wallet
                            for buy/sell execution, then transfer purchased collectibles to the Polygon custody Safe before
                            recording the final position.
                        </p>

                        <Section title="Autopilot from Courtyard URL">
                            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                                <Field
                                    label="Courtyard asset URL"
                                    value={courtyardUrl}
                                    onChange={setCourtyardUrl}
                                    placeholder="https://courtyard.io/asset/..."
                                    mono
                                />
                                <button
                                    type="button"
                                    onClick={resolveCourtyardAutopilot}
                                    disabled={autopilotLoading || !courtyardUrl.trim() || !effectiveTreasuryAddress || !ADDRESS_RE.test(polygonSafe) || !ADDRESS_RE.test(polygonHotWallet)}
                                    className="rounded-lg bg-[#4fa8e0] px-4 py-2 text-sm font-semibold text-[#0b0a14] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {autopilotLoading ? 'Preparing...' : 'Resolve listing'}
                                </button>
                            </div>
                            {autopilotError ? (
                                <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                                    {autopilotError}
                                </div>
                            ) : null}
                            {autopilotAsset ? (
                                <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                                    {autopilotAsset.image ? (
                                        <img
                                            src={autopilotAsset.image}
                                            alt={autopilotAsset.title}
                                            className="aspect-[3/4] w-full max-w-[120px] rounded-lg object-cover"
                                        />
                                    ) : null}
                                    <div className="grid gap-2 text-xs text-gray-400">
                                        <div className="text-sm font-semibold text-white">{autopilotAsset.title}</div>
                                        <div>Price: {autopilotAsset.listing.priceDecimal} {autopilotAsset.listing.currency.symbol}</div>
                                        <div>Order ID: {autopilotAsset.listing.orderId}</div>
                                        <div>Expires: {autopilotAsset.listing.expiration}</div>
                                        <div>Collection: {autopilotAsset.collectionContract}</div>
                                        <div className="break-all">Token ID: {autopilotAsset.tokenId}</div>
                                        <div>Prepared purchase key: {purchase.key}</div>
                                    </div>
                                </div>
                            ) : null}
                            <div className="grid gap-1 text-xs text-gray-400">
                                <div>Listing resolved: {autopilotAsset ? 'yes' : 'pending'}</div>
                                <div>Polygon custody Safe configured: {polygonSafeConfigured ? 'yes' : 'no'}</div>
                                <div>Polygon Hot Wallet configured: {polygonHotWalletConfigured ? 'yes' : 'no'}</div>
                                <div>COURTYARD marketplace approved: {courtyardApproved ? 'yes' : 'no'}</div>
                                <div>LI.FI USDC quote sufficient: {fundingQuotes ? String(fundingQuotes.usdc.enoughOutput) : 'pending'}</div>
                            </div>
                            {autopilotAsset?.listing.expiresSoon ? (
                                <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                    This listing expires within 24 hours. Refresh the quote before signing any funding or purchase transactions.
                                </div>
                            ) : null}
                            {autopilotReady ? (
                                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                                    Autopilot prepared the withdrawal amount, LI.FI funding amounts, purchase authorization, fund release, and position fields. Review each prepared action before signing.
                                </div>
                            ) : null}
                        </Section>

                        <Section title="Fund Polygon Hot Wallet">
                            <div className="grid gap-1 text-xs text-gray-400">
                                <div>
                                    Avalanche treasury Safe: {effectiveTreasuryAddress ?? 'Unavailable'}
                                    {!treasuryAddress && effectiveTreasuryAddress ? ' (configured)' : ''}
                                </div>
                                <div>Polygon Hot Wallet for Courtyard buy/sell: {polygonHotWallet}</div>
                                <div>Polygon custody Safe after purchase: {polygonChainSafe?.evmSafe ?? polygonSafe}</div>
                                <div>Live liquid treasury: {formatUsdt6(liveLiquidTreasuryUsdt6)}</div>
                                <div>Stored accounting treasury: {stableAccounting ? `${formatUnits(stableAccounting[2], 6)} USDT` : 'Unavailable'}</div>
                            </div>
                            <p className="text-xs leading-5 text-gray-400">
                                This withdraws AVAX from the fund to the Avalanche treasury Safe. Then use the LI.FI widget
                                below from the connected Avalanche Safe to deliver Polygon USDC to the Polygon Hot Wallet
                                before buying on Courtyard.
                            </p>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field
                                    label="AVAX to withdraw to treasury Safe"
                                    value={treasuryWithdrawalAvax}
                                    onChange={setTreasuryWithdrawalAvax}
                                    placeholder="1"
                                    type="number"
                                />
                                <Field
                                    label="Withdrawal reason"
                                    value={treasuryWithdrawalReason}
                                    onChange={setTreasuryWithdrawalReason}
                                    placeholder="Fund Polygon Courtyard Hot Wallet"
                                />
                            </div>
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                The prepared withdrawal includes the LI.FI USDC route, source-chain gas estimates, and a 2%
                                buffer. Release amount accounting stays equal to the listing price.
                            </div>
                            {fundingQuotes ? (
                                <div className="grid gap-1 text-xs text-gray-400">
                                    <div>USDC route AVAX input: {fundingQuotes.usdc.fromAmountAvax} AVAX via {fundingQuotes.usdc.tool || 'LI.FI'}</div>
                                    <div>Estimated source gas: {fundingQuotes.usdc.sourceGasAvax} AVAX</div>
                                    <div>Total before buffer: {fundingQuotes.summary.totalAvax} AVAX</div>
                                    <div>Prepared withdrawal with 2% buffer: {fundingQuotes.summary.bufferedAvax} AVAX</div>
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-3">
                                <TxButton
                                    onClick={submitTreasuryWithdrawal}
                                    txHash={txHash}
                                    isPending={isPending}
                                    disabled={!MAINNET.fundProxy || !effectiveTreasuryAddress || !treasuryWithdrawalAvax.trim()}
                                >
                                    Withdraw AVAX to treasury Safe
                                </TxButton>
                            </div>
                            <div className="grid gap-3">
                                <div className="grid gap-3">
                                    <Field
                                        label="USDC route source amount (AVAX)"
                                        value={lifiUsdcFromAmount}
                                        onChange={setLifiUsdcFromAmount}
                                        placeholder="Resolve a Courtyard listing"
                                        type="number"
                                    />
                                    <div className="grid gap-2 text-xs text-gray-400">
                                        <div>LI.FI source: Avalanche AVAX from the connected treasury Safe</div>
                                        <div>LI.FI destination: Polygon USDC to {polygonHotWallet}</div>
                                    </div>
                                    <Suspense fallback={<div className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-gray-400">Loading LI.FI USDC route...</div>}>
                                        <LiFiWidget config={lifiUsdcWidgetConfig} integrator="gm10-admin" />
                                    </Suspense>
                                </div>
                            </div>
                        </Section>

                        <Section title="Live Courtyard configuration">
                            <div className="grid gap-1 text-xs text-gray-400">
                                <div>Polygon EID: {LZ_EID.POLYGON_MAINNET}</div>
                                <div>Polygon custody Safe: {polygonChainSafe?.evmSafe ?? 'Unavailable'}</div>
                                <div>Polygon Hot Wallet: {polygonHotWallet}</div>
                                <div>Polygon custody Safe enabled: {polygonChainSafe ? String(polygonChainSafe.enabled) : 'Unavailable'}</div>
                                <div>COURTYARD marketplace approved: {courtyardMarketplaceApproved === undefined ? 'Unavailable' : String(courtyardMarketplaceApproved)}</div>
                                <div>COURTYARD marketplace ID: {COURTYARD_MARKETPLACE_ID}</div>
                            </div>
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                Configure the Polygon custody Safe onchain. The Hot Wallet is an off-chain operator wallet used
                                only because Courtyard does not support Safe execution.
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                <Field
                                    label="Polygon Safe for Courtyard custody"
                                    value={polygonSafe}
                                    onChange={setPolygonSafe}
                                    placeholder="0x..."
                                    mono
                                />
                                <TxButton
                                    onClick={submitCourtyardPolygonSafe}
                                    txHash={txHash}
                                    isPending={isPending}
                                    disabled={!MAINNET.courtyardWorkflow || !ADDRESS_RE.test(polygonSafe)}
                                >
                                    Configure Polygon Safe
                                </TxButton>
                            </div>
                            <Field
                                label="Polygon Hot Wallet for Courtyard buy/sell"
                                value={polygonHotWallet}
                                onChange={setPolygonHotWallet}
                                placeholder="0x..."
                                mono
                            />
                        </Section>

                        <Section title="Purchase">
                            <div className="grid gap-1 text-xs text-gray-400">
                                <div>Purchase key: {purchaseKey}</div>
                                <div>Status: {purchaseAuthorization ? statusLabel(PURCHASE_STATUS, purchaseAuthorization.status) : 'Unavailable'}</div>
                                <div>Destination Safe: {purchaseAuthorization?.destinationSafe ?? 'Unavailable'}</div>
                                <div>Max spend: {purchaseAuthorization ? `${formatUnits(purchaseAuthorization.maxSpendUsdt6, 6)} USDT` : 'Unavailable'}</div>
                                <div>Funding token: {purchaseAuthorization?.fundingToken ?? 'Unavailable'}</div>
                                <div>Confirmed funding: {purchaseAuthorization ? `${formatUnits(purchaseAuthorization.releasedUsdt6, 6)} USDT` : 'Unavailable'}</div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Purchase key" value={purchase.key} onChange={(value) => updatePurchase('key', value)} placeholder="courtyard-purchase-1 or 0x..." mono />
                                <Field label="Asset ref" value={purchase.assetRef} onChange={(value) => updatePurchase('assetRef', value)} placeholder="Courtyard listing, vault, or 0x..." mono />
                                <Field label="Max spend (USDT)" value={purchase.maxSpendUsdt} onChange={(value) => updatePurchase('maxSpendUsdt', value)} placeholder="100" type="number" />
                                <Field label="Mandate ref" value={purchase.mandateRef} onChange={(value) => updatePurchase('mandateRef', value)} placeholder="buy mandate or 0x..." mono />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitAuthorizePurchase} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry || !purchase.key.trim()}>
                                    Authorize purchase
                                </TxButton>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                                <Field label="Confirmed funding amount (USDT)" value={purchase.releaseAmountUsdt} onChange={(value) => updatePurchase('releaseAmountUsdt', value)} placeholder="80" type="number" />
                                <TxButton onClick={submitConfirmPurchaseFunding} txHash={txHash} isPending={isPending} disabled={!MAINNET.fundProxy || !purchase.key.trim() || !ADDRESS_RE.test(polygonSafe)}>
                                    Confirm purchase funding
                                </TxButton>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <Field label="Execution ref" value={purchase.executionRef} onChange={(value) => updatePurchase('executionRef', value)} placeholder="Courtyard buy tx or 0x..." mono />
                                <Field label="Settlement ref" value={purchase.settlementRef} onChange={(value) => updatePurchase('settlementRef', value)} placeholder="settlement ref or 0x..." mono />
                                <Field label="Proof ref" value={purchase.proofRef} onChange={(value) => updatePurchase('proofRef', value)} placeholder="proof hash or 0x..." mono />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitRecordPurchaseExecution} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry || !purchase.key.trim()}>
                                    Record purchase execution
                                </TxButton>
                            </div>
                        </Section>

                        <Section title="Record position">
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                Record the position after the Courtyard token has been transferred from the Polygon Hot Wallet
                                to the Polygon custody Safe. Keep the Courtyard purchase tx as the execution proof and use the
                                transfer tx as supporting custody proof if available.
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-400">Custody mode</span>
                                    <select
                                        className="rounded bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                                        value={position.custodyMode}
                                        onChange={(event) => updatePosition('custodyMode', event.target.value)}
                                    >
                                        <option value="0">Native chain</option>
                                        <option value="1">Mirrored Avalanche</option>
                                    </select>
                                </label>
                                <Field label="Token standard" value={position.tokenStandard} onChange={(value) => updatePosition('tokenStandard', value)} placeholder="ERC721" />
                                <Field label="EVM collection" value={position.evmCollection} onChange={(value) => updatePosition('evmCollection', value)} placeholder="0x..." mono />
                                <Field label="Token ID" value={position.tokenId} onChange={(value) => updatePosition('tokenId', value)} placeholder="0" mono />
                                <Field label="Non-EVM collection" value={position.nonEvmCollection} onChange={(value) => updatePosition('nonEvmCollection', value)} placeholder="optional" mono />
                                <Field label="Non-EVM token ID" value={position.nonEvmTokenId} onChange={(value) => updatePosition('nonEvmTokenId', value)} placeholder="optional" mono />
                                <Field label="External asset ID" value={position.externalAssetId} onChange={(value) => updatePosition('externalAssetId', value)} placeholder="Courtyard card ID" mono />
                                <Field label="Category ID" value={position.categoryId} onChange={(value) => updatePosition('categoryId', value)} placeholder="POKEMON_CARD" />
                                <Field label="Marketplace provenance ref" value={position.marketplaceProvenanceRef} onChange={(value) => updatePosition('marketplaceProvenanceRef', value)} placeholder="vault/provenance ref" mono />
                                <Field label="Acquisition price (USDT)" value={position.acquisitionPriceUsdt} onChange={(value) => updatePosition('acquisitionPriceUsdt', value)} placeholder="80" type="number" />
                                <Field label="Metadata ref" value={position.metadataRef} onChange={(value) => updatePosition('metadataRef', value)} placeholder="metadata hash or 0x..." mono />
                                <Field label="Proof ref" value={position.proofRef} onChange={(value) => updatePosition('proofRef', value)} placeholder="proof hash or 0x..." mono />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton
                                    onClick={submitRecordPosition}
                                    txHash={txHash}
                                    isPending={isPending}
                                    disabled={!MAINNET.fundProxy || !purchase.key.trim() || !isAddress(position.evmCollection)}
                                >
                                    Record collectible position
                                </TxButton>
                            </div>
                        </Section>

                        <Section title="Sale">
                            <div className="grid gap-1 text-xs text-gray-400">
                                <div>Sale key: {saleKey}</div>
                                <div>Status: {saleAuthorization ? statusLabel(SALE_STATUS, saleAuthorization.status) : 'Unavailable'}</div>
                                <div>Position ID: {saleAuthorization ? saleAuthorization.positionId.toString() : 'Unavailable'}</div>
                                <div>Min net proceeds: {saleAuthorization ? `${formatUnits(saleAuthorization.minNetProceedsUsdt6, 6)} USDT` : 'Unavailable'}</div>
                                <div>Net proceeds confirmed: {saleAuthorization ? `${formatUnits(saleAuthorization.netProceedsUsdt6, 6)} USDT` : 'Unavailable'}</div>
                                <div>Settlement token: {saleAuthorization?.proceedsToken ?? 'Unavailable'}</div>
                                <div>Settlement amount: {saleAuthorization ? saleAuthorization.proceedsAmount.toString() : 'Unavailable'}</div>
                                <div>External source: {saleAuthorization?.sourceChainEid ? `${saleAuthorization.sourceChainEid} / ${saleAuthorization.sourceToken}` : 'None'}</div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Sale key" value={sale.key} onChange={(value) => updateSale('key', value)} placeholder="courtyard-sale-1 or 0x..." mono />
                                <Field label="Position ID" value={sale.positionId} onChange={(value) => updateSale('positionId', value)} placeholder="1" type="number" />
                                <Field label="Min net proceeds (USDT)" value={sale.minNetProceedsUsdt} onChange={(value) => updateSale('minNetProceedsUsdt', value)} placeholder="100" type="number" />
                                <Field label="Mandate ref" value={sale.mandateRef} onChange={(value) => updateSale('mandateRef', value)} placeholder="sale mandate or 0x..." mono />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitAuthorizeSale} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry || !sale.key.trim()}>
                                    Authorize sale
                                </TxButton>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Gross proceeds (USDT)" value={sale.grossProceedsUsdt} onChange={(value) => updateSale('grossProceedsUsdt', value)} placeholder="120" type="number" />
                                <Field label="Marketplace fees (USDT)" value={sale.marketplaceFeesUsdt} onChange={(value) => updateSale('marketplaceFeesUsdt', value)} placeholder="8" type="number" />
                                <Field label="Bridge fees (USDT)" value={sale.bridgeFeesUsdt} onChange={(value) => updateSale('bridgeFeesUsdt', value)} placeholder="2" type="number" />
                                <Field label="Execution ref" value={sale.executionRef} onChange={(value) => updateSale('executionRef', value)} placeholder="Courtyard sale tx or 0x..." mono />
                                <Field label="Proceeds ref" value={sale.proceedsRef} onChange={(value) => updateSale('proceedsRef', value)} placeholder="proceeds ref or 0x..." mono />
                                <Field label="Proof ref" value={sale.proofRef} onChange={(value) => updateSale('proofRef', value)} placeholder="proof hash or 0x..." mono />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitRecordSaleExecution} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry || !sale.key.trim()}>
                                    Record sale execution
                                </TxButton>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-400">Settlement mode</span>
                                    <select
                                        className="rounded bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                                        value={sale.settlementMode}
                                        onChange={(event) => updateSale('settlementMode', event.target.value as SaleForm['settlementMode'])}
                                    >
                                        <option value="stable">USDC/USDT returned to fund</option>
                                        <option value="native">AVAX returned to fund</option>
                                        <option value="external">External token pending normalization</option>
                                    </select>
                                </label>
                                {sale.settlementMode === 'stable' ? (
                                    <>
                                        <Field label="Stable proceeds token" value={sale.stableProceedsToken} onChange={(value) => updateSale('stableProceedsToken', value)} placeholder="0x..." mono />
                                        <Field label="Stable proceeds amount" value={sale.stableProceedsAmount} onChange={(value) => updateSale('stableProceedsAmount', value)} placeholder="110" type="number" />
                                        <label className="flex items-center gap-2 text-sm text-gray-300">
                                            <input type="checkbox" checked={sale.pullStableFromCaller} onChange={(event) => updateSale('pullStableFromCaller', event.target.checked)} />
                                            Pull stablecoin from connected wallet
                                        </label>
                                    </>
                                ) : sale.settlementMode === 'native' ? (
                                    <Field label="Native proceeds to deposit (AVAX)" value={sale.nativeProceedsAvax} onChange={(value) => updateSale('nativeProceedsAvax', value)} placeholder="4.4" type="number" />
                                ) : (
                                    <>
                                        <Field label="Source chain EID" value={sale.sourceChainEid} onChange={(value) => updateSale('sourceChainEid', value)} placeholder="30101" type="number" />
                                        <Field label="Source token" value={sale.sourceToken} onChange={(value) => updateSale('sourceToken', value)} placeholder="0x..." mono />
                                        <Field label="Source token amount" value={sale.sourceTokenAmount} onChange={(value) => updateSale('sourceTokenAmount', value)} placeholder="1" type="number" />
                                        <Field label="Source token decimals" value={sale.sourceTokenDecimals} onChange={(value) => updateSale('sourceTokenDecimals', value)} placeholder="18" type="number" />
                                        <Field label="Source proceeds ref" value={sale.sourceProceedsRef} onChange={(value) => updateSale('sourceProceedsRef', value)} placeholder="external tx or 0x..." mono />
                                    </>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitConfirmSaleProceeds} txHash={txHash} isPending={isPending} disabled={(!MAINNET.fundProxy && sale.settlementMode !== 'external') || (!MAINNET.portfolioRegistry && sale.settlementMode === 'external') || !sale.key.trim()}>
                                    {sale.settlementMode === 'external' ? 'Record external proceeds' : 'Confirm settled proceeds'}
                                </TxButton>
                                <TxButton onClick={submitFinalizeSale} txHash={txHash} isPending={isPending} disabled={!MAINNET.fundProxy || !sale.key.trim() || saleAuthorization?.status !== 4}>
                                    Finalize sale
                                </TxButton>
                            </div>
                        </Section>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <p className="text-xs leading-5 text-gray-400">
                            Real LP execution is split 50/50 between Trader Joe and Pharaoh. Trader Joe LP tokens are burned; Pharaoh CL positions are locked to the configured permanent owner.
                        </p>
                        <div className="grid gap-2 text-xs text-gray-400">
                            <div>Trader Joe AVAX deployed: {traderJoeAvaxLp !== undefined ? `${formatEther(traderJoeAvaxLp)} AVAX` : 'Unavailable'}</div>
                            <div>Pharaoh AVAX deployed: {pharaohAvaxLp !== undefined ? `${formatEther(pharaohAvaxLp)} AVAX` : 'Unavailable'}</div>
                            <div>Trader Joe CATCH deployed: {traderJoeTokenLp !== undefined ? `${formatUnits(traderJoeTokenLp, 18)} CATCH` : 'Unavailable'}</div>
                            <div>Pharaoh CATCH deployed: {pharaohTokenLp !== undefined ? `${formatUnits(pharaohTokenLp, 18)} CATCH` : 'Unavailable'}</div>
                        </div>
                    </div>
                )}

                <TxResult hash={txHash} error={error} />
            </div>
        </div>
    );
}
