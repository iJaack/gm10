import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="border-t border-white/5 bg-[#0a0f1c] relative z-10">
            {/* AI Agent Ready Banner */}
            <div className="border-b border-cyan-500/10 bg-cyan-500/5">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xl">🤖</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-cyan-400 uppercase tracking-wider">AI Agent Ready</span>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 uppercase tracking-wider">SKILL.md</span>
                            </div>
                            <p className="text-sm text-white/50 max-w-lg">
                                This platform is fully readable and operable by AI agents. Contracts, ABIs, token gate logic, and governance workflows are all documented.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-14 sm:ml-0">
                        <a
                            href="/SKILL.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-colors duration-200"
                        >
                            SKILL.md →
                        </a>
                        <a
                            href="/docs/agent-integration.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white/60 text-sm font-semibold hover:bg-white/10 hover:text-white/80 transition-colors duration-200"
                        >
                            Full Docs →
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-10">
                {/* Brand */}
                <div>
                    <div className="text-white font-bold text-lg mb-2">Gem Mint Strategy</div>
                    <p className="text-white/40 text-sm leading-relaxed">
                        Tokenized exposure to the high-end graded Pokémon card market. Transparent, liquid, governed onchain.
                    </p>
                </div>

                {/* Navigation */}
                <div>
                    <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Explore</div>
                    <ul className="space-y-2 text-sm text-white/40">
                        {[
                            { to: '/how-it-works', label: 'How It Works' },
                            { to: '/tokenomics', label: 'Tokenomics' },
                            { to: '/fundraising', label: 'Fundraising' },
                            { to: '/portfolio', label: 'Portfolio' },
                            { to: '/governance', label: 'Governance' },
                            { to: '/faq', label: 'FAQ' },
                        ].map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className="hover:text-white/70 transition-colors duration-150">{label}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Agent Integration */}
                <div>
                    <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Agent Integration</div>
                    <ul className="space-y-2 text-sm text-white/40">
                        <li>
                            <a
                                href="/SKILL.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-cyan-400 transition-colors duration-150"
                            >
                                SKILL.md — Quick Reference
                            </a>
                        </li>
                        <li>
                            <a
                                href="/docs/agent-integration.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-cyan-400 transition-colors duration-150"
                            >
                                Full ABI & Workflow Docs
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://github.com/iJaack/gm10"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-white/70 transition-colors duration-150"
                            >
                                GitHub Repo
                            </a>
                        </li>
                        <li className="pt-1">
                            <span className="text-white/30 text-xs">Fund contract (Fuji):</span>
                            <a
                                href="https://testnet.snowtrace.io/address/0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs font-mono text-white/30 hover:text-cyan-400 transition-colors duration-150 truncate mt-0.5"
                            >
                                0xd3E5…83d3
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-white/5 px-6 py-4 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/25">
                <span>&copy; {new Date().getFullYear()} Gem Mint Strategy. Built on Avalanche.</span>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    AI Agent Ready · <a href="/SKILL.md" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">SKILL.md</a>
                </span>
            </div>
        </footer>
    );
}
