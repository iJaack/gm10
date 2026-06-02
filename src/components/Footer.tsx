import { Link } from 'react-router-dom';
import { ScrollReveal } from './ScrollReveal';
import { PixelMenuLink } from './PixelUI';
import {
    FOOTER_EXPLORE_LINKS,
    GLOBAL_CTA_ROUTE,
    SITE_LINKS,
    getRoundPrimaryCtaLabel,
} from '../data/protocol';
import { useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from './Web3Providers';

function FooterRoundCta() {
    const roundState = useFujiRoundState();

    return (
        <PixelMenuLink to={GLOBAL_CTA_ROUTE} active>
            {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
        </PixelMenuLink>
    );
}

export default function Footer() {
    return (
        <footer className="relative z-10 px-4 py-16">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <div className="relative pt-12 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--border-strong)] before:to-transparent">
                    <div className="grid gap-12 xl:grid-cols-[1.2fr_0.7fr_0.9fr] xl:gap-16">
                        <ScrollReveal>
                            <div className="max-w-md">
                                <div className="text-[0.95rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">GM10</div>
                                <h2 className="mt-4 text-2xl font-bold leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                                    Onchain access to a managed portfolio of trophy-tier Pokemon cards.
                                </h2>
                                <p className="mt-3 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                                    GM10 packages sourcing, diligence, custody, valuation, and exits into one strategy so investors can focus on exposure instead of card operations.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Web3Providers>
                                        <FooterRoundCta />
                                    </Web3Providers>
                                    <a
                                        href={SITE_LINKS.x}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="pixel-menu-link pixel-external-link"
                                    >
                                        <span className="pixel-menu-cursor" aria-hidden>↗</span>
                                        <span>Follow on X</span>
                                    </a>
                                </div>
                            </div>
                        </ScrollReveal>

                        <ScrollReveal delay={1}>
                            <div>
                                <div className="label-font">Explore</div>
                                <div className="mt-4 grid gap-2.5">
                                    {FOOTER_EXPLORE_LINKS.map(({ to, label }) => (
                                        <Link
                                            key={to}
                                            to={to}
                                            className="text-[0.9rem] text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
                                        >
                                            {label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </ScrollReveal>

                        <ScrollReveal delay={2}>
                            <div>
                                <div className="label-font">Disclosures</div>
                                <p className="mt-4 text-[0.9rem] leading-[1.7] text-[var(--text-secondary)]">
                                    GM10 is an onchain strategy wrapper around collectible exposure. It is not legal, tax, or investment advice, and card prices can move against the fund.
                                </p>
                            </div>
                        </ScrollReveal>
                    </div>

                    <div className="mt-14 flex flex-col gap-2 border-t border-[var(--border)] pt-5 text-[0.75rem] text-[var(--text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
                        <span>&copy; {new Date().getFullYear()} Gem Mint Strategy. Built on Avalanche.</span>
                        <span>$CATCH tracks the GM10 strategy and remains subject to collectible-market and execution risk.</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
