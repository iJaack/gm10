import { Link } from 'react-router-dom';
import { ScrollReveal } from './ScrollReveal';
import { PixelExternalLink, PixelMenuLink } from './PixelUI';
import { SITE_LINKS } from '../data/protocol';

const routeLinks = [
    { to: '/', label: 'Home' },
    { to: '/fundraising', label: 'Buy' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/catch', label: '$CATCH' },
    { to: '/faq', label: 'FAQ' },
];

export default function Footer() {
    return (
        <footer className="relative z-10 px-4 py-16">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                <div className="relative pt-12 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--border-strong)] before:to-transparent">
                    <div className="grid gap-12 xl:grid-cols-[1fr_0.4fr_0.6fr] xl:gap-16">
                        <ScrollReveal>
                            <div className="max-w-md">
                                <div className="text-[0.95rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">GM10</div>
                                <h2 className="mt-4 text-2xl font-bold leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                                    Shared access to trophy-tier Pokémon cards.
                                </h2>
                                <p className="mt-3 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                                    One fund. One token. The top of the market, without doing the card work alone.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <PixelMenuLink to="/fundraising" active>
                                        Buy $CATCH
                                    </PixelMenuLink>
                                    <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noopener noreferrer">
                                        Follow on X
                                    </PixelExternalLink>
                                </div>
                            </div>
                        </ScrollReveal>

                        <ScrollReveal delay={1}>
                            <div>
                                <div className="label-font">Routes</div>
                                <div className="mt-4 grid gap-2.5">
                                    {routeLinks.map(({ to, label }) => (
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
                                <div className="label-font">Live stack</div>
                                <p className="mt-4 text-[0.9rem] leading-[1.7] text-[var(--text-secondary)]">
                                    Contracts, fund flows, and positions — all verifiable on Snowtrace. Inspect before you invest.
                                </p>
                                <div className="mt-5">
                                    <Link to="/fundraising#proof" className="text-[0.9rem] font-medium text-[var(--accent-blue)]">
                                        Open the live Fuji stack
                                    </Link>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>

                    <div className="mt-14 flex flex-col gap-2 border-t border-[var(--border)] pt-5 text-[0.75rem] text-[var(--text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
                        <span>&copy; {new Date().getFullYear()} Gem Mint Strategy. Built on Avalanche.</span>
                        <span>$CATCH is the onchain token tied to the GM10 card run. Not legal or investment advice.</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
