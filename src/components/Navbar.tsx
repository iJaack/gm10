import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PixelLabel, PixelMenuLink } from './PixelUI';

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
                        ? 'border-b border-white/10 bg-[rgba(7,10,20,0.84)] backdrop-blur-xl'
                        : 'bg-transparent'
                }`}
            >
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))] px-4">
                    <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-[4.7rem]'}`}>
                        <Link to="/" className="flex items-center gap-4 text-[var(--text-main)]">
                            <div className="h-11 w-11 rounded-full border border-white/12 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_60%),rgba(12,18,35,0.56)]" />
                            <div>
                                <div className="pixel-font text-[0.74rem] uppercase tracking-[0.22em] text-[var(--accent-live)]">GM10</div>
                                <div className="text-base font-semibold text-[var(--text-main)]">Gem Mint Strategy</div>
                            </div>
                        </Link>

                        <nav className="hidden lg:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <PixelMenuLink key={link.path} to={link.path} active={isActive(link.path)} className="min-h-0 border-0 bg-transparent px-0 py-0 text-sm shadow-none hover:translate-y-0 hover:shadow-none focus-visible:translate-y-0 focus-visible:shadow-none">
                                    {link.label}
                                </PixelMenuLink>
                            ))}
                        </nav>

                        <div className="flex items-center gap-3">
                            <div className="hidden xl:block">
                                <PixelLabel tone="live">Fuji live</PixelLabel>
                            </div>
                            <div className="hidden sm:block [&_.iekbcc0]:!rounded-full [&_.iekbcc0]:!border [&_.iekbcc0]:!border-white/10 [&_.iekbcc0]:!bg-[rgba(11,16,30,0.76)] [&_.iekbcc0]:!px-4 [&_.iekbcc0]:!shadow-[0_10px_28px_rgba(0,0,0,0.2)] [&_.iekbcc0]:!font-['Space_Grotesk'] [&_.ju367v7]:!font-['Space_Grotesk']">
                                <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
                            </div>

                            <button
                                type="button"
                                className="lg:hidden inline-flex min-h-[3.05rem] min-w-[88px] items-center justify-center rounded-full border border-white/10 bg-[rgba(11,16,30,0.76)] px-4 font-['Oxanium'] text-[0.76rem] uppercase tracking-[0.18em] text-[var(--text-main)] shadow-[0_10px_28px_rgba(0,0,0,0.2)]"
                                onClick={() => setMobileMenuOpen((value) => !value)}
                                aria-expanded={mobileMenuOpen}
                                aria-label="Toggle navigation menu"
                            >
                                {mobileMenuOpen ? 'Close' : 'Menu'}
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
                <div className="absolute inset-0 bg-[rgba(5,8,15,0.9)] backdrop-blur-xl" onClick={() => setMobileMenuOpen(false)} />
                <div className="absolute inset-x-4 top-24 rounded-[28px] border border-white/10 bg-[rgba(8,12,22,0.96)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
                    <div className="mb-6 flex items-center justify-between">
                        <PixelLabel tone="warning">Menu</PixelLabel>
                        <PixelLabel tone="live">Live</PixelLabel>
                    </div>
                    <div className="grid gap-3">
                        {navLinks.map((link) => (
                            <PixelMenuLink
                                key={link.path}
                                to={link.path}
                                active={isActive(link.path)}
                                className="w-full justify-between"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </PixelMenuLink>
                        ))}
                    </div>
                    <div className="mt-6 border-t border-white/8 pt-5 text-center [&_.iekbcc0]:!rounded-full [&_.iekbcc0]:!border [&_.iekbcc0]:!border-white/10 [&_.iekbcc0]:!bg-[rgba(11,16,30,0.76)] [&_.iekbcc0]:!px-4 [&_.iekbcc0]:!shadow-[0_10px_28px_rgba(0,0,0,0.2)] [&_.iekbcc0]:!font-['Space_Grotesk'] [&_.ju367v7]:!font-['Space_Grotesk']">
                        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
                    </div>
                </div>
            </div>
        </>
    );
}
