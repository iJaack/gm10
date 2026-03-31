import { Link } from 'react-router-dom';
import { PixelDivider, PixelExternalLink, PixelLabel, PixelMenuLink } from './PixelUI';
import { SITE_LINKS } from '../data/protocol';

const routeLinks = [
    { to: '/', label: 'Home' },
    { to: '/fundraising', label: 'Buy' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/faq', label: 'FAQ' },
];

export default function Footer() {
    return (
        <footer className="relative z-10 border-t border-white/8 px-4 py-14">
            <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                <PixelDivider label="GM10" />

                <div className="mt-10 grid gap-12 xl:grid-cols-[1fr_0.42fr_0.58fr] xl:gap-16">
                    <div className="max-w-xl">
                        <div className="flex flex-wrap gap-3">
                            <PixelLabel tone="live">GM10</PixelLabel>
                            <PixelLabel tone="warning">Buy live</PixelLabel>
                        </div>
                        <h2 className="mt-5 font-['Oxanium'] text-3xl font-semibold leading-tight text-[var(--text-main)]">
                            Shared exposure to high-grade Pokemon cards.
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                            One fund for people who want the top end of the market without doing the card work alone.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <PixelMenuLink to="/fundraising" active>
                                Buy $CATCH
                            </PixelMenuLink>
                            <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noopener noreferrer">
                                Follow on X
                            </PixelExternalLink>
                        </div>
                    </div>

                    <div>
                        <div className="pixel-font text-[0.72rem] uppercase tracking-[0.2em] text-[var(--text-dim)]">Routes</div>
                        <div className="mt-5 grid gap-2">
                            {routeLinks.map(({ to, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className="text-sm text-[var(--text-soft)] transition-colors duration-150 hover:text-[var(--accent-live)]"
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="pixel-font text-[0.72rem] uppercase tracking-[0.2em] text-[var(--text-dim)]">Live stack</div>
                        <p className="mt-5 text-sm leading-7 text-[var(--text-soft)]">
                            The live round sits on Buy. Onchain links and the Fuji surface stay public for anyone who wants to inspect the flow.
                        </p>
                        <div className="mt-6">
                            <Link to="/fundraising#proof" className="text-sm font-medium text-[var(--accent-live)]">
                                Open the live Fuji stack
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-2 border-t border-white/8 pt-5 text-[11px] text-[var(--text-dim)] sm:flex-row sm:items-center sm:justify-between">
                    <span>&copy; {new Date().getFullYear()} Gem Mint Strategy. Built on Avalanche.</span>
                    <span>$CATCH is the onchain token tied to the GM10 card run. Not legal or investment advice.</span>
                </div>
            </div>
        </footer>
    );
}
