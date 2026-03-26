import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="border-t border-white/5 bg-[#0a0f1c] relative z-10">
            <div className="border-b border-white/[0.04] bg-white/[0.01]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-blue-400/80 uppercase tracking-wider">AI Agent Ready</span>
                            <span className="text-white/25 mx-2">·</span>
                            <span className="text-xs text-white/35">SKILL.md carries the full operating picture for agents, workflows, and protocol context.</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-11 sm:ml-0">
                        <a
                            href="/SKILL.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400/80 text-xs font-semibold hover:bg-blue-500/10 transition-colors duration-200"
                        >
                            SKILL.md →
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-10">
                {/* Brand */}
                <div>
                    <div className="text-white font-bold text-lg mb-2">Gem Mint Strategy</div>
                    <p className="text-white/30 text-sm leading-relaxed">
                        Pokemon grails first. Onchain receipts, wallet reporting, and future governance under the hood.
                    </p>
                </div>

                {/* Navigation */}
                <div>
                    <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Explore</div>
                    <ul className="space-y-2 text-sm text-white/30">
                        {[
                            { to: '/how-it-works', label: 'How It Works' },
                            { to: '/tokenomics', label: 'Tokenomics' },
                            { to: '/fundraising', label: 'Buy' },
                            { to: '/portfolio', label: 'Portfolio' },
                            { to: '/governance', label: 'Governance' },
                            { to: '/nav-methodology', label: 'NAV Methodology' },
                            { to: '/sales-proceeds', label: 'Sales & Proceeds' },
                            { to: '/investor-pnl', label: 'Wallet PnL' },
                            { to: '/faq', label: 'FAQ' },
                        ].map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className="hover:text-white/60 transition-colors duration-150">{label}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Resources */}
                <div>
                    <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Resources</div>
                    <ul className="space-y-2 text-sm text-white/30">
                        <li>
                            <a
                                href="/SKILL.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-400 transition-colors duration-150"
                            >
                                SKILL.md
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://github.com/iJaack/gm10"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-white/60 transition-colors duration-150"
                            >
                                GitHub
                            </a>
                        </li>
                        <li className="pt-1">
                            <span className="text-white/20 text-xs">Fund contract (Fuji):</span>
                            <a
                                href="https://testnet.snowtrace.io/address/0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs font-mono text-white/20 hover:text-blue-400 transition-colors duration-150 truncate mt-0.5"
                            >
                                0xd3E5…F86C
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-white/[0.04] px-6 py-4 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/20">
                <span>&copy; {new Date().getFullYear()} Gem Mint Strategy. Built on Avalanche.</span>
                <span>$CATCH is documented here as the token behind the GM10 card run. Not legal or investment advice.</span>
            </div>
        </footer>
    );
}
