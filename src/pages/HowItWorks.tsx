import { Link } from 'react-router-dom';
import Page from '../components/Page';
import { FundLifecycleDiagram, SaleLifecycleDiagram } from '../components/ProtocolDiagrams';
import { PURCHASE_FLOW, SALE_FLOW } from '../data/protocol';

const cardRun = [
    'The live Buy page stays on Fuji until the public mainnet launch is genuinely ready.',
    'GM10 still aims straight at high-grade Pokemon cards, not generic collectible clutter.',
    'Early on, card targets are shaped by manager conviction plus community input before the governance flow gets heavier in rounds 2 and 3.',
    'Execution can happen through tokenized rails or settlement venues, but the slab, the provenance, and the exit are the real center of gravity.',
    'The scoreboard for buys, exits, proceeds, and wallet reporting routes back to Avalanche so the whole run stays legible.',
] as const;

export default function HowItWorks() {
    return (
        <Page containerClassName="mx-auto max-w-6xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Protocol mechanics</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">How GM10 actually moves</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    This is still a Pokemon-first product. The rails can be modern. The card targets are still slabs, grails, and blue-chip cardboard with real provenance.
                </p>
            </div>

            <section className="mt-16">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <div className="text-xs uppercase tracking-[0.35em] text-white/35">Buy workflow</div>
                        <h2 className="mt-3 text-3xl font-bold text-white">How a target card gets pulled in</h2>
                    </div>
                    <Link to="/fundraising" className="text-sm font-semibold text-sky-300 hover:text-sky-200">
                        Go to Buy →
                    </Link>
                </div>
                <FundLifecycleDiagram />
                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {PURCHASE_FLOW.map((step) => (
                        <div key={step.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                            <p className="mt-3 text-sm leading-7 text-white/60">{step.detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-16">
                <div className="mb-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-white/35">Exit workflow</div>
                    <h2 className="mt-3 text-3xl font-bold text-white">How a card gets moved out</h2>
                </div>
                <SaleLifecycleDiagram />
                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {SALE_FLOW.map((step) => (
                        <div key={step.title} className="rounded-3xl border border-white/10 bg-[#0b1322] p-5">
                            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                            <p className="mt-3 text-sm leading-7 text-white/60">{step.detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-16 rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">The card run</div>
                <h2 className="mt-3 text-3xl font-bold text-white">What this means when you hold CATCH</h2>
                <div className="mt-6 space-y-4">
                    {cardRun.map((item, index) => (
                        <div key={item} className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-sm font-semibold text-sky-200">
                                {index + 1}
                            </div>
                            <p className="text-sm leading-7 text-white/60">{item}</p>
                        </div>
                    ))}
                </div>
            </section>
        </Page>
    );
}
