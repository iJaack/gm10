/**
 * PortfolioV2 — catalog.
 *
 * Scales to 10s (and 100s) of lots. Two modes:
 *   - Grid   (default): compact card grid, 1/2/3 cols responsive, aspect-[3/4] images.
 *   - Ledger:           terminal-style data table with thumbnail, specs, links.
 *
 * Preceded by a breadcrumb + tabular summary strip.
 * Followed by an activity ledger.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Web3Providers } from '../components/Web3Providers';
import {
    Caption,
    DataMono,
    Display,
    Hairline,
    Label,
    LedgerRow,
    SectionLabel,
} from '../components/v2/primitives';
import { useCourtyardProfileNav } from '../hooks/useCourtyardProfileNav';
import { useFujiPortfolioPositions } from '../hooks/useFujiProof';
import type { Gm10PortfolioPosition } from '../hooks/useFujiProof';

/* ── Summary strip ─────────────────────────────────────── */

function SummaryStrip({
    stats,
}: {
    stats: {
        label: string;
        value: string;
        secondaryValue?: string;
        tone?: 'up' | 'down' | 'flat';
    }[];
}) {
    return (
        <div className="grid grid-cols-2 gap-4 py-8 md:grid-cols-4 md:gap-6">
            {stats.map((s) => (
                <div key={s.label} className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4 transition-colors hover:border-[var(--border-strong)]">
                    <Label as="span" className="text-[0.65rem]">{s.label}</Label>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <DataMono className="text-[1.45rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                            {s.value}
                        </DataMono>
                        {s.secondaryValue ? (
                            <DataMono className={`text-[0.86rem] font-bold ${s.tone === 'up' ? 'v2-up' : s.tone === 'down' ? 'v2-down' : 'text-[var(--ink-muted)]'}`}>
                                {s.secondaryValue}
                            </DataMono>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── LotCard — compact grid tile ───────────────────────── */

function LotCard({ position }: { position: Gm10PortfolioPosition }) {
    const lotNumber = String(position.positionId).padStart(2, '0');
    const href = position.courtyardUrl ?? position.snowtraceUrl;
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col border border-[var(--rule)] bg-[var(--bg-secondary)] hover:border-[var(--rule-strong)] transition-colors"
        >
            <div className="relative aspect-[3/4] overflow-hidden bg-[var(--bg-primary)]">
                <img
                    src={position.imageSrc}
                    alt={position.imageAlt}
                    className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                />
                <DataMono className="absolute left-3 top-3 text-[0.64rem] tracking-[0.12em] text-[var(--accent-brass)]">
                    LOT {lotNumber}
                </DataMono>
                <DataMono className="absolute right-3 top-3 text-[0.62rem] tracking-[0.08em] uppercase text-[var(--ink-faint)]">
                    {position.chain}
                </DataMono>
                {position.statusLabel !== 'Active' ? (
                    <DataMono className="absolute left-3 bottom-3 bg-[var(--bg-secondary)] px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.08em] text-[var(--accent-brass)]">
                        {position.statusLabel}
                    </DataMono>
                ) : null}
            </div>

            <div className="flex flex-col gap-3 p-4 border-t border-[var(--rule)]">
                <div>
                    <Display as="div" className="text-[1rem] leading-[1.25] line-clamp-2 text-[var(--text-primary)]">
                        {position.title}
                    </Display>
                    {position.subtitle ? (
                        <p className="mt-1 text-[0.78rem] leading-[1.4] text-[var(--ink-muted)] line-clamp-1">
                            {position.subtitle}
                        </p>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[0.74rem]">
                    <div>
                        <Caption className="block text-[0.6rem] uppercase tracking-[0.08em] text-[var(--ink-faint)]">Cost</Caption>
                        <DataMono className="text-[var(--text-primary)]">{position.acquisition}</DataMono>
                    </div>
                    <div>
                        <Caption className="block text-[0.6rem] uppercase tracking-[0.08em] text-[var(--ink-faint)]">Mark</Caption>
                        <DataMono className="text-[var(--text-primary)]">{position.currentValue}</DataMono>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--rule)] text-[0.7rem]">
                    <DataMono className="text-[var(--ink-faint)]">{position.acquisitionDateLabel}</DataMono>
                    <span className="v2-mono text-[var(--accent-brass)] group-hover:text-[var(--text-primary)] transition-colors">
                        {position.courtyardUrl ? '→ Courtyard' : `→ ${position.chain === 'Polygon' ? 'Polygonscan' : 'Snowtrace'}`}
                    </span>
                </div>
            </div>
        </a>
    );
}

/* ── LotRow — dense ledger row ─────────────────────────── */

function LotRow({ position }: { position: Gm10PortfolioPosition }) {
    const lotNumber = String(position.positionId).padStart(2, '0');
    return (
        <LedgerRow
            columns="48px 64px 1fr 120px 120px 130px 90px 120px 100px"
            align="center"
            cellAlign={['center', 'center', 'left', 'right', 'right', 'left', 'left', 'left', 'right']}
            cells={[
                <DataMono className="text-[0.7rem] text-[var(--accent-brass)] tracking-[0.1em]">
                    {lotNumber}
                </DataMono>,
                <img
                    src={position.imageSrc}
                    alt=""
                    className="h-16 w-16 object-contain"
                    loading="lazy"
                />,
                <div>
                    <div className="text-[0.88rem] font-medium text-[var(--text-primary)] line-clamp-1" style={{ fontFamily: 'var(--font-serif)' }}>
                        {position.title}
                    </div>
                    {position.subtitle ? (
                        <div className="text-[0.72rem] text-[var(--ink-faint)] line-clamp-1">{position.subtitle}</div>
                    ) : null}
                </div>,
                <DataMono className="text-right text-[var(--text-primary)]">{position.acquisition}</DataMono>,
                <DataMono className="text-right text-[var(--text-primary)]">{position.currentValue}</DataMono>,
                <DataMono className={`text-[0.68rem] uppercase ${position.statusLabel === 'PENDING TRANSFER' ? 'text-[var(--accent-brass)]' : 'text-[var(--ink-faint)]'}`}>
                    {position.statusLabel}
                </DataMono>,
                <DataMono className="text-[var(--ink-faint)] uppercase text-[0.7rem]">{position.chain}</DataMono>,
                <DataMono className="text-[var(--ink-faint)] text-[0.7rem]">{position.acquisitionDateLabel}</DataMono>,
                <div className="flex gap-2 justify-end text-[0.72rem]">
                    {position.courtyardUrl ? (
                        <a
                            href={position.courtyardUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="v2-mono text-[var(--accent-brass)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            [courtyard]
                        </a>
                    ) : null}
                    <a
                        href={position.snowtraceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="v2-mono text-[var(--ink-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        [chain]
                    </a>
                </div>,
            ]}
        />
    );
}

/* ── ActivityLedger ────────────────────────────────────── */

function ActivityLedger() {
    const portfolio = useFujiPortfolioPositions();
    const items = portfolio.activity;
    return (
        <section className="px-4 py-20">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <SectionLabel>Activity ledger</SectionLabel>
                <Hairline className="mt-4" />
                {items.length === 0 ? (
                    <div className="py-8 text-[0.86rem] text-[var(--ink-muted)]">
                        No activity recorded yet.
                    </div>
                ) : (
                    <div>
                        <div className="md:hidden divide-y divide-[var(--rule)]">
                            {items.map((item) => (
                                <div key={item.id} className="py-5">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className={item.type === 'Buy' ? 'v2-up v2-mono text-[0.8rem]' : item.type === 'Sell' ? 'v2-down v2-mono text-[0.8rem]' : 'v2-mono text-[0.8rem]'}>
                                            {item.type.toUpperCase()}
                                        </span>
                                        <span className="shrink-0 text-[var(--text-primary)]">{item.amount}</span>
                                    </div>
                                    <div className="mt-2 text-[0.82rem] text-[var(--ink-faint)]">{item.date}</div>
                                    <div className="mt-2 text-[1rem] leading-[1.45] text-[var(--text-primary)]">{item.item}</div>
                                    <div className="mt-1 text-[0.88rem] leading-[1.5] text-[var(--ink-muted)]">{item.detail}</div>
                                </div>
                            ))}
                        </div>
                        <div className="hidden md:block">
                            {items.map((item) => (
                                <LedgerRow
                                    key={item.id}
                                    columns="120px 160px 1fr 200px"
                                    cells={[
                                        <span className={item.type === 'Buy' ? 'v2-up v2-mono text-[0.8rem]' : item.type === 'Sell' ? 'v2-down v2-mono text-[0.8rem]' : 'v2-mono text-[0.8rem]'}>
                                            {item.type.toUpperCase()}
                                        </span>,
                                        <span className="text-[var(--ink-faint)]">{item.date}</span>,
                                        <span>
                                            <span className="text-[var(--text-primary)]">{item.item}</span>
                                            <span className="ml-3 text-[var(--ink-faint)]">{item.detail}</span>
                                        </span>,
                                        <span className="text-right text-[var(--text-primary)]">{item.amount}</span>,
                                    ]}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ── Page ──────────────────────────────────────────────── */

type ViewMode = 'grid' | 'ledger';

function PortfolioContent() {
    const platformNav = useCourtyardProfileNav();
    const portfolio = useFujiPortfolioPositions({
        status: platformNav.status,
        netWorthUsd: platformNav.netWorthUsd,
    });
    const [view, setView] = useState<ViewMode>('grid');

    const summaryStats = [
        { label: 'COST', value: portfolio.proofSummary.costBasisLabel },
        { label: 'MARK-TO-MARKET', value: portfolio.proofSummary.strategyCurrentValueLabel },
        { label: 'CASH FUNDS', value: portfolio.proofSummary.liquidTreasuryLabel },
        {
            label: 'P/L',
            value: portfolio.proofSummary.unrealizedPnlLabel,
            secondaryValue: portfolio.proofSummary.unrealizedPnlPercentLabel,
            tone: portfolio.proofSummary.unrealizedPnlDirection,
        },
    ];

    return (
        <main>
            <section className="px-4 pt-28 md:pt-32 pb-4">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    {/* Breadcrumb */}
                    <div className="flex flex-wrap items-center gap-3 text-[0.7rem]">
                        <DataMono className="text-[var(--ink-faint)] tracking-[0.08em] uppercase">
                            <Link to="/" className="hover:text-[var(--text-primary)]">Gm10</Link>
                            {' · '}
                            <span className="text-[var(--text-primary)]">Portfolio</span>
                            {' · '}
                            <span>Lots {portfolio.positions.length}</span>
                        </DataMono>
                        <DataMono className="text-[0.7rem] text-[var(--ink-faint)] tracking-[0.04em]">
                            SYNCED WITH REGISTRY
                        </DataMono>
                    </div>

                    {/* Title */}
                    <div className="mt-10">
                        <SectionLabel>The collection</SectionLabel>
                        <Display as="h1" className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
                            Collection
                        </Display>
                        <p className="mt-4 text-[0.98rem] leading-[1.7] text-[var(--ink-muted)]">
                            Every lot is a graded card position with custody, provenance, and marks tracked through marketplace records and onchain registry data.
                            Cost basis is the acquisition price. Mark-to-market includes active card marks plus finalized cash funds from settled proceeds.
                        </p>
                    </div>

                    <SummaryStrip stats={summaryStats} />
                </div>
            </section>

            {/* Gallery — Grid or Ledger */}
            <section className="px-4 pt-8 pb-12">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    {/* View toggle + count */}
                    <div className="flex items-center justify-between mb-6">
                        <SectionLabel>Holdings ({portfolio.positions.length})</SectionLabel>
                        <div className="flex items-center gap-3">
                            <Caption className="text-[var(--ink-faint)] uppercase tracking-[0.08em]">View</Caption>
                            <div className="inline-flex items-center rounded-full border border-[var(--border)] p-0.5">
                                {(['grid', 'ledger'] as const).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setView(m)}
                                        className={`v2-mono px-3 py-1 text-[0.72rem] tracking-[0.04em] rounded-full transition-colors ${
                                            view === m
                                                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                                : 'text-[var(--ink-muted)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        {m === 'grid' ? 'Grid' : 'Ledger'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {portfolio.positions.length === 0 ? (
                        <div className="py-16 text-center">
                            <Caption>No lots recorded onchain yet.</Caption>
                        </div>
                    ) : view === 'grid' ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {portfolio.positions.map((position) => (
                                <LotCard key={position.positionId} position={position} />
                            ))}
                        </div>
                    ) : (
                        <div>
                            {/* Column headers */}
                            <div
                                className="hidden md:grid gap-4 items-center py-2 border-b border-[var(--rule-strong)] text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-faint)] v2-mono"
                                style={{ gridTemplateColumns: '48px 64px 1fr 120px 120px 130px 90px 120px 100px' }}
                            >
                                <span>Lot</span>
                                <span />
                                <span>Title</span>
                                <span className="text-right">Cost</span>
                                <span className="text-right">Mark</span>
                                <span>Status</span>
                                <span>Chain</span>
                                <span>Acquired</span>
                                <span className="text-right">Links</span>
                            </div>
                            {portfolio.positions.map((position) => (
                                <LotRow key={position.positionId} position={position} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <ActivityLedger />

            {/* Closer */}
            <section className="px-4 py-12 md:py-14 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <SectionLabel>Continuous sourcing</SectionLabel>
                    <Display as="div" className="mt-4 text-[clamp(1.5rem,3vw,2.2rem)] max-w-[32ch]">
                        More lots will be acquired from strategy capital and continuous commit settlement.
                    </Display>
                    <div className="mt-6 flex flex-wrap gap-6">
                        <Link to="/fundraising" className="v2-mono text-[0.88rem] tracking-[0.05em] text-[var(--accent-brass)] hover:text-[var(--text-primary)]">
                            → Mint new $CATCH
                        </Link>
                        <Link to="/holders" className="v2-mono text-[0.88rem] tracking-[0.05em] text-[var(--ink-muted)] hover:text-[var(--text-primary)]">
                            → Holder dashboard
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default function PortfolioV2() {
    return (
        <Web3Providers>
            <PortfolioContent />
        </Web3Providers>
    );
}
