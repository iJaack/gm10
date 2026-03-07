import { Link } from 'react-router-dom';
import Hero from '../components/Hero';

const whyCards = [
    {
        title: "Transparent Treasury",
        description: "Every card is visible onchain. NAV is verifiable. No black boxes — you always know what the fund holds.",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        title: "Community Governed",
        description: "Token holders vote on acquisitions, sales, and strategy. 1 token = 1 vote. Your collection, your decisions.",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
        ),
    },
    {
        title: "Permanent Liquidity",
        description: "LP tokens are burned — not locked, burned. The trading floor is permanent and verifiable onchain.",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
        ),
    },
];

const steps = [
    { step: "01", title: "Buy $CATCH", description: "Contribute AVAX during a fundraising round to receive tokens." },
    { step: "02", title: "Cards Acquired", description: "Treasury acquires museum-quality PSA/BGS graded cards." },
    { step: "03", title: "Vote & Govern", description: "Shape the portfolio — vote on acquisitions, sales, strategy." },
];

const featuredCards = [
    {
        name: "Charizard",
        set: "1st Ed. Base Set",
        grade: "PSA 10",
        image: "/images/cards/charizard_psa10.png",
        value: "$8,500",
    },
    {
        name: "Umbreon VMAX",
        set: "Evolving Skies",
        grade: "BGS 10 Black Label",
        image: "/images/cards/umbreon_vmax_bgs.png",
        value: "$3,200",
    },
    {
        name: "Lugia",
        set: "Neo Genesis",
        grade: "PSA 9",
        image: "/images/cards/lugia_psa9.png",
        value: "$1,800",
    },
];

export default function Home() {
    return (
        <main>
            <Hero />

            {/* Why Gem Mint */}
            <section className="py-24 px-4 bg-[#0a0f1c] relative">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
                        Why Gem Mint Strategy
                    </h2>
                    <p className="text-white/50 text-center mb-14 max-w-2xl mx-auto">
                        A new way to participate in the graded card market — transparent, liquid, and community-owned.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {whyCards.map((card) => (
                            <div
                                key={card.title}
                                className="group p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
                            >
                                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
                                    {card.icon}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                                <p className="text-white/45 text-sm leading-relaxed">{card.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works (condensed) */}
            <section className="py-24 px-4 bg-[#080c18] relative">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-14 text-center">
                        How It Works
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        {steps.map((s) => (
                            <div key={s.step} className="text-center md:text-left">
                                <div className="text-4xl font-extrabold text-white/[0.06] mb-3 leading-none">{s.step}</div>
                                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                                <p className="text-white/45 text-sm leading-relaxed">{s.description}</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <Link
                            to="/how-it-works"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors duration-200"
                        >
                            Learn more about the process
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Cards */}
            <section className="py-24 px-4 bg-[#0a0f1c] relative">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-end justify-between mb-12">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                Example Portfolio
                            </h2>
                            <p className="text-white/40 text-sm">
                                The kind of cards we're targeting. Updated after Round 1.
                            </p>
                        </div>
                        <Link
                            to="/portfolio"
                            className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white transition-colors duration-200"
                        >
                            View all →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {featuredCards.map((card) => (
                            <Link
                                to="/portfolio"
                                key={card.name}
                                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-all duration-300"
                            >
                                <div className="aspect-[3/4] bg-[#0d1220] p-6 flex items-center justify-center">
                                    <img
                                        src={card.image}
                                        alt={card.name}
                                        className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition-transform duration-500"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-white">{card.name}</h3>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {card.grade}
                                        </span>
                                    </div>
                                    <div className="text-white/40 text-sm mb-3">{card.set}</div>
                                    <div className="text-white/70 font-bold">{card.value}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    <div className="mt-8 text-center md:hidden">
                        <Link
                            to="/portfolio"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white transition-colors"
                        >
                            View full portfolio →
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 bg-[#080c18]">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Own a piece of your childhood.
                    </h2>
                    <p className="text-white/45 mb-8 max-w-lg mx-auto">
                        Join the first community-governed graded card fund on Avalanche.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/fundraising"
                            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-[0_4px_15px_rgba(59,130,246,0.35)] hover:shadow-[0_8px_25px_rgba(59,130,246,0.45)] transition-all duration-300 hover:-translate-y-0.5"
                        >
                            Buy $CATCH
                        </Link>
                        <Link
                            to="/how-it-works"
                            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 font-semibold hover:bg-white/[0.06] hover:text-white transition-all duration-300"
                        >
                            How It Works
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
