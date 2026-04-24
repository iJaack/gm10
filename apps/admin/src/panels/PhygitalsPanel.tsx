import { useMemo, useState, type ReactNode } from 'react';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';
import { encodeFunctionData, formatUnits, isAddress, keccak256, padHex, parseUnits, stringToHex, zeroHash } from 'viem';
import { useAccount, useReadContract, useSendTransaction, useSwitchChain, useWriteContract } from 'wagmi';
import { FUND_ADMIN_ABI, REGISTRY_ABI } from '../abis';
import { LZ_EID, MAINNET } from '../addresses';
import { TxButton, TxResult } from '../components/TxButton';
import { useSafeAppInfo } from '../hooks/useSafeAppInfo';
import { bytes32ToSolanaAddress, nonEvmSafeInputToBytes32 } from '../lib/solanaAddress.js';

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000' as const;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;
const DEFAULT_SOLANA_MULTISIG = 'GWE93fpg5M4vsfYnpW21pD3t1pQx4XktcAzwhPqYRaTG';
const DEFAULT_CARD_URL = 'https://www.phygitals.com/card/2021-pokemon-japanese-s-promo-po-wbtuqn';
const PHYGITALS_MARKETPLACE_ID = keccak256(stringToHex('PHYGITALS'));
const PURCHASE_STATUS = ['None', 'Approved', 'Funds released', 'Executed', 'Position recorded', 'Cancelled'] as const;
const AVALANCHE_CHAIN_ID = 43114;

type Bytes32 = `0x${string}`;

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
    prefill: PurchaseForm & PositionPrefill;
};

type PurchaseForm = {
    purchaseKey: string;
    assetRef: string;
    maxSpendUsdt: string;
    releaseAmountUsdt: string;
    mandateRef: string;
};

type PositionPrefill = {
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

type PurchaseState = PurchaseForm & {
    executionRef: string;
    settlementRef: string;
    proofRef: string;
};

type LifiTransactionRequest = {
    to?: `0x${string}`;
    data?: `0x${string}`;
    value?: string;
    chainId?: number;
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
    enoughOutput: boolean;
    transactionRequest: LifiTransactionRequest | null;
};

type SolanaUsdcFundingQuote = {
    usdc: FundingQuote;
};

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
    return padHex(stringToHex(value.trim().slice(0, 31) || 'SOLANA'), { size: 32, dir: 'right' });
}

function parseUsdt6Input(value: string): bigint {
    return parseUnits(value.trim() || '0', 6);
}

function parseUintInput(value: string): bigint {
    return BigInt(value.trim() || '0');
}

function statusLabel(value: unknown) {
    const index = typeof value === 'bigint' ? Number(value) : typeof value === 'number' ? value : -1;
    return PURCHASE_STATUS[index] ?? 'Unknown';
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

function emptyPurchase(): PurchaseState {
    return {
        purchaseKey: '',
        assetRef: '',
        maxSpendUsdt: '',
        releaseAmountUsdt: '',
        mandateRef: '',
        executionRef: '',
        settlementRef: '',
        proofRef: '',
    };
}

function emptyPosition(): PositionPrefill {
    return {
        custodyMode: '0',
        tokenStandard: 'CORE_NFT',
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

export function PhygitalsPanel() {
    const { chainId } = useAccount();
    const safeAppInfo = useSafeAppInfo();
    const [solanaSafe, setSolanaSafe] = useState(DEFAULT_SOLANA_MULTISIG);
    const [solanaSafeError, setSolanaSafeError] = useState('');
    const [phygitalsUrl, setPhygitalsUrl] = useState(DEFAULT_CARD_URL);
    const [card, setCard] = useState<PhygitalsCard | null>(null);
    const [resolveError, setResolveError] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [purchase, setPurchase] = useState<PurchaseState>(emptyPurchase);
    const [position, setPosition] = useState<PositionPrefill>(emptyPosition);
    const [fundingQuote, setFundingQuote] = useState<SolanaUsdcFundingQuote | null>(null);
    const [fundingError, setFundingError] = useState('');
    const [isFundingLoading, setIsFundingLoading] = useState(false);
    const [safeBatchHash, setSafeBatchHash] = useState<`0x${string}` | undefined>();
    const [safeBatchError, setSafeBatchError] = useState('');
    const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

    const purchaseKey = useMemo(() => bytes32FromInput(purchase.purchaseKey), [purchase.purchaseKey]);
    const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
    const {
        sendTransactionAsync,
        data: fundingTxHash,
        isPending: isFundingPending,
        error: fundingSendError,
    } = useSendTransaction();
    const { switchChainAsync } = useSwitchChain();

    const { data: solanaChainSafe } = useReadContract({
        address: MAINNET.portfolioRegistry,
        abi: REGISTRY_ABI,
        functionName: 'getChainSafe',
        args: [LZ_EID.SOLANA_MAINNET],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) },
    });

    const { data: phygitalsApproved } = useReadContract({
        address: MAINNET.portfolioRegistry,
        abi: REGISTRY_ABI,
        functionName: 'isMarketplaceApproved',
        args: [PHYGITALS_MARKETPLACE_ID],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) },
    });

    const { data: purchaseAuthorization } = useReadContract({
        address: MAINNET.portfolioRegistry,
        abi: REGISTRY_ABI,
        functionName: 'getPurchaseAuthorization',
        args: [purchaseKey],
        query: { enabled: Boolean(MAINNET.portfolioRegistry) && Boolean(purchase.purchaseKey.trim()) },
    });

    const effectiveTreasuryAddress = (safeAppInfo.safeAddress ?? MAINNET.treasurySafe) as `0x${string}` | undefined;
    const configuredSolanaDestination = solanaChainSafe?.enabled
        ? formatNonEvmSafe(solanaChainSafe.nonEvmSafe)
        : solanaSafe.trim();
    const solanaFundingDestination = configuredSolanaDestination === 'Unavailable' ? solanaSafe.trim() : configuredSolanaDestination;
    const fundingTargetRaw = card?.listing?.priceRaw ?? (purchase.releaseAmountUsdt ? parseUsdt6Input(purchase.releaseAmountUsdt).toString() : '');

    async function resolveCard() {
        setResolveError('');
        setIsResolving(true);
        setCard(null);
        setFundingQuote(null);
        setFundingError('');
        setSafeBatchHash(undefined);
        setSafeBatchError('');
        try {
            const response = await fetch(`/api/phygitals-card?url=${encodeURIComponent(phygitalsUrl.trim())}`);
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Unable to resolve Phygitals card');
            const resolved = payload as PhygitalsCard;
            setCard(resolved);
            setPurchase({
                purchaseKey: resolved.prefill.purchaseKey,
                assetRef: resolved.prefill.assetRef,
                maxSpendUsdt: resolved.prefill.maxSpendUsdt,
                releaseAmountUsdt: resolved.prefill.releaseAmountUsdt,
                mandateRef: resolved.prefill.mandateRef,
                executionRef: `phygitals:execution:${resolved.slug}:${resolved.assetAddress}`,
                settlementRef: `phygitals:settlement:${resolved.slug}:${resolved.assetAddress}`,
                proofRef: resolved.prefill.proofRef,
            });
            setPosition({
                custodyMode: resolved.prefill.custodyMode,
                tokenStandard: resolved.prefill.tokenStandard,
                evmCollection: resolved.prefill.evmCollection,
                tokenId: resolved.prefill.tokenId,
                nonEvmCollection: resolved.prefill.nonEvmCollection,
                nonEvmTokenId: resolved.prefill.nonEvmTokenId,
                externalAssetId: resolved.prefill.externalAssetId,
                categoryId: resolved.prefill.categoryId,
                marketplaceProvenanceRef: resolved.prefill.marketplaceProvenanceRef,
                acquisitionPriceUsdt: resolved.prefill.acquisitionPriceUsdt,
                metadataRef: resolved.prefill.metadataRef,
                proofRef: resolved.prefill.proofRef,
            });
        } catch (caught) {
            setResolveError(caught instanceof Error ? caught.message : 'Unable to prepare Phygitals card');
        } finally {
            setIsResolving(false);
        }
    }

    function submitSolanaSafe() {
        if (!MAINNET.portfolioRegistry || !solanaSafe.trim()) return;
        let nonEvmSafe: Bytes32;
        try {
            nonEvmSafe = nonEvmSafeInputToBytes32(solanaSafe) as Bytes32;
        } catch (caught) {
            setSolanaSafeError(caught instanceof Error ? caught.message : 'Invalid Solana multisig address');
            return;
        }
        setSolanaSafeError('');
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'setChainSafe',
            args: [LZ_EID.SOLANA_MAINNET, ADDRESS_ZERO, nonEvmSafe, labelBytes32('SOLANA'), true],
        });
    }

    function submitMarketplaceApproval() {
        if (!MAINNET.portfolioRegistry) return;
        reset();
        writeContract({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'setMarketplaceApproval',
            args: [PHYGITALS_MARKETPLACE_ID, true],
        });
    }

    function submitAuthorizePurchase() {
        if (!MAINNET.portfolioRegistry || !purchase.purchaseKey.trim()) return;
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

    function authorizePurchaseData() {
        return encodeFunctionData({
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

    async function quoteSolanaUsdcFunding() {
        setFundingError('');
        setIsFundingLoading(true);
        try {
            if (!effectiveTreasuryAddress) throw new Error('Avalanche treasury Safe is unavailable.');
            if (!solanaFundingDestination) throw new Error('Solana multisig destination is unavailable.');
            if (!fundingTargetRaw || BigInt(fundingTargetRaw) <= 0n) throw new Error('Resolve a listed Phygitals card before quoting funding.');
            const params = new URLSearchParams({
                toToken: 'USDC',
                toAmountRaw: fundingTargetRaw,
                fromAddress: effectiveTreasuryAddress,
                toAddress: solanaFundingDestination,
            });
            const response = await fetch(`/api/lifi-solana-quote?${params.toString()}`);
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Unable to quote LI.FI Solana USDC route');
            const quote = payload as SolanaUsdcFundingQuote;
            if (!quote.usdc.transactionRequest?.to) throw new Error('LI.FI did not return an executable Solana USDC route.');
            if (!quote.usdc.enoughOutput) throw new Error('LI.FI route does not meet the requested Solana USDC output.');
            setFundingQuote(quote);
            return quote;
        } catch (caught) {
            setFundingQuote(null);
            setFundingError(caught instanceof Error ? caught.message : 'Unable to prepare Solana USDC funding');
            return null;
        } finally {
            setIsFundingLoading(false);
        }
    }

    async function ensureAvalanche() {
        if (chainId !== AVALANCHE_CHAIN_ID && switchChainAsync) {
            await switchChainAsync({ chainId: AVALANCHE_CHAIN_ID });
        }
    }

    async function submitSolanaUsdcFunding() {
        setFundingError('');
        try {
            const quote = fundingQuote ?? (await quoteSolanaUsdcFunding());
            const tx = quote?.usdc.transactionRequest;
            if (!tx?.to) throw new Error('LI.FI route is missing a transaction request. Refresh the quote.');
            await ensureAvalanche();
            await sendTransactionAsync({
                to: tx.to,
                data: tx.data,
                value: BigInt(tx.value ?? '0'),
            });
        } catch (caught) {
            setFundingError(caught instanceof Error ? caught.message : 'LI.FI Solana USDC transaction was not submitted');
        }
    }

    async function submitAuthorizeAndFundBatch() {
        setSafeBatchError('');
        setSafeBatchHash(undefined);
        setIsBatchSubmitting(true);
        try {
            if (!safeAppInfo.isSafeApp) throw new Error('Open admin.gm10.xyz inside the Avalanche Treasury Safe to submit a Safe batch.');
            if (safeAppInfo.chainId !== AVALANCHE_CHAIN_ID) throw new Error('Open the Treasury Safe on Avalanche before submitting the batch.');
            if (!MAINNET.portfolioRegistry || !purchase.purchaseKey.trim()) throw new Error('Resolve a card before authorizing the purchase.');
            const quote = fundingQuote ?? (await quoteSolanaUsdcFunding());
            const lifiTx = quote?.usdc.transactionRequest;
            if (!lifiTx?.to) throw new Error('LI.FI route is missing a transaction request. Refresh the quote.');

            const sdk = new SafeAppsSDK({ debug: false });
            const result = await sdk.txs.send({
                txs: [
                    {
                        to: MAINNET.portfolioRegistry,
                        value: '0',
                        data: authorizePurchaseData(),
                    },
                    {
                        to: lifiTx.to,
                        value: lifiTx.value ?? '0',
                        data: lifiTx.data ?? '0x',
                    },
                ],
            });
            setSafeBatchHash(result.safeTxHash as `0x${string}`);
        } catch (caught) {
            setSafeBatchError(caught instanceof Error ? caught.message : 'Safe batch was not submitted');
        } finally {
            setIsBatchSubmitting(false);
        }
    }

    function submitRecordExecution() {
        if (!MAINNET.portfolioRegistry || !purchase.purchaseKey.trim()) return;
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
        if (!MAINNET.fundProxy || !purchase.purchaseKey.trim()) return;
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

    return (
        <div className="grid gap-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-3 text-lg font-bold text-white">Phygitals adapter</h2>
                <div className="grid gap-2 text-xs text-gray-400">
                    <div>Marketplace ID: {PHYGITALS_MARKETPLACE_ID}</div>
                    <div>Marketplace approved: {phygitalsApproved === undefined ? 'Unavailable' : String(phygitalsApproved)}</div>
                    <div>Solana EID: {LZ_EID.SOLANA_MAINNET}</div>
                    <div className="break-all">Configured Solana multisig: {formatNonEvmSafe(solanaChainSafe?.nonEvmSafe)}</div>
                    <div>Solana custody enabled: {solanaChainSafe ? String(solanaChainSafe.enabled) : 'Unavailable'}</div>
                </div>
            </div>

            <Section title="Setup">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                    <Field
                        label="Solana Squads multisig"
                        value={solanaSafe}
                        onChange={(value) => {
                            setSolanaSafe(value);
                            setSolanaSafeError('');
                            setFundingQuote(null);
                            setFundingError('');
                        }}
                        placeholder="Base58 Solana address"
                        mono
                    />
                    <TxButton onClick={submitSolanaSafe} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry || !solanaSafe.trim()}>
                        Configure Solana Safe
                    </TxButton>
                    <TxButton onClick={submitMarketplaceApproval} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry || phygitalsApproved === true}>
                        Approve PHYGITALS
                    </TxButton>
                </div>
                {solanaSafeError ? (
                    <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                        {solanaSafeError}
                    </div>
                ) : null}
            </Section>

            <Section title="Resolve card">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <Field
                        label="Phygitals card URL"
                        value={phygitalsUrl}
                        onChange={(value) => {
                            setPhygitalsUrl(value);
                            setCard(null);
                            setResolveError('');
                        }}
                        placeholder="https://www.phygitals.com/card/..."
                        mono
                    />
                    <button
                        type="button"
                        onClick={() => void resolveCard()}
                        disabled={isResolving || !phygitalsUrl.trim()}
                        className="rounded-lg bg-[#4fa8e0] px-4 py-2 text-sm font-semibold text-[#0b0a14] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isResolving ? 'Resolving...' : 'Resolve card'}
                    </button>
                </div>
                {resolveError ? (
                    <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                        {resolveError}
                    </div>
                ) : null}
                {card ? (
                    <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                        {card.image ? (
                            <img src={card.image} alt={card.title} className="aspect-[3/4] w-full max-w-[120px] rounded-lg object-cover" />
                        ) : null}
                        <div className="grid gap-1 text-xs text-gray-400">
                            <div className="text-sm font-semibold text-white">{card.title}</div>
                            <div>Price: {card.listing ? `${card.listing.priceDecimal} ${card.listing.currency.symbol}` : `${card.altFmv ?? '0'} ALT FMV`}</div>
                            <div>Marketplace: {card.marketplace}</div>
                            <div>Vault: {card.vault || 'Unavailable'}</div>
                            <div className="break-all">Asset: {card.assetAddress}</div>
                            <div className="break-all">Collection: {card.collectionAddress}</div>
                            <div>Token standard: {card.tokenStandard}</div>
                        </div>
                    </div>
                ) : null}
            </Section>

            <Section title="Funding transaction">
                <div className="grid gap-1 text-xs text-gray-400">
                    <div className="break-all">Avalanche treasury Safe: {effectiveTreasuryAddress ?? 'Unavailable'}</div>
                    <div className="break-all">Solana recipient: {solanaFundingDestination || 'Unavailable'}</div>
                    <div>Source asset: AVAX on Avalanche</div>
                    <div>Destination asset: USDC on Solana</div>
                    <div>Target receive: {fundingTargetRaw ? `${formatRawUnits(fundingTargetRaw, 6)} USDC` : 'Resolve a listed card'}</div>
                </div>
                {fundingQuote ? (
                    <div className="grid gap-1 text-xs text-gray-400">
                        <div>Route: {fundingQuote.usdc.tool || 'LI.FI'}</div>
                        <div>AVAX input: {fundingQuote.usdc.fromAmountAvax}</div>
                        <div>Estimated receive: {formatRawUnits(fundingQuote.usdc.toAmountRaw, 6)} USDC</div>
                        <div>Minimum receive: {formatRawUnits(fundingQuote.usdc.toAmountMinRaw, 6)} USDC</div>
                        <div>Estimated source gas: {fundingQuote.usdc.sourceGasAvax} AVAX</div>
                    </div>
                ) : null}
                {fundingError ? (
                    <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                        {fundingError}
                    </div>
                ) : null}
                {safeBatchError ? (
                    <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                        {safeBatchError}
                    </div>
                ) : null}
                {safeBatchHash ? (
                    <div className="break-all rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                        Safe batch submitted: {safeBatchHash}
                    </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => void quoteSolanaUsdcFunding()}
                        disabled={isFundingLoading || !card || !effectiveTreasuryAddress || !solanaFundingDestination}
                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-50"
                    >
                        {isFundingLoading ? 'Quoting...' : 'Refresh LI.FI USDC quote'}
                    </button>
                    <TxButton
                        onClick={() => void submitSolanaUsdcFunding()}
                        txHash={fundingTxHash}
                        isPending={isFundingPending || isFundingLoading}
                        disabled={!card || !effectiveTreasuryAddress || !solanaFundingDestination}
                    >
                        Submit LI.FI funding
                    </TxButton>
                    <button
                        type="button"
                        onClick={() => void submitAuthorizeAndFundBatch()}
                        disabled={
                            isBatchSubmitting ||
                            isFundingLoading ||
                            !safeAppInfo.isSafeApp ||
                            safeAppInfo.chainId !== AVALANCHE_CHAIN_ID ||
                            !MAINNET.portfolioRegistry ||
                            !card ||
                            phygitalsApproved !== true ||
                            !solanaChainSafe?.enabled
                        }
                        className="rounded-lg bg-[#4fa8e0] px-4 py-2 text-sm font-semibold text-[#0b0a14] hover:bg-[#70bce8] disabled:opacity-50"
                    >
                        {isBatchSubmitting ? 'Submitting...' : 'Batch authorize + fund'}
                    </button>
                </div>
                <TxResult hash={fundingTxHash} error={fundingSendError} />
            </Section>

            <Section title="Purchase workflow">
                <div className="grid gap-1 text-xs text-gray-400">
                    <div>Purchase key: {purchase.purchaseKey || 'Resolve a card'}</div>
                    <div>Authorization status: {purchaseAuthorization ? statusLabel(purchaseAuthorization.status) : 'Unavailable'}</div>
                    <div>Max spend: {purchase.maxSpendUsdt || '0'} USDT</div>
                    <div>Funding amount: {purchase.releaseAmountUsdt || '0'} USDT</div>
                    <div>Confirmed funding: {purchaseAuthorization ? `${formatUnits(purchaseAuthorization.releasedUsdt6, 6)} USDT` : 'Unavailable'}</div>
                    <div className="break-all">Destination Safe: {formatNonEvmSafe(purchaseAuthorization?.destinationSafeAlt)}</div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Execution ref" value={purchase.executionRef} onChange={(value) => setPurchase((current) => ({ ...current, executionRef: value }))} mono />
                    <Field label="Settlement ref" value={purchase.settlementRef} onChange={(value) => setPurchase((current) => ({ ...current, settlementRef: value }))} mono />
                    <Field label="Proof ref" value={purchase.proofRef} onChange={(value) => setPurchase((current) => ({ ...current, proofRef: value }))} mono />
                    <Field label="Acquisition price (USDT)" value={position.acquisitionPriceUsdt} onChange={(value) => setPosition((current) => ({ ...current, acquisitionPriceUsdt: value }))} type="number" />
                </div>
                <div className="flex flex-wrap gap-3">
                    <TxButton onClick={submitAuthorizePurchase} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry || !card || phygitalsApproved !== true || !solanaChainSafe?.enabled}>
                        Authorize purchase
                    </TxButton>
                    <TxButton onClick={submitRecordExecution} txHash={txHash} isPending={isPending} disabled={!MAINNET.portfolioRegistry || !card || !purchase.executionRef}>
                        Record execution
                    </TxButton>
                    <TxButton onClick={submitRecordPosition} txHash={txHash} isPending={isPending} disabled={!MAINNET.fundProxy || !card || !position.nonEvmTokenId}>
                        Record Solana position
                    </TxButton>
                </div>
            </Section>

            <Section title="Position fields">
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Collection" value={position.nonEvmCollection} onChange={(value) => setPosition((current) => ({ ...current, nonEvmCollection: value }))} mono />
                    <Field label="Asset" value={position.nonEvmTokenId} onChange={(value) => setPosition((current) => ({ ...current, nonEvmTokenId: value }))} mono />
                    <Field label="External asset ID" value={position.externalAssetId} onChange={(value) => setPosition((current) => ({ ...current, externalAssetId: value }))} mono />
                    <Field label="Marketplace provenance ref" value={position.marketplaceProvenanceRef} onChange={(value) => setPosition((current) => ({ ...current, marketplaceProvenanceRef: value }))} mono />
                    <Field label="Metadata ref" value={position.metadataRef} onChange={(value) => setPosition((current) => ({ ...current, metadataRef: value }))} mono />
                    <Field label="Position proof ref" value={position.proofRef} onChange={(value) => setPosition((current) => ({ ...current, proofRef: value }))} mono />
                </div>
            </Section>

            <TxResult hash={txHash} error={error} />
        </div>
    );
}
