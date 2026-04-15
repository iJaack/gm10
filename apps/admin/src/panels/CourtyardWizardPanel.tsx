import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatUnits, isAddress, keccak256, parseEther, parseUnits, stringToHex, zeroHash } from 'viem';
import { useAccount, useReadContract, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { COURTYARD_WORKFLOW_ABI, FUND_ADMIN_ABI, REGISTRY_ABI } from '../abis';
import { EXPLORER_TX_BASE_URL, LZ_EID, MAINNET } from '../addresses';

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000' as const;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;
const AVALANCHE_CHAIN_ID = 43114;
const POLYGON_CHAIN_ID = 137;
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const COURTYARD_MARKETPLACE_ID = keccak256(stringToHex('COURTYARD'));
const STORAGE_KEY = 'gm10:courtyard-wizard:draft';
const STEP_IDS = [
    'resolve',
    'preflight',
    'withdraw_avax',
    'bridge_usdc_to_hot_wallet',
    'authorize_purchase',
    'release_funds',
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

const STEPS: Array<{ id: StepId; title: string }> = [
    { id: 'resolve', title: 'Resolve listing' },
    { id: 'preflight', title: 'Preflight' },
    { id: 'withdraw_avax', title: 'Withdraw AVAX' },
    { id: 'bridge_usdc_to_hot_wallet', title: 'Bridge USDC' },
    { id: 'authorize_purchase', title: 'Authorize purchase' },
    { id: 'release_funds', title: 'Release funds' },
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

function parseUintInput(value: string): bigint {
    return BigInt(value.trim() || '0');
}

function shortHash(hash: string) {
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function sameAddress(left?: string, right?: string) {
    return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
            <div className="grid gap-3">{children}</div>
        </div>
    );
}

function PrimaryButton({
    children,
    onClick,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-lg bg-[#4fa8e0] px-4 py-2 text-sm font-semibold text-[#0b0a14] transition-colors hover:bg-[#70bce8] disabled:cursor-not-allowed disabled:opacity-50"
        >
            {children}
        </button>
    );
}

function SecondaryButton({
    children,
    onClick,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {children}
        </button>
    );
}

function TxSummary({ tx }: { tx: PendingTx | null }) {
    if (!tx) return null;
    return (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-gray-300">
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
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-gray-300">
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
    const purchaseKey = useMemo(() => bytes32FromInput(draft.purchase.key), [draft.purchase.key]);
    const targetUsdcRaw = asset ? BigInt(asset.listing.priceRaw) : 0n;
    const nftTokenId = asset?.tokenId ? BigInt(asset.tokenId) : 0n;

    const { data: treasuryAddress } = useReadContract({
        address: MAINNET.fundProxy as `0x${string}`,
        abi: FUND_ADMIN_ABI,
        functionName: 'treasury',
        query: { enabled: Boolean(MAINNET.fundProxy) },
    });
    const effectiveTreasuryAddress = (treasuryAddress ?? MAINNET.treasurySafe) as `0x${string}` | undefined;

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
        address: POLYGON_USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [polygonHotWallet],
        chainId: POLYGON_CHAIN_ID,
        query: {
            enabled: Boolean(asset && isAddress(polygonHotWallet)),
            refetchInterval: 15_000,
        },
    });

    const { data: nftOwner, refetch: refetchNftOwner } = useReadContract({
        address: (asset?.collectionContract ?? ADDRESS_ZERO) as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'ownerOf',
        args: [nftTokenId],
        chainId: POLYGON_CHAIN_ID,
        query: {
            enabled: Boolean(asset && isAddress(asset.collectionContract)),
            retry: false,
            refetchInterval: 15_000,
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
    const purchaseReleased = purchaseStatus >= 2 || (purchaseAuthorization?.releasedUsdt6 ?? 0n) >= parseUsdt6Input(draft.purchase.releaseAmountUsdt);
    const purchaseExecuted = purchaseStatus >= 3;
    const positionRecorded = purchaseStatus >= 4;
    const hotWalletHasUsdc = (hotWalletUsdc ?? 0n) >= targetUsdcRaw && targetUsdcRaw > 0n;
    const nftInHotWallet = sameAddress(nftOwner, polygonHotWallet);
    const nftInSafe = sameAddress(nftOwner, polygonSafe);
    const bridgeRouteDone = hotWalletHasUsdc || lifiStatus.data?.status === 'DONE';
    const bridgeRouteFailed = lifiStatus.data?.status === 'FAILED' || lifiStatus.data?.status === 'INVALID';
    const nextContractStep: Partial<Record<StepId, StepId>> = {
        withdraw_avax: 'bridge_usdc_to_hot_wallet',
        authorize_purchase: 'release_funds',
        release_funds: 'buy_on_courtyard',
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
    ];
    const preflightOk = preflightChecks.every((check) => check.ok);

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

    async function resolveListing() {
        setError('');
        setIsResolving(true);
        try {
            if (!effectiveTreasuryAddress) throw new Error('Avalanche treasury Safe is unavailable.');
            const assetResponse = await fetch(`/api/courtyard-asset?url=${encodeURIComponent(draft.courtyardUrl.trim())}`);
            const assetPayload = await assetResponse.json();
            if (!assetResponse.ok) throw new Error(assetPayload.error || 'Unable to resolve Courtyard listing');
            const resolvedAsset = assetPayload as CourtyardAsset;

            const quoteParams = new URLSearchParams({
                usdcRaw: resolvedAsset.listing.priceRaw,
                fromAddress: effectiveTreasuryAddress,
                toAddress: polygonHotWallet,
            });
            const quoteResponse = await fetch(`/api/lifi-quotes?${quoteParams.toString()}`);
            const quotePayload = await quoteResponse.json();
            if (!quoteResponse.ok) throw new Error(quotePayload.error || 'Unable to quote LI.FI route');
            const resolvedQuotes = quotePayload as FundingQuotes;
            if (!resolvedQuotes.usdc.enoughOutput || !resolvedQuotes.usdc.transactionRequest?.to) {
                throw new Error('LI.FI did not return a sufficient executable USDC route.');
            }

            updateDraft((current) => ({
                ...current,
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
        try {
            const tx = quotes?.usdc.transactionRequest;
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
        await submitContractStep('authorize_purchase', 'Authorizing Courtyard purchase', () =>
            writeContractAsync({
                address: MAINNET.courtyardWorkflow,
                abi: COURTYARD_WORKFLOW_ABI,
                functionName: 'authorizeCourtyardPurchase',
                args: [
                    purchaseKey,
                    LZ_EID.POLYGON_MAINNET,
                    bytes32FromInput(draft.purchase.assetRef),
                    parseUsdt6Input(draft.purchase.maxSpendUsdt),
                    bytes32FromInput(draft.purchase.mandateRef),
                ],
            }),
        );
    }

    async function submitRelease() {
        await submitContractStep('release_funds', 'Releasing purchase funds', () =>
            writeContractAsync({
                address: MAINNET.courtyardWorkflow,
                abi: COURTYARD_WORKFLOW_ABI,
                functionName: 'releaseCourtyardPurchaseFunds',
                args: [purchaseKey, parseUsdt6Input(draft.purchase.releaseAmountUsdt)],
            }),
        );
    }

    async function submitRecordExecution() {
        await submitContractStep('record_execution', 'Recording purchase execution', () =>
            writeContractAsync({
                address: MAINNET.courtyardWorkflow,
                abi: COURTYARD_WORKFLOW_ABI,
                functionName: 'recordCourtyardPurchaseExecution',
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
                address: MAINNET.courtyardWorkflow,
                abi: COURTYARD_WORKFLOW_ABI,
                functionName: 'recordCourtyardPosition',
                args: [
                    purchaseKey,
                    {
                        custodyMode: Number(draft.position.custodyMode),
                        tokenStandard: bytes32FromInput(draft.position.tokenStandard),
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
            completeStep('bridge_usdc_to_hot_wallet', 'authorize_purchase');
            setPendingTx(null);
        }
    }, [draft.activeStep, bridgeRouteDone]);

    useEffect(() => {
        if (draft.activeStep === 'bridge_usdc_to_hot_wallet' && bridgeRouteFailed) {
            setError(lifiStatus.data?.substatusMessage || 'LI.FI route failed.');
        }
    }, [draft.activeStep, bridgeRouteFailed, lifiStatus.data?.substatusMessage]);

    useEffect(() => {
        if (draft.activeStep === 'authorize_purchase' && purchaseAuthorized) completeStep('authorize_purchase', 'release_funds');
        if (draft.activeStep === 'release_funds' && purchaseReleased) completeStep('release_funds', 'buy_on_courtyard');
        if (draft.activeStep === 'record_execution' && purchaseExecuted) completeStep('record_execution', 'record_position');
        if (draft.activeStep === 'record_position' && positionRecorded) completeStep('record_position', 'complete');
    }, [draft.activeStep, positionRecorded, purchaseAuthorized, purchaseExecuted, purchaseReleased]);

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
                    <Panel title="Resolve Courtyard listing">
                        <Field
                            label="Courtyard asset URL"
                            value={draft.courtyardUrl}
                            onChange={(value) => updateDraft((current) => ({ ...current, courtyardUrl: value }))}
                            placeholder="https://courtyard.io/asset/..."
                            mono
                        />
                        <div className="flex flex-wrap gap-3">
                            <PrimaryButton onClick={resolveListing} disabled={isResolving || !draft.courtyardUrl.trim()}>
                                {isResolving ? 'Resolving...' : 'Resolve and quote funding'}
                            </PrimaryButton>
                            <SecondaryButton onClick={resetWizard}>Reset</SecondaryButton>
                        </div>
                    </Panel>
                );
            case 'preflight':
                return (
                    <Panel title="Preflight checks">
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
                                <div>Withdraw with 2% buffer: {quotes.summary.bufferedAvax} AVAX</div>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap gap-3">
                            <PrimaryButton onClick={() => completeStep('preflight', 'withdraw_avax')} disabled={!preflightOk}>
                                Continue to withdrawal
                            </PrimaryButton>
                            <SecondaryButton onClick={resolveListing} disabled={isResolving}>Refresh quote</SecondaryButton>
                        </div>
                    </Panel>
                );
            case 'withdraw_avax':
                return (
                    <Panel title="Withdraw AVAX to Avalanche treasury Safe">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Fund contract: {MAINNET.fundProxy}</div>
                            <div>Treasury Safe: {effectiveTreasuryAddress ?? 'Unavailable'}</div>
                            <div>Amount: {draft.withdrawalAvax || '0'} AVAX</div>
                        </div>
                        <Field label="Withdrawal amount (AVAX)" value={draft.withdrawalAvax} onChange={(value) => updateDraft((current) => ({ ...current, withdrawalAvax: value }))} type="number" />
                        <Field label="Reason" value={draft.withdrawalReason} onChange={(value) => updateDraft((current) => ({ ...current, withdrawalReason: value }))} />
                        <StoredTxSummary hash={draft.txHashes.withdraw_avax} label="Stored withdrawal transaction" />
                        <PrimaryButton onClick={submitWithdraw} disabled={!MAINNET.fundProxy || !effectiveTreasuryAddress || !draft.withdrawalAvax || isContractPending}>
                            {isContractPending || (pendingTx?.step === 'withdraw_avax' && contractReceipt.isLoading) ? 'Waiting...' : 'Submit withdrawal'}
                        </PrimaryButton>
                        {draft.txHashes.withdraw_avax ? (
                            <SecondaryButton onClick={() => void continueAfterSafeConfirmation('withdraw_avax')}>
                                I confirmed this in Safe
                            </SecondaryButton>
                        ) : null}
                    </Panel>
                );
            case 'bridge_usdc_to_hot_wallet':
                return (
                    <Panel title="Bridge AVAX to Polygon USDC">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Source: Avalanche AVAX from connected treasury Safe</div>
                            <div>Destination: Polygon USDC to {polygonHotWallet}</div>
                            <div>Target: {asset?.listing.priceDecimal ?? '0'} USDC</div>
                            <div>Detected Hot Wallet USDC: {hotWalletUsdc !== undefined ? formatUnits(hotWalletUsdc, 6) : 'Checking...'}</div>
                            <div>LI.FI status: {lifiStatus.data?.status ?? (bridgeReceipt.isSuccess ? 'Waiting for destination' : 'Not submitted')}</div>
                        </div>
                        {lifiStatus.data?.lifiExplorerLink ? (
                            <a href={lifiStatus.data.lifiExplorerLink} target="_blank" rel="noreferrer" className="text-xs text-[#4fa8e0] underline">
                                Open LI.FI route
                            </a>
                        ) : null}
                        <PrimaryButton onClick={submitBridgeUsdc} disabled={!quotes?.usdc.transactionRequest?.to || isBridgePending || bridgeRouteDone}>
                            {isBridgePending || (pendingTx?.step === 'bridge_usdc_to_hot_wallet' && !bridgeRouteDone) ? 'Waiting...' : 'Submit LI.FI bridge'}
                        </PrimaryButton>
                        <SecondaryButton onClick={() => void refetchHotWalletUsdc()}>Refresh Hot Wallet balance</SecondaryButton>
                    </Panel>
                );
            case 'authorize_purchase':
                return (
                    <Panel title="Authorize purchase">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Purchase key: {draft.purchase.key}</div>
                            <div>Max spend: {draft.purchase.maxSpendUsdt} USDT</div>
                            <div>Status: {purchaseStatus}</div>
                        </div>
                        <StoredTxSummary hash={draft.txHashes.authorize_purchase} label="Stored authorization transaction" />
                        <PrimaryButton onClick={submitAuthorize} disabled={purchaseAuthorized || isContractPending}>
                            {purchaseAuthorized ? 'Already authorized' : 'Submit authorization'}
                        </PrimaryButton>
                        {draft.txHashes.authorize_purchase ? (
                            <SecondaryButton onClick={() => void continueAfterSafeConfirmation('authorize_purchase')}>
                                I confirmed this in Safe
                            </SecondaryButton>
                        ) : null}
                    </Panel>
                );
            case 'release_funds':
                return (
                    <Panel title="Release purchase funds">
                        <Field label="Release amount (USDT)" value={draft.purchase.releaseAmountUsdt} onChange={(value) => updatePurchase('releaseAmountUsdt', value)} type="number" />
                        <div className="text-xs text-gray-400">Release amount stays equal to listing price. Funding buffer is not added to accounting.</div>
                        <StoredTxSummary hash={draft.txHashes.release_funds} label="Stored release transaction" />
                        <PrimaryButton onClick={submitRelease} disabled={purchaseReleased || isContractPending}>
                            {purchaseReleased ? 'Already released' : 'Submit release'}
                        </PrimaryButton>
                        {draft.txHashes.release_funds ? (
                            <SecondaryButton onClick={() => void continueAfterSafeConfirmation('release_funds')}>
                                I confirmed this in Safe
                            </SecondaryButton>
                        ) : null}
                    </Panel>
                );
            case 'buy_on_courtyard':
                return (
                    <Panel title="Buy on Courtyard with the Hot Wallet">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Hot Wallet: {polygonHotWallet}</div>
                            <div>USDC balance: {hotWalletUsdc !== undefined ? formatUnits(hotWalletUsdc, 6) : 'Checking...'}</div>
                            <div>NFT owner: {nftOwner ?? 'Not detected yet'}</div>
                        </div>
                        {asset ? (
                            <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="w-fit rounded-lg bg-[#4fa8e0] px-4 py-2 text-sm font-semibold text-[#0b0a14]">
                                Open Courtyard listing
                            </a>
                        ) : null}
                        <SecondaryButton onClick={() => void refetchNftOwner()}>Check NFT ownership</SecondaryButton>
                    </Panel>
                );
            case 'detect_hot_wallet_nft':
                return (
                    <Panel title="Detect NFT in Hot Wallet">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Expected owner: {polygonHotWallet}</div>
                            <div>Detected owner: {nftOwner ?? 'Checking...'}</div>
                        </div>
                        <SecondaryButton onClick={() => void refetchNftOwner()}>Refresh ownership</SecondaryButton>
                    </Panel>
                );
            case 'transfer_nft_to_safe':
                return (
                    <Panel title="Move NFT from Hot Wallet to Polygon Safe">
                        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                            Transfer the NFT manually from the Courtyard Hot Wallet to the Polygon custody Safe. The wizard will advance when Polygon ownership updates.
                        </div>
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>From Hot Wallet: {polygonHotWallet}</div>
                            <div>To Polygon Safe: {polygonSafe}</div>
                            <div>Detected owner: {nftOwner ?? 'Checking...'}</div>
                        </div>
                        <SecondaryButton onClick={() => void refetchNftOwner()}>Refresh ownership</SecondaryButton>
                    </Panel>
                );
            case 'record_execution':
                return (
                    <Panel title="Record purchase execution">
                        <div className="grid gap-3 md:grid-cols-3">
                            <Field label="Execution ref" value={draft.purchase.executionRef} onChange={(value) => updatePurchase('executionRef', value)} mono />
                            <Field label="Settlement ref" value={draft.purchase.settlementRef} onChange={(value) => updatePurchase('settlementRef', value)} mono />
                            <Field label="Proof ref" value={draft.purchase.proofRef} onChange={(value) => updatePurchase('proofRef', value)} mono />
                        </div>
                        <StoredTxSummary hash={draft.txHashes.record_execution} label="Stored execution record transaction" />
                        <PrimaryButton onClick={submitRecordExecution} disabled={purchaseExecuted || isContractPending}>
                            {purchaseExecuted ? 'Already recorded' : 'Submit execution record'}
                        </PrimaryButton>
                        {draft.txHashes.record_execution ? (
                            <SecondaryButton onClick={() => void continueAfterSafeConfirmation('record_execution')}>
                                I confirmed this in Safe
                            </SecondaryButton>
                        ) : null}
                    </Panel>
                );
            case 'record_position':
                return (
                    <Panel title="Record collectible position">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Custody detected: {nftInSafe ? 'Polygon Safe owns the NFT' : 'Waiting for Polygon Safe custody'}</div>
                            <div>Owner: {nftOwner ?? 'Checking...'}</div>
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
                        <PrimaryButton onClick={submitRecordPosition} disabled={!nftInSafe || positionRecorded || isContractPending}>
                            {positionRecorded ? 'Position recorded' : 'Submit position record'}
                        </PrimaryButton>
                        {draft.txHashes.record_position ? (
                            <SecondaryButton onClick={() => void continueAfterSafeConfirmation('record_position')}>
                                I confirmed this in Safe
                            </SecondaryButton>
                        ) : null}
                    </Panel>
                );
            case 'complete':
                return (
                    <Panel title="Purchase workflow complete">
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div>Purchase key: {draft.purchase.key}</div>
                            <div>Purchase status: {purchaseStatus}</div>
                            <div>NFT owner: {nftOwner ?? 'Unavailable'}</div>
                            <div>Hot Wallet USDC: {hotWalletUsdc !== undefined ? formatUnits(hotWalletUsdc, 6) : 'Unavailable'}</div>
                        </div>
                        <SecondaryButton onClick={resetWizard}>Start another purchase</SecondaryButton>
                    </Panel>
                );
            default:
                return null;
        }
    }

    return (
        <div className="grid gap-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-white">Courtyard Purchase Wizard</h2>
                        <p className="mt-2 max-w-3xl text-xs leading-5 text-gray-400">
                            Guided purchase funding and accounting. The wizard submits Safe/admin transactions, waits for confirmations, funds only Polygon USDC to the Hot Wallet, and waits for NFT custody before recording the final position.
                        </p>
                    </div>
                    <SecondaryButton onClick={resetWizard}>Reset</SecondaryButton>
                </div>

                <div className="mb-5 grid gap-2 md:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-400">
                        Avalanche treasury Safe
                        <div className="mt-1 break-all font-mono text-gray-200">{effectiveTreasuryAddress ?? 'Unavailable'}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-400">
                        Polygon Hot Wallet
                        <div className="mt-1 break-all font-mono text-gray-200">{polygonHotWallet}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-400">
                        Polygon custody Safe
                        <div className="mt-1 break-all font-mono text-gray-200">{polygonSafe}</div>
                    </div>
                </div>

                <div className="mb-6 grid gap-2 md:grid-cols-4">
                    {STEPS.map((step) => {
                        const state = stepState(step.id);
                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => setStep(step.id)}
                                className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                                    state === 'active'
                                        ? 'border-[#4fa8e0] bg-[#4fa8e0]/15 text-white'
                                        : state === 'completed'
                                          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                                          : 'border-white/10 bg-black/20 text-gray-500'
                                }`}
                            >
                                <div className="font-semibold">{step.title}</div>
                                <div className="mt-1 capitalize">{state}</div>
                            </button>
                        );
                    })}
                </div>

                {error ? (
                    <div className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                        {error}
                    </div>
                ) : null}

                <TxSummary tx={pendingTx} />
                <div className={pendingTx ? 'mt-4' : ''}>{renderStep()}</div>

                {asset ? (
                    <div className="mt-4 grid gap-1 text-xs text-gray-500">
                        <div>Purchase key hash: {purchaseKey}</div>
                        <div>Listing price raw: {asset.listing.priceRaw}</div>
                        <div>Detected Hot Wallet USDC: {hotWalletUsdc !== undefined ? `${formatUnits(hotWalletUsdc, 6)} USDC` : 'Unavailable'}</div>
                        <div>Funding AVAX total before buffer: {quotes ? `${quotes.summary.totalAvax} AVAX` : 'Unavailable'}</div>
                        <div>Funding AVAX withdrawal with buffer: {quotes ? `${quotes.summary.bufferedAvax} AVAX` : 'Unavailable'}</div>
                        <div>Purchase released: {purchaseAuthorization ? `${formatUnits(purchaseAuthorization.releasedUsdt6, 6)} USDT` : 'Unavailable'}</div>
                        <div>Bridge source tx: {draft.txHashes.bridge_usdc_to_hot_wallet ? shortHash(draft.txHashes.bridge_usdc_to_hot_wallet) : 'Unavailable'}</div>
                    </div>
                ) : null}
            </div>

            {draft.withdrawalAvax ? (
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                    Prepared withdrawal: {draft.withdrawalAvax} AVAX. Current route accounting excludes POL funding. Connected chain: {chainId ?? 'unknown'}. Purchase status: {purchaseStatus}. Funded USDC target: {asset ? formatUnits(targetUsdcRaw, 6) : '0'} USDC.
                </div>
            ) : null}
        </div>
    );
}
