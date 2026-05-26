import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';
import { PUBLIC_NAV_LINKS } from '../data/protocol';
import { useTheme } from '../hooks/useTheme';
import Logo from './Logo';
import { Web3Providers } from './Web3Providers';

function shortenAddress(address?: string) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function NavbarWalletCta({ mobile = false }: { mobile?: boolean }) {
    return (
        <ConnectButton.Custom>
            {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
                const connected = mounted && account && chain;
                const isWrongNetwork = Boolean(connected && chain.unsupported);
                const label = !connected
                    ? 'Connect wallet'
                    : isWrongNetwork
                        ? 'Switch network'
                        : account.displayName || shortenAddress(account.address);
                const detail = !connected ? 'Wallet' : isWrongNetwork ? 'Network' : chain.name || 'Connected';

                const handleClick = () => {
                    if (!connected) {
                        openConnectModal();
                        return;
                    }

                    if (isWrongNetwork) {
                        openChainModal();
                        return;
                    }

                    openAccountModal();
                };

                return (
                    <button
                        type="button"
                        onClick={handleClick}
                        className={`pixel-menu-link pixel-menu-link-active ${mobile ? 'w-full justify-center' : ''}`.trim()}
                    >
                        <span className="pixel-menu-cursor" aria-hidden>↗</span>
                        <span className="flex flex-col leading-tight">
                            <span>{label}</span>
                            <span className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] opacity-75">
                                {detail}
                            </span>
                        </span>
                    </button>
                );
            }}
        </ConnectButton.Custom>
    );
}

function isLinkActive(currentPath: string, currentHash: string, target: string) {
    const [path, hash = ''] = target.split('#');

    if (hash) {
        return currentPath === path && currentHash === `#${hash}`;
    }

    return currentPath === path;
}

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { theme, toggle } = useTheme();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 16);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname, location.hash]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    return (
        <>
            <header
                className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
                    scrolled || mobileMenuOpen
                        ? 'border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur-xl'
                        : 'bg-transparent'
                }`}
            >
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))] px-4">
                    <div className={`flex items-center justify-between gap-3 transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
                        <Link to="/" className="flex items-center gap-2 text-[var(--text-primary)]">
                            <Logo size={28} />
                            <div className="holo-shimmer font-['Inter'] text-[0.95rem] font-bold tracking-[-0.02em]">
                                GM10
                            </div>
                        </Link>

                        <nav className="hidden lg:flex items-center gap-1">
                            {PUBLIC_NAV_LINKS.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`rounded-full px-4 py-1.5 text-[0.88rem] font-medium transition-all duration-200 ${
                                        isLinkActive(location.pathname, location.hash, link.to)
                                            ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggle}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            >
                                {theme === 'dark' ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                                )}
                            </button>

                            <div className="hidden lg:block">
                                <Web3Providers>
                                    <NavbarWalletCta />
                                </Web3Providers>
                            </div>

                            <button
                                type="button"
                                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                                onClick={() => setMobileMenuOpen((value) => !value)}
                                aria-expanded={mobileMenuOpen}
                                aria-label="Toggle navigation menu"
                            >
                                {mobileMenuOpen ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div
                className={`fixed inset-0 z-40 transition-all duration-300 lg:hidden ${
                    mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                }`}
            >
                <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                <div className="absolute inset-x-4 top-20 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
                    <div className="grid gap-1">
                        {PUBLIC_NAV_LINKS.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`rounded-xl px-4 py-3 text-[0.95rem] font-medium transition-colors ${
                                    isLinkActive(location.pathname, location.hash, link.to)
                                        ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                        <Web3Providers>
                            <NavbarWalletCta mobile />
                        </Web3Providers>
                    </div>
                </div>
            </div>
        </>
    );
}
