import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/how-it-works', label: 'How it Works' },
        { path: '/tokenomics', label: 'Tokenomics' },
        { path: '/governance', label: 'Governance' },
        { path: '/portfolio', label: 'Portfolio' },
        { path: '/faq', label: 'FAQ' },
        { path: '/fundraising', label: 'Buy' },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled || mobileMenuOpen
                ? 'bg-[#0a0f1c]/95 backdrop-blur-xl border-white/10 shadow-lg'
                : 'bg-transparent backdrop-blur-none border-transparent'
                }`}
        >
            <div className={`max-w-[1400px] mx-auto flex items-center justify-between transition-all duration-300 ${scrolled ? 'py-4 px-6 md:px-8' : 'py-6 px-6 md:px-8'}`}>
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-3 no-underline text-white hover:opacity-90 transition-opacity group">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-primary/20 border border-blue-primary/30 rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                            <span className="text-xl">💎</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent hidden sm:inline">
                            Gem Mint Strategy
                        </span>
                    </Link>
                </div>

                <ul className="hidden md:flex items-center gap-2 m-0 p-0 list-none">
                    {navLinks.map((link) => (
                        <li key={link.path}>
                            <Link
                                to={link.path}
                                className={`px-4 py-2 rounded-lg text-[0.95rem] font-medium transition-all duration-200 ${location.pathname === link.path
                                    ? 'text-white bg-blue-primary/15'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-4">
                    <ConnectButton
                        accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
                        chainStatus="icon"
                        showBalance={false}
                    />

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden w-10 h-10 flex items-center justify-center text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-0 left-0 right-0 bottom-0 bg-[#0a0f1c] z-[100] flex flex-col p-6 pt-24 animate-in fade-in slide-in-from-top-4 duration-300">
                    <ul className="flex flex-col gap-2 list-none m-0 p-0 overflow-y-auto">
                        {navLinks.map((link) => (
                            <li key={link.path}>
                                <Link
                                    to={link.path}
                                    className={`block px-6 py-4 rounded-2xl text-xl font-bold transition-all ${location.pathname === link.path
                                        ? 'text-white bg-blue-primary/20 border border-blue-primary/30'
                                        : 'text-white/70 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-auto pt-10 pb-8 flex justify-center border-t border-white/10">
                        <ConnectButton
                            accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
                            chainStatus="icon"
                            showBalance={false}
                        />
                    </div>
                </div>
            )}
        </nav>
    );
}
