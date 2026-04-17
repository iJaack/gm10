/**
 * HoldersV2 — Bloomberg terminal.
 *
 * Sections:
 *   1. Market header  — CATCH/USD price display, sparkline, status strip
 *   2. Protocol stats — ledger rows, no cards
 *   3. Account        — connect-wallet prompt OR ledger rows (mono, signed P/L)
 *   4. Claim          — thin status row
 *   5. Liquidity      — data table: venue / pair / price / volume / liquidity / 24h / link
 */

import { useState, type ReactNode } from 'react';
import { formatEther, formatUnits } from 'viem';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Web3Providers } from '../components/Web3Providers';
import {
    Caption,
    DataMono,
    Display,
    Hairline,
    Label,
    LedgerRow,
    SectionLabel,
    Sparkline,
} from '../components/v2/primitives';
import { useAvaxPrice } from '../hooks/useAvaxPrice';
import { useCatchMarketData } from '../hooks/useCatchMarketData';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { useHolderDashboard } from '../hooks/useHolderDashboard';
import type { MarketPool } from '../data/marketData';
import { TOKEN_ALLOCATION } from '../data/protocol';
import { ChartLegend, ComparisonBars, DonutChart, SegmentedBar } from '../components/v2/MiniCharts';

/* ── Helpers ──────────────────────────────────────────── */

function formatUsd(value?: number, digits = 2) {
    if (value === undefined || !isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value);
}

function shortAddr(a?: string) {
    if (!a) return 'pending';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fallbackLiq(p: MarketPool) {
    if (p.status === 'available') return null;
    const avax = p.fallbackAvax !== undefined ? `${Number(formatEther(p.fallbackAvax)).toLocaleString('en-US', { maximumFractionDigits: 4 })} AVAX` : '—';
    const c = p.fallbackCatch !== undefined ? `${Number(formatUnits(p.fallbackCatch, 18)).toLocaleString('en-US', { maximumFractionDigits: 0 })} CATCH` : '—';
    return `${avax} / ${c}`;
}

/* ── 1. Market header ─────────────────────────────────── */

function MarketHeader() {
    const market = useCatchMarketData();
    const holder = useHolderDashboard();
    const avaxUsd = useAvaxPrice();
    const price = market.spotPriceUsd ?? market.lfj.priceUsd ?? market.pharaoh.priceUsd;
    const priceAvax = price !== undefined && avaxUsd > 0 ? price / avaxUsd : undefined;
    const change = market.lfj.priceChange24h ?? market.pharaoh.priceChange24h ?? 0;
    const isUp = change >= 0;

    // premium / discount vs reference NAV
    const refNavRaw = holder.raw.referenceNav;
    const refNavUsd = refNavRaw !== undefined ? Number(formatUnits(refNavRaw, 6)) : undefined;
    const canComparePremium = price !== undefined && refNavUsd !== undefined && refNavUsd > 0;
    const premiumPct = canComparePremium ? ((price! - refNavUsd!) / refNavUsd!) * 100 : 0;
    const atPar = Math.abs(premiumPct) < 0.5;
    const isPremium = premiumPct >= 0.5;

    // synthetic sparkline — no historical series in hook
    const spark = [1, 1.05, 0.98, 1.1, 1.2, 1.25, 1.3, 1.28, 1.32, 1.4];

    return (
        <section className="px-4 pt-28 md:pt-32 pb-8">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                {/* Breadcrumb */}
                <div className="flex items-center gap-3 text-[0.7rem]">
                    <DataMono className="text-[var(--ink-faint)] tracking-[0.08em] uppercase">
                        <Link to="/" className="hover:text-[var(--text-primary)]">Gm10</Link>
                        {' · '}
                        <span className="text-[var(--text-primary)]">Holders</span>
                    </DataMono>
                    <DataMono className="text-[var(--ink-faint)] tracking-[0.04em]">
                        MARKET DATA
                    </DataMono>
                </div>

                {/* Price headline */}
                <div className="mt-10 grid items-end gap-x-8 gap-y-5 lg:grid-cols-[minmax(300px,max-content)_minmax(180px,240px)_minmax(260px,1fr)]">
                    <div className="min-w-0">
                        <Label>CATCH / USD</Label>
                        <Display as="div" className="mt-2 text-[clamp(3rem,8vw,6rem)]">
                            {price !== undefined ? formatUsd(price, 4) : '—'}
                        </Display>
                        {priceAvax !== undefined ? (
                            <DataMono className="mt-2 block text-[0.82rem] tracking-[0.04em] text-[var(--ink-muted)]">
                                ≈ {priceAvax.toLocaleString('en-US', { maximumFractionDigits: 6 })} AVAX
                                <span className="ml-2 text-[var(--ink-faint)]">· AVAX {formatUsd(avaxUsd, 2)}</span>
                            </DataMono>
                        ) : null}
                    </div>
                    <div className="flex min-w-[180px] flex-col gap-3 pb-1 lg:justify-self-center lg:pb-3">
                        <DataMono className={isUp ? 'v2-up text-[1.2rem]' : 'v2-down text-[1.2rem]'}>
                            {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}% <span className="text-[var(--ink-faint)] text-[0.8rem] ml-1">24h</span>
                        </DataMono>
                        <Sparkline values={spark} width={140} height={28} color={isUp ? 'var(--data-up)' : 'var(--data-down)'} />
                    </div>
                    {canComparePremium ? (
                        <div className="flex min-w-0 flex-col gap-1 pb-1 lg:justify-self-end lg:pb-3 lg:text-right">
                            <span
                                className={`inline-flex self-start items-center gap-2 rounded-full px-3 py-1 text-[0.78rem] font-semibold lg:self-end ${
                                    atPar
                                        ? 'border border-[var(--border)] text-[var(--ink-muted)]'
                                        : isPremium
                                            ? 'border border-[var(--data-up)]/40 bg-[var(--data-up)]/10 v2-up'
                                            : 'border border-[var(--data-down)]/40 bg-[var(--data-down)]/10 v2-down'
                                }`}
                            >
                                {atPar
                                    ? 'vs NAV ≈ at par'
                                    : `vs NAV ${isPremium ? '▲ +' : '▼ '}${Math.abs(premiumPct).toFixed(1)}% · ${isPremium ? 'premium' : 'discount'}`}
                            </span>
                            <DataMono className="text-[0.7rem] text-[var(--ink-faint)]">
                                Market {formatUsd(price, 4)} · Ref NAV {formatUsd(refNavUsd, 4)}
                            </DataMono>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

/* ── 1b. Overview KPI cards ───────────────────────────── */

function OverviewCards() {
    const holder = useHolderDashboard();
    const market = useCatchMarketData();
    const portfolio = useFujiPortfolioPositions();

    const navUsd = holder.raw.navPerToken !== undefined ? Number(formatUnits(holder.raw.navPerToken, 6)) : undefined;
    const totalSupplyNum = Number(holder.labels.totalSupply.replace(/[^0-9.]/g, '')) || 0;
    const marketCapNav = navUsd !== undefined ? totalSupplyNum * navUsd : undefined;

    const liquidTreasuryUsd = Number(holder.labels.liquidTreasury.replace(/[^0-9.]/g, '')) || 0;
    const cardPortfolioUsd = Number(portfolio.proofSummary.onchainCurrentMarkLabel.replace(/[^0-9.]/g, '')) || 0;
    const totalTreasury = liquidTreasuryUsd + cardPortfolioUsd;

    const volumeSum = (market.lfj.volume24hUsd ?? 0) + (market.pharaoh.volume24hUsd ?? 0);

    const fmtUsd0 = (n?: number) => n !== undefined ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—';

    const cards = [
        {
            label: 'Market cap',
            value: fmtUsd0(marketCapNav),
            detail: `${totalSupplyNum.toLocaleString('en-US', { maximumFractionDigits: 0 })} CATCH · NAV ${holder.labels.navPerToken}`,
        },
        {
            label: 'Treasury',
            value: fmtUsd0(totalTreasury),
            detail: `Liquid ${holder.labels.liquidTreasury} · Cards ${portfolio.proofSummary.onchainCurrentMarkLabel}`,
        },
        {
            label: '24h volume',
            value: fmtUsd0(volumeSum),
            detail: 'LFJ + Pharaoh combined',
        },
    ];

    return (
        <section className="px-4 pt-4 pb-8">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <div className="grid gap-4 md:grid-cols-3">
                    {cards.map((c) => (
                        <div
                            key={c.label}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 transition-colors hover:border-[var(--border-strong)]"
                        >
                            <Caption className="block text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                                {c.label}
                            </Caption>
                            <div className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.02em] leading-none text-[var(--text-primary)] tabular-nums">
                                {c.value}
                            </div>
                            <div className="mt-3 text-[0.78rem] leading-[1.5] text-[var(--ink-faint)]">
                                {c.detail}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ── 1c. Composition donut ────────────────────────────── */

function CompositionDonut() {
    const holder = useHolderDashboard();
    const market = useCatchMarketData();
    const portfolio = useFujiPortfolioPositions();

    const liquidTreasuryUsd = Number(holder.labels.liquidTreasury.replace(/[^0-9.]/g, '')) || 0;
    const cardPortfolioUsd = Number(portfolio.proofSummary.onchainCurrentMarkLabel.replace(/[^0-9.]/g, '')) || 0;
    const dexLiquidity = (market.lfj.liquidityUsd ?? 0) + (market.pharaoh.liquidityUsd ?? 0);

    const slices = [
        { label: 'Liquid treasury', value: liquidTreasuryUsd, color: 'var(--accent)' },
        { label: 'Card portfolio', value: cardPortfolioUsd, color: 'var(--accent-blue)' },
        { label: 'DEX liquidity', value: dexLiquidity, color: 'var(--accent-green)' },
    ];

    const total = slices.reduce((s, x) => s + x.value, 0) || 1;

    // SVG donut math
    const R = 70;
    const r = 48;
    const cx = 90;
    const cy = 90;
    let angle = -Math.PI / 2; // start at 12 o'clock

    const paths = slices.map((slice) => {
        const sliceAngle = (slice.value / total) * Math.PI * 2;
        const a0 = angle;
        const a1 = angle + sliceAngle;
        angle = a1;

        const x0 = cx + R * Math.cos(a0);
        const y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1);
        const y1 = cy + R * Math.sin(a1);

        const xi0 = cx + r * Math.cos(a0);
        const yi0 = cy + r * Math.sin(a0);
        const xi1 = cx + r * Math.cos(a1);
        const yi1 = cy + r * Math.sin(a1);

        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const d = [
            `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
            `A ${R} ${R} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
            `L ${xi1.toFixed(2)} ${yi1.toFixed(2)}`,
            `A ${r} ${r} 0 ${largeArc} 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)}`,
            'Z',
        ].join(' ');
        return { d, color: slice.color, pct: (slice.value / total) * 100, label: slice.label, value: slice.value };
    });

    // Flow-to-holders metrics — live alongside the composition donut
    const flowRows = [
        {
            label: 'Lifetime profit deposited',
            detail: 'AVAX sent to the holder distributor since launch',
            value: holder.labels.totalProfitDeposited,
        },
        {
            label: 'Pending holder distribution',
            detail: 'Accrued but not yet claimed by holders',
            value: holder.labels.holderDistributionAccrued,
        },
    ];

    return (
        <section className="px-4 pb-12">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <SectionLabel>Protocol composition</SectionLabel>
                <Hairline className="mt-4" />
                <div className="mt-6 grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)] md:items-start">
                    <div className="flex justify-center md:justify-start lg:items-center">
                        <svg viewBox="0 0 180 180" width="180" height="180" aria-hidden>
                            {paths.map((p, i) => (
                                <path key={i} d={p.d} fill={p.color} stroke="var(--bg-primary)" strokeWidth="1.2" />
                            ))}
                            <text
                                x={cx}
                                y={cy - 6}
                                textAnchor="middle"
                                className="v2-mono fill-[var(--ink-muted)]"
                                style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            >
                                Total
                            </text>
                            <text
                                x={cx}
                                y={cy + 12}
                                textAnchor="middle"
                                className="fill-[var(--text-primary)]"
                                style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}
                            >
                                ${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </text>
                        </svg>
                    </div>
                    <ul className="flex flex-col gap-2">
                        {paths.map((p) => (
                            <li
                                key={p.label}
                                className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-3 last:border-b-0"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="inline-block h-3 w-3 rounded-full"
                                        style={{ background: p.color }}
                                        aria-hidden
                                    />
                                    <span className="text-[0.95rem] text-[var(--text-primary)]">{p.label}</span>
                                </div>
                                <div className="flex items-baseline gap-4 v2-mono tabular-nums">
                                    <span className="text-[0.95rem] font-semibold text-[var(--text-primary)]">
                                        ${p.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                    </span>
                                    <span className="text-[0.78rem] text-[var(--ink-faint)]">
                                        {p.pct.toFixed(1)}%
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-col">
                        {flowRows.map((row) => <StatRowItem key={row.label} row={row} />)}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ── 2. Protocol stats ─────────────────────────────────── */

/**
 * A single stat row inside a Protocol Accounting group.
 * Renders: metric label (small bold) + description caption + big bold value
 * + optional inline ratio bar + optional trailing pct/hint.
 */
type StatRow = {
    label: string;
    detail: string;
    value: string;
    /** 0-100. If set, renders a thin ratio bar under the description */
    ratioPct?: number;
    /** Optional short hint displayed below the value (e.g. "6.2% of total") */
    hint?: string;
    /** Color tint for hint: neutral | up | down */
    hintTone?: 'neutral' | 'up' | 'down';
};

function StatRowItem({ row }: { row: StatRow }) {
    const hintClass =
        row.hintTone === 'up' ? 'v2-up'
            : row.hintTone === 'down' ? 'v2-down'
                : 'text-[var(--ink-faint)]';
    return (
        <div className="grid gap-4 border-b border-[var(--rule)] py-5 items-center md:grid-cols-[1fr_auto] md:gap-8 last:border-b-0">
            <div className="min-w-0">
                <div className="text-[0.82rem] font-semibold text-[var(--text-primary)]">{row.label}</div>
                <div className="mt-1 text-[0.78rem] text-[var(--ink-faint)]">{row.detail}</div>
                {row.ratioPct !== undefined ? (
                    <div className="mt-3 flex items-center gap-3 max-w-[320px]">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.min(100, Math.max(0, row.ratioPct))}%`,
                                    background: 'linear-gradient(90deg, var(--accent), var(--accent-blue))',
                                }}
                            />
                        </div>
                        <DataMono className="text-[0.7rem] tabular-nums text-[var(--ink-muted)]">
                            {row.ratioPct.toFixed(1)}%
                        </DataMono>
                    </div>
                ) : null}
            </div>
            <div className="text-right md:min-w-[180px]">
                <DataMono className="block text-[1.15rem] font-bold tracking-[-0.01em] tabular-nums text-[var(--text-primary)]">
                    {row.value}
                </DataMono>
                {row.hint ? (
                    <div className={`mt-1 text-[0.72rem] font-medium ${hintClass}`}>
                        {row.hint}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function StatGroup({
    title,
    description,
    rows,
    chart,
    hero,
    layout = 'stacked',
    metricCount,
    rightNode,
    rowsColumns = 1,
}: {
    title: string;
    description?: string;
    rows: StatRow[];
    chart?: ReactNode;
    /** Rendered above the chart — intended for big hero visuals (e.g. oversized progress bar) */
    hero?: ReactNode;
    /** `side-by-side` renders the chart on the left and either rows OR rightNode on the right */
    layout?: 'stacked' | 'side-by-side';
    /** Override the "N metric(s)" count when the logical metric count differs from rows.length */
    metricCount?: number;
    /** When set in `side-by-side` layout, replaces the rows column with this node (e.g. a second chart) */
    rightNode?: ReactNode;
    /** Render rows in a multi-column grid (default 1 — single stack). Use 2 for compact side-by-side rows. */
    rowsColumns?: 1 | 2;
}) {
    const count = metricCount ?? rows.length;

    const rowsNode = rows.length > 0 ? (
        <div className={`mt-2 ${rowsColumns === 2 ? 'grid gap-x-8 md:grid-cols-2' : ''}`}>
            {rows.map((row) => <StatRowItem key={row.label} row={row} />)}
        </div>
    ) : null;

    const body = layout === 'side-by-side' && chart ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
            <div className="min-w-0">{chart}</div>
            <div className="min-w-0">{rightNode ?? rowsNode}</div>
        </div>
    ) : (
        <>
            {chart ? <div className="mt-6">{chart}</div> : null}
            {rowsNode}
        </>
    );

    return (
        <section className="mt-8 first:mt-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8">
            <header className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="text-[0.95rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{title}</h3>
                    {description ? (
                        <p className="mt-1 text-[0.78rem] leading-[1.55] text-[var(--ink-muted)]">
                            {description}
                        </p>
                    ) : null}
                </div>
                {count > 0 ? (
                    <DataMono className="shrink-0 text-[0.68rem] tracking-[0.08em] uppercase text-[var(--ink-faint)]">
                        {count} metric{count === 1 ? '' : 's'}
                    </DataMono>
                ) : null}
            </header>
            {hero ? <div className="mt-6">{hero}</div> : null}
            {body}
        </section>
    );
}

function ProtocolStats() {
    const holder = useHolderDashboard();
    const market = useCatchMarketData();
    const portfolio = useFujiPortfolioPositions();
    const avaxUsd = useAvaxPrice();

    // Raw/numeric versions for percentage math
    const navUsd = holder.raw.navPerToken !== undefined ? Number(formatUnits(holder.raw.navPerToken, 6)) : undefined;
    const refNavUsd = holder.raw.referenceNav !== undefined ? Number(formatUnits(holder.raw.referenceNav, 6)) : undefined;
    const totalSupplyNum = Number(holder.labels.totalSupply.replace(/[^0-9.]/g, '')) || 0;
    const eligibleSupplyNum = Number(holder.labels.profitEligibleSupply.replace(/[^0-9.]/g, '')) || 0;
    const eligibleRatio = totalSupplyNum > 0 ? (eligibleSupplyNum / totalSupplyNum) * 100 : undefined;

    const marketCapMark = navUsd !== undefined ? totalSupplyNum * navUsd : undefined;
    const spotCap = market.spotPriceUsd !== undefined ? totalSupplyNum * market.spotPriceUsd : undefined;
    const spotPremiumPct =
        marketCapMark !== undefined && marketCapMark > 0 && spotCap !== undefined
            ? ((spotCap - marketCapMark) / marketCapMark) * 100
            : undefined;

    const liquidTreasuryUsd = Number(holder.labels.liquidTreasury.replace(/[^0-9.]/g, '')) || 0;
    const liquidTreasuryAvax = avaxUsd > 0 ? liquidTreasuryUsd / avaxUsd : undefined;
    const cardPortfolioUsd = Number(portfolio.proofSummary.onchainCurrentMarkLabel.replace(/[^0-9.]/g, '')) || 0;
    const cardCostUsd = Number(portfolio.proofSummary.costBasisLabel.replace(/[^0-9.]/g, '')) || 0;
    const treasurySum = liquidTreasuryUsd + cardPortfolioUsd;
    const liquidPct = treasurySum > 0 ? (liquidTreasuryUsd / treasurySum) * 100 : undefined;
    const portfolioPct = treasurySum > 0 ? (cardPortfolioUsd / treasurySum) * 100 : undefined;
    const portfolioPnlPct =
        cardCostUsd > 0 ? ((cardPortfolioUsd - cardCostUsd) / cardCostUsd) * 100 : undefined;
    const portfolioPnlTone =
        portfolioPnlPct === undefined ? 'neutral' : portfolioPnlPct > 0 ? 'up' : portfolioPnlPct < 0 ? 'down' : 'neutral';

    const fmtUsd = (n?: number) => n !== undefined ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—';

    // Supply is folded into a single hero bar (no row list). metricCount still reads "2".
    const excludedSupplyNum = Math.max(0, totalSupplyNum - eligibleSupplyNum);
    const fmtCatch = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 4 })} CATCH`;
    const supplyPct = eligibleRatio ?? 0;

    const valuation: StatRow[] = [
        {
            label: 'Reference NAV / token',
            detail: 'Sourced from investor accounting',
            value: holder.labels.referenceNav,
        },
        {
            label: 'Current NAV / token',
            detail: 'Latest onchain mark',
            value: holder.labels.navPerToken,
        },
        {
            label: 'Market cap (NAV)',
            detail: 'Total supply × current NAV per token',
            value: fmtUsd(marketCapMark),
        },
        {
            label: 'Market cap (spot)',
            detail: 'Total supply × live DEX spot price',
            value: fmtUsd(spotCap),
            hint:
                spotPremiumPct === undefined
                    ? undefined
                    : `${spotPremiumPct >= 0 ? '▲' : '▼'} ${Math.abs(spotPremiumPct).toFixed(1)}% vs NAV cap`,
            hintTone:
                spotPremiumPct === undefined
                    ? 'neutral'
                    : spotPremiumPct >= 0.5 ? 'up' : spotPremiumPct <= -0.5 ? 'down' : 'neutral',
        },
    ];

    const treasury: StatRow[] = [
        {
            label: 'Liquid treasury',
            detail: liquidTreasuryAvax !== undefined
                ? `${liquidTreasuryAvax.toLocaleString('en-US', { maximumFractionDigits: 2 })} AVAX @ ${formatUsd(avaxUsd, 2)} · wrapped in stable accounting`
                : 'AVAX-denominated, wrapped in stable accounting',
            value: holder.labels.liquidTreasury,
            ratioPct: liquidPct,
            hint: liquidPct !== undefined ? `${liquidPct.toFixed(1)}% of total protocol value` : undefined,
        },
        {
            label: 'Card portfolio (mark)',
            detail: `${portfolio.positions.length} lot${portfolio.positions.length === 1 ? '' : 's'} custodied by Courtyard on Polygon`,
            value: portfolio.proofSummary.onchainCurrentMarkLabel,
            ratioPct: portfolioPct,
            hint: portfolioPct !== undefined ? `${portfolioPct.toFixed(1)}% of total protocol value` : undefined,
        },
        {
            label: 'Card portfolio (cost)',
            detail: 'Sum of acquisition prices recorded onchain',
            value: portfolio.proofSummary.costBasisLabel,
            hint:
                portfolioPnlPct === undefined
                    ? undefined
                    : `${portfolioPnlPct >= 0 ? '▲' : '▼'} ${Math.abs(portfolioPnlPct).toFixed(1)}% unrealized vs mark`,
            hintTone: portfolioPnlTone,
        },
    ];

    /* ── Visuals ──────────────────────────────────────────────
     * Each group is a single card via StatGroup. Chart content is passed raw —
     * the outer card chrome + title + description live on the group itself.
     *
     * Supply    — big progress bar (hero) + 7-bucket tokenomics donut (chart)
     * Valuation — comparison bars (chart) + 4 precise rows (rows)
     * Treasury  — composition segmented bar (chart, left) + 3 rows (right)
     * Markets   — venue share split bars (chart) + 4 rows (rows)
     */

    // Inline subsection heading used inside a StatGroup card for the chart region
    const SubHead = ({ title, detail }: { title: string; detail?: string }) => (
        <div className="border-t border-[var(--rule)] pt-5">
            <h4 className="text-[0.78rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{title}</h4>
            {detail ? (
                <p className="mt-1 text-[0.72rem] leading-[1.5] text-[var(--ink-faint)] max-w-[72ch]">{detail}</p>
            ) : null}
        </div>
    );

    // Supply — hero is the /fundraising-style big progress bar
    const supplyHero = (
        <div>
            <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-[var(--bg-tertiary)]">
                <div
                    className="absolute inset-y-0 left-0"
                    style={{
                        width: `${supplyPct}%`,
                        background: 'linear-gradient(90deg, var(--accent), var(--accent-blue))',
                    }}
                />
                <div
                    className="absolute inset-y-0 left-0 flex flex-col justify-center pl-5 z-10"
                    style={{ maxWidth: `${supplyPct}%` }}
                >
                    <Caption
                        className="inline-block self-start rounded-md border border-[var(--border)] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]"
                        style={{ background: 'var(--bg-primary)' }}
                    >
                        Profit-eligible
                    </Caption>
                    <div
                        className="mt-1 inline-block self-start rounded-md border border-[var(--border)] px-2 py-0.5 text-[1.45rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] whitespace-nowrap"
                        style={{ background: 'var(--bg-primary)' }}
                    >
                        {fmtCatch(eligibleSupplyNum)}
                    </div>
                </div>
                {100 - supplyPct >= 15 ? (
                    <div
                        className="absolute inset-y-0 right-0 flex flex-col justify-center pr-5 text-right z-10"
                        style={{ maxWidth: `${Math.max(0, 100 - supplyPct)}%` }}
                    >
                        <Caption className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                            Excluded · treasury · vesting · LP
                        </Caption>
                        <div className="text-[1.45rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] whitespace-nowrap">
                            {fmtCatch(excludedSupplyNum)}
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="mt-3 flex items-baseline justify-between text-[0.78rem] text-[var(--ink-faint)] tabular-nums">
                <span>0</span>
                <span className="text-[1.05rem] font-bold text-[var(--accent)]">{supplyPct.toFixed(1)}%</span>
                <span>{fmtCatch(totalSupplyNum)} total</span>
            </div>
        </div>
    );

    const allocationPalette = [
        '#0ea5e9', '#ef4444', '#6366f1', '#10b981',
        '#f59e0b', '#d946ef', '#8b5cf6',
    ];
    const supplyChart = (
        <div>
            <SubHead
                title="Tokenomics breakdown"
                detail="Fixed 100M $CATCH at full dilution, split across seven buckets. Release timing varies per bucket — nothing dumps at TGE."
            />
            <div className="mt-4 grid gap-6 md:grid-cols-[240px_1fr] md:items-center">
                <DonutChart
                    slices={TOKEN_ALLOCATION.map((b, i) => ({
                        label: b.label,
                        value: b.percent,
                        color: allocationPalette[i % allocationPalette.length],
                    }))}
                    totalLabel="Supply"
                    totalValue="100M"
                    size={220}
                    ariaLabel="Token allocation donut chart"
                />
                <ChartLegend
                    items={TOKEN_ALLOCATION.map((b, i) => ({
                        color: allocationPalette[i % allocationPalette.length],
                        label: b.label,
                        value: `${b.percent}%`,
                    }))}
                />
            </div>
        </div>
    );

    const valuationChart = (
        <div>
            <SubHead
                title="NAV comparison"
                detail="Bars scale to the largest value. All three derive from total supply × the corresponding per-token price."
            />
            <div className="mt-4">
                <ComparisonBars
                    height={200}
                    bars={[
                        {
                            label: 'Reference NAV',
                            value: refNavUsd !== undefined ? totalSupplyNum * refNavUsd : 0,
                            display: refNavUsd !== undefined ? fmtUsd(totalSupplyNum * refNavUsd) : '—',
                            color: 'var(--accent)',
                        },
                        {
                            label: 'Current NAV',
                            value: marketCapMark ?? 0,
                            display: fmtUsd(marketCapMark),
                            color: 'var(--accent-blue)',
                        },
                        {
                            label: 'Spot',
                            value: spotCap ?? 0,
                            display: fmtUsd(spotCap),
                            color: 'var(--accent-green)',
                            hint:
                                spotPremiumPct === undefined
                                    ? undefined
                                    : `${spotPremiumPct >= 0 ? '▲' : '▼'} ${Math.abs(spotPremiumPct).toFixed(1)}% vs NAV`,
                            hintTone:
                                spotPremiumPct === undefined
                                    ? 'neutral'
                                    : spotPremiumPct >= 0.5 ? 'up'
                                        : spotPremiumPct <= -0.5 ? 'down'
                                            : 'neutral',
                        },
                    ]}
                    ariaLabel="NAV comparison bar chart"
                />
            </div>
        </div>
    );

    const lotColors = ['var(--accent)', 'var(--accent-blue)', 'var(--accent-green)', 'var(--accent-red)', '#8b5cf6', '#d946ef', '#f59e0b'];
    const lotSlices = portfolio.positions.map((p, i) => ({
        label: p.title,
        value: Number(formatUnits(p.currentValueUsdt6, 6)),
        color: lotColors[i % lotColors.length],
    }));
    const liquidSlice = liquidTreasuryUsd > 0
        ? [{ label: 'Liquid treasury', value: liquidTreasuryUsd, color: 'var(--ink-faint)' }]
        : [];
    const treasuryChart = (
        <div>
            <SubHead
                title="Composition by lot"
                detail="Each colored slice is a card lot, sized by its current mark. The gray tail is liquid AVAX treasury waiting to be deployed."
            />
            <div className="mt-4 flex flex-col gap-4">
                <SegmentedBar
                    slices={[...lotSlices, ...liquidSlice]}
                    height={20}
                    ariaLabel="Treasury composition by lot"
                />
                <ChartLegend
                    items={[
                        ...lotSlices.map((s) => ({
                            color: s.color,
                            label: s.label,
                            value: `$${s.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
                            pct: treasurySum > 0 ? (s.value / treasurySum) * 100 : 0,
                        })),
                        ...liquidSlice.map((s) => ({
                            color: s.color,
                            label: s.label,
                            value: `$${s.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                            pct: treasurySum > 0 ? (s.value / treasurySum) * 100 : 0,
                        })),
                    ]}
                />
            </div>
        </div>
    );

    // Treasury right-column chart — small comparison bars for Liquid / Mark / Cost
    const treasuryCompareChart = (
        <div>
            <SubHead
                title="Value breakdown"
                detail="Liquid AVAX dominates today; card lots are the productive portion. Cost vs mark shows unrealized P/L."
            />
            <div className="mt-4">
                <ComparisonBars
                    height={120}
                    bars={[
                        {
                            label: 'Liquid',
                            value: liquidTreasuryUsd,
                            display: fmtUsd(liquidTreasuryUsd),
                            color: 'var(--ink-faint)',
                            hint: liquidPct !== undefined ? `${liquidPct.toFixed(1)}% of total` : undefined,
                            hintTone: 'neutral',
                        },
                        {
                            label: 'Cards · mark',
                            value: cardPortfolioUsd,
                            display: fmtUsd(cardPortfolioUsd),
                            color: 'var(--accent-blue)',
                            hint: portfolioPct !== undefined ? `${portfolioPct.toFixed(1)}% of total` : undefined,
                            hintTone: 'neutral',
                        },
                        {
                            label: 'Cards · cost',
                            value: cardCostUsd,
                            display: fmtUsd(cardCostUsd),
                            color: 'var(--accent)',
                            hint:
                                portfolioPnlPct === undefined
                                    ? undefined
                                    : `${portfolioPnlPct >= 0 ? '▲' : '▼'} ${Math.abs(portfolioPnlPct).toFixed(1)}% vs mark`,
                            hintTone: portfolioPnlTone,
                        },
                    ]}
                    ariaLabel="Treasury value breakdown"
                />
            </div>
        </div>
    );

    return (
        <section className="px-4 pt-4 pb-12">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <div className="flex items-baseline justify-between">
                    <SectionLabel>Protocol accounting</SectionLabel>
                    <DataMono className="text-[0.7rem] text-[var(--ink-faint)]">
                        {2 + valuation.length + treasury.length} metrics · 3 groups · 4 charts
                    </DataMono>
                </div>

                {/* Supply + Valuation — two cards side by side on lg, stretched to equal height */}
                <div className="mt-8 grid gap-6 lg:grid-cols-2 items-stretch [&>section]:mt-0 [&>section]:h-full">
                    <StatGroup
                        title="Supply"
                        description="Live minted $CATCH. The gradient portion is held by outside wallets and shares in protocol profits. The remainder is protocol-owned (treasury, vesting, LP) and does not receive distributions."
                        rows={[]}
                        hero={supplyHero}
                        chart={supplyChart}
                        metricCount={2}
                    />
                    <StatGroup
                        title="Valuation"
                        description="Reference NAV is the accounting baseline. Current NAV is the live registry mark. Spot is the DEX-implied market cap. Wide gaps signal premium or discount."
                        rows={valuation}
                        chart={valuationChart}
                    />
                </div>

                <StatGroup
                    title="Treasury"
                    description="Where protocol value sits today: card lots custodied by Courtyard plus liquid AVAX waiting to be deployed."
                    rows={treasury}
                    chart={treasuryChart}
                    layout="side-by-side"
                    rightNode={treasuryCompareChart}
                />
            </div>
        </section>
    );
}

/* ── 3. Account ────────────────────────────────────────── */

function AccountSection() {
    const holder = useHolderDashboard();

    return (
        <section className="px-4 pt-2 pb-10">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                {!holder.isConnected ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8 flex flex-wrap items-center justify-between gap-6">
                        <div className="min-w-0">
                            <SectionLabel>Your position</SectionLabel>
                            <div className="mt-2 text-[1.25rem] md:text-[1.4rem] font-extrabold tracking-[-0.01em] text-[var(--text-primary)]">
                                Connect a wallet to see your $CATCH, claimable profit, and live P/L.
                            </div>
                            <p className="mt-2 max-w-[60ch] text-[0.82rem] leading-[1.55] text-[var(--ink-muted)]">
                                Read-only — no signatures required. We pull balances, cost basis and claim state from Avalanche directly.
                            </p>
                        </div>
                        <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                                <button
                                    type="button"
                                    onClick={openConnectModal}
                                    className="shrink-0 rounded-full bg-[var(--accent)] px-6 py-3 text-[0.95rem] font-bold tracking-[-0.01em] text-[#0f0e13] hover:bg-[var(--accent-hover)] transition-colors"
                                >
                                    Connect wallet →
                                </button>
                            )}
                        </ConnectButton.Custom>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8">
                        <div className="flex flex-wrap items-baseline justify-between gap-4">
                            <SectionLabel>Your position</SectionLabel>
                            <div className="flex items-center gap-3">
                                <DataMono className="text-[0.78rem] tracking-[0.04em] text-[var(--text-primary)]">
                                    {shortAddr(holder.account)}
                                </DataMono>
                                <DataMono className="text-[0.7rem] tracking-[0.04em] text-[var(--ink-faint)]">
                                    SYNCED
                                </DataMono>
                            </div>
                        </div>

                        <Hairline className="mt-5" />
                        <LedgerRow
                            columns="200px 1fr 240px"
                            cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Your $CATCH</Caption>,
                                <span className="text-[var(--ink-faint)]">Connected wallet balance</span>,
                                <span className="text-right text-[var(--text-primary)]">{holder.labels.catchBalance}</span>,
                            ]}
                        />
                        <LedgerRow
                            columns="200px 1fr 240px"
                            cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Cost basis</Caption>,
                                <span className="text-[var(--ink-faint)]">Remaining investor accounting</span>,
                                <span className="text-right text-[var(--text-primary)]">{holder.labels.remainingCostBasis}</span>,
                            ]}
                        />
                        <LedgerRow
                            columns="200px 1fr 240px"
                            cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Reference value</Caption>,
                                <span className="text-[var(--ink-faint)]">Wallet tokens × NAV</span>,
                                <span className="text-right text-[var(--text-primary)]">{holder.labels.currentReferenceValue}</span>,
                            ]}
                        />
                        <LedgerRow
                            columns="200px 1fr 240px"
                            cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Unrealized P/L</Caption>,
                                <span className="text-[var(--ink-faint)]">Not claimable — mark-to-market</span>,
                                <span className={`text-right ${holder.labels.unrealizedReferencePnl.startsWith('-') ? 'v2-down' : holder.labels.unrealizedReferencePnl.startsWith('+') ? 'v2-up' : 'text-[var(--text-primary)]'}`}>
                                    {holder.labels.unrealizedReferencePnl}
                                </span>,
                            ]}
                        />
                        <LedgerRow
                            columns="200px 1fr 240px"
                            cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Claimable profit</Caption>,
                                <span className="text-[var(--ink-faint)]">Realised sale proceeds only</span>,
                                <span className="text-right text-[var(--text-primary)]">{holder.labels.claimableProfit}</span>,
                            ]}
                        />
                        <LedgerRow
                            columns="200px 1fr 240px"
                            cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Already claimed</Caption>,
                                <span className="text-[var(--ink-faint)]">AVAX distributions to date</span>,
                                <span className="text-right text-[var(--text-primary)]">{holder.labels.claimedProfit}</span>,
                            ]}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}

/* ── 4. Claim row ──────────────────────────────────────── */

function ClaimRow() {
    const holder = useHolderDashboard();
    if (!holder.isConnected) return null;
    const canClaim = holder.claimState.canClaim;

    return (
        <section className="px-4 pt-8 pb-16 border-t border-[var(--rule)]">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))] flex flex-wrap items-baseline gap-6 justify-between">
                <div>
                    <SectionLabel>Claim status</SectionLabel>
                    <DataMono className="mt-2 block text-[1.05rem] text-[var(--text-primary)]">
                        {canClaim ? 'READY' : 'LOCKED'} · {holder.labels.claimableProfit}
                    </DataMono>
                    <p className="mt-2 max-w-[56ch] text-[0.82rem] leading-[1.6] text-[var(--ink-muted)]">
                        {holder.claimState.reason}
                    </p>
                </div>
                <span
                    aria-disabled
                    className={`v2-mono text-[0.92rem] tracking-[0.05em] ${canClaim ? 'text-[var(--accent-brass)]' : 'text-[var(--ink-faint)] cursor-not-allowed'}`}
                >
                    {canClaim ? '→ Claim AVAX (disabled on the public site — use the admin flow)' : '◯ Claim disabled'}
                </span>
            </div>
        </section>
    );
}

/* ── 5. Liquidity table ────────────────────────────────── */

function PoolRow({ pool }: { pool: MarketPool }) {
    const isUp = (pool.priceChange24h ?? 0) >= 0;
    return (
        <LedgerRow
            columns="120px 140px 1fr 160px 160px 120px 80px"
            cellAlign={['left', 'left', 'left', 'right', 'right', 'right', 'right']}
            cells={[
                <span className="text-[var(--text-primary)]">{pool.venue}</span>,
                <DataMono className="text-[var(--ink-faint)]">{shortAddr(pool.pairAddress)}</DataMono>,
                <span className="text-[var(--ink-faint)]">{pool.quoteToken ?? '—'}</span>,
                <span className="text-[var(--text-primary)]">
                    {pool.status === 'available' ? formatUsd(pool.liquidityUsd) : (fallbackLiq(pool) ?? '—')}
                </span>,
                <span className="text-[var(--text-primary)]">
                    {pool.volume24hUsd !== undefined ? formatUsd(pool.volume24hUsd) : '—'}
                </span>,
                <span className={isUp ? 'v2-up' : 'v2-down'}>
                    {pool.priceChange24h !== undefined ? `${isUp ? '▲' : '▼'} ${Math.abs(pool.priceChange24h).toFixed(2)}%` : '—'}
                </span>,
                pool.url ? (
                    <a href={pool.url} target="_blank" rel="noreferrer" className="v2-mono text-[var(--accent-brass)] hover:text-[var(--text-primary)]">
                        [pool]
                    </a>
                ) : (
                    <span className="text-[var(--ink-faint)]">—</span>
                ),
            ]}
        />
    );
}

type VenueTab = 'all' | 'lfj' | 'pharaoh';

function LiquiditySection() {
    const market = useCatchMarketData();
    const holder = useHolderDashboard();
    const round = useFujiRoundState();
    const [tab, setTab] = useState<VenueTab>('all');

    const lfj = market.lfj;
    const pharaoh = market.pharaoh;

    // Aggregate view for "All"
    const combined = {
        liquidityUsd: (lfj.liquidityUsd ?? 0) + (pharaoh.liquidityUsd ?? 0),
        volume24hUsd: (lfj.volume24hUsd ?? 0) + (pharaoh.volume24hUsd ?? 0),
        priceUsd: lfj.priceUsd ?? pharaoh.priceUsd,
        priceChange24h: lfj.priceChange24h ?? pharaoh.priceChange24h,
    };

    const active = tab === 'lfj' ? lfj : tab === 'pharaoh' ? pharaoh : null;
    const viewLiq = active ? (active.liquidityUsd ?? 0) : combined.liquidityUsd;
    const viewVol = active ? (active.volume24hUsd ?? 0) : combined.volume24hUsd;
    const viewPrice = active ? active.priceUsd : combined.priceUsd;
    const viewChange = active ? active.priceChange24h ?? 0 : combined.priceChange24h ?? 0;
    const viewUp = viewChange >= 0;

    const tabs: { id: VenueTab; label: string }[] = [
        { id: 'all', label: 'All venues' },
        { id: 'lfj', label: 'LFJ' },
        { id: 'pharaoh', label: 'Pharaoh' },
    ];

    // Shares for the venue-split chart
    const lfjLiq = lfj.liquidityUsd ?? 0;
    const pharaohLiq = pharaoh.liquidityUsd ?? 0;
    const lfjVol = lfj.volume24hUsd ?? 0;
    const pharaohVol = pharaoh.volume24hUsd ?? 0;
    const liquiditySum = lfjLiq + pharaohLiq;
    const volumeSum = lfjVol + pharaohVol;
    const fmtUsd0 = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

    return (
        <section className="px-4 pt-8 pb-24">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <div className="flex items-baseline justify-between">
                    <SectionLabel>Markets</SectionLabel>
                    <DataMono className="text-[0.7rem] text-[var(--ink-faint)]">
                        {market.fetchedAt ? `UPDATED ${new Date(market.fetchedAt).toLocaleTimeString('en-US')}` : 'LOADING'}
                    </DataMono>
                </div>

                <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 md:p-8">
                    <header className="flex items-baseline justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="text-[0.95rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                                Liquidity &amp; venues
                            </h3>
                            <p className="mt-1 text-[0.78rem] leading-[1.55] text-[var(--ink-muted)]">
                                How $CATCH trades across the two DEX venues — combined depth, 24h flow, and cumulative AVAX routed to holders since launch. Switch tabs to drill into a single pool.
                            </p>
                        </div>
                        <DataMono className="shrink-0 text-[0.68rem] tracking-[0.08em] uppercase text-[var(--ink-faint)]">
                            9 metrics
                        </DataMono>
                    </header>

                    {/* Pill tabs */}
                    <div className="mt-5 flex flex-wrap gap-2">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={`rounded-full px-4 py-1.5 text-[0.82rem] font-medium tracking-[-0.01em] transition-colors ${
                                    tab === t.id
                                        ? 'bg-[var(--accent)] text-[#0f0e13]'
                                        : 'border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* KPI cards — reflect selected venue or aggregate */}
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5">
                            <Caption className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                                Spot price
                            </Caption>
                            <div className="mt-2 text-[1.4rem] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">
                                {viewPrice !== undefined ? formatUsd(viewPrice, 4) : '—'}
                            </div>
                            <DataMono className="mt-1 text-[0.72rem] text-[var(--ink-faint)]">
                                CATCH / USD
                            </DataMono>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5">
                            <Caption className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                                Liquidity
                            </Caption>
                            <div className="mt-2 text-[1.4rem] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">
                                {formatUsd(viewLiq, 0)}
                            </div>
                            <DataMono className="mt-1 text-[0.72rem] text-[var(--ink-faint)]">
                                Pool TVL
                            </DataMono>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5">
                            <Caption className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                                24h volume
                            </Caption>
                            <div className="mt-2 text-[1.4rem] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">
                                {formatUsd(viewVol, 0)}
                            </div>
                            <DataMono className="mt-1 text-[0.72rem] text-[var(--ink-faint)]">
                                Cross-venue trade flow
                            </DataMono>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-5">
                            <Caption className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                                24h change
                            </Caption>
                            <div className={`mt-2 text-[1.4rem] font-extrabold tracking-[-0.02em] tabular-nums ${viewUp ? 'v2-up' : 'v2-down'}`}>
                                {viewUp ? '▲' : '▼'} {Math.abs(viewChange).toFixed(2)}%
                            </div>
                            <DataMono className="mt-1 text-[0.72rem] text-[var(--ink-faint)]">
                                Price momentum
                            </DataMono>
                        </div>
                    </div>

                    {/* Venue share — pool liquidity + 24h volume split */}
                    <div className="mt-8 border-t border-[var(--rule)] pt-5">
                        <h4 className="text-[0.78rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Venue share</h4>
                        <p className="mt-1 text-[0.72rem] leading-[1.5] text-[var(--ink-faint)]">
                            Shallow depth on either side increases slippage — this is where to top up.
                        </p>
                        <div className="mt-4 grid gap-6 md:grid-cols-2">
                            <div>
                                <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                                    Pool liquidity
                                </div>
                                <div className="mt-3 flex flex-col gap-3">
                                    <SegmentedBar
                                        slices={[
                                            { label: 'LFJ', value: lfjLiq, color: 'var(--accent)' },
                                            { label: 'Pharaoh', value: pharaohLiq, color: 'var(--accent-blue)' },
                                        ]}
                                        ariaLabel="Pool liquidity split"
                                    />
                                    <ChartLegend
                                        items={[
                                            { color: 'var(--accent)', label: 'LFJ', value: fmtUsd0(lfjLiq), pct: liquiditySum > 0 ? (lfjLiq / liquiditySum) * 100 : 0 },
                                            { color: 'var(--accent-blue)', label: 'Pharaoh', value: fmtUsd0(pharaohLiq), pct: liquiditySum > 0 ? (pharaohLiq / liquiditySum) * 100 : 0 },
                                        ]}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                                    24h volume
                                </div>
                                <div className="mt-3 flex flex-col gap-3">
                                    <SegmentedBar
                                        slices={[
                                            { label: 'LFJ', value: lfjVol, color: 'var(--accent)' },
                                            { label: 'Pharaoh', value: pharaohVol, color: 'var(--accent-blue)' },
                                        ]}
                                        ariaLabel="24h volume split"
                                    />
                                    <ChartLegend
                                        items={[
                                            { color: 'var(--accent)', label: 'LFJ', value: fmtUsd0(lfjVol), pct: volumeSum > 0 ? (lfjVol / volumeSum) * 100 : 0 },
                                            { color: 'var(--accent-blue)', label: 'Pharaoh', value: fmtUsd0(pharaohVol), pct: volumeSum > 0 ? (pharaohVol / volumeSum) * 100 : 0 },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Capital deployment — big bar showing LP split + buyback rows */}
                    {(() => {
                        const lfjPct = liquiditySum > 0 ? (lfjLiq / liquiditySum) * 100 : 0;
                        const pharaohPct = 100 - lfjPct;
                        // Round 2 LP allocation: 10% of raised → LP, half of that will be used to market-buy $CATCH
                        // Executes only after the round closes; until then, nothing has been bought.
                        const raisedAvax = Number(formatEther(round.round?.raisedAmount ?? 0n));
                        const roundBuybackAvax = raisedAvax * 0.10 * 0.5;
                        const roundBuybackExecuted = round.isClosed ? roundBuybackAvax : 0;
                        const roundBuybackLabel = `${roundBuybackExecuted.toLocaleString('en-US', { maximumFractionDigits: 4 })} AVAX`;
                        return (
                            <div className="mt-8 border-t border-[var(--rule)] pt-5">
                                <h4 className="text-[0.78rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Capital deployment</h4>
                                <p className="mt-1 text-[0.72rem] leading-[1.5] text-[var(--ink-faint)]">
                                    LP deployed across venues and AVAX earmarked for $CATCH buybacks. LP and buyback reserves accrue onchain and are deployed opportunistically as markets allow.
                                </p>

                                {/* Big progress bar — LFJ vs Pharaoh LP split */}
                                <div className="mt-5">
                                    <div className="relative h-24 w-full overflow-hidden rounded-2xl bg-[var(--bg-tertiary)]">
                                        {/* LFJ fill */}
                                        <div
                                            className="absolute inset-y-0 left-0"
                                            style={{ width: `${lfjPct}%`, background: 'var(--accent)' }}
                                        />
                                        {/* Pharaoh fill */}
                                        <div
                                            className="absolute inset-y-0 right-0"
                                            style={{ width: `${pharaohPct}%`, background: 'var(--accent-blue)' }}
                                        />
                                        {/* LFJ label */}
                                        {lfjPct >= 15 ? (
                                            <div
                                                className="absolute inset-y-0 left-0 flex flex-col justify-center pl-5 z-10"
                                                style={{ maxWidth: `${lfjPct}%` }}
                                            >
                                                <Caption
                                                    className="inline-block self-start rounded-md border border-[var(--border)] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]"
                                                    style={{ background: 'var(--bg-primary)' }}
                                                >
                                                    LFJ
                                                </Caption>
                                                <div
                                                    className="mt-1 inline-block self-start rounded-md border border-[var(--border)] px-2 py-0.5 text-[1.45rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] whitespace-nowrap"
                                                    style={{ background: 'var(--bg-primary)' }}
                                                >
                                                    {fmtUsd0(lfjLiq)}
                                                </div>
                                            </div>
                                        ) : null}
                                        {/* Pharaoh label */}
                                        {pharaohPct >= 15 ? (
                                            <div
                                                className="absolute inset-y-0 right-0 flex flex-col justify-center pr-5 items-end z-10"
                                                style={{ maxWidth: `${pharaohPct}%` }}
                                            >
                                                <Caption
                                                    className="inline-block self-end rounded-md border border-[var(--border)] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]"
                                                    style={{ background: 'var(--bg-primary)' }}
                                                >
                                                    Pharaoh
                                                </Caption>
                                                <div
                                                    className="mt-1 inline-block self-end rounded-md border border-[var(--border)] px-2 py-0.5 text-[1.45rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] whitespace-nowrap"
                                                    style={{ background: 'var(--bg-primary)' }}
                                                >
                                                    {fmtUsd0(pharaohLiq)}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="mt-3 flex items-baseline justify-between text-[0.78rem] text-[var(--ink-faint)] tabular-nums">
                                        <span>LFJ {lfjPct.toFixed(1)}%</span>
                                        <span className="text-[1.05rem] font-bold text-[var(--text-primary)]">
                                            {fmtUsd0(liquiditySum)} <span className="text-[0.78rem] font-medium text-[var(--ink-faint)]">LP deployed</span>
                                        </span>
                                        <span>Pharaoh {pharaohPct.toFixed(1)}%</span>
                                    </div>
                                    <div className="mt-1 text-center text-[0.72rem] text-[var(--ink-faint)]">
                                        + {holder.labels.lpAccrued} AVAX reserve awaiting deployment
                                    </div>
                                </div>

                                {/* Buyback rows */}
                                <div className="mt-6">
                                    <StatRowItem row={{
                                        label: 'Buyback from sale proceeds',
                                        detail: 'AVAX earmarked to buy $CATCH on the open market using realized card-sale proceeds',
                                        value: holder.labels.buybackAccrued,
                                    }} />
                                    <StatRowItem row={{
                                        label: 'Buyback from round proceeds',
                                        detail: round.isClosed
                                            ? '10% of Round 2 proceeds went to LP, split 50/50 across LFJ & Pharaoh — half of each allocation market-bought $CATCH, the other half paired with it as LP'
                                            : `Not executed yet — triggers at Round ${round.round?.roundId ?? 2} close. 10% of proceeds will be reserved for LP, split 50/50 across LFJ & Pharaoh, with half of each allocation market-buying $CATCH.`,
                                        value: roundBuybackLabel,
                                        hint: round.isClosed && roundBuybackExecuted > 0
                                            ? `≈ 5% of ${raisedAvax.toLocaleString('en-US', { maximumFractionDigits: 2 })} AVAX raised`
                                            : undefined,
                                    }} />
                                </div>
                            </div>
                        );
                    })()}

                    {/* Pool table / single-pair detail */}
                    {tab === 'all' ? (
                        <div className="mt-8 overflow-x-auto border-t border-[var(--rule)] pt-5">
                            <div className="min-w-[920px]">
                                <div
                                    className="grid gap-4 py-2 text-[0.64rem] tracking-[0.08em] uppercase text-[var(--ink-faint)] v2-mono border-b border-[var(--rule)]"
                                    style={{ gridTemplateColumns: '120px 140px 1fr 160px 160px 120px 80px' }}
                                >
                                    <span>Venue</span>
                                    <span>Pair</span>
                                    <span>Quote</span>
                                    <span className="text-right">Liquidity</span>
                                    <span className="text-right">24H Vol</span>
                                    <span className="text-right">24H</span>
                                    <span className="text-right">Link</span>
                                </div>
                                <PoolRow pool={lfj} />
                                <PoolRow pool={pharaoh} />
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 flex items-center justify-between border-t border-[var(--rule)] pt-4 text-[0.82rem]">
                            <DataMono className="text-[var(--ink-faint)]">
                                PAIR · <span className="text-[var(--text-primary)]">{shortAddr((active ?? lfj).pairAddress)}</span>
                                {' · '}
                                <span className="text-[var(--text-primary)]">{(active ?? lfj).quoteToken ?? '—'}</span>
                            </DataMono>
                            {(active ?? lfj).url ? (
                                <a
                                    href={(active ?? lfj).url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="v2-mono text-[0.88rem] tracking-[0.03em] text-[var(--accent-brass)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    → Open pool on {tab === 'lfj' ? 'LFJ' : 'Pharaoh'}
                                </a>
                            ) : null}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
}

/* ── Export ─────────────────────────────────────────────── */

function HoldersContent() {
    return (
        <main>
            <MarketHeader />
            <AccountSection />
            <ClaimRow />
            <OverviewCards />
            <CompositionDonut />
            <ProtocolStats />
            <LiquiditySection />
        </main>
    );
}

export default function HoldersV2() {
    return (
        <Web3Providers>
            <HoldersContent />
        </Web3Providers>
    );
}
