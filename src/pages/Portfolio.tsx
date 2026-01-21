export default function Portfolio() {
    const cards = [
        {
            id: 1,
            name: "Charizard",
            set: "Base Set",
            year: "2003",
            grade: "PSA 10",
            grader: "PSA",
            value: "$8,500",
            image: "/images/cards/charizard_psa10.png",
            description: "Iconic holographic Charizard from the Base Set. One of the most sought-after Pokemon cards.",
            rarity: "Holo Rare"
        },
        {
            id: 2,
            name: "Umbreon VMAX",
            set: "Evolving Skies",
            year: "2021",
            grade: "BGS 10 Black Label",
            grader: "BGS",
            value: "$3,200",
            image: "/images/cards/umbreon_vmax_bgs.png",
            description: "Modern alternate art VMAX with pristine Black Label grade. All 10 subgrades.",
            rarity: "Secret Rare"
        },
        {
            id: 3,
            name: "Lugia",
            set: "Neo Genesis",
            year: "2000",
            grade: "PSA 9",
            grader: "PSA",
            value: "$1,800",
            image: "/images/cards/lugia_psa9.png",
            description: "Legendary bird Pokemon from the Neo Genesis expansion. Classic vintage holo.",
            rarity: "Holo Rare"
        }
    ];

    const statsData = [
        { label: "Total Cards", value: "3", color: "text-blue-400" },
        { label: "Total Value", value: "$13,500", color: "text-green-400" },
        { label: "Avg. Grade", value: "9.7", color: "text-cyan-400" },
        { label: "Top Card", value: "PSA 10 Charizard", color: "text-purple-400" }
    ];

    return (
        <div className="min-h-screen pt-32 px-4 pb-20 bg-[#0a0f1c] text-white">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Portfolio</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                        Our curated collection of museum-quality graded Pokemon cards. Each card is professionally authenticated, graded, and stored in secure vaults.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                    {statsData.map((stat, idx) => (
                        <div key={idx} className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                            <div className="text-sm text-gray-400 mb-2">{stat.label}</div>
                            <div className={`text-2xl md:text-3xl font-bold ${stat.color}`}>
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Disclaimer Banner */}
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-3xl p-8 mb-16">
                    <div className="flex items-start gap-4">
                        <div className="text-3xl flex-shrink-0">⚠️</div>
                        <div>
                            <h3 className="text-xl font-bold text-orange-300 mb-2">Example Cards Only</h3>
                            <p className="text-gray-300 leading-relaxed">
                                The cards displayed below are <strong>examples for demonstration purposes only</strong> and do not represent current actual ownership.
                                This gallery will be updated with a real-time overview of our treasury collection after <strong>Round 1 is complete</strong> (February 2026).
                                All acquired cards will be professionally authenticated, graded, and stored in secure vaults with full transparency.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cards Gallery */}
                <div className="mb-4 text-center">
                    <h2 className="text-2xl font-bold text-gray-400">Example Portfolio Gallery</h2>
                    <p className="text-sm text-gray-500 mt-1">Not representative of current holdings</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    {cards.map((card) => (
                        <div key={card.id} className="group bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl overflow-hidden hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300">
                            {/* Card Image */}
                            <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-8">
                                <img
                                    src={card.image}
                                    alt={`${card.name} ${card.grade}`}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>

                            {/* Card Info */}
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-1">{card.name}</h3>
                                        <p className="text-sm text-gray-400">{card.set} ({card.year})</p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${card.grader === 'PSA' ? 'bg-red-500/20 text-red-400' : 'bg-black/40 text-white border border-white/20'
                                            }`}>
                                            {card.grade}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-400 mb-4">{card.description}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <div>
                                        <div className="text-xs text-gray-500">Est. Value</div>
                                        <div className="text-xl font-bold text-green-400">{card.value}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">Rarity</div>
                                        <div className="text-sm font-semibold text-cyan-400">{card.rarity}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Coming Soon Section */}
                <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-3xl p-12 text-center">
                    <div className="text-5xl mb-4">🚀</div>
                    <h3 className="text-3xl font-bold mb-4">More Cards Coming Soon</h3>
                    <p className="text-gray-400 max-w-2xl mx-auto mb-6">
                        As we complete our fundraising rounds, we'll be acquiring 40+ additional museum-quality cards. Check back regularly to see our portfolio grow!
                    </p>
                    <div className="flex gap-4 justify-center">
                        <a
                            href="/fundraising"
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl font-bold text-white hover:opacity-90 transition-all"
                        >
                            Invest Now
                        </a>
                        <a
                            href="/tokenomics"
                            className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-white hover:bg-white/20 transition-all"
                        >
                            Learn More
                        </a>
                    </div>
                </div>

                {/* Storage & Security */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                        <div className="text-3xl mb-3">🔒</div>
                        <div className="font-bold text-white mb-2">Professional Storage</div>
                        <div className="text-sm text-gray-400">
                            All cards stored in climate-controlled, insured vaults with 24/7 security monitoring
                        </div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                        <div className="text-3xl mb-3">✅</div>
                        <div className="font-bold text-white mb-2">Authenticated & Graded</div>
                        <div className="text-sm text-gray-400">
                            Every card professionally graded by PSA, BGS, or CGC - the industry's most trusted graders
                        </div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                        <div className="text-3xl mb-3">💰</div>
                        <div className="font-bold text-white mb-2">Fully Insured</div>
                        <div className="text-sm text-gray-400">
                            Comprehensive insurance coverage protects against theft, damage, and natural disasters
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
