import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { ChainType, type WidgetConfig } from '@lifi/widget';
import { formatEther, formatUnits, isAddress, keccak256, padHex, parseEther, parseUnits, stringToHex, zeroHash } from 'viem';
import { useReadContract, useWriteContract } from 'wagmi';
import { COURTYARD_WORKFLOW_ABI, FUND_ADMIN_ABI, LIQUIDITY_COORDINATOR_ABI, PROFIT_DISTRIBUTOR_ABI, REGISTRY_ABI } from '../abis';
import { LZ_EID, MAINNET } from '../addresses';
import { TxButton, TxResult } from '../components/TxButton';

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000' as const;
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const COURTYARD_MARKETPLACE_ID = keccak256(stringToHex('COURTYARD'));
const PURCHASE_STATUS = ['None', 'Approved', 'Funds released', 'Executed', 'Position recorded', 'Cancelled'] as const;
const SALE_STATUS = ['None', 'Approved', 'Executed', 'Proceeds received', 'Finalized', 'Cancelled'] as const;
const POLYGON_CHAIN_ID = 137;
const AVALANCHE_CHAIN_ID = 43114;
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const LiFiWidget = lazy(() => import('@lifi/widget').then((mod) => ({ default: mod.LiFiWidget })));

type Bytes32 = `0x${string}`;

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

type FundingQuote = {
    kind: string;
    tool: string;
    fromAmountAvax: string;
    sourceGasAvax: string;
    totalInputAvax: string;
    toAmountUsd: string;
    executionDuration: number;
    enoughOutput: boolean;
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
};

function bytes32FromInput(value: string, emptyValue: Bytes32 = zeroHash): Bytes32 {
    const trimmed = value.trim();
    if (!trimmed) return emptyValue;
    if (BYTES32_RE.test(trimmed)) return trimmed as Bytes32;
    return keccak256(stringToHex(trimmed));
}

function labelBytes32(value: string): Bytes32 {
    return padHex(stringToHex(value.trim().slice(0, 31) || 'POLYGON'), { size: 32, dir: 'right' });
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
    });
    const [mode, setMode] = useState<'round' | 'profit' | 'marketplace' | 'courtyard' | 'lp'>('round');

    const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();

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

    const { data: courtyardMarketplaceApproved } = useReadContract({
        address: MAINNET.portfolioRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'isMarketplaceApproved',
        args: [COURTYARD_MARKETPLACE_ID],
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

    function submitAuthorizePurchase() {
        if (!MAINNET.courtyardWorkflow) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'authorizeCourtyardPurchase',
            args: [
                purchaseKey,
                LZ_EID.POLYGON_MAINNET,
                bytes32FromInput(purchase.assetRef),
                parseUsdt6Input(purchase.maxSpendUsdt),
                bytes32FromInput(purchase.mandateRef),
            ],
        });
    }

    function submitReleasePurchaseFunds() {
        if (!MAINNET.courtyardWorkflow) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'releaseCourtyardPurchaseFunds',
            args: [purchaseKey, parseUsdt6Input(purchase.releaseAmountUsdt)],
        });
    }

    function submitRecordPurchaseExecution() {
        if (!MAINNET.courtyardWorkflow) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'recordCourtyardPurchaseExecution',
            args: [
                purchaseKey,
                bytes32FromInput(purchase.executionRef),
                bytes32FromInput(purchase.settlementRef),
                bytes32FromInput(purchase.proofRef),
            ],
        });
    }

    function submitRecordPosition() {
        if (!MAINNET.courtyardWorkflow) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'recordCourtyardPosition',
            args: [
                purchaseKey,
                {
                    custodyMode: Number(position.custodyMode),
                    tokenStandard: bytes32FromInput(position.tokenStandard),
                    evmCollection: isAddress(position.evmCollection) ? position.evmCollection : ADDRESS_ZERO,
                    nonEvmCollection: bytes32FromInput(position.nonEvmCollection),
                    tokenId: parseUintInput(position.tokenId),
                    nonEvmTokenId: bytes32FromInput(position.nonEvmTokenId),
                    externalAssetId: bytes32FromInput(position.externalAssetId),
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
        if (!MAINNET.courtyardWorkflow) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'authorizeCourtyardSale',
            args: [
                saleKey,
                parseUintInput(sale.positionId),
                parseUsdt6Input(sale.minNetProceedsUsdt),
                bytes32FromInput(sale.mandateRef),
            ],
        });
    }

    function submitRecordSaleExecution() {
        if (!MAINNET.courtyardWorkflow) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'recordCourtyardSaleExecution',
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
        if (!MAINNET.courtyardWorkflow) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'confirmCourtyardSaleProceeds',
            args: [saleKey, parseUsdt6Input(sale.netProceedsUsdt)],
            value: parseEther(sale.nativeProceedsAvax.trim() || '0'),
        });
    }

    function submitFinalizeSale() {
        if (!MAINNET.courtyardWorkflow) return;
        reset();
        writeContract({
            address: MAINNET.courtyardWorkflow,
            abi: COURTYARD_WORKFLOW_ABI,
            functionName: 'finalizeCourtyardSale',
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
                    This surface tracks the live profit-sharing model: excluded protocol wallets, cumulative AVAX distributions,
                    and the mainnet marketplace approval list for operator-assisted card workflow execution.
                </p>
                <div className="grid gap-2 text-xs text-gray-400">
                    <div>Fund proxy: {MAINNET.fundProxy ?? 'Pending env config'}</div>
                    <div>Portfolio registry: {MAINNET.portfolioRegistry ?? 'Pending env config'}</div>
                    <div>Profit distributor: {profitDistributor ?? 'Pending module wiring'}</div>
                    <div>Liquidity coordinator: {liquidityCoordinator ?? 'Pending module wiring'}</div>
                    <div>Courtyard workflow: {MAINNET.courtyardWorkflow ?? 'Pending env config'}</div>
                    <div>Reference NAV/token: {referenceNav !== undefined ? `${formatUnits(referenceNav, 6)} USDT` : 'Unavailable'}</div>
                    <div>Reference treasury: {stableAccounting ? `${formatUnits(stableAccounting[2], 6)} USDT` : 'Unavailable'}</div>
                    <div>Holder distribution liability: {stableAccounting ? `${formatUnits(stableAccounting[6], 6)} USDT` : 'Unavailable'}</div>
                    <div>LP accrual bucket: {stableAccounting ? `${formatUnits(stableAccounting[5], 6)} USDT` : 'Unavailable'}</div>
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
                        Profit Share
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
                            Exclude protocol-controlled wallets from claimable AVAX profit distributions. Circulating holders stay eligible by default.
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
                                <div>Liquid treasury reference: {stableAccounting ? `${formatUnits(stableAccounting[2], 6)} USDT` : 'Unavailable'}</div>
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
                                Configure the Polygon custody Safe on-chain. The Hot Wallet is an off-chain operator wallet used
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
                                <div>Released: {purchaseAuthorization ? `${formatUnits(purchaseAuthorization.releasedUsdt6, 6)} USDT` : 'Unavailable'}</div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Purchase key" value={purchase.key} onChange={(value) => updatePurchase('key', value)} placeholder="courtyard-purchase-1 or 0x..." mono />
                                <Field label="Asset ref" value={purchase.assetRef} onChange={(value) => updatePurchase('assetRef', value)} placeholder="Courtyard listing, vault, or 0x..." mono />
                                <Field label="Max spend (USDT)" value={purchase.maxSpendUsdt} onChange={(value) => updatePurchase('maxSpendUsdt', value)} placeholder="100" type="number" />
                                <Field label="Mandate ref" value={purchase.mandateRef} onChange={(value) => updatePurchase('mandateRef', value)} placeholder="buy mandate or 0x..." mono />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitAuthorizePurchase} txHash={txHash} isPending={isPending} disabled={!MAINNET.courtyardWorkflow || !purchase.key.trim()}>
                                    Authorize purchase
                                </TxButton>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                                <Field label="Release amount (USDT)" value={purchase.releaseAmountUsdt} onChange={(value) => updatePurchase('releaseAmountUsdt', value)} placeholder="80" type="number" />
                                <TxButton onClick={submitReleasePurchaseFunds} txHash={txHash} isPending={isPending} disabled={!MAINNET.courtyardWorkflow || !purchase.key.trim()}>
                                    Release purchase funds
                                </TxButton>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <Field label="Execution ref" value={purchase.executionRef} onChange={(value) => updatePurchase('executionRef', value)} placeholder="Courtyard buy tx or 0x..." mono />
                                <Field label="Settlement ref" value={purchase.settlementRef} onChange={(value) => updatePurchase('settlementRef', value)} placeholder="settlement ref or 0x..." mono />
                                <Field label="Proof ref" value={purchase.proofRef} onChange={(value) => updatePurchase('proofRef', value)} placeholder="proof hash or 0x..." mono />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitRecordPurchaseExecution} txHash={txHash} isPending={isPending} disabled={!MAINNET.courtyardWorkflow || !purchase.key.trim()}>
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
                                    disabled={!MAINNET.courtyardWorkflow || !purchase.key.trim() || !isAddress(position.evmCollection)}
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
                                <div>Native proceeds confirmed: {saleAuthorization ? `${formatEther(saleAuthorization.netProceedsNativeWei)} AVAX` : 'Unavailable'}</div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Sale key" value={sale.key} onChange={(value) => updateSale('key', value)} placeholder="courtyard-sale-1 or 0x..." mono />
                                <Field label="Position ID" value={sale.positionId} onChange={(value) => updateSale('positionId', value)} placeholder="1" type="number" />
                                <Field label="Min net proceeds (USDT)" value={sale.minNetProceedsUsdt} onChange={(value) => updateSale('minNetProceedsUsdt', value)} placeholder="100" type="number" />
                                <Field label="Mandate ref" value={sale.mandateRef} onChange={(value) => updateSale('mandateRef', value)} placeholder="sale mandate or 0x..." mono />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitAuthorizeSale} txHash={txHash} isPending={isPending} disabled={!MAINNET.courtyardWorkflow || !sale.key.trim()}>
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
                                <TxButton onClick={submitRecordSaleExecution} txHash={txHash} isPending={isPending} disabled={!MAINNET.courtyardWorkflow || !sale.key.trim()}>
                                    Record sale execution
                                </TxButton>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Net proceeds (USDT)" value={sale.netProceedsUsdt} onChange={(value) => updateSale('netProceedsUsdt', value)} placeholder="110" type="number" />
                                <Field label="Native proceeds to deposit (AVAX)" value={sale.nativeProceedsAvax} onChange={(value) => updateSale('nativeProceedsAvax', value)} placeholder="4.4" type="number" />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <TxButton onClick={submitConfirmSaleProceeds} txHash={txHash} isPending={isPending} disabled={!MAINNET.courtyardWorkflow || !sale.key.trim()}>
                                    Confirm sale proceeds
                                </TxButton>
                                <TxButton onClick={submitFinalizeSale} txHash={txHash} isPending={isPending} disabled={!MAINNET.courtyardWorkflow || !sale.key.trim()}>
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
