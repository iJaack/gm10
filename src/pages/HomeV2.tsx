/**
 * HomeV2 — GM10 home, v2 layout + production visuals.
 *
 * Sections:
 *   1. Hero       — pokeball cover + headline + glass body card + round-status tiles
 *   2. Thesis     — pull-quote + signature data point (Pikachu Illustrator)
 *   3. Strategy   — three stacked chapters
 *   4. Holdings   — horizontal marquee of portfolio cards → /portfolio
 */

import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import { Web3Providers } from '../components/Web3Providers';
import {
    DataMono,
    Display,
    DisplayItalic,
    Label,
    SectionLabel,
    Sparkline,
} from '../components/v2/primitives';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { useStrategyCapitalTotals } from '../hooks/useStrategyCapitalTotals';
import { useTheme } from '../hooks/useTheme';
import { FINALIZED_RAISE_ARCHIVE, HOME_GM10_ADVANTAGES, ROUND_2_CLOSE_LEDGER } from '../data/protocol';

/* ─────────────────────────────────────────────── */
/*  1. HERO                                         */
/* ─────────────────────────────────────────────── */

const FALLBACK_ROUND_1_RAISED_AVAX = 500;

function Hero() {
    const round = useFujiRoundState();
    const { theme } = useTheme();
    const archiveRaisedAvax = round.archiveRound ? Number(formatEther(round.archiveRound.raisedAmount)) : FALLBACK_ROUND_1_RAISED_AVAX;
    const roundRaisedAvax = round.roundSource === 'onchain' && round.round
        ? Number(formatEther(round.round.raisedAmount))
        : round.roundSource === 'published'
            ? ROUND_2_CLOSE_LEDGER.raisedAvax
            : 0;
    const strategyCapital = useStrategyCapitalTotals(round);
    const priorMonthRaisedAvax = archiveRaisedAvax + roundRaisedAvax;
    const momRaisedAvaxPercent = priorMonthRaisedAvax > 0
        ? (strategyCapital.continuousRaisedAvax / priorMonthRaisedAvax) * 100
        : 0;
    const totalRaisedLabel = `${strategyCapital.totalRaisedAvax.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    })} AVAX`;
    const totalRaisedUsdLabel = `~$${strategyCapital.totalCommitmentUsd.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
    const momRaisedAvaxLabel = `+${momRaisedAvaxPercent.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })}% MoM in AVAX`;

    const onPhoto = {
        primary: theme === 'dark' ? '#ffffff' : '#0f0e0a',
        secondary: theme === 'dark' ? 'rgba(255,255,255,0.86)' : 'rgba(15,14,10,0.82)',
        muted: theme === 'dark' ? 'rgba(255,255,255,0.62)' : 'rgba(15,14,10,0.56)',
        shadow: theme === 'dark'
            ? '0 1px 4px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)'
            : '0 1px 4px rgba(255,255,255,1), 0 0 16px rgba(255,255,255,0.95), 0 0 40px rgba(255,255,255,0.75)',
    };

    return (
        <section className="relative overflow-hidden px-4 pb-14 pt-16 sm:pt-20 md:pb-20 md:pt-24">
            <div className="absolute inset-0 z-0">
                <img
                    src={theme === 'dark' ? '/brand/cover-pokeball-night.webp' : '/brand/cover-pokeball.webp'}
                    alt=""
                    aria-hidden
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover object-center"
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background: theme === 'dark'
                            ? 'linear-gradient(120deg, rgba(11,10,20,0.72) 0%, rgba(11,10,20,0.44) 48%, rgba(11,10,20,0.18) 100%)'
                            : 'linear-gradient(120deg, rgba(250,247,240,0.70) 0%, rgba(250,247,240,0.42) 48%, rgba(250,247,240,0.16) 100%)',
                    }}
                />
            </div>

            <div className="relative z-10 mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <div className="max-w-[44rem] lg:max-w-none">
                    <div className="label-font" style={{ color: onPhoto.muted }}>
                        Onchain collectible exposure
                    </div>
                    <h1
                        className="mt-5 max-w-[18ch] lg:max-w-none text-[2.9rem] font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-[3.5rem] lg:text-[4.35rem]"
                        style={{ color: onPhoto.primary, textShadow: onPhoto.shadow }}
                    >
                        Exposure to the 'mons you can't $CATCH alone.
                    </h1>
                    <div
                        className="mt-6 max-w-[38rem] lg:max-w-none rounded-3xl px-5 py-4"
                        style={{
                            background: theme === 'dark' ? 'rgba(11,10,20,0.55)' : 'rgba(255,255,255,0.72)',
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                        }}
                    >
                        <p className="text-[1.08rem] leading-[1.72] sm:text-[1.14rem]" style={{ color: onPhoto.secondary }}>
                            GM10 turns sourcing, diligence, custody, valuation, and exits into one managed onchain strategy, so a single position can track the full portfolio.
                        </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            to="/fundraising"
                            className="pixel-menu-link pixel-menu-link-active"
                        >
                            <span className="pixel-menu-cursor" aria-hidden>↗</span>
                            <span>Mint new $CATCH</span>
                        </Link>
                        <Link
                            to="/portfolio"
                            className="pixel-menu-link"
                        >
                            <span className="pixel-menu-cursor" aria-hidden>↗</span>
                            <span>View the Portfolio</span>
                        </Link>
                    </div>

                    {/* Continuous capital callout */}
                    <div className="mt-6 max-w-[42rem] lg:max-w-[42%]">
                        <div
                            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/85 backdrop-blur-sm px-5 py-4"
                        >
                            <div className="label-font">
                                Strategy capital
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                                <div className="text-[1.65rem] font-extrabold leading-tight tracking-[-0.035em] text-[var(--text-primary)]">
                                    {totalRaisedLabel}
                                </div>
                                <DataMono className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/45 px-2 py-1 text-[0.76rem] font-semibold tracking-[0.02em] text-[var(--data-up)]">
                                    {momRaisedAvaxLabel}
                                </DataMono>
                            </div>
                            <div className="mt-1 text-[0.9rem] text-[var(--text-secondary)]">
                                {totalRaisedUsdLabel} commit-time USD value across recorded rounds, including live continuous commits.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────── */
/*  2. THESIS — signature data point                */
/* ─────────────────────────────────────────────── */

// Synthetic sparkline for the record. Historical peak sale prices
// (rough shape — not meant as precise data).
const PEAK_SALE_HISTORY = [55000, 90000, 195000, 370000, 900000, 5_275_000, 6_900_000, 16_500_000];

function Thesis() {
    return (
        <section className="px-4 py-16 md:py-20 border-t border-[var(--rule)]">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <SectionLabel>The thesis</SectionLabel>
                <blockquote className="mt-8">
                    <Display as="p" className="text-[clamp(2.4rem,5.5vw,4rem)] max-w-[20ch] md:max-w-none">
                        Trophy-tier Pokémon cards already trade like a
                        {' '}<DisplayItalic>serious alternative asset class.</DisplayItalic>
                    </Display>
                </blockquote>

                <div className="mt-16 grid gap-12 md:grid-cols-[0.5fr_0.5fr_1fr] md:items-end">
                    <div className="flex justify-center md:justify-start">
                        <img
                            src="/brand/evidence-bg.webp"
                            alt="1998 PM Japanese Promo Pikachu Illustrator Holo, PSA 10 GEM MT, cert 22220188"
                            className="block w-full max-w-[260px] h-auto"
                        />
                    </div>
                    <div>
                        <SectionLabel>Record public sale</SectionLabel>
                        <Display as="div" className="mt-2 text-[clamp(2.5rem,5vw,4rem)]">
                            $16.5M
                        </Display>
                        <div className="mt-3 flex items-center gap-3">
                            <Sparkline values={PEAK_SALE_HISTORY} width={120} height={28} color="var(--accent-brass)" />
                            <DataMono className="text-[0.7rem] tracking-[0.04em] text-[var(--data-up)]">
                                ▲ 30,000× · 15yr
                            </DataMono>
                        </div>
                    </div>
                    <div className="max-w-[48ch]">
                        <p className="text-[1.05rem] leading-[1.7] text-[var(--text-primary)]">
                            <DisplayItalic className="text-[1.2rem]">Pikachu Illustrator PSA 10.</DisplayItalic>{' '}
                            Goldin Auctions, February 2026. Logan Paul sold it to AJ Scaramucci.
                            The top of the grade curve has its own pricing.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                            <DataMono className="text-[0.74rem] tracking-[0.05em] text-[var(--ink-faint)]">
                                <Label as="span" className="mr-2 inline">SALE</Label>
                                $16,492,000
                            </DataMono>
                            <DataMono className="text-[0.74rem] tracking-[0.05em] text-[var(--ink-faint)]">
                                <Label as="span" className="mr-2 inline">DATE</Label>
                                16 FEB 2026
                            </DataMono>
                            <DataMono className="text-[0.74rem] tracking-[0.05em] text-[var(--ink-faint)]">
                                <Label as="span" className="mr-2 inline">VENUE</Label>
                                GOLDIN AUCTIONS
                            </DataMono>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────── */
/*  3. STRATEGY — stacked editorial chapters        */
/* ─────────────────────────────────────────────── */

/**
 * Illustrative PSA 10 Base Set Charizard index, approximate public comps 2005 → 2025.
 * Not authoritative — rough shape based on publicly reported auction history.
 */
const CAGR_INDEX: Array<{ year: number; usd: number }> = [
    { year: 2005, usd: 600 },
    { year: 2008, usd: 1200 },
    { year: 2010, usd: 2000 },
    { year: 2012, usd: 3500 },
    { year: 2014, usd: 6000 },
    { year: 2016, usd: 14000 },
    { year: 2018, usd: 40000 },
    { year: 2019, usd: 80000 },
    { year: 2020, usd: 220000 },
    { year: 2021, usd: 420000 },
    { year: 2022, usd: 360000 },
    { year: 2023, usd: 280000 },
    { year: 2024, usd: 340000 },
    { year: 2025, usd: 420000 },
];

function CagrChart() {
    const W = 640;
    const H = 220;
    const pad = { l: 24, r: 24, t: 12, b: 24 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const yrs = CAGR_INDEX.map((d) => d.year);
    const yMin = Math.log10(Math.min(...CAGR_INDEX.map((d) => d.usd)));
    const yMax = Math.log10(Math.max(...CAGR_INDEX.map((d) => d.usd)));
    const yRange = yMax - yMin || 1;
    const xAt = (year: number) => pad.l + ((year - yrs[0]) / (yrs[yrs.length - 1] - yrs[0])) * plotW;
    const yAt = (usd: number) => pad.t + plotH - ((Math.log10(usd) - yMin) / yRange) * plotH;

    const points = CAGR_INDEX.map((d) => `${xAt(d.year).toFixed(2)},${yAt(d.usd).toFixed(2)}`).join(' ');
    const firstX = xAt(yrs[0]).toFixed(2);
    const lastX = xAt(yrs[yrs.length - 1]).toFixed(2);
    const baseY = (pad.t + plotH).toFixed(2);
    const lineSegments = CAGR_INDEX.map((d) => `L ${xAt(d.year).toFixed(2)},${yAt(d.usd).toFixed(2)}`).join(' ');
    const areaPath = `M ${firstX},${baseY} ${lineSegments} L ${lastX},${baseY} Z`;

    return (
        <div className="relative w-full max-w-[720px]">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden>
                <defs>
                    <linearGradient id="cagr-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Axis years */}
                {[2005, 2010, 2015, 2020, 2025].map((y) => (
                    <text
                        key={y}
                        x={xAt(y)}
                        y={H - 4}
                        textAnchor="middle"
                        className="fill-[var(--text-tertiary)]"
                        style={{ fontSize: 10, fontFamily: 'var(--font-sans)' }}
                    >
                        {y}
                    </text>
                ))}
                {/* Area under the curve */}
                <path d={areaPath} fill="url(#cagr-fill)" />
                {/* The curve */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Endpoint dot */}
                <circle cx={xAt(yrs[yrs.length - 1])} cy={yAt(CAGR_INDEX[CAGR_INDEX.length - 1].usd)} r="3.5" fill="var(--accent)" />
            </svg>
        </div>
    );
}

function StrategyChapters() {
    // Compute compound annual growth rate 2005 → 2025 (log scale, y-axis shows log growth visually).
    const first = CAGR_INDEX[0];
    const last = CAGR_INDEX[CAGR_INDEX.length - 1];
    const years = last.year - first.year;
    const cagr = (Math.pow(last.usd / first.usd, 1 / years) - 1) * 100;

    return (
        <section className="px-4 py-12 md:py-16 border-t border-[var(--rule)]">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <SectionLabel>The track record</SectionLabel>
                <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                    {/* Left: headline + chart */}
                    <div>
                        <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold tracking-[-0.035em] leading-[1.1] text-[var(--text-primary)] max-w-[22ch]">
                            Top-grade Pokémon cards have compounded at {cagr.toFixed(0)}% a year.
                        </h2>
                        <p className="mt-3 max-w-[52ch] text-[0.95rem] leading-[1.6] text-[var(--ink-muted)]">
                            Illustrative public comps for PSA 10 Base Set Charizard, 2005–2025. Volatile year to year, but the ceiling keeps moving — and GM10 concentrates on the part of the market where it moves most.
                        </p>
                        <div className="mt-6">
                            <CagrChart />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                            <DataMono className="text-[0.72rem] tracking-[0.04em] text-[var(--text-tertiary)]">
                                <span className="text-[var(--text-primary)]">CAGR</span>
                                <span className="ml-2">{cagr.toFixed(1)}% · 20yr</span>
                            </DataMono>
                            <DataMono className="text-[0.72rem] tracking-[0.04em] text-[var(--text-tertiary)]">
                                <span className="text-[var(--text-primary)]">2005</span>
                                <span className="ml-2">${first.usd.toLocaleString('en-US')}</span>
                            </DataMono>
                            <DataMono className="text-[0.72rem] tracking-[0.04em] text-[var(--text-tertiary)]">
                                <span className="text-[var(--text-primary)]">2025</span>
                                <span className="ml-2">${last.usd.toLocaleString('en-US')}</span>
                            </DataMono>
                            <DataMono className="text-[0.72rem] tracking-[0.04em] text-[var(--text-tertiary)]">
                                Source: public auction comps (illustrative)
                            </DataMono>
                        </div>
                    </div>

                    {/* Right: the three advantages, compact */}
                    <div className="flex flex-col gap-4 lg:pt-2">
                        <SectionLabel>Why GM10</SectionLabel>
                        {HOME_GM10_ADVANTAGES.map((advantage, idx) => (
                            <div key={advantage.title} className="border-t border-[var(--rule)] pt-4">
                                <div className="flex items-baseline gap-3">
                                    <DataMono className="text-[0.72rem] tracking-[0.1em] text-[var(--accent-brass)]">
                                        {String(idx + 1).padStart(2, '0')}
                                    </DataMono>
                                    <h3 className="text-[1rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                                        {advantage.title}
                                    </h3>
                                </div>
                                <p className="mt-1 text-[0.88rem] leading-[1.55] text-[var(--ink-muted)]">
                                    {advantage.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────── */
/*  4. HOLDINGS MARQUEE                             */
/* ─────────────────────────────────────────────── */

function HoldingsMarquee() {
    const portfolio = useFujiPortfolioPositions();
    if (portfolio.positions.length === 0) {
        return null;
    }
    const lotCount = portfolio.positions.length;
    const lotWord = lotCount === 1 ? 'lot' : 'lots';
    // loop the cards so the marquee scrolls continuously
    const loop = [...portfolio.positions, ...portfolio.positions, ...portfolio.positions];
    return (
        <section className="overflow-hidden border-t border-[var(--rule)] py-16 md:py-20">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))] px-4 mb-8 flex items-center justify-between">
                <div className="max-w-[44rem]">
                    <SectionLabel>Current holdings</SectionLabel>
                    <p className="mt-3 text-[1rem] leading-[1.6] text-[var(--text-primary)]">
                        {lotCount} {lotWord} acquired so far. More will follow as rounds close and cards get greenlit.
                    </p>
                </div>
                <Link to="/portfolio" className="v2-mono text-[0.82rem] tracking-[0.05em] text-[var(--accent-brass)] hover:text-[var(--text-primary)] transition-colors">
                    → View the collection
                </Link>
            </div>

            <div
                className="flex gap-8 whitespace-nowrap"
                style={{ animation: 'v2-marquee 40s linear infinite' }}
                onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = 'paused')}
                onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = 'running')}
            >
                {loop.map((position, i) => (
                    <Link
                        key={`${position.positionId}-${i}`}
                        to="/portfolio"
                        className="group block shrink-0 w-[260px]"
                    >
                        <div className="overflow-hidden rounded-[0.5rem] bg-[var(--bg-secondary)] aspect-[3/4]">
                            <img
                                src={position.imageSrc}
                                alt={position.imageAlt}
                                className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                        </div>
                        <div className="mt-3 px-1">
                            <DataMono className="text-[0.66rem] tracking-[0.08em] text-[var(--ink-faint)]">
                                LOT {String(position.positionId).padStart(2, '0')}
                            </DataMono>
                            <Display as="div" className="mt-1 truncate text-[1rem] text-[var(--text-primary)]">
                                {position.title}
                            </Display>
                            <DataMono className="mt-1 text-[0.72rem] text-[var(--ink-muted)]">
                                {position.acquisition} · {position.chain}
                            </DataMono>
                        </div>
                    </Link>
                ))}
            </div>
            <style>{`
                @keyframes v2-marquee {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-33.333%); }
                }
                @media (prefers-reduced-motion: reduce) {
                    [style*='v2-marquee'] { animation: none !important; }
                }
            `}</style>
        </section>
    );
}

/* ─────────────────────────────────────────────── */
/*  Export                                           */
/* ─────────────────────────────────────────────── */

function HomeContent() {
    return (
        <main>
            <Hero />
            <Thesis />
            <StrategyChapters />
            <HoldingsMarquee />
        </main>
    );
}

export default function HomeV2() {
    return (
        <Web3Providers>
            <HomeContent />
        </Web3Providers>
    );
}
