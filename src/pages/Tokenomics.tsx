export default function Tokenomics() {
    const rounds = [
        {
            round: 1,
            month: "Feb 2026",
            duration: "1 month",
            target: "10,000",
            discount: "0% (Fixed)",
            exampleNAV: "0.0025",
            examplePrice: "0.0025",
            catchIssued: "4,000,000"
        },
        {
            round: 2,
            month: "Apr-May 2026",
            duration: "2 months",
            target: "20,000",
            discount: "10%",
            exampleNAV: "0.0030",
            examplePrice: "0.0027",
            catchIssued: "~7,407,407"
        },
        {
            round: 3,
            month: "Sep-Dec 2026",
            duration: "4 months",
            target: "35,000",
            discount: "5%",
            exampleNAV: "0.0036",
            examplePrice: "0.00342",
            catchIssued: "~10,233,918"
        }
    ];

    const distribution = [
        { category: "Round 1 Investors", amount: "4,000,000", percent: 16.7, color: "from-blue-500 to-blue-600" },
        { category: "Round 2 Investors (est)", amount: "~7,407,407", percent: 30.9, color: "from-cyan-500 to-cyan-600" },
        { category: "Round 3 Investors (est)", amount: "~10,233,918", percent: 42.7, color: "from-sky-500 to-sky-600" },
        { category: "Liquidity Pool (Burned)", amount: "400,000", percent: 1.7, color: "from-purple-500 to-purple-600" },
        { category: "Team (6mo cliff, 2yr vest)", amount: "~2,400,000", percent: 10.0, color: "from-pink-500 to-pink-600" }
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
                        Dynamic NAV-based pricing over 3 spaced rounds. 10% team allocation with 6-month cliff. 50% supply reserved for future governance.
                    </p>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                        <div className="text-sm text-gray-400 mb-2">Current Supply</div>
                        <div className="text-3xl font-bold text-white">~24M</div>
                        <div className="text-xs text-gray-500 mt-1">+50% reserve</div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                        <div className="text-sm text-gray-400 mb-2">Fundraising Total</div>
                        <div className="text-3xl font-bold text-white">65,000</div>
                        <div className="text-xs text-gray-500 mt-1">AVAX (3 rounds)</div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                        <div className="text-sm text-gray-400 mb-2">Team Allocation</div>
                        <div className="text-3xl font-bold text-white">10%</div>
                        <div className="text-xs text-gray-500 mt-1">6mo cliff, 2yr vest</div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 text-center">
                        <div className="text-sm text-gray-400 mb-2">LP Tokens</div>
                        <div className="text-3xl font-bold text-white">🔥 Burned</div>
                        <div className="text-xs text-gray-500 mt-1">Permanent liquidity</div>
                    </div>
                </div>

                {/* Fundraising Rounds */}
                <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8 mb-16">
                    <h2 className="text-3xl font-bold mb-8 text-center">3-Round Fundraising Schedule</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-blue-500/30">
                                <tr>
                                    <th className="pb-4 text-gray-400 font-semibold">Round</th>
                                    <th className="pb-4 text-gray-400 font-semibold">Timing</th>
                                    <th className="pb-4 text-gray-400 font-semibold">Target</th>
                                    <th className="pb-4 text-gray-400 font-semibold">Discount</th>
                                    <th className="pb-4 text-gray-400 font-semibold">Example Price</th>
                                    <th className="pb-4 text-gray-400 font-semibold">$CATCH Issued</th>
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
                                        <td className="py-4">
                                            <div className="text-white font-semibold">{r.month}</div>
                                            <div className="text-xs text-gray-400">{r.duration}</div>
                                        </td>
                                        <td className="py-4 font-mono text-white">{r.target} AVAX</td>
                                        <td className="py-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${r.round === 1 ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/20 text-cyan-400'
                                                }`}>
                                                {r.discount}
                                            </span>
                                        </td>
                                        <td className="py-4 font-mono text-cyan-400">{r.examplePrice}</td>
                                        <td className="py-4 font-mono text-white">{r.catchIssued}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                        <p className="text-sm text-gray-300">
                            💡 <strong>Dynamic Pricing:</strong> Rounds 2 and 3 offer discounts on the current NAV at round start. Round 2 = 10% discount, Round 3 = 5% discount. This rewards later investors while maintaining fair pricing tied to portfolio value.
                        </p>
                    </div>
                </div>

                {/* Token Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8">
                        <h3 className="text-2xl font-bold mb-6">Token Distribution (Current)</h3>
                        <div className="space-y-4 mb-6">
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
                        <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl">
                            <div className="text-sm text-orange-300">
                                ⚠️ <strong>Future Expansion:</strong> Up to 50% of final supply is reserved for future rounds controlled by governance. Total supply could reach ~48M $CATCH.
                            </div>
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
                                    <div className="text-sm text-gray-400">Each token represents fractional ownership of 45+ museum-quality cards</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-2xl">
                                    🗳️
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-1">Governance Rights</div>
                                    <div className="text-sm text-gray-400">1 token = 1 vote. 10,000 $CATCH needed to submit proposals</div>
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
                                    <div className="font-bold text-white mb-1">NAV Discounts</div>
                                    <div className="text-sm text-gray-400">Rounds 2-3 offer 10% and 5% discounts on current NAV</div>
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

                {/* Timeline */}
                <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-3xl p-12 mb-16">
                    <h3 className="text-3xl font-bold mb-8 text-center">2026 Roadmap</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className="text-5xl mb-4">📅</div>
                            <div className="font-bold text-white text-xl mb-2">Feb 2026</div>
                            <div className="text-sm text-gray-400 mb-3">Round 1 • 1 Month</div>
                            <div className="text-xs text-gray-500">10K AVAX @ 0.0025 fixed price</div>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl mb-4">📅</div>
                            <div className="font-bold text-white text-xl mb-2">Apr-May 2026</div>
                            <div className="text-sm text-gray-400 mb-3">Round 2 • 2 Months</div>
                            <div className="text-xs text-gray-500">20K AVAX @ 10% NAV discount</div>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl mb-4">📅</div>
                            <div className="font-bold text-white text-xl mb-2">Sep-Dec 2026</div>
                            <div className="text-sm text-gray-400 mb-3">Round 3 • 4 Months</div>
                            <div className="text-xs text-gray-500">35K AVAX @ 5% NAV discount</div>
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
                            <div className="text-sm text-gray-400">0.1 AVAX minimum enables broad participation</div>
                        </div>
                        <div>
                            <div className="text-5xl mb-3">🔒</div>
                            <div className="font-bold text-white mb-2">Team Cliff</div>
                            <div className="text-sm text-gray-400">6-month cliff ensures team commitment through Round 2</div>
                        </div>
                        <div>
                            <div className="text-5xl mb-3">👥</div>
                            <div className="font-bold text-white mb-2">Governance Control</div>
                            <div className="text-sm text-gray-400">50% of supply reserved for future community decisions</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
