import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RECENT_CARD_COMPS } from '../data/protocol'

type ShowcaseCard = {
    id: 'umbreon' | 'charizard' | 'lugia'
    title: string
    subtitle: string
    imageSrc: string
    imageAlt: string
    grader: string
    gradeMobile: string
    gradeDesktop: string
    labelTopClassName: string
    labelBottomDesktopClassName: string
    mobileWrapperClassName: string
    desktopWrapperClassName: string
    desktopGlowClassName: string
}

const showcaseCards: ShowcaseCard[] = [
    {
        id: 'umbreon',
        title: 'Umbreon VMAX',
        subtitle: 'Evolving Skies',
        imageSrc: '/images/cards/umbreon_vmax_bgs.png',
        imageAlt: 'Umbreon VMAX graded card',
        grader: 'BGS',
        gradeMobile: 'BGS 10',
        gradeDesktop: 'BLACK LABEL 10',
        labelTopClassName: 'text-[#cccccc]',
        labelBottomDesktopClassName:
            'text-white text-[0.65rem] font-bold tracking-widest drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]',
        mobileWrapperClassName:
            'absolute w-[108px] p-2 rounded-lg bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] border border-[#333] shadow-xl transform -rotate-[12deg] left-0 top-[24px] z-[1]',
        desktopWrapperClassName:
            'absolute w-[200px] p-3 rounded-xl bg-gradient-to-b from-[#0a0a0a] to-[#0a0a0a] border-2 border-[#333] shadow-[0_25px_80px_rgba(0,0,0,0.7)] transform -rotate-[12deg] -translate-x-[120px] translate-y-[20px] hover:-rotate-[5deg] hover:-translate-x-[100px] hover:-translate-y-[20px] hover:scale-110 hover:z-20 transition-all duration-500 cursor-pointer z-[3] group',
        desktopGlowClassName:
            'bg-gradient-to-br from-[#1a1a1a] via-[#4a4a4a] to-[#1a1a1a]',
    },
    {
        id: 'charizard',
        title: 'Charizard',
        subtitle: '1st Ed. Base Set',
        imageSrc: '/images/cards/charizard_psa10.png',
        imageAlt: 'Charizard graded card',
        grader: 'PSA',
        gradeMobile: 'PSA 10',
        gradeDesktop: 'GEM MT 10',
        labelTopClassName: 'text-white',
        labelBottomDesktopClassName: 'text-white/90 text-[0.65rem] font-bold tracking-widest',
        mobileWrapperClassName:
            'absolute w-[120px] p-2 rounded-lg bg-gradient-to-b from-[#c41e3a] via-[#8b1528] to-[#5a0f1a] border border-[#ff4757] shadow-xl transform left-1/2 -translate-x-1/2 top-0 z-[2]',
        desktopWrapperClassName:
            'absolute w-[200px] p-3 rounded-xl bg-gradient-to-b from-[#c41e3a] via-[#8b1528] to-[#5a0f1a] border-2 border-[#ff4757] shadow-[0_25px_80px_rgba(0,0,0,0.5)] transform rotate-0 -translate-y-[20px] hover:-translate-y-[50px] hover:scale-[1.15] hover:z-20 transition-all duration-500 cursor-pointer z-[4] group',
        desktopGlowClassName: 'bg-gradient-to-br from-[#ff4757] to-[#ff6b81]',
    },
    {
        id: 'lugia',
        title: 'Lugia',
        subtitle: 'Neo Genesis',
        imageSrc: '/images/cards/lugia_psa9.png',
        imageAlt: 'Lugia graded card',
        grader: 'PSA',
        gradeMobile: 'PSA 9',
        gradeDesktop: 'MINT 9',
        labelTopClassName: 'text-white',
        labelBottomDesktopClassName: 'text-white/90 text-[0.65rem] font-bold tracking-widest',
        mobileWrapperClassName:
            'absolute w-[108px] p-2 rounded-lg bg-gradient-to-b from-[#0b2c4a] via-[#0a2238] to-[#071624] border border-[#4facfe] shadow-xl transform rotate-[12deg] right-0 top-[24px] z-[1]',
        desktopWrapperClassName:
            'absolute w-[200px] p-3 rounded-xl bg-gradient-to-b from-[#0b2c4a] via-[#0a2238] to-[#071624] border-2 border-[#4facfe] shadow-[0_25px_80px_rgba(0,0,0,0.55)] transform rotate-[12deg] translate-x-[120px] translate-y-[20px] hover:rotate-[5deg] hover:translate-x-[100px] hover:-translate-y-[20px] hover:scale-110 hover:z-20 transition-all duration-500 cursor-pointer z-[2] group',
        desktopGlowClassName: 'bg-gradient-to-br from-[#56d3ff] to-[#4facfe]',
    },
]

export default function Hero() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <section className="relative min-h-screen flex items-center overflow-hidden py-20 lg:py-32 px-4 text-cream bg-[#050814]">
            {/* Cover Backdrop */}
            <picture aria-hidden className="absolute inset-0">
                <source
                    type="image/webp"
                    srcSet="/brand/cover.webp 1x, /brand/cover@2x.webp 2x"
                />
                <source
                    type="image/jpeg"
                    srcSet="/brand/cover.jpg 1x, /brand/cover@2x.jpg 2x"
                />
                <img
                    src="/brand/cover.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                    loading="eager"
                    decoding="async"
                />
            </picture>
            <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-[#050814]/95 via-[#0a0f1c]/80 to-[#061a2e]/90"
            />
            <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_70%_45%,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none"
            />

            {/* Ambient Orbs */}
            <div
                aria-hidden
                className="absolute top-[-200px] right-[-120px] w-[640px] h-[640px] rounded-full bg-blue-400/15 opacity-35 blur-[90px] animate-float"
            />
            <div
                aria-hidden
                className="absolute bottom-[-160px] left-[-120px] w-[520px] h-[520px] rounded-full bg-blue-500/20 opacity-45 blur-[90px] animate-float delay-7000"
            />

            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-16 items-center relative z-10 w-full">
                {/* Mobile Cards - Above content on mobile */}
                <div className={`lg:hidden flex justify-center mb-2 transition-all duration-1000 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="relative w-[336px] h-[264px]">
                        {showcaseCards.map((card) => (
                            <div key={card.id} className={card.mobileWrapperClassName}>
                                <div className="aspect-[2.5/3.5] bg-gray-100 rounded overflow-hidden mb-1">
                                    <img
                                        src={card.imageSrc}
                                        alt={card.imageAlt}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="text-center">
                                    <div className="text-white text-[9px] font-bold tracking-widest">
                                        {card.grader}
                                    </div>
                                    <div className="text-white/90 text-[9px] font-bold">
                                        {card.gradeMobile}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className={`flex flex-col gap-4 lg:gap-6 transition-all duration-1000 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-primary/30 bg-red-primary/10 backdrop-blur-md w-fit">
                            <span className="text-base text-red-primary">⚡</span>
                            <span className="text-sm font-semibold text-[#ff6b7a]">Built on Avalanche</span>
                        </div>
                        <a
                            href="/SKILL.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/10 backdrop-blur-md w-fit hover:bg-blue-500/15 transition-colors duration-200"
                        >
                            <span className="text-base">🤖</span>
                            <span className="text-sm font-semibold text-blue-400">AI Agent Ready</span>
                        </a>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-white mb-0">
                        Get Closer To The<br />
                        <span className="bg-gradient-to-br from-blue-400 via-blue-300 to-blue-500 bg-clip-text text-transparent">Pokemon Grails</span>
                    </h1>

                    <p className="text-xl leading-relaxed text-white/70 max-w-xl">
                        PSA 10 Charizards, black-label Moonbreons, vintage Lugias, and the kind of slabbed cardboard most people only watch from a distance. GM10 keeps the card chase front and center while the receipts stay onchain.
                    </p>

                    <div className="flex flex-wrap gap-3 items-center mt-1">
                        <Link
                            to="/fundraising"
                            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg rounded-xl overflow-hidden shadow-[0_4px_15px_rgba(59,130,246,0.35)] hover:shadow-[0_8px_25px_rgba(59,130,246,0.45)] transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out" />
                            <span>Go To Buy</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>

                        <Link
                            to="/how-it-works"
                            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-white/80 font-semibold hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300"
                        >
                            See How It Moves →
                        </Link>
                    </div>

                    <div className="mt-4 lg:mt-6 w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-md">
                        <div className="text-xs font-bold uppercase tracking-wider text-white/45">Recent public comps</div>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {RECENT_CARD_COMPS.map((card) => (
                                <div key={card.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <div className="text-sm font-semibold text-white">{card.name}</div>
                                    <div className="text-xs uppercase tracking-[0.2em] text-white/35">{card.grade}</div>
                                    <div className="mt-2 text-2xl font-black text-sky-200">{card.priceLabel}</div>
                                    <div className="mt-1 text-xs text-white/45">{card.recencyLabel}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Desktop Cards Showcase - Hidden on mobile, shown on lg+ */}
                <div className={`hidden lg:flex relative w-full max-w-[550px] h-[580px] items-center justify-center perspective-[1000px] transition-all duration-1000 ease-out delay-200 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {showcaseCards.map((card) => (
                        <div key={card.id} className={card.desktopWrapperClassName}>
                            <div
                                className={`absolute inset-0 ${card.desktopGlowClassName} blur-[30px] opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-xl`}
                            />
                            <div className="relative aspect-[2.5/3.5] bg-gray-100 rounded-md overflow-hidden mb-2">
                                <img
                                    src={card.imageSrc}
                                    alt={card.imageAlt}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                            <div className="text-center py-1">
                                <div
                                    className={`${card.labelTopClassName} text-sm font-extrabold tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]`}
                                >
                                    {card.grader}
                                </div>
                                <div className={card.labelBottomDesktopClassName}>
                                    {card.gradeDesktop}
                                </div>
                            </div>
                            <div className="absolute bottom-[-45px] left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 group-hover:bottom-[-50px] transition-all duration-300 whitespace-nowrap z-30 pointer-events-none">
                                <div className="font-bold text-sm text-white">{card.title}</div>
                                <div className="text-xs text-white/60">{card.subtitle}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
