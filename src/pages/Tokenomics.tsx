export default function Tokenomics() {
    const rounds = [
        {
            round: 1,
            month: "Feb 2026",
            target: "10,000",
            nav: "0.0025",
            catchIssued: "4,000,000",
            vsRound1: "1.0x",
            allocation: 17.0
        },
        {
            round: 2,
            month: "Mar 2026",
            target: "15,000",
            nav: "0.0030",
            catchIssued: "5,000,000",
            vsRound1: "1.2x",
            allocation: 21.2
        },
        {
            round: 3,
            month: "Apr 2026",
            target: "22,500",
            nav: "0.0036",
            catchIssued: "6,250,000",
            vsRound1: "1.44x",
            allocation: 26.5
        },
        {
            round: 4,
            month: "May 2026",
            target: "33,750",
            nav: "0.0043",
            catchIssued: "7,848,837",
            vsRound1: "1.72x",
            allocation: 33.3
        }
    ];

    const distribution = [
        { category: "Round 1 Investors", amount: "4,000,000", percent: 17.0, color: "from-blue-500 to-blue-600" },
        { category: "Round 2 Investors", amount: "5,000,000", percent: 21.2, color: "from-cyan-500 to-cyan-600" },
        { category: "Round 3 Investors", amount: "6,250,000", percent: 26.5, color: "from-sky-500 to-sky-600" },
        { category: "Round 4 Investors", amount: "7,848,837", percent: 33.3, color: "from-indigo-500 to-indigo-600" },
        { category: "Liquidity Pool (Burned)", amount: "400,000", percent: 1.7, color: "from-purple-500 to-purple-600" },
        { category: "Team Reserve (2yr vest)", amount: "100,000", percent: 0.4, color: "from-pink-500 to-pink-600" }
    ];

    return (
        <div className="min-h-screen pt-32 px-4 pb-20 bg-[#0a0f1c] text-white">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        $CATCH <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tokenomics</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                        Transparent, fair-launch token economics designed to reward early investors and align long-term incentives.
                    </p>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                        <div className="text-sm text-gray-400 mb-2">Total Supply</div>
                        <div className="text-3xl font-bold text-white">23.6M</div>
                        <div className="text-xs text-gray-500 mt-1">$CATCH tokens</div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                        <div className="text-sm text-gray-400 mb-2">Fundraising Total</div>
                        <div className="text-3xl font-bold text-white">81,250</div>
                        <div className="text-xs text-gray-500 mt-1">AVAX (4 rounds)</div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                        <div className="text-sm text-gray-400 mb-2">Team Allocation</div>
                        <div className="text-3xl font-bold text-white">0.4%</div>
                        <div className="text-xs text-gray-500 mt-1">2-year vesting</div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                        <div className="text-sm text-gray-400 mb-2">LP Tokens</div>
                        <div className="text-3xl font-bold text-white">🔥 Burned</div>
                        <div className="text-xs text-gray-500 mt-1">Permanent liquidity</div>
                    </div>
                </div>

                {/* Fundraising Rounds */}
                <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8 mb-16">
                    <h2 className="text-3xl font-bold mb-8 text-center">4-Round Fundraising Schedule</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-blue-500/30">
                                <tr>
                                    <th className="pb-4 text-gray-400 font-semibold">Round</th>
                                    <th className="pb-4 text-gray-400 font-semibold">Month</th>
                                    <th className="pb-4 text-gray-400 font-semibold">Target (AVAX)</th>
                                    <th className="pb-4 text-gray-400 font-semibold">NAV</th>
                                    <th className="pb-4 text-gray-400 font-semibold">$CATCH Issued</th>
                                    <th className="pb-4 text-gray-400 font-semibold">Price vs R1</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rounds.map((r) => (
                                    <tr key={r.round} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4">
                                            <span className="flex items-center gap-2">
                                                <span className="w-8 h-8 bg-blue-500/20 border border-blue-500/40 rounded-full flex items-center justify-center font-bold text-blue-400">
                                                    {r.round}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="py-4 text-white">{r.month}</td>
                                        <td className="py-4 font-mono text-white">{r.target}</td>
                                        <td className="py-4 font-mono text-cyan-400">{r.nav}</td>
                                        <td className="py-4 font-mono text-white">{r.catchIssued}</td>
                                        <td className="py-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${r.round === 1 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                                                }`}>
                                                {r.vsRound1}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                        <p className="text-sm text-gray-300">
                            💡 <strong>Early Investor Advantage:</strong> Round 1 investors get 400 $CATCH per 1 AVAX, while Round 4 investors get 233 $CATCH per 1 AVAX. Combined with portfolio appreciation, early rounds offer the highest potential returns.
                        </p>
                    </div>
                </div>

                {/* Token Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8">
                        <h3 className="text-2xl font-bold mb-6">Token Distribution</h3>
                        <div className="space-y-4">
                            {distribution.map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-white font-semibold">{item.category}</span>
                                        <span className="text-gray-400">{item.percent}%</span>
                                    </div>
                                    <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                                            style={{ width: `${item.percent}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{item.amount} $CATCH</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8">
                        <h3 className="text-2xl font-bold mb-6">Token Utility</h3>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-2xl">
                                    💎
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-1">Portfolio Exposure</div>
                                    <div className="text-sm text-gray-400">Each token represents fractional ownership of 50+ museum-quality cards</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-2xl">
                                    🗳️
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-1">Governance Rights</div>
                                    <div className="text-sm text-gray-400">1 token = 1 vote. Only 1,000 $CATCH needed to submit proposals</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-2xl">
                                    💧
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-1">24/7 Liquidity</div>
                                    <div className="text-sm text-gray-400">Trade on Trader Joe DEX anytime. LP tokens burned for permanent liquidity</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-2xl">
                                    📈
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-1">NAV Appreciation</div>
                                    <div className="text-sm text-gray-400">Token value adjusts with portfolio performance. Target 2x NAV growth</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fee Structure */}
                <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8 mb-16">
                    <h3 className="text-2xl font-bold mb-6 text-center">Fee Structure</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-blue-900/20 rounded-xl border border-blue-500/30">
                            <div className="text-4xl font-bold text-white mb-2">1%</div>
                            <div className="text-sm font-semibold text-gray-300 mb-2">Management Fee</div>
                            <div className="text-xs text-gray-400">Annually on AUM for operations, storage, insurance</div>
                        </div>
                        <div className="text-center p-6 bg-blue-900/20 rounded-xl border border-blue-500/30">
                            <div className="text-4xl font-bold text-white mb-2">10%</div>
                            <div className="text-sm font-semibold text-gray-300 mb-2">Performance Fee</div>
                            <div className="text-xs text-gray-400">On profits above high-water mark. Aligns incentives</div>
                        </div>
                        <div className="text-center p-6 bg-blue-900/20 rounded-xl border border-blue-500/30">
                            <div className="text-4xl font-bold text-white mb-2">0.5%</div>
                            <div className="text-sm font-semibold text-gray-300 mb-2">Redemption Fee</div>
                            <div className="text-xs text-gray-400">On direct NAV redemptions (when enabled)</div>
                        </div>
                    </div>
                </div>

                {/* Investment Limits */}
                <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-3xl p-12 text-center">
                    <h3 className="text-3xl font-bold mb-6">Fair Launch Mechanism</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div>
                            <div className="text-5xl mb-3">🚫</div>
                            <div className="font-bold text-white mb-2">Anti-Whale Protection</div>
                            <div className="text-sm text-gray-400">200 AVAX max per wallet per round prevents concentration</div>
                        </div>
                        <div>
                            <div className="text-5xl mb-3">🌍</div>
                            <div className="font-bold text-white mb-2">Retail Accessible</div>
                            <div className="text-sm text-gray-400">0.1 AVAX minimum (~$2.50) enables broad participation</div>
                        </div>
                        <div>
                            <div className="text-5xl mb-3">🔒</div>
                            <div className="font-bold text-white mb-2">Permanent Liquidity</div>
                            <div className="text-sm text-gray-400">LP tokens burned to 0x...dEaD—provably immutable</div>
                        </div>
                        <div>
                            <div className="text-5xl mb-3">👥</div>
                            <div className="font-bold text-white mb-2">Minimal Team Allocation</div>
                            <div className="text-sm text-gray-400">0.4% with 2-year vesting aligns long-term incentives</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
