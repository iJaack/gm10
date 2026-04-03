import { ScrollReveal } from './ScrollReveal';
import { PixelExternalLink, PixelMenuLink } from './PixelUI';
import { SITE_LINKS } from '../data/protocol';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from './Web3Providers';

function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function HomeFujiSectionContent() {
    const roundState = useFujiRoundState();
    const proofState = useFujiPortfolioPositions();
    const roundHeadline = roundState.isRoundOpen ? 'Live on Fuji' : 'Fuji round closed';
    const roundBody = roundState.isRoundOpen
        ? 'The full stack runs on Fuji today. Contracts, fund flows, and portfolio positions — all public.'
        : 'The Fuji test round is now closed. Contracts, fund flows, and portfolio positions stay public while mainnet gets queued up.';

    return (
        <section className="px-4 py-16 md:py-24">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                <ScrollReveal>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${roundState.isRoundOpen ? 'animate-ping bg-[var(--accent-green)]' : 'bg-[var(--accent)]'}`} />
                            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${roundState.isRoundOpen ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent)]'}`} />
                        </span>
                        <span className={`label-font ${roundState.isRoundOpen ? 'text-[var(--accent-green)]' : 'text-[var(--accent)]'}`}>{roundHeadline}</span>
                    </div>
                    <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                        Already live. Already inspectable.
                    </h2>
                    <p className="mt-4 text-[1rem] leading-[1.7] text-[var(--text-secondary)]">
                        {roundBody}
                    </p>
                </ScrollReveal>

                <div className="mt-10 grid gap-4 md:grid-cols-3">
                    {[
                        { label: roundState.isRoundOpen ? 'Live round' : 'Last test round', value: `Round ${roundState.roundId}`, emoji: '🔄' },
                        { label: 'Raised', value: roundState.raisedLabel, emoji: '💎' },
                        { label: 'Marked value', value: proofState.proofSummary.portfolioValueLabel, emoji: '📊' },
                    ].map((stat, index) => (
                        <ScrollReveal key={stat.label} delay={(index + 1) as 1 | 2 | 3}>
                            <div className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-all duration-300 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]">
                                <div className="flex items-center gap-2">
                                    <span aria-hidden>{stat.emoji}</span>
                                    <span className="label-font">{stat.label}</span>
                                </div>
                                <div className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{stat.value}</div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {proofState.links.map((link, index) => (
                        <ScrollReveal key={link.address} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <a
                                href={link.snowtraceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-all duration-300 hover:border-[var(--accent-blue)]/20 hover:shadow-[var(--shadow-md)]"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="label-font truncate">{link.label}</span>
                                    <span className="shrink-0 text-[0.75rem] font-medium text-[var(--accent-blue)] opacity-0 transition-opacity group-hover:opacity-100">Snowtrace ↗</span>
                                </div>
                                <div className="mt-2 font-mono text-[0.8rem] text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                                    {formatAddress(link.address)}
                                </div>
                            </a>
                        </ScrollReveal>
                    ))}
                </div>

                <ScrollReveal delay={2}>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <PixelMenuLink to="/fundraising">{roundState.isRoundOpen ? 'Buy $CATCH' : 'See fundraising status'}</PixelMenuLink>
                        <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer">
                            Follow on X
                        </PixelExternalLink>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

export default function HomeFujiSection() {
    return (
        <Web3Providers>
            <HomeFujiSectionContent />
        </Web3Providers>
    );
}
