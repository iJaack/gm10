import Page from '../components/Page';
import { FAQ_TOPICS } from '../data/protocol';

export default function FAQ() {
    return (
        <Page containerClassName="mx-auto max-w-4xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">FAQ</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">Frequently asked questions</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    The point here is to answer the real questions without sanding all the personality off the product.
                </p>
            </div>

            <div className="mt-16 space-y-4">
                {FAQ_TOPICS.map((faq) => (
                    <details key={faq.question} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                        <summary className="cursor-pointer list-none text-xl font-semibold text-white">
                            {faq.question}
                        </summary>
                        <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-white/60">
                            {faq.answer}
                        </p>
                    </details>
                ))}
            </div>

            <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">More detail</div>
                <h2 className="mt-3 text-3xl font-bold text-white">Where to go next</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[
                        ['NAV Methodology', '/nav-methodology'],
                        ['Sales & Proceeds', '/sales-proceeds'],
                        ['Wallet PnL', '/investor-pnl'],
                    ].map(([label, href]) => (
                        <a key={label} href={href} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-semibold text-white/75 hover:text-white">
                            {label} →
                        </a>
                    ))}
                </div>
            </section>
        </Page>
    );
}
