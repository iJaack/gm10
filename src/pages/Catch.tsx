import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import { useReadContract } from 'wagmi';
import { ScrollReveal } from '../components/ScrollReveal';
import { PixelLabel } from '../components/PixelUI';
import { Web3Providers } from '../components/Web3Providers';
import { Display, SectionLabel } from '../components/v2/primitives';
import { GM10_FUND_ABI } from '../data/contracts';
import { GM10_PRIMARY_DEPLOYMENT } from '../data/gm10Config';
import {
    GOVERNANCE_PHASES,
    ROUND_2_CLOSE_LEDGER,
    SUPPORT_PAGE_COPY,
    TOKEN_ALLOCATION,
    TOKEN_RELEASE_RULES,
    getRoundPrimaryCtaLabel,
} from '../data/protocol';
import { useFujiRoundState } from '../hooks/useFujiProof';

// Release rule lookup keyed by allocation label
const RELEASE_BY_LABEL: Record<string, string> = Object.fromEntries(TOKEN_RELEASE_RULES);
const CONTINUOUS_ALLOCATION_PREVIEW_USDT6 = 100_000_000n;
const SEGMENT_ALLOCATION_COUNT = TOKEN_ALLOCATION.length - 1;

// Solid fill colours matching the Tailwind gradient classes
const SLICE_COLOURS: Record<string, string> = {
    'from-sky-500 to-cyan-400': '#0ea5e9',
    'from-red-500 to-orange-400': '#ef4444',
    'from-indigo-500 to-blue-500': '#6366f1',
    'from-emerald-500 to-teal-400': '#10b981',
    'from-amber-500 to-yellow-400': '#f59e0b',
    'from-fuchsia-500 to-pink-400': '#d946ef',
    'from-violet-500 to-purple-400': '#8b5cf6',
};

const WATERFALL_CODE_REFERENCE = [
    {
        emoji: '🃏',
        label: 'Sale matched to inventory',
        detail: 'Venue proof links the sold card to its registry position',
        color: 'var(--accent)',
        source: 'Admin sale import',
        code: `saleKey = hash(venueTx, collection, tokenId, proceedsRef);
positionId = matchSoldTokenToRegistry(collection, tokenId);
recordSaleExecution(saleKey, gross, fees, bridgeFees, proofRef);`,
    },
    {
        emoji: '⛓',
        label: 'Cash lands on Avalanche',
        detail: 'Stable proceeds must be confirmed in the fund before routing',
        color: 'var(--accent-blue)',
        source: 'GemMintStrategyFundV8.sol',
        code: `confirmStableSaleProceeds(
    saleKey,
    settlementToken,
    settledAmount,
    pullStableFromCaller,
    proceedsRef,
    proofRef
);`,
    },
    {
        emoji: '💰',
        label: 'Cost basis returns first',
        detail: 'The fund restores the sold card principal before profit routing',
        color: 'var(--accent-green)',
        source: 'GemMintStrategyFundV8.sol',
        code: `if (netProceedsUsdt6 <= costBasisUsdt6) {
    liquidTreasuryUsdt6 += netProceedsUsdt6;
} else {
    uint256 realizedProfitUsdt6 = netProceedsUsdt6 - costBasisUsdt6;
    liquidTreasuryUsdt6 += costBasisUsdt6;
}`,
    },
    {
        emoji: '📊',
        label: 'Profit gets a fresh route',
        detail: 'The market snapshot decides how realized profit supports the strategy',
        color: 'var(--accent)',
        source: 'GemMintStrategyFundV8.sol',
        code: `finalizeSaleWithMarketSnapshot(saleKey, snapshot, proofRef);
previewSaleProfitRoute(realizedProfitUsdt6, snapshot);
releaseLpSupportToken(token, amount, recipient, ref);
executeLpSupport(lfjAmount, pharaohAmount, catchAmount, ref);`,
    },
] as const;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
    const start = polarToXY(cx, cy, r, startDeg);
    const end = polarToXY(cx, cy, r, endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

interface TooltipState {
    label: string;
    percent: number;
    detail: string;
    x: number;
    y: number;
    color: string;
}

type AllocationSlice = {
    label: string;
    percent: number;
    color: string;
    detail: string;
    amountLabel?: string;
};

function percentFromParts(part: bigint, total: bigint) {
    if (total <= 0n) return 0;
    return Number((part * 10_000n + total / 2n) / total) / 100;
}

function formatPercent(value: number) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCatchAmount(value?: bigint) {
    if (value === undefined) return undefined;
    const amount = Number(formatEther(value));
    return `${amount.toLocaleString('en-US', { maximumFractionDigits: amount >= 100 ? 0 : 2 })} CATCH`;
}

function buildContinuousAllocationSlices(preview?: readonly [bigint, bigint, bigint]) {
    const buyerCatch = preview?.[0];
    const segmentCatchEach = preview?.[1];
    const previewTotal = buyerCatch !== undefined && segmentCatchEach !== undefined
        ? buyerCatch + segmentCatchEach * BigInt(SEGMENT_ALLOCATION_COUNT)
        : 0n;
    const buyerPercent = previewTotal > 0n && buyerCatch !== undefined
        ? percentFromParts(buyerCatch, previewTotal)
        : TOKEN_ALLOCATION[0].percent;
    const segmentPercent = previewTotal > 0n && segmentCatchEach !== undefined
        ? percentFromParts(segmentCatchEach, previewTotal)
        : TOKEN_ALLOCATION[1]?.percent ?? 0;

    return TOKEN_ALLOCATION.map((slice, index): AllocationSlice => {
        const isBuyer = index === 0;
        const amountLabel = isBuyer ? formatCatchAmount(buyerCatch) : formatCatchAmount(segmentCatchEach);
        return {
            ...slice,
            percent: isBuyer ? buyerPercent : segmentPercent,
            amountLabel,
            detail: amountLabel
                ? `${slice.detail} Current 100 USDC contract preview: ${amountLabel}.`
                : slice.detail,
        };
    });
}

function WaterfallHoverCard({
    emoji,
    label,
    detail,
    color,
    source,
    code,
}: (typeof WATERFALL_CODE_REFERENCE)[number]) {
    return (
        <div className="group relative flex w-full max-w-sm flex-col items-center">
            <div className="w-full rounded-xl border-2 bg-[var(--bg-secondary)] px-5 py-4 text-center transition-transform duration-200 group-hover:-translate-y-0.5 group-focus-within:-translate-y-0.5" style={{ borderColor: color }}>
                <div className="text-xl">{emoji}</div>
                <div className="mt-1 text-[0.92rem] font-bold text-[var(--text-primary)]">{label}</div>
                <div className="mt-0.5 text-[0.75rem] text-[var(--text-secondary)]">{detail}</div>
                <div className="mt-2 hidden items-center justify-center gap-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)] md:flex">
                    <span>hover to inspect code</span>
                </div>
            </div>

            <div className="pointer-events-none absolute bottom-[calc(100%+1rem)] left-1/2 z-20 hidden w-[min(32rem,88vw)] -translate-x-1/2 rounded-2xl border border-[var(--border-strong)] bg-[color-mix(in_oklab,var(--bg-secondary)_92%,black)] p-4 text-left opacity-0 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 md:block lg:w-[28rem]">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Contract proof</div>
                        <div className="mt-1 text-sm font-bold text-[var(--text-primary)]">{label}</div>
                    </div>
                    <div className="rounded-full border px-2 py-1 text-[0.64rem] font-semibold text-[var(--text-secondary)]" style={{ borderColor: color }}>
                        {source}
                    </div>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-primary)_88%,black)] px-3 py-3 text-[0.68rem] leading-[1.55] text-[var(--text-secondary)]"><code>{code}</code></pre>
                <div className="mt-2 text-[0.7rem] leading-[1.5] text-[var(--text-tertiary)]">
                    This is the process branch the UI is describing. Exact route amounts depend on confirmed settlement and the market snapshot.
                </div>
                <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[var(--border-strong)] bg-[color-mix(in_oklab,var(--bg-secondary)_92%,black)]" />
            </div>
        </div>
    );
}

function AllocationPieChart({ slices, previewStatus }: { slices: AllocationSlice[]; previewStatus: string }) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const cx = 200, cy = 200, r = 165, rHover = 177;
    let cursor = 0;

    return (
        <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-12">
            {/* SVG Pie */}
            <div className="relative shrink-0">
                <svg
                    viewBox="0 0 400 400"
                    width="400"
                    height="400"
                    className="drop-shadow-lg"
                    onMouseLeave={() => { setTooltip(null); setActiveIndex(null); }}
                >
                    {slices.map((slice, i) => {
                        const start = cursor;
                        const sweep = (slice.percent / 100) * 360;
                        cursor += sweep;
                        const end = cursor;
                        const midDeg = start + sweep / 2;
                        const isActive = activeIndex === i;
                        const radius = isActive ? rHover : r;
                        const path = buildArc(cx, cy, radius, start, end - 0.4);
                        const color = SLICE_COLOURS[slice.color] ?? '#888';
                        const labelPos = polarToXY(cx, cy, r * 0.68, start + sweep / 2);

                        return (
                            <g key={slice.label}>
                                <path
                                    d={path}
                                    fill={color}
                                    opacity={activeIndex !== null && !isActive ? 0.45 : 1}
                                    style={{ transition: 'opacity 150ms ease, d 150ms ease' }}
                                    className="cursor-pointer"
                                    onMouseEnter={(e) => {
                                        const svgRect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
                                        setActiveIndex(i);
                                        setTooltip({
                                            label: slice.label,
                                            percent: slice.percent,
                                            detail: slice.detail,
                                            x: e.clientX - svgRect.left,
                                            y: e.clientY - svgRect.top,
                                            color,
                                        });
                                    }}
                                    onMouseMove={(e) => {
                                        const svgRect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
                                        setTooltip((prev) => prev ? { ...prev, x: e.clientX - svgRect.left, y: e.clientY - svgRect.top } : prev);
                                    }}
                                />
                                {/* Percentage label inside slice — only if slice >= 8% */}
                                {slice.percent >= 8 && (
                                    <text
                                        x={labelPos.x}
                                        y={labelPos.y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="white"
                                        fontSize="12"
                                        fontWeight="700"
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                                    >
                                        {formatPercent(slice.percent)}%
                                    </text>
                                )}
                                {/* Midpoint dot indicator for small slices */}
                                {slice.percent < 8 && (() => {
                                    const dot = polarToXY(cx, cy, r * 0.75, midDeg);
                                    return (
                                        <circle cx={dot.x} cy={dot.y} r="3" fill="white" opacity="0.7" style={{ pointerEvents: 'none' }} />
                                    );
                                })()}
                            </g>
                        );
                    })}
                    {/* Centre hole */}
                    <circle cx={cx} cy={cy} r={64} fill="var(--bg-primary)" />
                    <text x={cx} y={cy - 9} textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize="16" fontWeight="800">Dynamic</text>
                    <text x={cx} y={cy + 13} textAnchor="middle" dominantBaseline="middle" fill="var(--text-secondary)" fontSize="12">supply</text>
                </svg>

                {/* Floating tooltip */}
                {tooltip && (
                    <div
                        className="pointer-events-none absolute z-20 max-w-[200px] rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 py-3 shadow-[var(--shadow-lg)]"
                        style={{
                            left: tooltip.x + 14,
                            top: tooltip.y - 10,
                            transform: tooltip.x > 220 ? 'translateX(-110%)' : undefined,
                        }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tooltip.color }} />
                            <span className="text-[0.78rem] font-bold text-[var(--text-primary)]">{tooltip.label}</span>
                        </div>
                        <div className="text-xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)]">{formatPercent(tooltip.percent)}%</div>
                        <p className="mt-1 text-[0.75rem] leading-[1.5] text-[var(--text-secondary)]">{tooltip.detail}</p>
                    </div>
                )}
            </div>

            {/* Unified legend + release rules */}
            <div className="w-full divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] overflow-hidden">
                {slices.map((slice, i) => {
                    const color = SLICE_COLOURS[slice.color] ?? '#888';
                    const releaseRule = RELEASE_BY_LABEL[slice.label] ?? '—';
                    return (
                        <button
                            key={slice.label}
                            type="button"
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-all duration-150 ${
                                activeIndex === i
                                    ? 'bg-[var(--bg-secondary)]'
                                    : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]'
                            }`}
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                            <span className="flex-1 min-w-0 text-[0.83rem] leading-[1.45] font-semibold text-[var(--text-primary)]">
                                {slice.label}<span className="font-normal text-[var(--text-secondary)]"> — {releaseRule}{slice.amountLabel ? ` Preview: ${slice.amountLabel}.` : ''}</span>
                            </span>
                            <span className="shrink-0 text-[0.83rem] font-bold tabular-nums" style={{ color }}>{formatPercent(slice.percent)}%</span>
                        </button>
                    );
                })}
                <div className="bg-[var(--bg-secondary)] px-4 py-3 text-[0.78rem] leading-[1.55] text-[var(--text-secondary)]">
                    {previewStatus}
                </div>
            </div>
        </div>
    );
}

const NAV_RULES = [
    {
        label: 'Rule 1',
        title: 'Exact trade',
        detail: 'Use the exact executed buy or sale of the same asset when it exists.',
        tone: 'live' as const,
    },
    {
        label: 'Rule 2',
        title: 'Comparable sales',
        detail: 'Use strong comps from matching collection, condition, chain, and venue context.',
        tone: 'warning' as const,
    },
    {
        label: 'Rule 3',
        title: 'Listing-band fallback',
        detail: 'If trades are thin, mark conservatively and cap inferred weekly moves.',
        tone: 'warning' as const,
    },
];

const SYSTEM_FLOW_STEPS = [
    {
        title: 'Commit through the continuous round',
        body: 'The continuous round is the entry point. Supported routes settle on Avalanche and the system records each commit as its own mint event.',
    },
    {
        title: 'GM10 acquires and marks positions',
        body: 'The team handles sourcing and execution, while the system tracks positions, marks, and liquid treasury against the portfolio.',
    },
    {
        title: '$CATCH tracks the strategy result',
        body: 'The token represents exposure to the portfolio process: holdings, realized exits, and the accounting rules that govern each update.',
    },
] as const;


function CatchContent() {
    const roundState = useFujiRoundState();
    const pageCopy = SUPPORT_PAGE_COPY.catch;
    const round1RaisedAvax = roundState.archiveRound
        ? Number(formatEther(roundState.archiveRound.raisedAmount))
        : 500;
    const round2RaisedAvax = roundState.round
        ? Number(formatEther(roundState.round.raisedAmount))
        : ROUND_2_CLOSE_LEDGER.raisedAvax;
    const totalRaisedAvax = round1RaisedAvax + round2RaisedAvax;
    const totalRaisedLabel = `${totalRaisedAvax.toLocaleString('en-US', { maximumFractionDigits: 4 })} AVAX`;
    const { data: continuousAllocationPreview } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'previewContinuousMint',
        args: [CONTINUOUS_ALLOCATION_PREVIEW_USDT6],
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const allocationSlices = buildContinuousAllocationSlices(continuousAllocationPreview);
    const previewBuyerCatch = formatCatchAmount(continuousAllocationPreview?.[0]);
    const previewSegmentCatch = formatCatchAmount(continuousAllocationPreview?.[1]);
    const previewStatus = previewBuyerCatch && previewSegmentCatch
        ? `Live contract preview: a 100 USDC settled commit mints ${previewBuyerCatch} to the buyer and ${previewSegmentCatch} to each of ${SEGMENT_ALLOCATION_COUNT} configured segment wallets.`
        : `Waiting for live contract preview; showing the continuous mint formula of buyer tokens plus ${SEGMENT_ALLOCATION_COUNT} segment mints.`;

    return (
        <main>
            <div className="px-4 pt-28 md:pt-32 pb-4">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">

            {/* ── HEADER ── */}
            <section>
                <ScrollReveal>
                    <div className="flex flex-wrap items-center gap-3 text-[0.7rem] v2-mono tracking-[0.08em] uppercase text-[var(--ink-faint)]">
                        <Link to="/" className="hover:text-[var(--text-primary)]">Gm10</Link>
                        <span>·</span>
                        <span className="text-[var(--text-primary)]">How it works</span>
                        <span>·</span>
                        <span>Continuous round</span>
                    </div>
                    <div className="mt-10">
                        <SectionLabel>{pageCopy.eyebrow}</SectionLabel>
                    </div>
                    <Display as="h1" className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
                        {pageCopy.title}
                    </Display>
                    <p className="mt-4 w-full max-w-none text-[0.98rem] leading-[1.7] text-[var(--ink-muted)]">
                        {pageCopy.body}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-6">
                        <Link to={pageCopy.primaryCtaTo} className="v2-mono text-[0.88rem] tracking-[0.05em] text-[var(--accent-brass)] hover:text-[var(--text-primary)]">
                            → {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
                        </Link>
                        <Link to={pageCopy.secondaryCtaTo} className="v2-mono text-[0.88rem] tracking-[0.05em] text-[var(--ink-muted)] hover:text-[var(--text-primary)]">
                            → Inspect the proof
                        </Link>
                    </div>
                </ScrollReveal>

                {/* Quick stats */}
                <div className="mt-8 grid gap-3 sm:grid-cols-4">
                    {[
                        { emoji: '🪙', label: 'Supply model', value: 'Dynamic supply', unit: 'Per-commit issuance' },
                        { emoji: '🏷️', label: 'Pricing model', value: '5% below risk-free price', unit: 'Primary commits mint at 95% of NAV' },
                        { emoji: '🔒', label: 'Segment mints', value: `${SEGMENT_ALLOCATION_COUNT} × 1%`, unit: previewSegmentCatch ? `${previewSegmentCatch} each per 100 USDC preview` : 'Excluded from circulating supply' },
                        { emoji: '📊', label: 'Total raised to date', value: totalRaisedLabel, unit: 'Round 1 plus finalized Round 2' },
                    ].map((stat, index) => (
                        <ScrollReveal key={stat.label} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--border-strong)]">
                                <div className="flex items-center gap-2">
                                    <span aria-hidden>{stat.emoji}</span>
                                    <span className="label-font">{stat.label}</span>
                                </div>
                                <div className="mt-2 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">{stat.value}</div>
                                <div className="mt-0.5 text-[0.75rem] text-[var(--text-tertiary)]">{stat.unit}</div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            <section className="mt-16">
                <ScrollReveal>
                    <SectionLabel>System flow</SectionLabel>
                    <Display as="h2" className="mt-3 text-[clamp(1.4rem,2.6vw,2rem)]">
                        How GM10 turns one token into portfolio exposure.
                    </Display>
                    <p className="mt-2 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                        Read this page as a sequence: contribution, portfolio construction, valuation discipline, and realized exit handling.
                    </p>
                </ScrollReveal>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {SYSTEM_FLOW_STEPS.map((step, index) => (
                        <ScrollReveal key={step.title} delay={(index + 1) as 1 | 2 | 3}>
                            <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-colors hover:border-[var(--border-strong)]">
                                <div className="label-font text-[var(--accent)]">0{index + 1}</div>
                                <h3 className="mt-3 text-lg font-bold text-[var(--text-primary)]">{step.title}</h3>
                                <p className="mt-2 text-[0.84rem] leading-[1.6] text-[var(--text-secondary)]">{step.body}</p>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            {/* ── TOKEN ALLOCATION + RELEASE SCHEDULE (unified) ── */}
            <section className="mt-16">
                <ScrollReveal>
                    <SectionLabel>Token allocation</SectionLabel>
                    <Display as="h2" className="mt-3 text-[clamp(1.4rem,2.6vw,2rem)]">
                        Where the supply goes.
                    </Display>
                    <p className="mt-2 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                        There is no max supply. Each successful continuous commit mints buyer tokens from settled value, then mints 1% each to the {SEGMENT_ALLOCATION_COUNT} configured segment wallets. The chart uses the current contract preview for a 100 USDC settled commit.
                    </p>
                </ScrollReveal>

                <ScrollReveal delay={1}>
                    <div className="mt-8">
                        <AllocationPieChart slices={allocationSlices} previewStatus={previewStatus} />
                    </div>
                </ScrollReveal>
            </section>

            {/* ── NAV MECHANICS ── */}
            <section className="mt-16">
                <ScrollReveal>
                    <SectionLabel>NAV mechanics</SectionLabel>
                    <Display as="h2" className="mt-3 text-[clamp(1.4rem,2.6vw,2rem)]">
                        How the token gets priced.
                    </Display>
                    <p className="mt-2 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                        NAV per token reflects the marked portfolio value divided by circulating supply. The marking system follows a strict priority cascade.
                    </p>
                </ScrollReveal>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {NAV_RULES.map((rule, index) => (
                        <ScrollReveal key={rule.title} delay={(index + 1) as 1 | 2 | 3}>
                            <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-colors hover:border-[var(--border-strong)]">
                                <PixelLabel tone={rule.tone}>{rule.label}</PixelLabel>
                                <h3 className="mt-3 text-lg font-bold text-[var(--text-primary)]">{rule.title}</h3>
                                <p className="mt-2 text-[0.84rem] leading-[1.6] text-[var(--text-secondary)]">{rule.detail}</p>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                <ScrollReveal delay={1}>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Portfolio value', desc: 'Sum of all marked positions' },
                            { label: 'Liquid treasury', desc: 'Cash held across treasury wallets' },
                            { label: 'Weekly NAV cap', desc: 'Max inferred move per week' },
                            { label: 'Onchain reporting', desc: 'All values verifiable on Snowtrace' },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--border-strong)]">
                                <div className="text-[0.85rem] font-bold text-[var(--text-primary)]">{item.label}</div>
                                <p className="mt-1 text-[0.78rem] text-[var(--text-secondary)]">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </ScrollReveal>
            </section>

            {/* ── SALE-PROFIT PROCESS ── */}
            <section className="mt-16">
                <ScrollReveal>
                    <SectionLabel>Sale-profit process</SectionLabel>
                    <Display as="h2" className="mt-3 text-[clamp(1.4rem,2.6vw,2rem)]">
                        A card sale turns into routed strategy capital.
                    </Display>
                    <p className="mt-2 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                        A sale is not a payout button. Proceeds land on Avalanche, the fund restores the card&apos;s cost basis, then the remaining profit follows the live market snapshot: buy the next slab, deepen CATCH liquidity, or fund a buyback-burn when the token trades at a discount.
                    </p>
                    <p className="mt-2 hidden text-[0.75rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)] md:block">
                        hover a step to inspect the matching contract branch
                    </p>
                </ScrollReveal>

                {/* Flowchart */}
                <ScrollReveal delay={1}>
                    <div className="mt-8 flex flex-col items-center">

                        {/* Pipeline steps */}
                        {WATERFALL_CODE_REFERENCE.slice(0, 3).map((step) => (
                            <div key={step.label} className="flex w-full max-w-sm flex-col items-center">
                                <WaterfallHoverCard {...step} />
                                <div className="h-5 w-px bg-[var(--border-strong)]" />
                                <svg width="10" height="6" viewBox="0 0 10 6" className="text-[var(--border-strong)]"><path d="M5 6L0 0h10z" fill="currentColor"/></svg>
                            </div>
                        ))}

                        {/* Profit split node */}
                        <WaterfallHoverCard {...WATERFALL_CODE_REFERENCE[3]} />

                        {/* Fork */}
                        <div className="h-5 w-px bg-[var(--border-strong)]" />
                        <div className="relative w-full">
                            {/* Horizontal bar spans center of col1 to center of col3. */}
                            <div className="absolute top-0 left-[16.666%] right-[16.666%] h-px bg-[var(--border-strong)]" />
                            <div className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-3">
                                {([
                                    { label: 'Buying power', route: 'New inventory', color: '#0ea5e9', desc: 'Profit can stay liquid for the next card purchase' },
                                    { label: 'LP support', route: 'Market depth', color: '#10b981', desc: 'Accrued support pairs CATCH with AVAX/WAVAX on configured venues' },
                                    { label: 'Buyback-burn', route: 'Discount support', color: '#6366f1', desc: 'Triggered when the snapshot favors CATCH support over new inventory' },
                                ] as const).map((out) => (
                                    <div key={out.label} className="flex flex-col items-center">
                                        <div className="h-5 w-px bg-[var(--border-strong)]" />
                                        <svg width="10" height="6" viewBox="0 0 10 6" className="text-[var(--border-strong)]"><path d="M5 6L0 0h10z" fill="currentColor"/></svg>
                                        <div className="w-full rounded-xl border-2 bg-[var(--bg-secondary)] px-3 py-3 text-center" style={{ borderColor: out.color }}>
                                            <div className="text-sm font-extrabold uppercase" style={{ color: out.color }}>{out.route}</div>
                                            <div className="mt-0.5 text-[0.73rem] font-bold text-[var(--text-primary)] leading-tight">{out.label}</div>
                                            <p className="mt-1 text-[0.68rem] leading-[1.4] text-[var(--text-secondary)]">{out.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </section>

            {/* ── GOVERNANCE ── */}
            <section className="mt-16">
                <ScrollReveal>
                    <SectionLabel>Governance roadmap</SectionLabel>
                    <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                        Progressive decentralization.
                    </h3>
                </ScrollReveal>

                <div className="mt-6 flex flex-col gap-0 md:flex-row md:items-stretch">
                    {GOVERNANCE_PHASES.flatMap((phase, index) => {
                        const circleClass = index === 0
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
                        const items = [
                            <ScrollReveal key={phase.phase} delay={(index + 1) as 1 | 2 | 3} className="flex md:flex-1">
                                <div className="flex w-full md:flex-1 md:flex-col">
                                    {/* Mobile: vertical stem on left */}
                                    <div className="mr-4 flex flex-col items-center md:hidden">
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[0.78rem] font-extrabold ${circleClass}`}>
                                            {index + 1}
                                        </div>
                                        {index < GOVERNANCE_PHASES.length - 1 && (
                                            <div className="mt-1 h-full w-px bg-[var(--border)]" />
                                        )}
                                    </div>
                                    {/* Desktop: number centered above card */}
                                    <div className="mb-4 hidden justify-center md:flex">
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[0.78rem] font-extrabold ${circleClass}`}>
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div className={`mb-4 flex-1 rounded-2xl border bg-[var(--bg-secondary)] p-5 transition-all duration-200 hover:border-[var(--border-strong)] md:mb-0 md:flex md:flex-col ${index === 0 ? 'border-[var(--accent)]/30' : 'border-[var(--border)]'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="label-font text-[var(--accent)]">{phase.phase}</span>
                                            {index === 0 && <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--accent)]">Current</span>}
                                        </div>
                                        <h4 className="mt-2.5 text-[0.95rem] font-bold text-[var(--text-primary)]">{phase.title}</h4>
                                        <p className="mt-1.5 text-[0.84rem] leading-[1.6] text-[var(--text-secondary)]">{phase.detail}</p>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ];
                        if (index < GOVERNANCE_PHASES.length - 1) {
                            items.push(
                                <div key={`arrow-${index}`} className="hidden shrink-0 items-start pt-1.5 md:flex">
                                    <span className="text-lg text-[var(--text-tertiary)]">→</span>
                                </div>
                            );
                        }
                        return items;
                    })}
                </div>
            </section>

                </div>
            </div>
        </main>
    );
}

export default function Catch() {
    return (
        <Web3Providers>
            <CatchContent />
        </Web3Providers>
    );
}
