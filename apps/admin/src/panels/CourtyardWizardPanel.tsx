import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits, isAddress, keccak256, parseEther, parseUnits, stringToHex, zeroHash } from 'viem';
import { useAccount, useReadContract, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { FUND_ADMIN_ABI, REGISTRY_ABI } from '../abis';
import { EXPLORER_TX_BASE_URL, LZ_EID, MAINNET } from '../addresses';
import { AdminButton, AdminField as Field, AdminPage, OperatorFlowPanel, SectionPanel as Panel } from '../components/AdminPrimitives';
import { READ_STATUS } from '../lib/adminMetrics.js';
import { getFundingCapacityIssue, getPurchaseFundingConfirmationIssues } from '../lib/purchaseFunding.js';

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000' as const;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;
const AVALANCHE_CHAIN_ID = 43114;
const POLYGON_CHAIN_ID = 137;
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const COURTYARD_MARKETPLACE_ID = keccak256(stringToHex('COURTYARD'));
const STORAGE_KEY = 'gm10:courtyard-wizard:draft';
const NFT_OWNERSHIP_POLL_INTERVAL_MS = 5_000;
const STEP_IDS = [
    'resolve',
    'preflight',
    'authorize_purchase',
    'withdraw_avax',
    'bridge_usdc_to_hot_wallet',
    'confirm_funding',
    'buy_on_courtyard',
    'detect_hot_wallet_nft',
    'transfer_nft_to_safe',
    'record_execution',
    'record_position',
    'complete',
] as const;

type StepId = typeof STEP_IDS[number];
type Bytes32 = `0x${string}`;

type CourtyardAsset = {
    assetId: string;
    sourceUrl: string;
    title: string;
    image: string;
    collectionName: string;
    collectionContract: string;
    tokenId: string;
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

type CourtyardDeal = {
    assetId: string;
    assetUrl: string;
    title: string;
    category: string;
    grade?: string;
    image: string;
    priceUsd: number;
    priceUsdt6: string;
    fmvUsd?: number;
    upsideUsd?: number;
    discountPct?: number;
    confidence: number;
    seller: string;
    serialNumber: string;
    marketplace?: string;
    fitStatus: 'fits' | 'over_budget';
    blockedReason: string;
};

type LifiTransactionRequest = {
    to?: `0x${string}`;
    data?: `0x${string}`;
    value?: string;
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
};

type FundingQuote = {
    kind: string;
    tool: string;
    fromAmountAvax: string;
    sourceGasAvax: string;
    totalInputAvax: string;
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

type WizardDraft = {
    courtyardUrl: string;
    activeStep: StepId;
    completed: Partial<Record<StepId, boolean>>;
    asset: CourtyardAsset | null;
    quotes: FundingQuotes | null;
    withdrawalAvax: string;
    withdrawalReason: string;
    purchase: PurchaseForm;
    position: PositionForm;
    txHashes: Partial<Record<StepId, `0x${string}`>>;
};

type PendingTx = {
    step: StepId;
    hash: `0x${string}`;
    label: string;
    kind: 'contract' | 'bridge';
};

const ERC20_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const ERC721_ABI = [
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'ownerOf',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const ERC1155_ABI = [
    {
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'id', type: 'uint256' },
        ],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const STEPS: Array<{ id: StepId; title: string }> = [
    { id: 'resolve', title: 'Resolve listing' },
    { id: 'preflight', title: 'Preflight' },
    { id: 'authorize_purchase', title: 'Authorize purchase' },
    { id: 'withdraw_avax', title: 'Withdraw AVAX' },
    { id: 'bridge_usdc_to_hot_wallet', title: 'Bridge USDC' },
    { id: 'confirm_funding', title: 'Confirm funding' },
    { id: 'buy_on_courtyard', title: 'Buy on Courtyard' },
    { id: 'detect_hot_wallet_nft', title: 'Detect Hot Wallet NFT' },
    { id: 'transfer_nft_to_safe', title: 'Move NFT to Safe' },
    { id: 'record_execution', title: 'Record execution' },
    { id: 'record_position', title: 'Record position' },
    { id: 'complete', title: 'Complete' },
];

function defaultPurchase(): PurchaseForm {
    return {
        key: '',
        assetRef: '',
        maxSpendUsdt: '',
        releaseAmountUsdt: '',
        mandateRef: '',
        executionRef: '',
        settlementRef: '',
        proofRef: '',
    };
}

function defaultPosition(): PositionForm {
    return {
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
    };
}

function defaultDraft(): WizardDraft {
    return {
        courtyardUrl: '',
        activeStep: 'resolve',
        completed: {},
        asset: null,
        quotes: null,
        withdrawalAvax: '',
        withdrawalReason: '',
        purchase: defaultPurchase(),
        position: defaultPosition(),
        txHashes: {},
    };
}

function loadDraft(): WizardDraft {
    if (typeof window === 'undefined') return defaultDraft();
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored ? { ...defaultDraft(), ...JSON.parse(stored) } : defaultDraft();
    } catch {
        return defaultDraft();
    }
}

function bytes32FromInput(value: string, emptyValue: Bytes32 = zeroHash): Bytes32 {
    const trimmed = value.trim();
    if (!trimmed) return emptyValue;
    if (BYTES32_RE.test(trimmed)) return trimmed as Bytes32;
    return keccak256(stringToHex(trimmed));
}

function parseUsdt6Input(value: string): bigint {
    return parseUnits(value.trim() || '0', 6);
}

function tryParseUsdt6Input(value: string): bigint | undefined {
    try {
        return parseUsdt6Input(value);
    } catch {
        return undefined;
    }
}

function parseUintInput(value: string): bigint {
    return BigInt(value.trim() || '0');
}

function tryParseUintInput(value: string | undefined): bigint | undefined {
    try {
        const trimmed = String(value ?? '').trim();
        if (!trimmed) return undefined;
        const parsed = BigInt(trimmed);
        return parsed >= 0n ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function shortHash(hash: string) {
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function sameAddress(left?: string, right?: string) {
    return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function formatUsd(value?: number) {
    if (!Number.isFinite(value)) return 'n/a';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value as number);
}

function formatPct(value?: number) {
    if (!Number.isFinite(value)) return 'n/a';
    return `${(value as number).toFixed(1)}%`;
}

function TxSummary({ tx }: { tx: PendingTx | null }) {
    if (!tx) return null;
    return (
        <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-gray-300">
            <div>{tx.label}</div>
            <a href={`${EXPLORER_TX_BASE_URL}/${tx.hash}`} target="_blank" rel="noreferrer" className="font-mono text-[#4fa8e0] underline">
                {shortHash(tx.hash)}
            </a>
        </div>
    );
}

function StoredTxSummary({ hash, label }: { hash?: `0x${string}`; label: string }) {
    if (!hash) return null;
    return (
        <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-gray-300">
            <div>{label}</div>
            <a href={`${EXPLORER_TX_BASE_URL}/${hash}`} target="_blank" rel="noreferrer" className="font-mono text-[#4fa8e0] underline">
                {shortHash(hash)}
            </a>
        </div>
    );
}

export function CourtyardWizardPanel() {
    const [draft, setDraft] = useState<WizardDraft>(() => loadDraft());
    const [error, setError] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [pendingTx, setPendingTx] = useState<PendingTx | null>(null);
    const { chainId } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const { writeContractAsync, isPending: isContractPending } = useWriteContract();
    const { sendTransactionAsync, isPending: isBridgePending } = useSendTransaction();

    const asset = draft.asset;
    const quotes = draft.quotes;
    const polygonSafe = MAINNET.polygonCourtyardSafe;
    const polygonHotWallet = MAINNET.polygonCourtyardHotWallet;
    const listingFundingToken = (asset?.listing.currency.contract && isAddress(asset.listing.currency.contract)
        ? asset.listing.currency.contract
        : POLYGON_USDC) as `0x${string}`;
    const purchaseKey = useMemo(() => bytes32FromInput(draft.purchase.key), [draft.purchase.key]);
    const targetUsdcRaw = asset ? BigInt(asset.listing.priceRaw) : 0n;
    const positionTokenId = tryParseUintInput(draft.position.tokenId);
    const assetTokenId = tryParseUintInput(asset?.tokenId);
    const nftTokenId = positionTokenId ?? assetTokenId ?? 0n;
    const nftCollection = (
        isAddress(draft.position.evmCollection)
            ? draft.position.evmCollection
            : asset?.collectionContract ?? ADDRESS_ZERO
    ) as `0x${string}`;
    const hasNftLookupTarget = isAddress(nftCollection) && (positionTokenId !== undefined || assetTokenId !== undefined);
    const shouldPollNftOwner = Boolean(
        hasNftLookupTarget &&
        (
            draft.activeStep === 'buy_on_courtyard' ||
            draft.activeStep === 'detect_hot_wallet_nft' ||
            draft.activeStep === 'transfer_nft_to_safe' ||
            draft.activeStep === 'record_position'
        ),
    );

    const { data: treasuryAddress } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'treasury',
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });
    const effectiveTreasuryAddress = (treasuryAddress ?? MAINNET.treasurySafe) as `0x${string}` | undefined;
    const { data: stableAccounting } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'stableAccounting',
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });
    const dealBudgetUsdt6 = useMemo(() => {
        if (!stableAccounting) return undefined;
        return (stableAccounting[2] > stableAccounting[6] ? stableAccounting[2] - stableAccounting[6] : 0n).toString();
    }, [stableAccounting]);
    const dealBudgetLabel = dealBudgetUsdt6 !== undefined ? `${formatUnits(BigInt(dealBudgetUsdt6), 6)} USDT` : 'Loading...';
    const courtyardDeals = useQuery({
        queryKey: ['courtyard-deals', dealBudgetUsdt6],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '25' });
            if (dealBudgetUsdt6 !== undefined) params.set('budgetUsdt6', dealBudgetUsdt6);
            const response = await fetch(`/api/courtyard-deals?${params.toString()}`);
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Unable to scan Courtyard deals');
            return payload as { source: string; deals: CourtyardDeal[] };
        },
        enabled: dealBudgetUsdt6 !== undefined,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const { data: polygonChainSafe } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'getChainSafe',
        args: [LZ_EID.POLYGON_MAINNET],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) },
    });

    const { data: courtyardMarketplaceApproved } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'isMarketplaceApproved',
        args: [COURTYARD_MARKETPLACE_ID],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) },
    });

    const { data: purchaseAuthorization, refetch: refetchPurchaseAuthorization } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'getPurchaseAuthorization',
        args: [purchaseKey],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) && Boolean(draft.purchase.key.trim()) },
    });

    const { data: hotWalletUsdc, refetch: refetchHotWalletUsdc } = useReadContract({
        address: listingFundingToken,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [polygonHotWallet],
        chainId: POLYGON_CHAIN_ID,
        query: {
            enabled: Boolean(asset && isAddress(polygonHotWallet)),
            refetchInterval: 15_000,
        },
    });

    const {
        data: erc721Owner,
        refetch: refetchErc721Owner,
        isFetching: isErc721OwnerFetching,
        isError: isErc721OwnerError,
        error: erc721OwnerError,
    } = useReadContract({
        address: nftCollection,
        abi: ERC721_ABI,
        functionName: 'ownerOf',
        args: [nftTokenId],
        chainId: POLYGON_CHAIN_ID,
        query: {
            enabled: shouldPollNftOwner,
            retry: false,
            refetchInterval: shouldPollNftOwner ? NFT_OWNERSHIP_POLL_INTERVAL_MS : false,
            refetchIntervalInBackground: true,
        },
    });

    const {
        data: erc1155HotWalletBalance,
        refetch: refetchErc1155HotWalletBalance,
        isFetching: isErc1155HotWalletFetching,
    } = useReadContract({
        address: nftCollection,
        abi: ERC1155_ABI,
        functionName: 'balanceOf',
        args: [polygonHotWallet, nftTokenId],
        chainId: POLYGON_CHAIN_ID,
        query: {
            enabled: shouldPollNftOwner,
            retry: false,
            refetchInterval: shouldPollNftOwner ? NFT_OWNERSHIP_POLL_INTERVAL_MS : false,
            refetchIntervalInBackground: true,
        },
    });

    const {
        data: erc1155SafeBalance,
        refetch: refetchErc1155SafeBalance,
        isFetching: isErc1155SafeFetching,
        isError: isErc1155SafeError,
    } = useReadContract({
        address: nftCollection,
        abi: ERC1155_ABI,
        functionName: 'balanceOf',
        args: [polygonSafe, nftTokenId],
        chainId: POLYGON_CHAIN_ID,
        query: {
            enabled: shouldPollNftOwner,
            retry: false,
            refetchInterval: shouldPollNftOwner ? NFT_OWNERSHIP_POLL_INTERVAL_MS : false,
            refetchIntervalInBackground: true,
        },
    });

    const contractReceipt = useWaitForTransactionReceipt({
        hash: pendingTx?.kind === 'contract' ? pendingTx.hash : undefined,
        chainId: AVALANCHE_CHAIN_ID,
    });
    const bridgeReceipt = useWaitForTransactionReceipt({
        hash: pendingTx?.kind === 'bridge' ? pendingTx.hash : draft.txHashes.bridge_usdc_to_hot_wallet,
        chainId: AVALANCHE_CHAIN_ID,
    });

    const lifiStatus = useQuery({
        queryKey: ['lifi-status', draft.txHashes.bridge_usdc_to_hot_wallet, quotes?.usdc.tool],
        queryFn: async () => {
            const params = new URLSearchParams({
                txHash: draft.txHashes.bridge_usdc_to_hot_wallet ?? '',
            });
            if (quotes?.usdc.tool) params.set('bridge', quotes.usdc.tool);
            const response = await fetch(`/api/lifi-status?${params.toString()}`);
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Unable to check LI.FI status');
            return payload as { status?: string; substatus?: string; substatusMessage?: string; lifiExplorerLink?: string };
        },
        enabled: Boolean(draft.txHashes.bridge_usdc_to_hot_wallet && bridgeReceipt.isSuccess && draft.activeStep === 'bridge_usdc_to_hot_wallet'),
        refetchInterval: 15_000,
    });

    const purchaseStatus = Number(purchaseAuthorization?.status ?? 0);
    const purchaseAuthorized = purchaseStatus >= 1;
    const confirmFundingAmountUsdt6 = useMemo(() => tryParseUsdt6Input(draft.purchase.releaseAmountUsdt), [draft.purchase.releaseAmountUsdt]);
    const fundingCapacityIssue = useMemo(() => getFundingCapacityIssue({
        amountUsdt6: confirmFundingAmountUsdt6,
        liquidTreasuryUsdt6: stableAccounting?.[2],
        holderDistributionAccruedUsdt6: stableAccounting?.[6],
    }), [confirmFundingAmountUsdt6, stableAccounting]);
    const requiredFundingCapacityUsdt6 = confirmFundingAmountUsdt6 !== undefined && stableAccounting
        ? confirmFundingAmountUsdt6 + stableAccounting[6]
        : undefined;
    const fundingCapacityDetail = stableAccounting && requiredFundingCapacityUsdt6 !== undefined
        ? `Stored liquid treasury: ${formatUnits(stableAccounting[2], 6)} USDT. Required: ${formatUnits(requiredFundingCapacityUsdt6, 6)} USDT including the legacy reserved bucket.`
        : 'Stored liquid treasury accounting is still loading.';
    const purchaseReleased = purchaseStatus >= 3 || (
        confirmFundingAmountUsdt6 !== undefined &&
        confirmFundingAmountUsdt6 > 0n &&
        (purchaseAuthorization?.releasedUsdt6 ?? 0n) >= confirmFundingAmountUsdt6
    );
    const fundingConfirmationIssues = useMemo(() => getPurchaseFundingConfirmationIssues({
        purchase: draft.purchase,
        authorization: purchaseAuthorization,
        polygonSafe,
        fundingToken: listingFundingToken,
        destinationChainEid: LZ_EID.POLYGON_MAINNET,
        amountUsdt6: confirmFundingAmountUsdt6,
        liquidTreasuryUsdt6: stableAccounting?.[2],
        holderDistributionAccruedUsdt6: stableAccounting?.[6],
    }), [confirmFundingAmountUsdt6, draft.purchase, listingFundingToken, polygonSafe, purchaseAuthorization, stableAccounting]);
    const canConfirmFunding = fundingConfirmationIssues.length === 0;
    const purchaseExecuted = purchaseStatus >= 4;
    const positionRecorded = purchaseStatus >= 5;
    const hotWalletHasUsdc = (hotWalletUsdc ?? 0n) >= targetUsdcRaw && targetUsdcRaw > 0n;
    const erc1155InHotWallet = (erc1155HotWalletBalance ?? 0n) > 0n;
    const erc1155InSafe = (erc1155SafeBalance ?? 0n) > 0n;
    const nftInHotWallet = sameAddress(erc721Owner, polygonHotWallet) || erc1155InHotWallet;
    const nftInSafe = sameAddress(erc721Owner, polygonSafe) || erc1155InSafe;
    const detectedTokenStandard = erc1155InHotWallet || erc1155InSafe ? 'ERC1155' : 'ERC721';
    const nftOwner = erc721Owner ?? (erc1155InSafe ? polygonSafe : erc1155InHotWallet ? polygonHotWallet : undefined);
    const isNftOwnerFetching = isErc721OwnerFetching || isErc1155HotWalletFetching || isErc1155SafeFetching;
    const nftOwnerStatus = nftOwner
        ? `${nftOwner}${detectedTokenStandard === 'ERC1155' ? ` (${detectedTokenStandard})` : ''}`
        : isErc721OwnerError && !erc1155InHotWallet && !erc1155InSafe
            ? 'Not detected yet'
            : isNftOwnerFetching
                ? 'Checking...'
                : 'Waiting for ownership update';
    const erc721OwnershipReadError = erc721OwnerError instanceof Error ? erc721OwnerError.message : undefined;
    const erc1155SafeBalanceStatus = erc1155SafeBalance !== undefined
        ? erc1155SafeBalance.toString()
        : isErc1155SafeError
            ? 'Not supported by collection'
            : 'Checking...';

    async function refetchNftOwner() {
        await Promise.allSettled([
            refetchErc721Owner(),
            refetchErc1155HotWalletBalance(),
            refetchErc1155SafeBalance(),
        ]);
    }
    const bridgeRouteDone = hotWalletHasUsdc || lifiStatus.data?.status === 'DONE';
    const bridgeRouteFailed = lifiStatus.data?.status === 'FAILED' || lifiStatus.data?.status === 'INVALID';
    const currentStepTitle = STEPS.find((step) => step.id === draft.activeStep)?.title ?? draft.activeStep;
    const nextContractStep: Partial<Record<StepId, StepId>> = {
        authorize_purchase: 'withdraw_avax',
        withdraw_avax: 'bridge_usdc_to_hot_wallet',
        confirm_funding: 'buy_on_courtyard',
        record_execution: 'record_position',
        record_position: 'complete',
    };

    const preflightChecks = [
        { label: 'Active Courtyard listing resolved', ok: Boolean(asset) },
        { label: 'Listing is Polygon USDC', ok: Boolean(asset && asset.listing.currency.symbol === 'USDC') },
        { label: 'Polygon custody Safe configured', ok: Boolean(polygonChainSafe?.enabled && sameAddress(polygonChainSafe.evmSafe, polygonSafe)) },
        { label: 'Polygon Hot Wallet configured', ok: isAddress(polygonHotWallet) },
        { label: 'COURTYARD marketplace approved', ok: courtyardMarketplaceApproved === true },
        { label: 'LI.FI USDC route output is sufficient', ok: Boolean(quotes?.usdc.enoughOutput && quotes.usdc.transactionRequest?.to) },
        { label: fundingCapacityIssue ? `Stored liquid treasury covers purchase funding: ${fundingCapacityIssue}` : 'Stored liquid treasury covers purchase funding', ok: !fundingCapacityIssue },
    ];
    const preflightOk = preflightChecks.every((check) => check.ok);
    const preflightBlockers = preflightChecks.filter((check) => !check.ok);

    function updateDraft(updater: (current: WizardDraft) => WizardDraft) {
        setDraft((current) => {
            const next = updater(current);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                if (next.asset?.prefill.purchaseKey) {
                    window.localStorage.setItem(`gm10:courtyard-wizard:${next.asset.prefill.purchaseKey}`, JSON.stringify(next));
                }
            }
            return next;
        });
    }

    function setStep(step: StepId) {
        updateDraft((current) => ({ ...current, activeStep: step }));
    }

    function completeStep(step: StepId, nextStep: StepId) {
        updateDraft((current) => ({
            ...current,
            activeStep: nextStep,
            completed: { ...current.completed, [step]: true },
        }));
    }

    function updatePurchase<K extends keyof PurchaseForm>(key: K, value: PurchaseForm[K]) {
        updateDraft((current) => ({ ...current, purchase: { ...current.purchase, [key]: value } }));
    }

    function updatePosition<K extends keyof PositionForm>(key: K, value: PositionForm[K]) {
        updateDraft((current) => ({ ...current, position: { ...current.position, [key]: value } }));
    }

    async function quoteFundingForAsset(resolvedAsset: CourtyardAsset) {
        if (!effectiveTreasuryAddress) throw new Error('Avalanche treasury Safe is unavailable.');
        const quoteParams = new URLSearchParams({
            usdcRaw: resolvedAsset.listing.priceRaw,
            fromAddress: effectiveTreasuryAddress,
            toAddress: polygonHotWallet,
            toToken: resolvedAsset.listing.currency.contract,
        });
        const quoteResponse = await fetch(`/api/lifi-quotes?${quoteParams.toString()}`);
        const quotePayload = await quoteResponse.json();
        if (!quoteResponse.ok) throw new Error(quotePayload.error || 'Unable to quote LI.FI route');
        const resolvedQuotes = quotePayload as FundingQuotes;
        if (!resolvedQuotes.usdc.enoughOutput || !resolvedQuotes.usdc.transactionRequest?.to) {
            throw new Error('LI.FI did not return a sufficient executable USDC route.');
        }
        return resolvedQuotes;
    }

    async function refreshBridgeQuote() {
        if (!asset) throw new Error('Resolve a Courtyard listing before refreshing the LI.FI route.');
        const freshQuotes = await quoteFundingForAsset(asset);
        updateDraft((current) => ({
            ...current,
            quotes: freshQuotes,
            withdrawalAvax: freshQuotes.summary.bufferedAvax,
        }));
        return freshQuotes;
    }

    async function resolveListing(inputUrl = draft.courtyardUrl) {
        setError('');
        setIsResolving(true);
        try {
            if (!effectiveTreasuryAddress) throw new Error('Avalanche treasury Safe is unavailable.');
            const resolvedUrl = inputUrl.trim();
            if (!resolvedUrl) throw new Error('Enter a Courtyard asset URL first.');
            const assetResponse = await fetch(`/api/courtyard-asset?url=${encodeURIComponent(resolvedUrl)}`);
            const assetPayload = await assetResponse.json();
            if (!assetResponse.ok) throw new Error(assetPayload.error || 'Unable to resolve Courtyard listing');
            const resolvedAsset = assetPayload as CourtyardAsset;
            const resolvedQuotes = await quoteFundingForAsset(resolvedAsset);

            updateDraft((current) => ({
                ...current,
                courtyardUrl: resolvedUrl,
                activeStep: 'preflight',
                completed: { resolve: true },
                asset: resolvedAsset,
                quotes: resolvedQuotes,
                withdrawalAvax: resolvedQuotes.summary.bufferedAvax,
                withdrawalReason: `Fund Courtyard purchase ${resolvedAsset.assetId}`,
                purchase: {
                    key: resolvedAsset.prefill.purchaseKey,
                    assetRef: resolvedAsset.prefill.assetRef,
                    maxSpendUsdt: resolvedAsset.prefill.maxSpendUsdt,
                    releaseAmountUsdt: resolvedAsset.prefill.releaseAmountUsdt,
                    mandateRef: resolvedAsset.prefill.mandateRef,
                    executionRef: `courtyard:buy:${resolvedAsset.assetId}:${resolvedAsset.listing.orderId}`,
                    settlementRef: `courtyard:settlement:${resolvedAsset.assetId}:${resolvedAsset.listing.orderId}`,
                    proofRef: resolvedAsset.prefill.proofRef,
                },
                position: {
                    custodyMode: resolvedAsset.prefill.custodyMode,
                    tokenStandard: resolvedAsset.prefill.tokenStandard,
                    evmCollection: resolvedAsset.prefill.evmCollection,
                    tokenId: resolvedAsset.prefill.tokenId,
                    nonEvmCollection: resolvedAsset.prefill.nonEvmCollection,
                    nonEvmTokenId: resolvedAsset.prefill.nonEvmTokenId,
                    externalAssetId: resolvedAsset.prefill.externalAssetId,
                    categoryId: resolvedAsset.prefill.categoryId,
                    marketplaceProvenanceRef: resolvedAsset.prefill.marketplaceProvenanceRef,
                    acquisitionPriceUsdt: resolvedAsset.prefill.acquisitionPriceUsdt,
                    metadataRef: resolvedAsset.prefill.metadataRef,
                    proofRef: resolvedAsset.prefill.proofRef,
                },
                txHashes: {},
            }));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to prepare wizard');
        } finally {
            setIsResolving(false);
        }
    }

    async function useDealInWizard(deal: CourtyardDeal) {
        updateDraft((current) => ({ ...current, courtyardUrl: deal.assetUrl }));
        await resolveListing(deal.assetUrl);
    }

    function canResolveDealInWizard(deal: CourtyardDeal) {
        return deal.fitStatus === 'fits';
    }

    async function ensureAvalanche() {
        if (chainId !== AVALANCHE_CHAIN_ID && switchChainAsync) {
            await switchChainAsync({ chainId: AVALANCHE_CHAIN_ID });
        }
    }

    async function submitContractStep(step: StepId, label: string, action: () => Promise<`0x${string}`>) {
        setError('');
        try {
            await ensureAvalanche();
            const hash = await action();
            setPendingTx({ step, hash, label, kind: 'contract' });
            updateDraft((current) => ({ ...current, txHashes: { ...current.txHashes, [step]: hash } }));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Transaction was not submitted');
        }
    }

    async function continueAfterSafeConfirmation(step: StepId) {
        setError('');
        await refetchPurchaseAuthorization();
            completeStep(step, nextContractStep[step] ?? draft.activeStep);
        setPendingTx(null);
    }

    async function submitWithdraw() {
        if (!effectiveTreasuryAddress) return;
        if (fundingCapacityIssue) {
            setError(`Withdrawal is blocked: ${fundingCapacityIssue} ${fundingCapacityDetail}`);
            return;
        }
        await submitContractStep('withdraw_avax', 'Withdrawing AVAX to treasury Safe', () =>
            writeContractAsync({
                address: MAINNET.fundProxy,
                abi: FUND_ADMIN_ABI,
                functionName: 'withdrawFromTreasury',
                args: [
                    effectiveTreasuryAddress,
                    parseEther(draft.withdrawalAvax.trim()),
                    draft.withdrawalReason.trim() || `Fund Courtyard purchase ${asset?.assetId ?? ''}`,
                ],
            }),
        );
    }

    async function submitBridgeUsdc() {
        setError('');
        if (fundingCapacityIssue) {
            setError(`Bridge is blocked: ${fundingCapacityIssue} ${fundingCapacityDetail}`);
            return;
        }
        try {
            const freshQuotes = await refreshBridgeQuote();
            const tx = freshQuotes.usdc.transactionRequest;
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
            setPendingTx({ step: 'bridge_usdc_to_hot_wallet', hash, label: 'Bridging AVAX to Polygon USDC', kind: 'bridge' });
            updateDraft((current) => ({ ...current, txHashes: { ...current.txHashes, bridge_usdc_to_hot_wallet: hash } }));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'LI.FI transaction was not submitted');
        }
    }

    async function submitAuthorize() {
        if (!preflightOk) {
            setError(`Purchase authorization is blocked: ${preflightBlockers.map((check) => check.label).join(', ')}.`);
            return;
        }

        await submitContractStep('authorize_purchase', 'Authorizing Courtyard purchase', () =>
            writeContractAsync({
                address: MAINNET.portfolioRegistry,
                abi: REGISTRY_ABI,
                functionName: 'authorizePurchaseV2',
                args: [
                    purchaseKey,
                    LZ_EID.POLYGON_MAINNET,
                    COURTYARD_MARKETPLACE_ID,
                    bytes32FromInput(draft.purchase.assetRef),
                    listingFundingToken,
                    parseUsdt6Input(draft.purchase.maxSpendUsdt),
                    bytes32FromInput(draft.purchase.mandateRef),
                ],
            }),
        );
    }

    async function submitConfirmFunding() {
        if (!canConfirmFunding) {
            setError(`Cannot confirm funding yet: ${fundingConfirmationIssues.join(' ')}`);
            return;
        }
        await submitContractStep('confirm_funding', 'Confirming purchase funding', () =>
            writeContractAsync({
                address: MAINNET.fundProxy,
                abi: FUND_ADMIN_ABI,
                functionName: 'confirmPurchaseFunding',
                args: [
                    purchaseKey,
                    listingFundingToken,
                    parseUsdt6Input(draft.purchase.releaseAmountUsdt),
                    LZ_EID.POLYGON_MAINNET,
                    polygonSafe as `0x${string}`,
                    bytes32FromInput(draft.purchase.settlementRef),
                    bytes32FromInput(draft.purchase.proofRef),
                ],
            }),
        );
    }

    async function submitRecordExecution() {
        await submitContractStep('record_execution', 'Recording purchase execution', () =>
            writeContractAsync({
                address: MAINNET.portfolioRegistry,
                abi: REGISTRY_ABI,
                functionName: 'recordPurchaseExecution',
                args: [
                    purchaseKey,
                    bytes32FromInput(draft.purchase.executionRef),
                    bytes32FromInput(draft.purchase.settlementRef),
                    bytes32FromInput(draft.purchase.proofRef),
                ],
            }),
        );
    }

    async function submitRecordPosition() {
        await submitContractStep('record_position', 'Recording collectible position', () =>
            writeContractAsync({
                address: MAINNET.fundProxy,
                abi: FUND_ADMIN_ABI,
                functionName: 'recordCollectiblePosition',
                args: [
                    purchaseKey,
                    {
                        custodyMode: Number(draft.position.custodyMode),
                        tokenStandard: bytes32FromInput(detectedTokenStandard),
                        evmCollection: isAddress(draft.position.evmCollection) ? draft.position.evmCollection : ADDRESS_ZERO,
                        nonEvmCollection: bytes32FromInput(draft.position.nonEvmCollection),
                        tokenId: parseUintInput(draft.position.tokenId),
                        nonEvmTokenId: bytes32FromInput(draft.position.nonEvmTokenId),
                        externalAssetId: bytes32FromInput(draft.position.externalAssetId),
                        categoryId: bytes32FromInput(draft.position.categoryId),
                        marketplaceProvenanceRef: bytes32FromInput(draft.position.marketplaceProvenanceRef),
                        acquisitionPriceUsdt6: parseUsdt6Input(draft.position.acquisitionPriceUsdt),
                        metadataHash: bytes32FromInput(draft.position.metadataRef),
                        proofHash: bytes32FromInput(draft.position.proofRef),
                    },
                ],
            }),
        );
    }

    function resetWizard() {
        if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
        setPendingTx(null);
        setError('');
        setDraft(defaultDraft());
    }

    useEffect(() => {
        if (!pendingTx || pendingTx.kind !== 'contract' || !contractReceipt.isSuccess) return;
        void refetchPurchaseAuthorization();
        completeStep(pendingTx.step, nextContractStep[pendingTx.step] ?? draft.activeStep);
        setPendingTx(null);
    }, [contractReceipt.isSuccess, pendingTx]);

    useEffect(() => {
        if (!pendingTx || pendingTx.kind !== 'contract' || !contractReceipt.isError) return;
        setError(`${pendingTx.label} failed while waiting for receipt.`);
        setPendingTx(null);
    }, [contractReceipt.isError, pendingTx]);

    useEffect(() => {
        if (draft.activeStep === 'bridge_usdc_to_hot_wallet' && bridgeRouteDone) {
            completeStep('bridge_usdc_to_hot_wallet', 'confirm_funding');
            setPendingTx(null);
        }
    }, [draft.activeStep, bridgeRouteDone]);

    useEffect(() => {
        if (draft.activeStep === 'bridge_usdc_to_hot_wallet' && bridgeRouteFailed) {
            setError(lifiStatus.data?.substatusMessage || 'LI.FI route failed.');
        }
    }, [draft.activeStep, bridgeRouteFailed, lifiStatus.data?.substatusMessage]);

    useEffect(() => {
        if (draft.activeStep === 'authorize_purchase' && purchaseAuthorized) completeStep('authorize_purchase', 'withdraw_avax');
        if (draft.activeStep === 'confirm_funding' && purchaseReleased) completeStep('confirm_funding', 'buy_on_courtyard');
        if (draft.activeStep === 'record_execution' && purchaseExecuted) completeStep('record_execution', 'record_position');
        if (draft.activeStep === 'record_position' && positionRecorded) completeStep('record_position', 'complete');
    }, [draft.activeStep, positionRecorded, purchaseAuthorized, purchaseExecuted, purchaseReleased]);

    useEffect(() => {
        if (detectedTokenStandard !== 'ERC1155' || draft.position.tokenStandard === 'ERC1155') return;
        updatePosition('tokenStandard', 'ERC1155');
    }, [detectedTokenStandard, draft.position.tokenStandard]);

    useEffect(() => {
        if (draft.activeStep === 'buy_on_courtyard' && nftInSafe) {
            updateDraft((current) => ({
                ...current,
                activeStep: 'record_execution',
                completed: {
                    ...current.completed,
                    buy_on_courtyard: true,
                    detect_hot_wallet_nft: true,
                    transfer_nft_to_safe: true,
                },
            }));
            return;
        }
        if (draft.activeStep === 'buy_on_courtyard' && nftInHotWallet) completeStep('buy_on_courtyard', 'detect_hot_wallet_nft');
        if (draft.activeStep === 'detect_hot_wallet_nft' && (nftInHotWallet || nftInSafe)) completeStep('detect_hot_wallet_nft', 'transfer_nft_to_safe');
        if (draft.activeStep === 'transfer_nft_to_safe' && nftInSafe) completeStep('transfer_nft_to_safe', 'record_execution');
    }, [draft.activeStep, nftInHotWallet, nftInSafe]);

    function stepState(id: StepId) {
        if (draft.completed[id]) return 'completed';
        if (draft.activeStep === id) return 'active';
        return STEP_IDS.indexOf(id) < STEP_IDS.indexOf(draft.activeStep) ? 'completed' : 'pending';
    }

    function renderStep() {
        switch (draft.activeStep) {
            case 'resolve':
                return (
                    <Panel variant="inline" title="Resolve Courtyard listing">
                        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-white">Best Courtyard deals</div>
                                    <div className="mt-1 text-xs leading-5 text-gray-400">
                                        Pokemon only, grades 10 GEM MINT and 10 PRISTINE, ranked against current liquid treasury budget: {dealBudgetLabel}.
                                    </div>
                                </div>
                                <AdminButton onClick={() => void courtyardDeals.refetch()} disabled={courtyardDeals.isFetching || dealBudgetUsdt6 === undefined} className="text-xs">
                                    {courtyardDeals.isFetching ? 'Scanning...' : 'Refresh deals'}
                                </AdminButton>
                            </div>
                            {courtyardDeals.isError ? (
                                <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                    {courtyardDeals.error instanceof Error ? courtyardDeals.error.message : 'Deal feed unavailable.'}
                                </div>
                            ) : null}
                            {courtyardDeals.isLoading ? (
                                <div className="text-xs text-gray-400">Scanning catalog...</div>
                            ) : null}
                            {courtyardDeals.data?.deals.length === 0 ? (
                                <div className="text-xs text-gray-400">No matching high-grade Pokemon deals fit the current filters.</div>
                            ) : null}
                            {courtyardDeals.data?.deals.length ? (
                                <div className="grid gap-2">
                                    {courtyardDeals.data.deals.slice(0, 5).map((deal) => (
                                        <div key={`${deal.assetId}-${deal.priceUsdt6}`} className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
                                            {deal.image ? <img src={deal.image} alt={deal.title} className="aspect-[3/4] w-16 rounded-md object-cover" /> : <div className="aspect-[3/4] w-16 rounded-md bg-white/5" />}
                                            <div className="min-w-0">
                                                <div className="min-w-0 truncate text-sm font-semibold text-white">{deal.title}</div>
                                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                                                    <span>{deal.grade ?? 'grade n/a'}</span>
                                                    <span>Price {formatUsd(deal.priceUsd)}</span>
                                                    <span>FMV {formatUsd(deal.fmvUsd)}</span>
                                                    <span className={(deal.upsideUsd ?? 0) > 0 ? 'text-emerald-300' : 'text-gray-400'}>Upside {formatUsd(deal.upsideUsd)}</span>
                                                    <span>Discount {formatPct(deal.discountPct)}</span>
                                                    <span>Confidence {(deal.confidence * 100).toFixed(0)}%</span>
                                                    {deal.marketplace ? <span>{deal.marketplace}</span> : null}
                                                </div>
                                                {!deal.assetUrl.includes('courtyard.io/asset/') ? (
                                                    <div className="mt-1 text-xs text-gray-400">Marketplace listing found; the wizard will prepare an OpenSea hot-wallet buy for the same Courtyard-vaulted NFT.</div>
                                                ) : null}
                                                {deal.blockedReason ? <div className="mt-1 text-xs text-amber-200">{deal.blockedReason}</div> : null}
                                            </div>
                                            <div className="flex flex-wrap gap-2 md:justify-end">
                                                <a href={deal.assetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:border-white/20 hover:bg-white/[0.085]">
                                                    Open
                                                </a>
                                                <AdminButton variant="primary" className="text-xs" onClick={() => void useDealInWizard(deal)} disabled={!canResolveDealInWizard(deal) || isResolving}>
                                                    Use in wizard
                                                </AdminButton>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <Field
                            label="Courtyard asset URL"
                            value={draft.courtyardUrl}
                            onChange={(value) => updateDraft((current) => ({ ...current, courtyardUrl: value }))}
                            placeholder="https://courtyard.io/asset/..."
                            mono
                        />
                        <div className="flex flex-wrap gap-3">
                            <AdminButton variant="primary" onClick={() => void resolveListing()} disabled={isResolving || !draft.courtyardUrl.trim()}>
                                {isResolving ? 'Resolving...' : 'Resolve and quote funding'}
                            </AdminButton>
                            <AdminButton onClick={resetWizard}>Reset</AdminButton>
                        </div>
                    </Panel>
                );
            case 'preflight':
                return (
                    <Panel variant="inline" title="Preflight checks">
                        {asset ? (
                            <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                                {asset.image ? <img src={asset.image} alt={asset.title} className="aspect-[3/4] w-full max-w-[120px] rounded-lg object-cover" /> : null}
                                <div className="grid gap-1 text-xs text-gray-400">
                                    <div className="text-sm font-semibold text-white">{asset.title}</div>
                                    <div>Price: {asset.listing.priceDecimal} {asset.listing.currency.symbol}</div>
                                    <div>Order ID: {asset.listing.orderId}</div>
                                    <div>Expires: {asset.listing.expiration}</div>
                                    <div>Hot Wallet: {polygonHotWallet}</div>
                                    <div>Custody Safe: {polygonSafe}</div>
                                </div>
                            </div>
                        ) : null}
                        <div className="grid gap-1 text-xs text-gray-300">
                            {preflightChecks.map((check) => (
                                <div key={check.label} className={check.ok ? 'text-emerald-300' : 'text-red-300'}>
                                    {check.ok ? 'OK' : 'Blocked'} - {check.label}
                                </div>
                            ))}
                        </div>
                        {asset?.listing.expiresSoon ? (
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                This listing expires within 24 hours. Refresh the listing before signing funding or purchase transactions.
                            </div>
                        ) : null}
                        {quotes ? (
                            <div className="grid gap-1 text-xs text-gray-400">
                                <div>USDC route AVAX input: {quotes.usdc.fromAmountAvax} AVAX via {quotes.usdc.tool || 'LI.FI'}</div>
                                <div>Estimated source gas: {quotes.usdc.sourceGasAvax} AVAX</div>
                                <div>Withdraw with 0.1% buffer: {quotes.summary.bufferedAvax} AVAX</div>
                                <div>{fundingCapacityDetail}</div>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap gap-3">
                            <AdminButton variant="primary" onClick={() => completeStep('preflight', 'authorize_purchase')} disabled={!preflightOk}>
                                Continue to authorization
                            </AdminButton>
                            <AdminButton onClick={() => void resolveListing()} disabled={isResolving}>Refresh quote</AdminButton>
                        </div>
                    </Panel>
                );
            case 'withdraw_avax':
                return (
                    <Panel variant="inline" title="Withdraw AVAX to Avalanche treasury Safe">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Fund contract: {MAINNET.fundProxy}</div>
                            <div>Treasury Safe: {effectiveTreasuryAddress ?? 'Unavailable'}</div>
                            <div>Amount: {draft.withdrawalAvax || '0'} AVAX</div>
                        </div>
                        <Field label="Withdrawal amount (AVAX)" value={draft.withdrawalAvax} onChange={(value) => updateDraft((current) => ({ ...current, withdrawalAvax: value }))} type="number" />
                        <Field label="Reason" value={draft.withdrawalReason} onChange={(value) => updateDraft((current) => ({ ...current, withdrawalReason: value }))} />
                        {fundingCapacityIssue ? (
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                Withdrawal is blocked by accounting: {fundingCapacityIssue} {fundingCapacityDetail}
                            </div>
                        ) : null}
                        <StoredTxSummary hash={draft.txHashes.withdraw_avax} label="Stored withdrawal transaction" />
                        <AdminButton variant="primary" onClick={submitWithdraw} disabled={!MAINNET.fundProxy || !effectiveTreasuryAddress || !draft.withdrawalAvax || isContractPending || Boolean(fundingCapacityIssue)}>
                            {isContractPending || (pendingTx?.step === 'withdraw_avax' && contractReceipt.isLoading) ? 'Waiting...' : 'Submit withdrawal'}
                        </AdminButton>
                        {draft.txHashes.withdraw_avax ? (
                            <AdminButton onClick={() => void continueAfterSafeConfirmation('withdraw_avax')}>
                                I confirmed this in Safe
                            </AdminButton>
                        ) : null}
                    </Panel>
                );
            case 'bridge_usdc_to_hot_wallet':
                return (
                    <Panel variant="inline" title="Bridge AVAX to Polygon USDC">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Source: Avalanche AVAX from connected treasury Safe</div>
                            <div>Destination: Polygon USDC to {polygonHotWallet}</div>
                            <div>Target: {asset?.listing.priceDecimal ?? '0'} USDC</div>
                            <div>Detected Hot Wallet USDC: {hotWalletUsdc !== undefined ? formatUnits(hotWalletUsdc, 6) : 'Checking...'}</div>
                            <div>LI.FI status: {lifiStatus.data?.status ?? (bridgeReceipt.isSuccess ? 'Waiting for destination' : 'Not submitted')}</div>
                            <div>{fundingCapacityDetail}</div>
                        </div>
                        {fundingCapacityIssue ? (
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                Bridge is blocked by accounting: {fundingCapacityIssue}
                            </div>
                        ) : null}
                        {lifiStatus.data?.lifiExplorerLink ? (
                            <a href={lifiStatus.data.lifiExplorerLink} target="_blank" rel="noreferrer" className="text-xs text-[#4fa8e0] underline">
                                Open LI.FI route
                            </a>
                        ) : null}
                        <AdminButton variant="primary" onClick={submitBridgeUsdc} disabled={!quotes?.usdc.transactionRequest?.to || isBridgePending || bridgeRouteDone || Boolean(fundingCapacityIssue)}>
                            {isBridgePending || (pendingTx?.step === 'bridge_usdc_to_hot_wallet' && !bridgeRouteDone) ? 'Waiting...' : 'Submit LI.FI bridge'}
                        </AdminButton>
                        <AdminButton
                            onClick={() => {
                                setError('');
                                void refreshBridgeQuote().catch((caught) => {
                                    setError(caught instanceof Error ? caught.message : 'Unable to refresh LI.FI route');
                                });
                            }}
                            disabled={!asset || isBridgePending}
                        >
                            Refresh LI.FI route
                        </AdminButton>
                        <AdminButton onClick={() => void refetchHotWalletUsdc()}>Refresh Hot Wallet balance</AdminButton>
                    </Panel>
                );
            case 'authorize_purchase':
                return (
                    <Panel variant="inline" title="Authorize purchase">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Purchase key: {draft.purchase.key}</div>
                            <div>Max spend: {draft.purchase.maxSpendUsdt} USDT</div>
                            <div>Status: {purchaseStatus}</div>
                        </div>
                        <StoredTxSummary hash={draft.txHashes.authorize_purchase} label="Stored authorization transaction" />
                        {!preflightOk ? (
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                Authorization is blocked until preflight passes: {preflightBlockers.map((check) => check.label).join(', ')}.
                            </div>
                        ) : null}
                        <AdminButton variant="primary" onClick={submitAuthorize} disabled={!preflightOk || purchaseAuthorized || isContractPending}>
                            {purchaseAuthorized ? 'Already authorized' : 'Submit authorization'}
                        </AdminButton>
                        {draft.txHashes.authorize_purchase ? (
                            <AdminButton onClick={() => void continueAfterSafeConfirmation('authorize_purchase')}>
                                I confirmed this in Safe
                            </AdminButton>
                        ) : null}
                    </Panel>
                );
            case 'confirm_funding':
                return (
                    <Panel variant="inline" title="Confirm purchase funding">
                        <Field label="Confirmed funding amount (USDT)" value={draft.purchase.releaseAmountUsdt} onChange={(value) => updatePurchase('releaseAmountUsdt', value)} type="number" />
                        <div className="text-xs text-gray-400">Confirm this only after Polygon USDC is visible in the Hot Wallet. Funding buffer is not added to accounting.</div>
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Settlement ref: {draft.purchase.settlementRef || 'Missing'}</div>
                            <div>Proof ref: {draft.purchase.proofRef || 'Missing'}</div>
                            <div>Stored treasury: {stableAccounting ? `${formatUnits(stableAccounting[2], 6)} USDT` : 'Checking...'}</div>
                            <div>{fundingCapacityDetail}</div>
                        </div>
                        {fundingConfirmationIssues.length ? (
                            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                Cannot confirm funding yet: {fundingConfirmationIssues.join(' ')}
                            </div>
                        ) : null}
                        <StoredTxSummary hash={draft.txHashes.confirm_funding} label="Stored funding confirmation transaction" />
                        <AdminButton variant="primary" onClick={submitConfirmFunding} disabled={purchaseReleased || isContractPending || !isAddress(polygonSafe) || !canConfirmFunding}>
                            {purchaseReleased ? 'Already confirmed' : 'Confirm funding'}
                        </AdminButton>
                        {draft.txHashes.confirm_funding ? (
                            <AdminButton onClick={() => void continueAfterSafeConfirmation('confirm_funding')}>
                                I confirmed this in Safe
                            </AdminButton>
                        ) : null}
                    </Panel>
                );
            case 'buy_on_courtyard':
                return (
                    <Panel variant="inline" title="Buy on Courtyard with the Hot Wallet">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Hot Wallet: {polygonHotWallet}</div>
                            <div>USDC balance: {hotWalletUsdc !== undefined ? formatUnits(hotWalletUsdc, 6) : 'Checking...'}</div>
                            <div>NFT owner: {nftOwnerStatus}</div>
                            <div>Ownership check: polling Polygon every {NFT_OWNERSHIP_POLL_INTERVAL_MS / 1_000}s</div>
                        </div>
                        {asset ? (
                            <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="w-fit rounded-md border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0b0a14] transition-colors hover:bg-[#ffd75b]">
                                Open marketplace listing
                            </a>
                        ) : null}
                        <AdminButton onClick={() => void refetchNftOwner()} disabled={isNftOwnerFetching}>
                            {isNftOwnerFetching ? 'Checking ownership...' : 'Check NFT ownership now'}
                        </AdminButton>
                    </Panel>
                );
            case 'detect_hot_wallet_nft':
                return (
                    <Panel variant="inline" title="Detect NFT in Hot Wallet">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Expected owner: {polygonHotWallet}</div>
                            <div>Detected owner: {nftOwnerStatus}</div>
                            <div>Ownership check: polling Polygon every {NFT_OWNERSHIP_POLL_INTERVAL_MS / 1_000}s</div>
                        </div>
                        <AdminButton onClick={() => void refetchNftOwner()} disabled={isNftOwnerFetching}>
                            {isNftOwnerFetching ? 'Checking ownership...' : 'Refresh ownership now'}
                        </AdminButton>
                    </Panel>
                );
            case 'transfer_nft_to_safe':
                return (
                    <Panel variant="inline" title="Move NFT from Hot Wallet to Polygon Safe">
                        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                            Transfer the NFT manually from the Courtyard Hot Wallet to the Polygon custody Safe. The wizard will advance when Polygon ownership updates.
                        </div>
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>From Hot Wallet: {polygonHotWallet}</div>
                            <div>To Polygon Safe: {polygonSafe}</div>
                            <div>Detected owner: {nftOwnerStatus}</div>
                            <div>Ownership check: polling Polygon every {NFT_OWNERSHIP_POLL_INTERVAL_MS / 1_000}s</div>
                        </div>
                        <AdminButton onClick={() => void refetchNftOwner()} disabled={isNftOwnerFetching}>
                            {isNftOwnerFetching ? 'Checking ownership...' : 'Refresh ownership now'}
                        </AdminButton>
                    </Panel>
                );
            case 'record_execution':
                return (
                    <Panel variant="inline" title="Record purchase execution">
                        <div className="grid gap-3 md:grid-cols-3">
                            <Field label="Execution ref" value={draft.purchase.executionRef} onChange={(value) => updatePurchase('executionRef', value)} mono />
                            <Field label="Settlement ref" value={draft.purchase.settlementRef} onChange={(value) => updatePurchase('settlementRef', value)} mono />
                            <Field label="Proof ref" value={draft.purchase.proofRef} onChange={(value) => updatePurchase('proofRef', value)} mono />
                        </div>
                        <StoredTxSummary hash={draft.txHashes.record_execution} label="Stored execution record transaction" />
                        <AdminButton variant="primary" onClick={submitRecordExecution} disabled={purchaseExecuted || isContractPending}>
                            {purchaseExecuted ? 'Already recorded' : 'Submit execution record'}
                        </AdminButton>
                        {draft.txHashes.record_execution ? (
                            <AdminButton onClick={() => void continueAfterSafeConfirmation('record_execution')}>
                                I confirmed this in Safe
                            </AdminButton>
                        ) : null}
                    </Panel>
                );
            case 'record_position':
                return (
                    <Panel variant="inline" title="Record collectible position">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Custody detected: {nftInSafe ? 'Polygon Safe owns the NFT' : 'Waiting for Polygon Safe custody'}</div>
                            <div>Owner: {nftOwnerStatus}</div>
                            {!nftOwner && erc721OwnershipReadError ? <div>ERC721 read error: {erc721OwnershipReadError}</div> : null}
                            <div>Query collection: {nftCollection}</div>
                            <div>Query token ID: {nftTokenId.toString()}</div>
                            <div>Detected token standard: {detectedTokenStandard}</div>
                            <div>ERC1155 Safe balance: {erc1155SafeBalanceStatus}</div>
                            <div>Ownership check: polling Polygon every {NFT_OWNERSHIP_POLL_INTERVAL_MS / 1_000}s</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Collection" value={draft.position.evmCollection} onChange={(value) => updatePosition('evmCollection', value)} mono />
                            <Field label="Token ID" value={draft.position.tokenId} onChange={(value) => updatePosition('tokenId', value)} mono />
                            <Field label="External asset ID" value={draft.position.externalAssetId} onChange={(value) => updatePosition('externalAssetId', value)} mono />
                            <Field label="Acquisition price (USDT)" value={draft.position.acquisitionPriceUsdt} onChange={(value) => updatePosition('acquisitionPriceUsdt', value)} type="number" />
                            <Field label="Metadata ref" value={draft.position.metadataRef} onChange={(value) => updatePosition('metadataRef', value)} mono />
                            <Field label="Proof ref" value={draft.position.proofRef} onChange={(value) => updatePosition('proofRef', value)} mono />
                        </div>
                        <StoredTxSummary hash={draft.txHashes.record_position} label="Stored position record transaction" />
                        <AdminButton variant="primary" onClick={submitRecordPosition} disabled={!nftInSafe || positionRecorded || isContractPending}>
                            {positionRecorded ? 'Position recorded' : nftInSafe ? 'Submit position record' : 'Waiting for Polygon Safe custody'}
                        </AdminButton>
                        {draft.txHashes.record_position ? (
                            <AdminButton onClick={() => void continueAfterSafeConfirmation('record_position')}>
                                I confirmed this in Safe
                            </AdminButton>
                        ) : null}
                    </Panel>
                );
            case 'complete':
                return (
                    <Panel variant="inline" title="Purchase workflow complete">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Purchase key: {draft.purchase.key}</div>
                            <div>Purchase status: {purchaseStatus}</div>
                            <div>NFT owner: {nftOwner ?? 'Unavailable'}</div>
                            <div>Hot Wallet USDC: {hotWalletUsdc !== undefined ? formatUnits(hotWalletUsdc, 6) : 'Unavailable'}</div>
                        </div>
                        <AdminButton onClick={resetWizard}>Start another purchase</AdminButton>
                    </Panel>
                );
            default:
                return null;
        }
    }

    return (
        <AdminPage
            eyebrow="Guided execution"
            title="Courtyard Wizard"
            description="Resolve listings, fund Polygon USDC, verify custody, and record accounting through a source-labeled execution timeline."
            actions={<AdminButton onClick={resetWizard}>Reset</AdminButton>}
            statusItems={[
                { label: `current ${currentStepTitle}`, status: READ_STATUS.configured },
                { label: asset ? 'listing resolved' : 'listing pending', status: asset ? READ_STATUS.live : READ_STATUS.unavailable },
                { label: purchaseAuthorized ? 'purchase authorized' : 'authorization pending', status: purchaseAuthorized ? READ_STATUS.live : READ_STATUS.partial },
                { label: bridgeRouteFailed ? 'bridge failed' : bridgeRouteDone ? 'bridge done' : 'bridge waiting', status: bridgeRouteFailed ? READ_STATUS.error : bridgeRouteDone ? READ_STATUS.live : READ_STATUS.unavailable },
                { label: nftInSafe ? 'NFT in Safe' : nftInHotWallet ? 'NFT in hot wallet' : 'ownership waiting', status: nftInSafe ? READ_STATUS.live : nftInHotWallet ? READ_STATUS.partial : READ_STATUS.unavailable },
            ]}
        >
            <OperatorFlowPanel
                title="Courtyard purchase flow"
                description={
                    <div className="grid gap-2 md:grid-cols-3">
                        <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                            Avalanche treasury Safe
                            <div className="mt-1 break-all font-mono text-gray-200">{effectiveTreasuryAddress ?? 'Unavailable'}</div>
                        </div>
                        <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                            Polygon Hot Wallet
                            <div className="mt-1 break-all font-mono text-gray-200">{polygonHotWallet}</div>
                        </div>
                        <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                            Polygon custody Safe
                            <div className="mt-1 break-all font-mono text-gray-200">{polygonSafe}</div>
                        </div>
                    </div>
                }
                steps={STEPS.map((step) => {
                    const state = stepState(step.id);
                    const status = state === 'completed'
                        ? READ_STATUS.live
                        : state === 'active'
                            ? READ_STATUS.partial
                            : READ_STATUS.unavailable;
                    return {
                        id: `courtyard-step-${step.id}`,
                        label: step.title,
                        detail: state === 'active' ? 'Active step. The controls are shown inside this card.' : state,
                        onClick: () => setStep(step.id),
                        active: draft.activeStep === step.id,
                        status,
                        children: draft.activeStep === step.id ? (
                            <>
                                {error ? (
                                    <div className="max-h-40 min-w-0 overflow-auto break-words rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100 [overflow-wrap:anywhere]">
                                        {error}
                                    </div>
                                ) : null}
                                <TxSummary tx={pendingTx} />
                                {renderStep()}
                                {asset ? (
                                    <div className="grid min-w-0 gap-1 text-xs text-gray-500 [overflow-wrap:anywhere]">
                                        <div>Purchase key hash: {purchaseKey}</div>
                                        <div>Listing price raw: {asset.listing.priceRaw}</div>
                                        <div>Detected Hot Wallet USDC: {hotWalletUsdc !== undefined ? `${formatUnits(hotWalletUsdc, 6)} USDC` : 'Unavailable'}</div>
                                        <div>Funding AVAX total before buffer: {quotes ? `${quotes.summary.totalAvax} AVAX` : 'Unavailable'}</div>
                                        <div>Funding AVAX withdrawal with buffer: {quotes ? `${quotes.summary.bufferedAvax} AVAX` : 'Unavailable'}</div>
                                        <div>Funding confirmed: {purchaseAuthorization ? `${formatUnits(purchaseAuthorization.releasedUsdt6, 6)} USDT` : 'Unavailable'}</div>
                                        <div>Bridge source tx: {draft.txHashes.bridge_usdc_to_hot_wallet ? shortHash(draft.txHashes.bridge_usdc_to_hot_wallet) : 'Unavailable'}</div>
                                    </div>
                                ) : null}
                            </>
                        ) : undefined,
                    };
                })}
            />

            {draft.withdrawalAvax ? (
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                    Prepared withdrawal: {draft.withdrawalAvax} AVAX. Current route accounting excludes POL funding. Connected chain: {chainId ?? 'unknown'}. Purchase status: {purchaseStatus}. Funded USDC target: {asset ? formatUnits(targetUsdcRaw, 6) : '0'} USDC.
                </div>
            ) : null}
        </AdminPage>
    );
}
