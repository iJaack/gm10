import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from '../hooks/useTheme';
import Logo from './Logo';

const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/fundraising', label: 'Buy' },
    { path: '/portfolio', label: 'Portfolio' },
    { path: '/catch', label: '$CATCH' },
    { path: '/faq', label: 'FAQ' },
];

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
    }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            <header
                className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
                    scrolled || mobileMenuOpen
                        ? 'border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur-xl'
                        : 'bg-transparent'
                }`}
            >
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] px-4">
                    <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 text-[var(--text-primary)]">
                            <Logo size={28} />
                            <div className="holo-shimmer font-['Inter'] text-[0.95rem] font-bold tracking-[-0.02em]">
                                GM10
                            </div>
                        </Link>

                        {/* Desktop nav — seamless text links */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`rounded-full px-4 py-1.5 text-[0.88rem] font-medium transition-all duration-200 ${
                                        isActive(link.path)
                                            ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center gap-2">
                            {/* Theme toggle */}
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

                            {/* Connect wallet */}
                            <div className="hidden sm:block [&_.iekbcc0]:!rounded-full [&_.iekbcc0]:!border [&_.iekbcc0]:!border-[var(--accent)] [&_.iekbcc0]:!bg-[var(--accent)] [&_.iekbcc0]:!px-4 [&_.iekbcc0]:!shadow-[0_0_14px_var(--gold-glow),0_0_32px_var(--gold-glow)] [&_.iekbcc0]:!font-['Inter'] [&_.iekbcc0]:!text-[var(--bg-primary)] [&_.iekbcc0]:!font-bold [&_.iekbcc0]:hover:!shadow-[0_0_20px_rgba(240,192,48,0.35),0_0_48px_rgba(240,192,48,0.15)] [&_.iekbcc0]:!transition-shadow [&_.ju367v7]:!font-['Inter']">
                                <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
                            </div>

                            {/* Mobile menu toggle */}
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

            {/* Mobile menu */}
            <div
                className={`fixed inset-0 z-40 transition-all duration-300 lg:hidden ${
                    mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                }`}
            >
                <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                <div className="absolute inset-x-4 top-20 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
                    <div className="grid gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`rounded-xl px-4 py-3 text-[0.95rem] font-medium transition-colors ${
                                    isActive(link.path)
                                        ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                                }`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="mt-4 border-t border-[var(--border)] pt-4 [&_.iekbcc0]:!rounded-full [&_.iekbcc0]:!border [&_.iekbcc0]:!border-[var(--accent)] [&_.iekbcc0]:!bg-[var(--accent)] [&_.iekbcc0]:!px-4 [&_.iekbcc0]:!shadow-[0_0_14px_var(--gold-glow),0_0_32px_var(--gold-glow)] [&_.iekbcc0]:!font-['Inter'] [&_.iekbcc0]:!text-[var(--bg-primary)] [&_.iekbcc0]:!font-bold [&_.ju367v7]:!font-['Inter']">
                        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
                    </div>
                </div>
            </div>
        </>
    );
}
