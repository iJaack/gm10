import Page from '../components/Page';
import { PORTFOLIO_PREVIEW, SAMPLE_HISTORY } from '../data/protocol';

export default function Portfolio() {
    return (
        <Page containerClassName="mx-auto max-w-6xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Portfolio</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">Card lanes, history, and realized proceeds</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    The point is not to hide behind generic portfolio language. This page is where the card lanes, the public comps, and the exit trail should become legible.
                </p>
            </div>

            <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
                {PORTFOLIO_PREVIEW.map((item) => (
                    <div key={item.name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                        <div className="flex items-center justify-between">
                            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
                                {item.chain}
                            </span>
                            <span className="text-xs uppercase tracking-[0.3em] text-white/30">{item.venue}</span>
                                </div>
                                <h2 className="mt-4 text-xl font-semibold text-white">{item.name}</h2>
                                <div className="mt-2 text-sm font-semibold text-sky-200">Recent public comp: {item.recentComp}</div>
                                <p className="mt-4 text-sm leading-7 text-white/60">{item.note}</p>
                            </div>
                        ))}
            </section>

            <section className="mt-12 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                    <div className="text-xs uppercase tracking-[0.35em] text-white/35">Buy history</div>
                    <h2 className="mt-3 text-3xl font-bold text-white">Acquisitions</h2>
                    <div className="mt-6 space-y-4">
                        {SAMPLE_HISTORY.buys.map((item) => (
                            <div key={`${item.date}-${item.item}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-lg font-semibold text-white">{item.item}</div>
                                    <div className="text-sm text-sky-200">{item.amount}</div>
                                </div>
                                <div className="mt-2 text-sm text-white/45">{item.chain} • {item.venue} • {item.date}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                    <div className="text-xs uppercase tracking-[0.35em] text-white/35">Sale history</div>
                    <h2 className="mt-3 text-3xl font-bold text-white">Realized exits</h2>
                    <div className="mt-6 space-y-4">
                        {SAMPLE_HISTORY.sales.map((item) => (
                            <div key={`${item.date}-${item.item}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-lg font-semibold text-white">{item.item}</div>
                                    <div className={`text-sm font-semibold ${item.pnl.startsWith('+') ? 'text-emerald-300' : 'text-rose-300'}`}>
                                        {item.pnl}
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-white/50 md:grid-cols-3">
                                    <div>Gross: <span className="text-white/75">{item.gross}</span></div>
                                    <div>Net: <span className="text-white/75">{item.net}</span></div>
                                    <div>Date: <span className="text-white/75">{item.date}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">Data model</div>
                <h2 className="mt-3 text-3xl font-bold text-white">What the live V3 portfolio page will expose</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                        'Chain and marketplace metadata',
                        'Acquisition and disposal timestamps',
                        'Cost basis, current mark, and realized proceeds',
                        'Proof references and custody mode',
                    ].map((item) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-[#0b1322] p-4 text-sm font-semibold text-white/75">
                            {item}
                        </div>
                    ))}
                </div>
            </section>
        </Page>
    );
}
