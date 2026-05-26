import { ScrollReveal } from './ScrollReveal';
import { PixelMenuLink } from './PixelUI';
import { GLOBAL_CTA_ROUTE, getRoundPrimaryCtaLabel } from '../data/protocol';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from './Web3Providers';
import { formatEther } from 'viem';

function formatAddress(address?: string) {
    if (!address) return 'Pending deployment';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAvax(value?: bigint) {
    if (value === undefined) return 'Pending archive read';

    return `${Number(formatEther(value)).toLocaleString('en-US', {
        maximumFractionDigits: 4,
    })} AVAX`;
}

function HomeFujiSectionContent() {
    const roundState = useFujiRoundState();
    const proofState = useFujiPortfolioPositions();
    const alreadyRaisedLabel = formatAvax(roundState.archiveRound?.raisedAmount);

    return (
        <section id="proof" className="px-4 py-16 md:py-24">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                <ScrollReveal>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${roundState.isRoundOpen ? 'animate-ping bg-[var(--accent-green)]' : 'bg-[var(--accent)]'}`} />
                            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${roundState.isRoundOpen ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent)]'}`} />
                        </span>
                        <span className={`label-font ${roundState.isRoundOpen ? 'text-[var(--accent-green)]' : 'text-[var(--accent)]'}`}>
                            {roundState.isRoundOpen ? 'Live proof' : 'Proof stays live'}
                        </span>
                    </div>
                    <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                        The strategy already has a public proof surface.
                    </h2>
                    <p className="mt-4 max-w-[44rem] text-[1rem] leading-[1.7] text-[var(--text-secondary)]">
                        GM10 exposes continuous commit state, verifiable contracts, and portfolio reporting on Avalanche mainnet so visitors can inspect the mechanics directly.
                    </p>
                </ScrollReveal>

                <div className="mt-10 grid gap-4 md:grid-cols-3">
                    {[
                        {
                            label: 'Already raised',
                            value: alreadyRaisedLabel,
                            detail: 'Archived raise capital already closed. Portfolio proof and accounting stay inspectable.',
                        },
                        {
                            label: 'Continuous round',
                            value: 'Per-commit minting',
                            detail: `${roundState.raisedLabel} legacy Round 2 close remains archived. New commits use live NAV-derived pricing.`,
                        },
                        {
                            label: 'Marked portfolio value',
                            value: proofState.proofSummary.portfolioValueLabel,
                            detail: proofState.proofSummary.holdingsLabel,
                        },
                    ].map((stat, index) => (
                        <ScrollReveal key={stat.label} delay={(index + 1) as 1 | 2 | 3}>
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-all duration-300 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]">
                                <div className="label-font">{stat.label}</div>
                                <div className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{stat.value}</div>
                                <p className="mt-2 text-[0.88rem] leading-[1.6] text-[var(--text-secondary)]">{stat.detail}</p>
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
                        <PixelMenuLink to={GLOBAL_CTA_ROUTE}>
                            {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
                        </PixelMenuLink>
                        <PixelMenuLink to="/fundraising#proof">Open the mainnet proof page</PixelMenuLink>
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
