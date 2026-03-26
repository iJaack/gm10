import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import { FundLifecycleDiagram, RoundOneChart } from '../components/ProtocolDiagrams';
import { PORTFOLIO_PREVIEW, RECENT_CARD_COMPS } from '../data/protocol';

const pillars = [
    {
        title: 'The cards come first',
        description: 'GM10 is built around high-grade Pokemon cards: grails, slabs, provenance, exits, and the thrill of owning a slice of the chase.',
    },
    {
        title: 'Execution rails stay in the background',
        description: 'Courtyard, vault rails, and settlement venues matter because they help source and move cards, not because they are the story.',
    },
    {
        title: 'The scoreboard stays onchain',
        description: 'Buys, exits, proceeds splits, and wallet reporting are documented in public so the card run stays transparent instead of turning into pure trust-me theatre.',
    },
];

export default function Home() {
    return (
        <main>
            <Hero />

            <section className="bg-[#08101c] px-4 py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Live status</div>
                            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">The public buy flow is still testnet</h2>
                        </div>
                        <p className="max-w-2xl text-sm leading-7 text-white/55">
                            The live public page stays on Fuji for now. Mainnet terms and the first real launch round should only be shown once they are actually ready to be announced.
                        </p>
                    </div>
                    <div className="mt-8">
                        <RoundOneChart />
                    </div>
                </div>
            </section>

            <section className="bg-[#0a0f1c] px-4 py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="text-xs uppercase tracking-[0.35em] text-white/35">Protocol overview</div>
                            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">What you are actually getting close to</h2>
                        </div>
                        <Link to="/how-it-works" className="text-sm font-semibold text-sky-300 hover:text-sky-200">
                            Read the full workflow →
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        {pillars.map((pillar) => (
                            <div key={pillar.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                                <h3 className="text-xl font-semibold text-white">{pillar.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-white/60">{pillar.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12">
                        <FundLifecycleDiagram />
                    </div>
                </div>
            </section>

            <section className="bg-[#07111e] px-4 py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10">
                        <div className="text-xs uppercase tracking-[0.35em] text-white/35">Card lane</div>
                        <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">High-grade Pokemon cards stay front and center</h2>
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
                            The venues can change. The chain can change. The target does not. GM10 is still about Pokemon grails with real provenance and visible public comps.
                        </p>
                    </div>

                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {RECENT_CARD_COMPS.map((card) => (
                            <div key={card.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                                <div className="text-sm font-semibold text-white">{card.name}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">{card.grade}</div>
                                <div className="mt-3 text-3xl font-black text-sky-200">{card.priceLabel}</div>
                                <div className="mt-2 text-sm text-white/45">{card.recencyLabel}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        {PORTFOLIO_PREVIEW.map((item) => (
                            <div key={item.name} className="rounded-3xl border border-white/10 bg-[#0b1322] p-6">
                                <div className="flex items-center justify-between">
                                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
                                        {item.chain}
                                    </span>
                                    <span className="text-xs uppercase tracking-[0.3em] text-white/30">{item.status}</span>
                                </div>
                                <h3 className="mt-4 text-xl font-semibold text-white">{item.name}</h3>
                                <div className="mt-2 text-sm text-white/40">{item.venue}</div>
                                <div className="mt-2 text-sm font-semibold text-sky-200">Recent public comp: {item.recentComp}</div>
                                <p className="mt-4 text-sm leading-7 text-white/60">{item.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#0a0f1c] px-4 py-24">
                <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center">
                    <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Documentation-first website</div>
                    <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">The mechanics are part of the product</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/55">
                        The site breaks down the card flow, the sale flow, the token split, and the wallet view in public instead of hiding the interesting parts behind generic fund language.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link to="/tokenomics" className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-3 font-semibold text-white">
                            Explore tokenomics
                        </Link>
                        <Link to="/nav-methodology" className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-white/75 hover:text-white">
                            Read NAV policy
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
