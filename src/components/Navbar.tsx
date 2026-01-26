import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/how-it-works', label: 'How it Works' },
    { path: '/tokenomics', label: 'Tokenomics' },
    { path: '/governance', label: 'Governance' },
    { path: '/portfolio', label: 'Portfolio' },
    { path: '/faq', label: 'FAQ' },
    { path: '/fundraising', label: 'Buy' },
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
            {/* Main Navbar */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled || mobileMenuOpen
                        ? 'bg-[#0a0f1c]/95 backdrop-blur-xl shadow-lg border-b border-white/10'
                        : 'bg-transparent border-b border-transparent'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`flex items-center justify-between transition-all duration-300 ${
                        scrolled ? 'h-16' : 'h-20'
                    }`}>
                        {/* Logo */}
                        <Link
                            to="/"
                            className="flex items-center gap-3 text-white hover:opacity-90 transition-opacity"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <div className="w-10 h-10 flex items-center justify-center bg-cyan-500/20 border border-cyan-500/30 rounded-xl">
                                <span className="text-xl">💎</span>
                            </div>
                            <span className="text-lg font-bold hidden sm:block">
                                Gem Mint Strategy
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        isActive(link.path)
                                            ? 'text-white bg-cyan-500/15'
                                            : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        {/* Right Side: Connect Button + Mobile Toggle */}
                        <div className="flex items-center gap-3">
                            {/* Desktop Connect Button */}
                            <div className="hidden sm:block">
                                <ConnectButton
                                    accountStatus="address"
                                    chainStatus="icon"
                                    showBalance={false}
                                />
                            </div>

                            {/* Mobile Menu Toggle */}
                            <button
                                type="button"
                                className="lg:hidden w-10 h-10 flex items-center justify-center text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-expanded={mobileMenuOpen}
                                aria-label="Toggle navigation menu"
                            >
                                {mobileMenuOpen ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
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
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-[#0a0f1c]"
                    onClick={() => setMobileMenuOpen(false)}
                />

                {/* Menu Content */}
                <div
                    className={`absolute inset-0 pt-24 pb-8 px-6 flex flex-col transition-transform duration-300 ${
                        mobileMenuOpen ? 'translate-y-0' : '-translate-y-4'
                    }`}
                >
                    {/* Navigation Links */}
                    <nav className="flex-1 overflow-y-auto">
                        <ul className="space-y-2">
                            {navLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className={`block px-5 py-4 rounded-2xl text-xl font-semibold transition-all ${
                                            isActive(link.path)
                                                ? 'text-white bg-cyan-500/20 border border-cyan-500/30'
                                                : 'text-white/70 hover:text-white hover:bg-white/5'
                                        }`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Mobile Connect Button */}
                    <div className="pt-6 border-t border-white/10">
                        <div className="flex flex-col items-center gap-4">
                            <ConnectButton
                                accountStatus="address"
                                chainStatus="icon"
                                showBalance={false}
                            />
                            <p className="text-xs text-white/30 uppercase tracking-widest">
                                Gem Mint Strategy
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
