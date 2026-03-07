import Page from '../components/Page';

export default function Tokenomics() {
    // Note: "exampleNAV" here is the projected per-token price, NOT the contract's
    // navPerToken (which initializes to 1 AVAX). The round 1 token price of 0.0025 AVAX
    // means 1 AVAX buys 400 CATCH. The contract NAV (1 AVAX/CATCH) reflects total
    // assets / supply and will diverge from round pricing once cards are acquired.
    const rounds = [
        {
            round: 1,
            month: "Q1 2026",
            duration: "1 month",
            target: "10,000",
            discount: "Fixed Price",
            exampleNAV: "0.0025",
            examplePrice: "0.0025",
            catchIssued: "4,000,000"
        },
        {
            round: 2,
            month: "Q2 2026",
            duration: "2 months",
            target: "20,000",
            discount: "Standard",
            exampleNAV: "0.0030",
            examplePrice: "0.0027",
            catchIssued: "~7,407,407"
        },
        {
            round: 3,
            month: "Q3-Q4 2026",
            duration: "4 months",
            target: "35,000",
            discount: "Standard",
            exampleNAV: "0.0036",
            examplePrice: "0.00342",
            catchIssued: "~10,233,918"
        }
    ];

    const distribution = [
        { category: "Round 1 Investors", amount: "4,000,000", percent: 16.7, color: "from-blue-500 to-blue-600" },
        { category: "Round 2 Investors (est)", amount: "~7,407,407", percent: 30.9, color: "from-blue-400 to-blue-600" },
        { category: "Round 3 Investors (est)", amount: "~10,233,918", percent: 42.7, color: "from-sky-500 to-sky-600" },
        { category: "Liquidity Pool (Burned)", amount: "400,000", percent: 1.7, color: "from-purple-500 to-purple-600" },
        { category: "Team (6mo cliff, 2yr vest)", amount: "~2,400,000", percent: 10.0, color: "from-pink-500 to-pink-600" }
    ];

    return (
        <Page containerClassName="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        $CATCH <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">Tokenomics</span>
                    </h1>
                    <p className="text-sm text-gray-300">💡 <strong>Round Pricing:</strong> Each round has a fixed token price set at round start. Later rounds may reflect updated portfolio valuations.</p>
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
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-blue-400"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-1">Membership Rights</div>
                                    <div className="text-sm text-gray-400">Access and participate in a curated collector community onchain</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-blue-400"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                                </div>
                                <div>
                                    <div className="font-bold text-white mb-1">Governance Rights</div>
                                    <div className="text-sm text-gray-400">1 token = 1 vote. 10,000 $CATCH needed to submit proposals</div>
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
                            <div className="text-4xl font-bold text-white mb-2">—</div>
                            <div className="text-sm font-semibold text-gray-300 mb-2">Operations Contribution</div>
                            <div className="text-xs text-gray-400">Defined by governance. No carry structure.</div>
                        </div>
                        <div className="text-center p-6 bg-blue-900/20 rounded-xl border border-blue-500/30">
                            <div className="text-4xl font-bold text-white mb-2">0.5%</div>
                            <div className="text-sm font-semibold text-gray-300 mb-2">Redemption Fee</div>
                            <div className="text-xs text-gray-400">On direct NAV redemptions (when enabled)</div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-gradient-to-r from-blue-900/20 to-blue-900/20 border border-blue-500/30 rounded-3xl p-12 mb-16">
                    <h3 className="text-3xl font-bold mb-8 text-center">2026 Roadmap</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { quarter: "Q1 2026", label: "Round 1 • 1 Month", detail: "10K AVAX @ 0.0025 fixed price", num: "1" },
                            { quarter: "Q2 2026", label: "Round 2 • 2 Months", detail: "20K AVAX @ 10% NAV discount", num: "2" },
                            { quarter: "Q3-Q4 2026", label: "Round 3 • 4 Months", detail: "35K AVAX @ 5% NAV discount", num: "3" },
                        ].map((r) => (
                            <div key={r.num} className="text-center">
                                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-black text-blue-400">R{r.num}</span>
                                </div>
                                <div className="font-bold text-white text-xl mb-2">{r.quarter}</div>
                                <div className="text-sm text-gray-400 mb-3">{r.label}</div>
                                <div className="text-xs text-gray-500">{r.detail}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Investment Limits */}
                <div className="bg-gradient-to-r from-blue-900/20 to-blue-900/20 border border-blue-500/30 rounded-3xl p-12 text-center">
                    <h3 className="text-3xl font-bold mb-6">Fair Launch Mechanism</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-400"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            </div>
                            <div>
                                <div className="font-bold text-white mb-1">Anti-Whale Protection</div>
                                <div className="text-sm text-gray-400">200 AVAX max per wallet per round prevents concentration</div>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-400"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                            </div>
                            <div>
                                <div className="font-bold text-white mb-1">Retail Accessible</div>
                                <div className="text-sm text-gray-400">0.1 AVAX minimum enables broad participation</div>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-purple-400"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                            </div>
                            <div>
                                <div className="font-bold text-white mb-1">Team Cliff</div>
                                <div className="text-sm text-gray-400">6-month cliff ensures team commitment through Round 2</div>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-sky-400"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>
                            </div>
                            <div>
                                <div className="font-bold text-white mb-1">Governance Control</div>
                                <div className="text-sm text-gray-400">50% of supply reserved for future community decisions</div>
                            </div>
                        </div>
                    </div>
                </div>
        </Page>
    );
}
