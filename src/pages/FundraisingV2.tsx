import { useMemo, useState } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { avalanche, base, mainnet } from 'wagmi/chains';
import { formatEther, formatUnits, parseUnits } from 'viem';
import { useAvaxPrice } from '../hooks/useAvaxPrice';
import {
    Caption,
    DataMono,
    Display,
    DisplayItalic,
    Hairline,
    LedgerRow,
    SectionLabel,
} from '../components/v2/primitives';
import { GM10_FUND_ABI } from '../data/contracts';
import {
    ROUND_2_CLOSE_LEDGER,
} from '../data/protocol';
import { CONTINUOUS_COMMIT_RAILS } from '../data/continuousAccrual';
import {
    GM10_PRIMARY_DEPLOYMENT,
} from '../data/gm10Config';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from '../components/Web3Providers';

function fmtAvax(n: number, digits = n < 1 ? 4 : 2) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function parseUsdt6(value: string) {
    try {
        return parseUnits(value || '0', 6);
    } catch {
        return 0n;
    }
}

function fmtUsdc(value?: bigint, fallback = 'Unavailable') {
    if (value === undefined) return fallback;
    return `${Number(formatUnits(value, 6)).toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC`;
}

function fmtCatch(value?: bigint) {
    if (value === undefined) return '0.00';
    return Number(formatUnits(value, 18)).toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function fmtSpread(spread?: bigint) {
    if (spread === undefined) return 'Unavailable';
    const bps = Number(spread);
    const pct = Math.abs(bps) / 100;
    if (bps < 0) return `${pct.toFixed(2)}% discount to NAV`;
    if (bps > 0) return `${pct.toFixed(2)}% premium to NAV`;
    return 'At NAV';
}

const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

type SourceTokenConfig = {
    id: string;
    chain: string;
    chainId: number;
    symbol: string;
    decimals: number;
    tokenAddress?: `0x${string}`;
    priceUsdc?: number;
    usesAvaxPrice?: boolean;
};

type SourceTokenBalanceStatus = 'connect' | 'loading' | 'ready' | 'error';

type SourceTokenOption = SourceTokenConfig & {
    balance?: number;
    balanceStatus: SourceTokenBalanceStatus;
};

const SOURCE_TOKEN_OPTIONS = [
    { id: 'avax-avalanche', chain: 'Avalanche', chainId: avalanche.id, symbol: 'AVAX', decimals: 18, usesAvaxPrice: true },
    { id: 'usdc-base', chain: 'Base', chainId: base.id, symbol: 'USDC', decimals: 6, tokenAddress: BASE_USDC_ADDRESS, priceUsdc: 1 },
    { id: 'eth-mainnet', chain: 'Ethereum', chainId: mainnet.id, symbol: 'ETH', decimals: 18, priceUsdc: 3820 },
] as const satisfies readonly SourceTokenConfig[];

type SourceTokenId = typeof SOURCE_TOKEN_OPTIONS[number]['id'];

function fmtTokenAmount(value: number) {
    return value.toLocaleString('en-US', { maximumFractionDigits: value >= 10 ? 2 : 6 });
}

function formatBalanceStatus(token: SourceTokenOption) {
    if (token.balanceStatus === 'connect') return 'Connect wallet';
    if (token.balanceStatus === 'loading') return 'Loading balance';
    if (token.balanceStatus === 'error') return 'Balance unavailable';
    return `${fmtTokenAmount(token.balance ?? 0)} ${token.symbol}`;
}

function getSourceTokenUsdcRate(token: SourceTokenConfig, avaxUsd: number) {
    return token.usesAvaxPrice ? avaxUsd : token.priceUsdc ?? 1;
}

/* ── Round 1 archive ─────────────────────────────────── */

function Round1Archive() {
    const { archiveRound } = useFujiRoundState();
    const portfolio = useFujiPortfolioPositions();
    const avaxUsd = useAvaxPrice();
    if (!archiveRound) return null;

    const raised = Number(formatEther(archiveRound.raisedAmount));
    const target = Number(formatEther(archiveRound.targetAmount));
    const filledLabel = '~45 hours'; // from onchain analysis: first tx 13 Apr 20:13 → last 15 Apr 16:48
    const participantsLabel = '24 addresses';
    const usdValue = raised * avaxUsd;
    const lotCount = portfolio.positions.length;
    const lotWord = lotCount === 1 ? 'lot' : 'lots';
    const lotCountLabel = lotCount > 0 ? `${lotCount} ${lotWord}` : 'lots';
    const archiveRows = [
        {
            label: 'Raised',
            detail: `${fmtAvax(raised)} / ${fmtAvax(target)} AVAX · 100%`,
            value: `$${usdValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        },
        {
            label: 'Fill time',
            detail: '13 Apr 2026, 20:13 UTC → 15 Apr 2026, 16:48 UTC',
            value: filledLabel,
        },
        {
            label: 'Participants',
            detail: 'Unique invest() callers',
            value: participantsLabel,
        },
        {
            label: 'Deployed',
            detail: `Acquired ${lotCountLabel} via Courtyard custody`,
            value: `${portfolio.proofSummary.costBasisLabel} cost basis`,
        },
        {
            label: '$CATCH minted',
            detail: 'Tokens issued to Round 1 participants',
            value: `${(raised / Number(formatEther(archiveRound.tokenPrice))).toLocaleString('en-US', { maximumFractionDigits: 0 })} $CATCH`,
        },
    ];

    return (
        <section className="px-4 py-20 border-t border-[var(--rule)]">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <SectionLabel>Round 01 · Archive</SectionLabel>
                <Display as="h2" className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)]">
                    Round 1 closed early: capital filled in 45 hours.
                </Display>
                <p className="mt-4 max-w-[56ch] text-[0.98rem] leading-[1.7] text-[var(--ink-muted)]">
                    500 AVAX raised across 24 wallets, well before the end timestamp.
                    Capital was deployed into the first {lotCountLabel}, all custodied by Courtyard on Polygon.
                    Fixed-window raises are now archive material; the current surface is continuous commit preview, valuation, and execution proof.
                </p>

                <div className="mt-10 border-t border-[var(--rule)]">
                    <div className="md:hidden divide-y divide-[var(--rule)]">
                        {archiveRows.map((row) => (
                            <div key={row.label} className="py-5">
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{row.label}</Caption>
                                <div className="mt-2 text-[1rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                                    {row.value}
                                </div>
                                <p className="mt-1 text-[0.86rem] leading-[1.55] text-[var(--ink-muted)]">
                                    {row.detail}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:block">
                        {archiveRows.map((row) => (
                            <LedgerRow key={row.label} columns="240px 1fr 240px" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{row.label}</Caption>,
                                <span className="text-[var(--ink-faint)]">{row.detail}</span>,
                                <span className="text-right text-[var(--text-primary)]">{row.value}</span>,
                            ]} />
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-6">
                    <a
                        href="/portfolio"
                        className="v2-mono text-[0.82rem] tracking-[0.05em] text-[var(--accent-brass)] hover:text-[var(--text-primary)]"
                    >
                        → View the collection
                    </a>
                </div>
            </div>
        </section>
    );
}

/* ── Proof listing ───────────────────────────────────── */

function Proof() {
    const round = useFujiRoundState();
    return (
        <section className="px-4 py-20 border-t border-[var(--rule)]">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <SectionLabel>Proof surface</SectionLabel>
                <Hairline className="mt-6" />
                {round.links.map((link) => (
                    <LedgerRow
                        key={link.label}
                        columns="220px 1fr auto"
                        cells={[
                            <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{link.label}</Caption>,
                            <DataMono className="break-all text-[0.78rem] text-[var(--text-primary)]">{link.address ?? 'pending'}</DataMono>,
                            <a
                                href={link.snowtraceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="v2-mono text-[0.82rem] text-[var(--accent-brass)] hover:text-[var(--text-primary)]"
                            >
                                → Snowtrace
                            </a>,
                        ]}
                    />
                ))}
            </div>
        </section>
    );
}

/* ── Post-close ledger ───────────────────────────────── */

function PostCloseLedger({ archiveRaisedAvax, avaxUsd }: { archiveRaisedAvax: number; avaxUsd: number }) {
    const totalRaisedAvax = archiveRaisedAvax + ROUND_2_CLOSE_LEDGER.raisedAvax;
    const totalRaisedUsd = totalRaisedAvax * avaxUsd;
    const round2StrategyAvax = ROUND_2_CLOSE_LEDGER.raisedAvax * 0.85;
    const round2LiquidityRouteAvax = ROUND_2_CLOSE_LEDGER.raisedAvax * 0.05;
    const totalStrategyAvax = archiveRaisedAvax + round2StrategyAvax;
    const totalRows = [
        {
            label: 'Total finalized raise',
            value: `${fmtAvax(totalRaisedAvax, 4)} AVAX`,
            detail: 'Round 1 and Round 2 closed and finalized on Avalanche mainnet.',
        },
        {
            label: 'Strategy treasury',
            value: `${fmtAvax(totalStrategyAvax, 4)} AVAX`,
            detail: 'Round 1 plus 85% of Round 2 proceeds stayed with the strategy for card sourcing and execution.',
        },
        {
            label: 'LFJ liquidity route',
            value: `${fmtAvax(round2LiquidityRouteAvax, 4)} AVAX`,
            detail: 'Round 2 routed one half of the liquidity bucket into LFJ.',
        },
        {
            label: 'Pharaoh liquidity route',
            value: `${fmtAvax(round2LiquidityRouteAvax, 4)} AVAX`,
            detail: 'Round 2 routed one half of the liquidity bucket into Pharaoh.',
        },
        {
            label: 'Team allocation',
            value: `${fmtAvax(round2LiquidityRouteAvax, 4)} AVAX`,
            detail: 'Round 2 bootstrap allocation sent to the team wallet.',
        },
    ] as const;

    return (
        <div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <DataMono className="block text-[0.68rem] tracking-[0.08em] uppercase text-[var(--ink-faint)]">
                        Finalized rounds · Proof live
                    </DataMono>
                    <DataMono className="text-[0.72rem] font-semibold tracking-[0.04em] text-[var(--ink-muted)]">
                        Finalized {ROUND_2_CLOSE_LEDGER.finalizedAtLabel}
                    </DataMono>
                </div>
                <p className="mt-2 text-[0.82rem] leading-[1.45] text-[var(--ink-muted)]">
                    Direct buys are closed. Round 1 and Round 2 close, routing, and contract proof remain public.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4 border-y border-[var(--rule)] py-3">
                    <div>
                        <Caption className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">Raised</Caption>
                        <DataMono className="mt-1 block text-[1.12rem] font-bold text-[var(--text-primary)]">
                            {fmtAvax(totalRaisedAvax, 4)} AVAX
                        </DataMono>
                        <DataMono className="text-[0.72rem] font-semibold text-[var(--ink-muted)]">
                            ~${totalRaisedUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </DataMono>
                    </div>
                    <div className="text-right">
                        <Caption className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">Finalized</Caption>
                        <DataMono className="mt-1 block text-[1.12rem] font-bold text-[var(--accent-brass)]">
                            Block {ROUND_2_CLOSE_LEDGER.finalizedBlock.toLocaleString('en-US')}
                        </DataMono>
                        <DataMono className="text-[0.72rem] font-semibold text-[var(--ink-muted)]">
                            {ROUND_2_CLOSE_LEDGER.progressLabel} of original cap
                        </DataMono>
                    </div>
                </div>
                <div className="mt-2 border-t border-[var(--rule)]">
                    {totalRows.map((row) => (
                        <div key={row.label}>
                            <div className="md:hidden border-b border-[var(--rule)] py-3">
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{row.label}</Caption>
                                <DataMono className="mt-1.5 block text-[0.9rem] text-[var(--text-primary)]">{row.value}</DataMono>
                                <p className="mt-1 text-[0.8rem] leading-[1.45] text-[var(--ink-muted)]">{row.detail}</p>
                            </div>
                            <div className="hidden md:block">
                                <LedgerRow
                                    columns="170px 1fr 150px"
                                    className="py-2.5"
                                    cells={[
                                        <Caption className="text-[0.66rem] uppercase tracking-[0.06em] text-[var(--ink-faint)]">{row.label}</Caption>,
                                        <span className="text-[0.84rem] leading-[1.45] text-[var(--ink-faint)]">{row.detail}</span>,
                                        <span className="text-right text-[0.9rem] text-[var(--text-primary)]">{row.value}</span>,
                                    ]}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Main page ───────────────────────────────────────── */

function FundraisingContent() {
    const { address, isConnected } = useAccount();
    const [amount, setAmount] = useState('');
    const [sourceTokenId, setSourceTokenId] = useState<SourceTokenId>(SOURCE_TOKEN_OPTIONS[0].id);
    const [txError, setTxError] = useState<string | null>(null);
    const round = useFujiRoundState();
    const portfolio = useFujiPortfolioPositions();
    const avaxUsd = useAvaxPrice();
    const avaxBalance = useBalance({
        address,
        chainId: avalanche.id,
        query: { enabled: Boolean(address) },
    });
    const baseUsdcBalance = useBalance({
        address,
        chainId: base.id,
        token: BASE_USDC_ADDRESS,
        query: { enabled: Boolean(address) },
    });
    const ethBalance = useBalance({
        address,
        chainId: mainnet.id,
        query: { enabled: Boolean(address) },
    });
    const sourceTokens = useMemo<SourceTokenOption[]>(() => (
        SOURCE_TOKEN_OPTIONS.map((token) => {
            const balanceRead = token.id === 'avax-avalanche'
                ? avaxBalance
                : token.id === 'usdc-base'
                    ? baseUsdcBalance
                    : ethBalance;
            const balance = balanceRead.data
                ? Number(formatUnits(balanceRead.data.value, token.decimals))
                : undefined;
            const balanceStatus: SourceTokenBalanceStatus = !isConnected
                ? 'connect'
                : balanceRead.isError
                    ? 'error'
                    : balance === undefined || balanceRead.isLoading
                        ? 'loading'
                        : 'ready';
            return {
                ...token,
                balance,
                balanceStatus,
            };
        })
    ), [
        isConnected,
        avaxBalance.data,
        avaxBalance.isError,
        avaxBalance.isLoading,
        baseUsdcBalance.data,
        baseUsdcBalance.isError,
        baseUsdcBalance.isLoading,
        ethBalance.data,
        ethBalance.isError,
        ethBalance.isLoading,
    ]);
    const selectedSourceToken = useMemo(
        () => sourceTokens.find((token) => token.id === sourceTokenId) ?? sourceTokens[0],
        [sourceTokenId, sourceTokens],
    );
    const sourceAmount = amount ? Number(amount) : 0;
    const validSourceAmount = Number.isFinite(sourceAmount) && sourceAmount > 0 ? sourceAmount : 0;
    const selectedTokenUsdcRate = getSourceTokenUsdcRate(selectedSourceToken, avaxUsd);
    const settledUsdcAmount = validSourceAmount * selectedTokenUsdcRate;
    const settlementAmountUsdt6 = useMemo(
        () => parseUsdt6(settledUsdcAmount > 0 ? settledUsdcAmount.toFixed(6) : ''),
        [settledUsdcAmount],
    );

    const { data: navPerTokenUsdt6 } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'navPerTokenUsdt6',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: continuousMintPaused } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'continuousMintPaused',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: buybackPaused } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'buybackPaused',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: lpSupportPaused } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'lpSupportPaused',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: mintSpreadBps } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'mintSpreadBps',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: redemptionsPermanentlyDisabled } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'redemptionsPermanentlyDisabled',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: continuousPreview } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'previewContinuousMint',
        args: [settlementAmountUsdt6],
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address && settlementAmountUsdt6 > 0n) },
    });

    const archiveRaisedAvax = round.archiveRound ? Number(formatEther(round.archiveRound.raisedAmount)) : 500;
    const totalRaisedAvax = archiveRaisedAvax + ROUND_2_CLOSE_LEDGER.raisedAvax;
    const totalRaisedLabel = `${fmtAvax(totalRaisedAvax, 4)} AVAX`;
    const buyerCatch = fmtCatch(continuousPreview?.[0]);
    const segmentCatch = fmtCatch(continuousPreview?.[1]);
    const mintPriceLabel = continuousPreview?.[2] !== undefined
        ? fmtUsdc(continuousPreview[2])
        : navPerTokenUsdt6 !== undefined && mintSpreadBps !== undefined
            ? 'Enter an amount'
            : 'Unavailable';
    const amountUsd = settledUsdcAmount;

    const continuousAllocationRows = [
        {
            label: 'Strategy buying power',
            percent: '90%',
            detail: 'Settled value becomes liquid treasury for inventory sourcing and card execution.',
        },
        {
            label: 'LP support reserve',
            percent: '10%',
            detail: 'A bounded reserve accrues for market support without counting protocol-owned LP in NAV.',
        },
        {
            label: 'Segment token mints',
            percent: '5 x 1%',
            detail: 'Core team, governance, community, advisors, and partnerships each mint 1% of buyer tokens per commit.',
        },
    ] as const;

    const displayError = useMemo(() => {
        if (txError) return txError;
        return null;
    }, [txError]);

    function handlePreviewCommit() {
        setTxError(null);
        if (!GM10_PRIMARY_DEPLOYMENT.proxy.address) {
            setTxError('Mainnet fund address has not been configured yet.');
            return;
        }
        if (!amount || settlementAmountUsdt6 <= 0n) {
            setTxError('Enter a valid source-token amount.');
            return;
        }
        if (continuousMintPaused !== false) {
            setTxError(
                continuousMintPaused === true
                    ? 'Continuous commits are paused onchain. The preview can read NAV, but settlement cannot mint yet.'
                    : 'Continuous commit pause state is still loading. Wait for the onchain control read before previewing the route.',
            );
            return;
        }
        setTxError('Preview is ready. The public LI.FI/Mobula commit route should be connected only to the verified Avalanche settlement receiver.');
    }

    return (
        <main>
            {/* Status strip */}
            <section className="px-4 pt-28 md:pt-32 pb-4">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <div className="flex flex-wrap items-center gap-3 text-[0.7rem]">
                        <DataMono className="text-[var(--ink-faint)] tracking-[0.08em] uppercase">
                            <a href="/" className="hover:text-[var(--text-primary)]">Gm10</a>
                            {' · '}
                            <span className="text-[var(--text-primary)]">Continuous round</span>
                        </DataMono>
                        <DataMono className="tracking-[0.04em]">
                            <span className={continuousMintPaused === false ? 'v2-up' : 'text-[var(--ink-faint)]'}>
                                {continuousMintPaused === false ? 'CONTINUOUS LIVE' : 'CONTINUOUS PAUSED'}
                            </span>
                        </DataMono>
                        <DataMono className="text-[var(--ink-faint)] tracking-[0.04em]">
                            AVALANCHE MAINNET · V8 VERIFIED
                        </DataMono>
                    </div>

                    {/* Title */}
                    <div className="mt-10 flex flex-wrap items-end gap-8">
                        <div>
                            <SectionLabel>Current entry mode</SectionLabel>
                            <Display as="h1" className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
                                Continuous round
                            </Display>
                        </div>
                        <DisplayItalic as="div" className="text-[clamp(1.4rem,3vw,2.2rem)] text-[var(--ink-muted)] pb-3">
                            Per-commit minting at live NAV.
                        </DisplayItalic>
                    </div>
                </div>
            </section>

            {/* Continuous spec + preview grid */}
            <section className="px-4 pb-20">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
                        {/* Spec */}
                        <div>
                            <SectionLabel>Live mechanics</SectionLabel>
                            <Hairline className="mt-3" />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">NAV</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{fmtUsdc(navPerTokenUsdt6)}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Mint spread</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{fmtSpread(mintSpreadBps)}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Settlement</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">USDC-equivalent value on Avalanche</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Mint price</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{mintPriceLabel}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Redemptions</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{redemptionsPermanentlyDisabled ? 'Permanently disabled' : 'Disabled state unavailable'}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Buyback</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{buybackPaused === true ? 'Paused until sale-profit trigger' : 'Live'}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">LP support</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{lpSupportPaused === true ? 'Paused until deployment' : 'Live'}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Total raised</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{totalRaisedLabel}</span>,
                            ]} />
                        </div>

                        {/* Preview */}
                        <div>
                            <SectionLabel>Commit preview</SectionLabel>
                            <Hairline className="mt-3" />
                            <div className="mt-4 border border-[var(--rule-strong)] bg-[var(--bg-secondary)] px-4 shadow-[0_0_0_1px_var(--accent-muted)]">
                                <div className="flex items-baseline justify-between border-b border-[var(--rule)] py-3">
                                    <DataMono className="text-[0.75rem] font-semibold tracking-[0.04em] text-[var(--ink-muted)]">
                                        SOURCE · <span className="text-[var(--text-primary)]">From virtually any chain</span>
                                    </DataMono>
                                    <DataMono className="text-[0.88rem] font-semibold text-[var(--text-primary)]">
                                        Avalanche settlement
                                    </DataMono>
                                </div>

                                <div className="py-4">
                                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                        <div>
                                            <label
                                                htmlFor="source-token-select"
                                                className="v2-mono block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]"
                                            >
                                                Source token
                                            </label>
                                            <select
                                                id="source-token-select"
                                                value={sourceTokenId}
                                                onChange={(event) => {
                                                    setSourceTokenId(event.target.value as SourceTokenId);
                                                    setAmount('');
                                                    setTxError(null);
                                                }}
                                                className="mt-2 h-11 w-full border border-[var(--rule-strong)] bg-[var(--bg-primary)] px-3 v2-mono text-[0.86rem] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-brass)]"
                                            >
                                                {sourceTokens.map((token) => (
                                                    <option key={token.id} value={token.id}>
                                                        {token.symbol} on {token.chain} - {formatBalanceStatus(token)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <DataMono className="text-left text-[0.75rem] font-semibold tracking-[0.04em] text-[var(--ink-muted)] sm:text-right">
                                            {selectedSourceToken.balanceStatus === 'ready'
                                                ? `Balance ${fmtTokenAmount(selectedSourceToken.balance ?? 0)} ${selectedSourceToken.symbol}`
                                                : formatBalanceStatus(selectedSourceToken)}
                                        </DataMono>
                                    </div>
                                    <div className="mt-4 flex items-baseline justify-between">
                                        <Caption className="block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Commit amount</Caption>
                                        <DataMono className="text-[0.72rem] font-semibold tracking-[0.04em] text-[var(--ink-muted)]">
                                            {fmtUsdc(settlementAmountUsdt6, '0 USDC')} equivalent
                                        </DataMono>
                                    </div>
                                    <div className="mt-2 flex items-baseline gap-3 border-b border-[var(--rule-strong)] pb-2">
                                        <input
                                            value={amount}
                                            onChange={(e) => {
                                                setAmount(e.target.value);
                                                setTxError(null);
                                            }}
                                            aria-label={`Commit amount in ${selectedSourceToken.symbol}`}
                                            placeholder={selectedSourceToken.symbol === 'USDC' ? '100.00' : '1.00'}
                                            inputMode="decimal"
                                            className="w-full min-w-0 bg-transparent v2-mono text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-[-0.02em] text-[var(--text-primary)] outline-none placeholder:text-[var(--ink-faint)]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedSourceToken.balance !== undefined) {
                                                    setAmount(String(selectedSourceToken.balance));
                                                }
                                                setTxError(null);
                                            }}
                                            disabled={selectedSourceToken.balance === undefined || selectedSourceToken.balance <= 0}
                                            className="v2-mono shrink-0 border border-[var(--rule-strong)] px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[var(--accent-brass)] hover:border-[var(--accent-brass)] hover:text-[var(--text-primary)]"
                                        >
                                            Max
                                        </button>
                                        <DataMono className="shrink-0 text-[0.9rem] font-semibold text-[var(--ink-muted)]">{selectedSourceToken.symbol}</DataMono>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-y border-[var(--rule-strong)] bg-[var(--accent-muted)] px-4 py-4">
                                    <div>
                                        <Caption className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">Route settles</Caption>
                                        <DataMono className="mt-1.5 block text-[clamp(1.3rem,2vw,1.55rem)] font-bold text-[var(--text-primary)]">
                                            {settledUsdcAmount > 0 ? settledUsdcAmount.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0.00'} <span className="text-[0.9rem] font-semibold text-[var(--ink-muted)]">USDC</span>
                                        </DataMono>
                                        <DataMono className="text-[0.78rem] font-semibold text-[var(--ink-muted)]">
                                            ~${amountUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                        </DataMono>
                                    </div>
                                    <div className="text-right">
                                        <Caption className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">Buyer receives</Caption>
                                        <DataMono className="mt-1.5 block text-[clamp(1.3rem,2vw,1.55rem)] font-bold text-[var(--accent-brass)]">
                                            {buyerCatch} <span className="text-[0.9rem] font-semibold">$CATCH</span>
                                        </DataMono>
                                        <DataMono className="text-[0.78rem] font-semibold text-[var(--ink-muted)]">
                                            + {segmentCatch} each segment wallet
                                        </DataMono>
                                    </div>
                                </div>

                                <div className="py-4">
                                    <button
                                        type="button"
                                        onClick={handlePreviewCommit}
                                        disabled={!amount || settlementAmountUsdt6 <= 0n}
                                        className="v2-mono flex h-14 w-full items-center justify-center gap-2 border border-[var(--accent-brass)] bg-[var(--accent-brass)] px-4 text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[var(--bg-primary)] shadow-[0_0_24px_var(--accent-muted)] transition-all hover:-translate-y-0.5 hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] disabled:cursor-not-allowed disabled:border-[var(--rule-strong)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--ink-muted)] disabled:shadow-none disabled:hover:translate-y-0"
                                    >
                                        Mint new $CATCH
                                    </button>
                                </div>

                                {displayError ? (
                                    <div className="pb-4 v2-mono text-[0.82rem] font-medium v2-down">
                                        ⚠ {displayError}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <p className="mt-8 text-[0.86rem] leading-[1.7] text-[var(--ink-muted)]">
                        Fixed-window buys are closed. The continuous round has no terminal close: each verified settlement mints buyer CATCH immediately, while the Round 2 close stays visible as historical proof.
                    </p>
                </div>
            </section>

            {/* Continuous commit rail */}
            <section className="px-4 py-16 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <SectionLabel>Continuous round</SectionLabel>
                    <Display as="div" className="mt-4 text-[clamp(1.4rem,2.8vw,2rem)] max-w-[58ch]">
                        The next commit flow is infinite: every settled route mints immediately.
                    </Display>
                    <p className="mt-2 max-w-[72ch] text-[0.84rem] leading-[1.7] text-[var(--ink-muted)]">
                        Users commit from any LI.FI or Mobula-supported chain and token. The route settles on Avalanche first, then CATCH is minted per commit and delivered back through the prepared LayerZero OFT path when supported.
                    </p>
                    <div className="mt-8 grid gap-3 md:grid-cols-4">
                        {CONTINUOUS_COMMIT_RAILS.map((rail, index) => (
                            <div key={rail.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                                <DataMono className="text-[0.72rem] text-[var(--accent-brass)]">0{index + 1}</DataMono>
                                <h3 className="mt-3 text-[0.95rem] font-bold text-[var(--text-primary)]">{rail.label}</h3>
                                <p className="mt-2 text-[0.78rem] leading-[1.55] text-[var(--ink-muted)]">{rail.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Allocation preview */}
            <section className="px-4 py-16 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <SectionLabel>Value routing</SectionLabel>
                    <Display as="div" className="mt-4 text-[clamp(1.4rem,2.8vw,2rem)] max-w-[56ch]">
                        Every continuous commit has an immediate route. It does not wait for a round close.
                    </Display>
                    <p className="mt-2 text-[0.82rem] text-[var(--ink-faint)]">
                        Realized sale profits remain separate: principal comes back first, then profit preserves inventory buying power and can fund bounded LP support or buyback-burn budgets when conditions justify it.
                    </p>
                    <div className="mt-8 border-t border-[var(--rule)]">
                        {continuousAllocationRows.map((bucket) => (
                            <div key={bucket.label}>
                                <div className="md:hidden border-b border-[var(--rule)] py-5">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <DataMono className="text-[var(--accent-brass)] text-[0.9rem]">{bucket.percent}</DataMono>
                                        <div className="text-right text-[var(--text-primary)]">{bucket.label}</div>
                                    </div>
                                    <p className="mt-2 text-[0.86rem] leading-[1.55] text-[var(--ink-muted)]">{bucket.detail}</p>
                                </div>
                                <div className="hidden md:block">
                                    <LedgerRow
                                        columns="90px 1fr"
                                        cells={[
                                            <DataMono className="text-[var(--accent-brass)] text-[0.9rem]">{bucket.percent}</DataMono>,
                                            <span>
                                                <span className="text-[var(--text-primary)]">{bucket.label}</span>
                                                <span className="ml-3 text-[var(--ink-faint)]"> {bucket.detail}</span>
                                            </span>,
                                        ]}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <SectionLabel>Finalized raise archive</SectionLabel>
                    <Display as="div" className="mt-4 text-[clamp(1.4rem,2.8vw,2rem)] max-w-[56ch]">
                        Round 1 and Round 2 totals are archived, not the current purchase mechanic.
                    </Display>
                    <div className="mt-8">
                        <PostCloseLedger archiveRaisedAvax={archiveRaisedAvax} avaxUsd={avaxUsd} />
                    </div>
                </div>
            </section>

            <Round1Archive />
            <Proof />

            {/* closer */}
            <section className="px-4 py-20 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))] flex flex-wrap items-center justify-between gap-4">
                    <Display className="text-[clamp(1.2rem,2.4vw,1.6rem)]">
                        Questions about the terms?
                    </Display>
                    <a href="/faq" className="v2-mono text-[0.88rem] tracking-[0.05em] text-[var(--accent-brass)] hover:text-[var(--text-primary)]">
                        → FAQ
                    </a>
                </div>
            </section>

            {/* Used to keep TS happy with variables we may later reference */}
            <span className="hidden">{portfolio.proofSummary.holdingsLabel}{round.status}</span>
        </main>
    );
}

export default function FundraisingV2() {
    return (
        <Web3Providers>
            <FundraisingContent />
        </Web3Providers>
    );
}
