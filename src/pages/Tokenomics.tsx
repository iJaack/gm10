import Page from '../components/Page';
import { ProfitWaterfallDiagram, TokenAllocationDiagram } from '../components/ProtocolDiagrams';
import { TOKEN_ALLOCATION, TOKEN_RELEASE_RULES, WATERFALL } from '../data/protocol';

const tokenUtility = [
    {
        title: 'Vote on the lane',
        detail: 'CATCH is the vote on what gets chased, what gets sold, and how later rounds are shaped once governance opens up.',
    },
    {
        title: 'Track the scoreboard',
        detail: 'The token sits next to the onchain picture: card targets, exits, realized proceeds, and the wallet view.',
    },
    {
        title: 'Anchor the market',
        detail: 'As the system grows, CATCH also sits in the liquidity and buy-side mechanics that support the broader loop.',
    },
] as const;

export default function Tokenomics() {
    return (
        <Page containerClassName="mx-auto max-w-6xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Economics</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">$CATCH tokenomics</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    CATCH is built so the biggest share of supply goes to the rounds. Team, treasury, and ecosystem buckets matter, but they should never drown out the public distribution story.
                </p>
            </div>

            <section className="mt-16">
                <TokenAllocationDiagram />
            </section>

            <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
                {tokenUtility.map((item) => (
                    <div key={item.title} className="rounded-3xl border border-white/10 bg-[#0b1322] p-6">
                        <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-white/60">{item.detail}</p>
                    </div>
                ))}
            </section>

            <section className="mt-16 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">Release rules</div>
                <h2 className="mt-3 text-3xl font-bold text-white">Not all supply hits at once</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {TOKEN_RELEASE_RULES.map(([label, detail]) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                            <div className="text-sm font-semibold text-white">{label}</div>
                            <p className="mt-2 text-sm leading-6 text-white/55">{detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-16">
                <div className="mb-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-white/35">Realized profit</div>
                    <h2 className="mt-3 text-3xl font-bold text-white">Principal first, then the 40 / 25 / 20 / 15 split</h2>
                </div>
                <ProfitWaterfallDiagram />
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {WATERFALL.map((slice) => (
                        <div key={slice.label} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                            <div className="text-sm font-semibold text-white">{slice.label}</div>
                            <div className="mt-2 text-3xl font-black text-sky-200">{slice.percent}%</div>
                            <p className="mt-3 text-sm leading-6 text-white/55">
                                {slice.label === 'Treasury reinvestment'
                                    ? 'Keeps the chase alive after principal comes back.'
                                    : slice.label === 'Buyback and burn'
                                        ? 'Turns profitable exits into structural buy-side pressure.'
                                        : slice.label === 'CATCH / AVAX LP'
                                            ? 'Builds real depth around the token instead of leaving it thin.'
                                            : 'Creates a dedicated buffer for redemptions and stress.'}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-16 rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">Worked example</div>
                <h2 className="mt-3 text-3xl font-bold text-white">A profitable sale</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
                    {[
                        ['Cost basis', '$80,000'],
                        ['Net proceeds', '$110,000'],
                        ['Treasury', '$92,000'],
                        ['Buyback', '$7,500'],
                        ['LP / reserve', '$10,500'],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</div>
                            <div className="mt-2 text-2xl font-black text-white">{value}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-16 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
                <div className="text-xs uppercase tracking-[0.35em] text-white/35">Allocation recap</div>
                <h2 className="mt-3 text-3xl font-bold text-white">The rounds still own the biggest lane</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {TOKEN_ALLOCATION.map((slice) => (
                        <div key={slice.label} className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                            <div className="text-sm font-semibold text-white">{slice.label}</div>
                            <div className="mt-2 text-3xl font-black text-sky-200">{slice.percent}%</div>
                        </div>
                    ))}
                </div>
            </section>
        </Page>
    );
}
