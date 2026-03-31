import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PixelLabel, PixelMenuLink, PixelPanel } from './PixelUI';

const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/fundraising', label: 'Buy' },
    { path: '/portfolio', label: 'Portfolio' },
    { path: '/faq', label: 'FAQ' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled || mobileMenuOpen
                        ? 'bg-[#071017]/90 backdrop-blur-md border-b border-[rgba(193,218,191,0.1)]'
                        : 'bg-transparent border-b border-transparent'
                }`}
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className={`flex items-center justify-between transition-all duration-300 ${
                        scrolled ? 'h-16' : 'h-[4.75rem]'
                    }`}>
                        <Link
                            to="/"
                            className="flex items-center gap-3 text-[var(--text-main)]"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <div className="pixel-window flex h-11 w-11 items-center justify-center p-0">
                                <div className="h-5 w-5 border-2 border-[rgba(159,230,255,0.45)] bg-[rgba(159,230,255,0.08)]" aria-hidden />
                            </div>
                            <div className="hidden sm:block">
                                <div className="pixel-font text-[0.5rem] uppercase tracking-[0.18em] text-[var(--accent-live)]">
                                    Gm10
                                </div>
                                <div className="text-base font-bold text-[var(--text-main)]">Gem Mint Strategy</div>
                            </div>
                        </Link>

                        <nav className="hidden lg:flex items-center gap-2">
                            {navLinks.map((link) => (
                                <PixelMenuLink
                                    key={link.path}
                                    to={link.path}
                                    active={isActive(link.path)}
                                    className="text-sm"
                                >
                                    {link.label}
                                </PixelMenuLink>
                            ))}
                        </nav>

                        <div className="flex items-center gap-3">
                            <div className="hidden xl:block">
                                <PixelLabel tone="live">Fuji online</PixelLabel>
                            </div>
                            <div className="hidden sm:block [&_.iekbcc0]:!font-['Space_Grotesk'] [&_.iekbcc0]:!rounded-none [&_.iekbcc0]:!border-2 [&_.iekbcc0]:!border-[var(--pixel-border)] [&_.iekbcc0]:!bg-[var(--bg-panel)] [&_.iekbcc0]:!shadow-[0_0_0_2px_var(--pixel-shadow)] [&_.ju367v7]:!font-['Space_Grotesk']">
                                <ConnectButton
                                    accountStatus="address"
                                    chainStatus="icon"
                                    showBalance={false}
                                />
                            </div>

                            <button
                                type="button"
                                className="pixel-window lg:hidden flex h-11 min-w-[72px] items-center justify-center px-3 text-[var(--text-main)]"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-expanded={mobileMenuOpen}
                                aria-label="Toggle navigation menu"
                            >
                                {mobileMenuOpen ? (
                                    <span className="pixel-font text-[0.52rem] uppercase tracking-[0.16em]">Close</span>
                                ) : (
                                    <span className="pixel-font text-[0.52rem] uppercase tracking-[0.16em]">Menu</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <div
                className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
                    mobileMenuOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none'
                }`}
            >
                <div
                    className="absolute inset-0 bg-[#071017]"
                    onClick={() => setMobileMenuOpen(false)}
                />

                <div
                    className={`absolute inset-0 pt-24 pb-8 px-6 flex flex-col transition-transform duration-300 ${
                        mobileMenuOpen ? 'translate-y-0' : '-translate-y-4'
                    }`}
                >
                    <PixelPanel className="pixel-grid flex-1 overflow-y-auto p-5">
                        <div className="mb-5 flex items-center justify-between">
                            <PixelLabel tone="warning">Menu</PixelLabel>
                            <PixelLabel tone="live">Fuji</PixelLabel>
                        </div>
                        <nav>
                            <ul className="space-y-3">
                            {navLinks.map((link) => (
                                <li key={link.path}>
                                    <PixelMenuLink
                                        to={link.path}
                                        active={isActive(link.path)}
                                        className="w-full justify-start px-5 py-4 text-lg"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.label}
                                    </PixelMenuLink>
                                </li>
                            ))}
                        </ul>
                        </nav>
                    </PixelPanel>

                    <div className="pt-5">
                        <PixelPanel className="flex flex-col items-center gap-4 p-5">
                            <ConnectButton
                                accountStatus="address"
                                chainStatus="icon"
                                showBalance={false}
                            />
                            <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">
                                Gem Mint Strategy
                            </div>
                        </PixelPanel>
                    </div>
                </div>
            </div>
        </>
    );
}
