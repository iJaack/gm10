import { Link } from 'react-router-dom';
import { PixelExternalLink, PixelLabel, PixelPanel } from './PixelUI';
import { SITE_LINKS } from '../data/protocol';

export default function Footer() {
    return (
        <footer className="relative z-10 border-t border-[rgba(193,218,191,0.08)] bg-[#050c12]">
            <div className="mx-auto grid max-w-[min(1760px,calc(100vw-48px))] grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[1.35fr_0.8fr_1.15fr]">
                <PixelPanel className="pixel-grid">
                    <div className="flex items-center gap-3">
                        <PixelLabel tone="live">GM10</PixelLabel>
                        <PixelLabel tone="warning">Card fund</PixelLabel>
                    </div>
                    <div className="mt-5 text-2xl font-bold text-[var(--text-main)]">Proxy access to elite Pokemon-card upside.</div>
                    <p className="mt-4 max-w-md text-sm leading-7 text-[var(--text-soft)]">
                        One community fund. One card run. One public Fuji stack showing the mechanics in the open.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link to="/fundraising" className="pixel-menu-link pixel-menu-link-active">
                            <span className="pixel-menu-cursor opacity-100" aria-hidden>►</span>
                            <span>Buy $CATCH</span>
                        </Link>
                        <PixelExternalLink
                            href={SITE_LINKS.x}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="justify-between"
                        >
                            Follow on X
                        </PixelExternalLink>
                    </div>
                </PixelPanel>

                <PixelPanel>
                    <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Explore</div>
                    <ul className="mt-5 space-y-3 text-sm text-[var(--text-soft)]">
                        {[
                            { to: '/', label: 'Home' },
                            { to: '/fundraising', label: 'Buy' },
                            { to: '/portfolio', label: 'Portfolio' },
                            { to: '/faq', label: 'FAQ' },
                        ].map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className="inline-flex items-center gap-2 transition-colors duration-150 hover:text-[var(--accent-live)]">
                                    <span className="pixel-font text-[0.45rem]">►</span>
                                    <span>{label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </PixelPanel>

                <PixelPanel tone="live" className="pixel-window-live">
                    <div className="flex items-center justify-between gap-3">
                        <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Live Fuji</div>
                        <PixelLabel tone="live">Stack online</PixelLabel>
                    </div>
                    <div className="mt-5 space-y-3 text-sm text-[var(--text-soft)]">
                        <Link to="/fundraising#proof" className="inline-flex items-center gap-2 transition-colors duration-150 hover:text-[var(--accent-live)]">
                            <span className="pixel-font text-[0.45rem]">►</span>
                            <span>Current round</span>
                        </Link>
                        <Link to="/#governance" className="block transition-colors duration-150 hover:text-[var(--accent-live)]">
                            Governance phases
                        </Link>
                        <PixelExternalLink
                            href={SITE_LINKS.x}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 w-full justify-between text-sm"
                        >
                            Follow on X
                        </PixelExternalLink>
                        <div className="border-t border-[rgba(193,218,191,0.1)] pt-3 text-xs leading-6 text-[var(--text-dim)]">
                            The live round sits on Buy. Updates and commentary land on X.
                        </div>
                    </div>
                </PixelPanel>
            </div>

            <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-[rgba(193,218,191,0.06)] px-6 py-4 text-[11px] text-[var(--text-dim)] sm:flex-row sm:items-center sm:justify-between">
                <span>&copy; {new Date().getFullYear()} Gem Mint Strategy. Built on Avalanche.</span>
                <span>$CATCH is the onchain token tied to the GM10 card run. Not legal or investment advice.</span>
            </div>
        </footer>
    );
}
