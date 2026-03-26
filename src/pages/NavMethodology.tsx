import Page from '../components/Page';
import { NavDecisionDiagram } from '../components/ProtocolDiagrams';

export default function NavMethodology() {
    return (
        <Page containerClassName="mx-auto max-w-6xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Methodology</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">NAV methodology</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    The mark should stay disciplined. Exact sales hit immediately. Thin markets get conservative treatment. A loud listing should not be able to cosplay as a real card price.
                </p>
            </div>

            <section className="mt-16">
                <NavDecisionDiagram />
            </section>

            <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
                {[
                    {
                        title: 'Exact trade first',
                        detail: 'If the specific asset was just bought or sold at arm’s length, that execution is the new mark. No smoothing, no averaging, no floor tricks.',
                    },
                    {
                        title: 'Comparable sales second',
                        detail: 'If there is no exact trade, use strong comps from the same venue, same collection, same condition band, and same settlement context whenever possible.',
                    },
                    {
                        title: 'Listing band last',
                        detail: 'If execution data is thin, use a conservative listing band with a capped weekly movement so a single optimistic ask cannot move the book aggressively.',
                    },
                ].map((card) => (
                    <div key={card.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                        <h2 className="text-xl font-semibold text-white">{card.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-white/60">{card.detail}</p>
                    </div>
                ))}
            </section>

            <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">Worked example</div>
                <h2 className="mt-3 text-3xl font-bold text-white">Weekly mark with a cap</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                    {[
                        ['Current mark', '$80,000'],
                        ['Observed comp', '$95,000'],
                        ['Cap used', '15%'],
                        ['Applied mark', '$92,000'],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</div>
                            <div className="mt-2 text-2xl font-black text-white">{value}</div>
                        </div>
                    ))}
                </div>
                <p className="mt-6 text-sm leading-7 text-white/60">
                    The candidate value can move more than the cap only when an exact executed trade resets the mark. Everything else stays conservative by design.
                </p>
            </section>
        </Page>
    );
}
