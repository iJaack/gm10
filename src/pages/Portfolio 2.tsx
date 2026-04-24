import Page from '../components/Page';
import { ScrollReveal } from '../components/ScrollReveal';
import { PixelLabel, PixelMenuLink } from '../components/PixelUI';
import { Web3Providers } from '../components/Web3Providers';
import { PORTFOLIO_PREVIEW, RECENT_CARD_COMPS, SAMPLE_HISTORY, SUPPORT_PAGE_COPY, getRoundPrimaryCtaLabel } from '../data/protocol';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';

function formatAddress(address?: string) {
    if (!address) return 'Pending deployment';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function PortfolioContent() {
    const proofState = useFujiPortfolioPositions();
    const roundState = useFujiRoundState();
    const pageCopy = SUPPORT_PAGE_COPY.portfolio;

    return (
        <Page containerClassName="mx-auto max-w-[min(1440px,calc(100vw-48px))]">

            {/* ── PAGE HEADER ── */}
            <section>
                <ScrollReveal>
                    <div className="label-font">Portfolio</div>
                    <h1 className="mt-4 text-[2.8rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[3.4rem]">
                        {pageCopy.title}
                    </h1>
                    <p className="mt-4 text-[1rem] leading-[1.7] text-[var(--text-secondary)]">
                        {pageCopy.body}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <PixelMenuLink to={pageCopy.primaryCtaTo} active>
                            {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
                        </PixelMenuLink>
                        <PixelMenuLink to={pageCopy.secondaryCtaTo}>Inspect the Proof</PixelMenuLink>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <PixelLabel tone="warning">Target roster</PixelLabel>
                        <PixelLabel tone="live">{proofState.proofSummary.holdingsChipLabel}</PixelLabel>
                    </div>
                </ScrollReveal>

                {/* Stat panels */}
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {[
                        { emoji: '📦', label: 'Positions', value: proofState.collectiblePositionCount },
                        { emoji: '📊', label: 'Marked value', value: proofState.proofSummary.portfolioValueLabel },
                        { emoji: '🧭', label: 'Reference NAV/token', value: proofState.proofSummary.referenceNavLabel },
                        { emoji: '🪙', label: 'Circulating supply', value: proofState.proofSummary.circulatingSupplyLabel },
                        { emoji: '💸', label: 'Profit-eligible supply', value: proofState.proofSummary.profitEligibleSupplyLabel },
                        { emoji: '🎁', label: 'Your claimable profit', value: proofState.proofSummary.claimableProfitLabel },
                    ].map((stat, index) => (
                        <ScrollReveal key={stat.label} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]">
                                <div className="flex items-center gap-2">
                                    <span aria-hidden>{stat.emoji}</span>
                                    <span className="label-font">{stat.label}</span>
                                </div>
                                <div className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{stat.value}</div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                {/* Live contracts */}
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {proofState.links.map((link, index) => (
                        <ScrollReveal key={link.address} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <a
                                href={link.snowtraceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-all duration-200 hover:border-[var(--accent-blue)]/20 hover:shadow-[var(--shadow-sm)]"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="label-font truncate">{link.label}</span>
                                    <span className="shrink-0 text-[0.7rem] font-medium text-[var(--accent-blue)] opacity-0 transition-opacity group-hover:opacity-100">Snowtrace ↗</span>
                                </div>
                                <div className="mt-1.5 truncate font-mono text-[0.78rem] text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                                    {formatAddress(link.address)}
                                </div>
                            </a>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            {/* ── TARGET UNIVERSE ── */}
            <section className="mt-16">
                <div className="label-font">Target universe</div>

                {/* All 3 cards in one row: Charizard left, Moonbreon top-right, Lugia bottom-right */}
                <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
                    {/* Charizard — anchor card, full height */}
                    <ScrollReveal>
                        <div className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-all duration-200 hover:border-[var(--border-strong)]">
                            <div className="flex items-center justify-between">
                                <div className="label-font text-[var(--accent)]">Grail vintage</div>
                                <PixelLabel tone="warning">{PORTFOLIO_PREVIEW[0].status}</PixelLabel>
                            </div>
                            <div className="mt-4 flex flex-1 flex-col items-center gap-5 sm:flex-row sm:items-start">
                                <img
                                    src={RECENT_CARD_COMPS[0].imageSrc}
                                    alt={RECENT_CARD_COMPS[0].imageAlt}
                                    className="aspect-[4/5] w-full max-w-[220px] shrink-0 rounded-xl object-cover"
                                />
                                <div className="flex flex-1 flex-col py-1">
                                    <h2 className="text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                                        {RECENT_CARD_COMPS[0].name}
                                    </h2>
                                    <div className="mt-0.5 text-[0.8rem] text-[var(--text-tertiary)]">
                                        {RECENT_CARD_COMPS[0].subtitle} · {RECENT_CARD_COMPS[0].grade}
                                    </div>
                                    <p className="mt-3 text-[0.88rem] leading-[1.6] text-[var(--text-secondary)]">
                                        GM10 treats Charizard as the anchor-grail case: iconic demand, scarce top-grade supply, and public auction data that supports disciplined marking.
                                    </p>
                                    <div className="mt-auto pt-4 border-t border-[var(--border)]">
                                        <div className="label-font">Recent public comp</div>
                                        <div className="mt-1.5 text-2xl font-bold tracking-[-0.03em] text-[var(--accent)]">{RECENT_CARD_COMPS[0].priceLabel}</div>
                                        <div className="mt-0.5 text-[0.78rem] text-[var(--text-tertiary)]">{RECENT_CARD_COMPS[0].recencyLabel}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Right column: Moonbreon (top) + Lugia (bottom) */}
                    <div className="grid gap-4">
                        {/* Moonbreon */}
                        <ScrollReveal delay={1}>
                            <div className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-all duration-200 hover:border-[var(--border-strong)]">
                                <div className="flex items-center justify-between">
                                    <div className="label-font text-[var(--accent-blue)]">Modern momentum</div>
                                    <PixelLabel tone="live">{PORTFOLIO_PREVIEW[1].status}</PixelLabel>
                                </div>
                                <div className="mt-3 flex items-start gap-4">
                                    <img
                                        src={RECENT_CARD_COMPS[1].imageSrc}
                                        alt={RECENT_CARD_COMPS[1].imageAlt}
                                        className="aspect-[4/5] w-24 shrink-0 rounded-lg object-cover"
                                    />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">{RECENT_CARD_COMPS[1].name}</h3>
                                        <div className="mt-0.5 text-[0.78rem] text-[var(--text-tertiary)]">
                                            {RECENT_CARD_COMPS[1].subtitle} · {RECENT_CARD_COMPS[1].grade}
                                        </div>
                                        <p className="mt-2 text-[0.84rem] leading-[1.55] text-[var(--text-secondary)]">
                                            GM10 uses lanes like this for liquid collector demand with visible comps. Modern cards matter when the bid is deep enough to validate pricing fast.
                                        </p>
                                        <div className="mt-3 flex items-baseline gap-2">
                                            <span className="text-xl font-bold text-[var(--accent-blue)]">{RECENT_CARD_COMPS[1].priceLabel}</span>
                                            <span className="text-[0.72rem] text-[var(--text-tertiary)]">{RECENT_CARD_COMPS[1].recencyLabel}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* Lugia */}
                        <ScrollReveal delay={2}>
                            <div className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-all duration-200 hover:border-[var(--border-strong)]">
                                <div className="flex items-center justify-between">
                                    <div className="label-font text-[var(--accent-green)]">Vintage scarcity</div>
                                    <PixelLabel tone="warning">{PORTFOLIO_PREVIEW[2].status}</PixelLabel>
                                </div>
                                <div className="mt-3 flex items-start gap-4">
                                    <img
                                        src={RECENT_CARD_COMPS[2].imageSrc}
                                        alt={RECENT_CARD_COMPS[2].imageAlt}
                                        className="aspect-[4/5] w-24 shrink-0 rounded-lg object-cover"
                                    />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">{RECENT_CARD_COMPS[2].name}</h3>
                                        <div className="mt-0.5 text-[0.78rem] text-[var(--text-tertiary)]">
                                            {RECENT_CARD_COMPS[2].subtitle} · {RECENT_CARD_COMPS[2].grade}
                                        </div>
                                        <p className="mt-2 text-[0.84rem] leading-[1.55] text-[var(--text-secondary)]">
                                            GM10 uses lanes like this where scarcity is real but liquidity is thinner, so provenance, grading quality, and comp selection carry more weight.
                                        </p>
                                        <div className="mt-3 flex items-baseline gap-2">
                                            <span className="text-xl font-bold text-[var(--accent-blue)]">{RECENT_CARD_COMPS[2].priceLabel}</span>
                                            <span className="text-[0.72rem] text-[var(--text-tertiary)]">{RECENT_CARD_COMPS[2].recencyLabel}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* ── EXAMPLE HISTORY ── */}
            <section className="mt-16 grid gap-12 xl:grid-cols-2 xl:gap-16">
                <div className="flex h-full flex-col">
                    <ScrollReveal>
                        <div className="label-font">Example buys</div>
                        <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">Example acquisitions.</h2>
                        <p className="mt-2 text-[0.9rem] leading-[1.7] text-[var(--text-secondary)]">
                            Illustrative, not live positions. These examples show how GM10 thinks about sourcing and execution rather than promising a fixed roster.
                        </p>
                    </ScrollReveal>
                    <div className="mt-6 flex-1 grid gap-3 content-start">
                        {SAMPLE_HISTORY.buys.map((item, index) => (
                            <ScrollReveal key={`${item.date}-${item.item}`} delay={(index + 1) as 1 | 2}>
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--border-strong)]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-[0.95rem] font-bold text-[var(--text-primary)]">{item.item}</h3>
                                            <p className="mt-1 text-[0.8rem] text-[var(--text-secondary)]">
                                                {item.chain} · {item.venue}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <div className="text-[0.95rem] font-bold text-[var(--accent-blue)]">{item.amount}</div>
                                            <div className="mt-0.5 text-[0.72rem] text-[var(--text-tertiary)]">{item.date}</div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>

                <div className="flex h-full flex-col">
                    <ScrollReveal>
                        <div className="label-font">Example sales</div>
                        <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">Example exits.</h2>
                        <p className="mt-2 text-[0.9rem] leading-[1.7] text-[var(--text-secondary)]">
                            Illustrative only. Exit outcomes matter because they feed the waterfall and show how collectible exposure turns back into onchain cash.
                        </p>
                    </ScrollReveal>
                    <div className="mt-6 flex-1 grid gap-3 content-start">
                        {SAMPLE_HISTORY.sales.map((item, index) => (
                            <ScrollReveal key={`${item.date}-${item.item}`} delay={(index + 1) as 1 | 2}>
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--border-strong)]">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-[0.95rem] font-bold text-[var(--text-primary)]">{item.item}</h3>
                                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${item.pnl.startsWith('+') ? 'bg-[rgba(94,196,137,0.1)] text-[var(--accent-green)]' : 'bg-[rgba(232,124,124,0.1)] text-[var(--accent-red)]'}`}>
                                            {item.pnl}
                                        </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-3">
                                        <div>
                                            <div className="label-font" style={{ fontSize: '0.6rem' }}>Sale price</div>
                                            <div className="mt-1 text-[0.9rem] font-bold text-[var(--text-primary)]">{item.gross}</div>
                                        </div>
                                        <div>
                                            <div className="label-font" style={{ fontSize: '0.6rem' }}>After fees</div>
                                            <div className="mt-1 text-[0.9rem] font-bold text-[var(--text-primary)]">{item.net}</div>
                                        </div>
                                        <div>
                                            <div className="label-font" style={{ fontSize: '0.6rem' }}>Date</div>
                                            <div className="mt-1 text-[0.9rem] font-bold text-[var(--text-primary)]">{item.date}</div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>
        </Page>
    );
}

export default function Portfolio() {
    return (
        <Web3Providers>
            <PortfolioContent />
        </Web3Providers>
    );
}
