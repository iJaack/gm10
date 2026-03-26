import Page from '../components/Page';
import { ProfitWaterfallDiagram, SaleLifecycleDiagram } from '../components/ProtocolDiagrams';

export default function SalesProceeds() {
    return (
        <Page containerClassName="mx-auto max-w-6xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Methodology</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">Sales and proceeds</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    The exit path matters as much as the buy. A slab gets moved, the money comes back, and the split is deterministic instead of hand-wavy.
                </p>
            </div>

            <section className="mt-16">
                <SaleLifecycleDiagram />
            </section>

            <section className="mt-12">
                <ProfitWaterfallDiagram />
            </section>

            <section className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
                {[
                    {
                        title: 'Profitable sale',
                        body: 'Example: cost basis $80,000, net proceeds $110,000. Treasury gets $92,000 after principal-first accounting. The remaining $18,000 is forced into buyback, LP, and reserve buckets.',
                    },
                    {
                        title: 'Breakeven sale',
                        body: 'If net proceeds equal cost basis, everything goes back to treasury. There is no profit split because there is no realized profit to route.',
                    },
                    {
                        title: 'Loss sale',
                        body: 'If an asset exits below cost basis, the entire net proceeds simply return to liquid treasury and the realized loss shows up directly in fund economics and wallet reporting.',
                    },
                ].map((card) => (
                    <div key={card.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                        <h2 className="text-xl font-semibold text-white">{card.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-white/60">{card.body}</p>
                    </div>
                ))}
            </section>

            <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">Why this matters</div>
                <h2 className="mt-3 text-3xl font-bold text-white">Every exit has four consequences</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                    {[
                        'Treasury replenishment',
                        'Buy-side pressure through buybacks',
                        'Permanent liquidity support',
                        'Dedicated redemption resilience',
                    ].map((item) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-semibold text-white/75">
                            {item}
                        </div>
                    ))}
                </div>
            </section>
        </Page>
    );
}
