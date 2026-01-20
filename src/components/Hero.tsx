import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Hero() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <section className="relative min-h-screen flex items-center overflow-hidden py-32 px-4 bg-gradient-to-br from-[#0a0f1c] via-[#1a1f3c] to-[#0d1829] text-cream">
            {/* Background Orbs */}
            <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-blue-500/20 opacity-40 blur-[80px] animate-float delay-0" />
            <div className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-cyan-500/20 opacity-50 blur-[80px] animate-float delay-7000" />

            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(230,57,70,0.15),transparent_50%)] pointer-events-none" />

            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-16 items-center relative z-10 w-full">
                {/* Content */}
                <div className={`flex flex-col gap-6 transition-all duration-1000 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-primary/30 bg-red-primary/10 backdrop-blur-md w-fit">
                        <span className="text-base text-red-primary">⚡</span>
                        <span className="text-sm font-semibold text-[#ff6b7a]">Built on Avalanche</span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-white mb-0">
                        Invest in <span className="gradient-text bg-gradient-to-br from-[#56d3ff] via-[#90efff] to-[#4facfe] bg-clip-text text-transparent">$CATCH</span><br />
                        Graded Card Alpha
                    </h1>

                    <p className="text-xl leading-relaxed text-white/70 max-w-xl">
                        Buying the $CATCH token gives exposure to the graded card market growth.<br className="hidden md:block" />
                        Transparent. Liquid. On-chain.
                    </p>

                    <div className="flex flex-wrap gap-4 items-center mt-2">
                        <Link
                            to="/fundraising"
                            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-blue-500 to-cyan-400 text-white font-bold text-lg rounded-xl overflow-hidden shadow-[0_4px_15px_rgba(56,189,248,0.4)] hover:shadow-[0_8px_30px_rgba(56,189,248,0.5)] transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out" />
                            <span>Buy $CATCH</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>

                        <Link
                            to="/portfolio"
                            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-white/80 font-semibold hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300"
                        >
                            View Portfolio →
                        </Link>
                    </div>

                    <div className="flex items-center gap-6 mt-6 p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md w-fit">
                        <div className="flex flex-col gap-1">
                            <span className="text-2xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">$127K+</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-white/50">AUM</span>
                        </div>
                        <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                        <div className="flex flex-col gap-1">
                            <span className="text-2xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">23</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-white/50">Cards</span>
                        </div>
                        <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                        <div className="flex flex-col gap-1">
                            <span className="text-2xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">+18.4%</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-white/50">YTD</span>
                        </div>
                    </div>
                </div>

                {/* Cards Showcase */}
                <div className={`relative w-full max-w-[550px] h-[580px] flex items-center justify-center perspective-[1000px] transition-all duration-1000 ease-out delay-200 transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {/* Umbreon BGS */}
                    <div className="absolute w-[200px] p-3 rounded-xl bg-gradient-to-b from-[#0a0a0a] to-[#0a0a0a] border-2 border-[#333] shadow-[0_25px_80px_rgba(0,0,0,0.7)] transform -rotate-[12deg] -translate-x-[120px] translate-y-[20px] hover:-rotate-[5deg] hover:-translate-x-[100px] hover:-translate-y-[20px] hover:scale-110 hover:z-20 transition-all duration-500 cursor-pointer z-[3] group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#4a4a4a] to-[#1a1a1a] blur-[30px] opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-xl" />
                        <div className="relative aspect-[2.5/3.5] bg-gray-100 rounded-md overflow-hidden mb-2">
                            <img src="https://images.pokemontcg.io/swsh7/215_hires.png" alt="Umbreon" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-center py-1">
                            <div className="text-[#cccccc] text-sm font-extrabold tracking-widest text-shadow-sm">BGS</div>
                            <div className="text-white text-[0.65rem] font-bold tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">BLACK LABEL 10</div>
                        </div>
                        <div className="absolute bottom-[-45px] left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 group-hover:bottom-[-50px] transition-all duration-300 whitespace-nowrap z-30 pointer-events-none">
                            <div className="font-bold text-sm text-white">Umbreon VMAX</div>
                            <div className="text-xs text-white/60">Evolving Skies</div>
                        </div>
                    </div>

                    {/* Charizard PSA */}
                    <div className="absolute w-[200px] p-3 rounded-xl bg-gradient-to-b from-[#c41e3a] via-[#8b1528] to-[#5a0f1a] border-2 border-[#ff4757] shadow-[0_25px_80px_rgba(0,0,0,0.5)] transform rotate-0 -translate-y-[20px] hover:rotate-0 hover:-translate-y-[50px] hover:scale-115 hover:z-20 transition-all duration-500 cursor-pointer z-[4] group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#ff4757] to-[#ff6b81] blur-[30px] opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-xl" />
                        <div className="relative aspect-[2.5/3.5] bg-gray-100 rounded-md overflow-hidden mb-2">
                            <img src="https://images.pokemontcg.io/base1/4_hires.png" alt="Charizard" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-center py-1">
                            <div className="text-white text-sm font-extrabold tracking-widest drop-shadow-sm">PSA</div>
                            <div className="text-white/90 text-[0.65rem] font-bold tracking-widest">GEM MT 10</div>
                        </div>
                        <div className="absolute bottom-[-45px] left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 group-hover:bottom-[-50px] transition-all duration-300 whitespace-nowrap z-30 pointer-events-none">
                            <div className="font-bold text-sm text-white">Charizard</div>
                            <div className="text-xs text-white/60">1st Ed. Base Set</div>
                        </div>
                    </div>

                    {/* Pikachu TAG */}
                    <div className="absolute w-[200px] p-3 rounded-xl bg-gradient-to-b from-[#d4af37] via-[#b8860b] to-[#8b6914] border-2 border-[#ffd93d] shadow-[0_25px_80px_rgba(0,0,0,0.5)] transform rotate-[12deg] translate-x-[120px] translate-y-[20px] hover:rotate-[5deg] hover:translate-x-[100px] hover:-translate-y-[20px] hover:scale-110 hover:z-20 transition-all duration-500 cursor-pointer z-[2] group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#ffd93d] to-[#ffb347] blur-[30px] opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-xl" />
                        <div className="relative aspect-[2.5/3.5] bg-gray-100 rounded-md overflow-hidden mb-2">
                            <img src="https://images.pokemontcg.io/basep/4_hires.png" alt="Pikachu" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-center py-1">
                            <div className="text-white text-sm font-extrabold tracking-widest drop-shadow-sm">TAG</div>
                            <div className="text-white/90 text-[0.65rem] font-bold tracking-widest">PRISTINE 10</div>
                        </div>
                        <div className="absolute bottom-[-45px] left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 group-hover:bottom-[-50px] transition-all duration-300 whitespace-nowrap z-30 pointer-events-none">
                            <div className="font-bold text-sm text-white">Pikachu</div>
                            <div className="text-xs text-white/60">Illustrator Promo</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
