import Page from '../components/Page';
import { PixelDivider, PixelLabel, PixelLedgerRow, PixelMediaFrame, PixelStatRail } from '../components/PixelUI';
import { PORTFOLIO_PREVIEW, RECENT_CARD_COMPS, SAMPLE_HISTORY } from '../data/protocol';
import { useFujiPortfolioPositions } from '../hooks/useFujiProof';

function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Portfolio() {
    const proofState = useFujiPortfolioPositions();

    return (
        <Page containerClassName="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
            <section className="grid gap-12 xl:grid-cols-[0.72fr_1.28fr] xl:items-end">
                <div className="max-w-[40rem]">
                    <div className="pixel-font text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Portfolio</div>
                    <h1 className="mt-5 font-['Oxanium'] text-5xl font-semibold leading-[0.92] text-[var(--text-main)] md:text-6xl xl:max-w-[11.5ch]">
                        The card universe first. The live stack underneath.
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-soft)]">
                        GM10 targets scarce, high-grade cards with visible demand, thin top-grade supply, and cleaner comp history.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <PixelLabel tone="warning">Target roster</PixelLabel>
                        <PixelLabel tone="live">{proofState.proofSummary.holdingsChipLabel}</PixelLabel>
                    </div>
                </div>

                <div className="grid gap-6">
                    <PixelStatRail
                        items={[
                            { label: 'Positions', value: proofState.collectiblePositionCount, tone: 'warning' },
                            { label: 'Marked value', value: proofState.proofSummary.portfolioValueLabel, tone: 'live' },
                            { label: 'Cash buffer', value: proofState.proofSummary.liquidTreasuryLabel },
                        ]}
                    />
                    <div className="border-t border-white/8 pt-5">
                        <div className="pixel-font text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Live on Fuji</div>
                        <div className="mt-5 border-y border-white/8">
                            {proofState.links.map((link) => (
                                <PixelLedgerRow key={link.address}>
                                    <div className="grid gap-3 md:grid-cols-[170px_1fr_auto] md:items-center">
                                        <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">{link.label}</div>
                                        <div className="text-sm text-[var(--text-soft)]">{formatAddress(link.address)}</div>
                                        <a
                                            href={link.snowtraceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm font-medium text-[var(--accent-live)]"
                                        >
                                            Snowtrace
                                        </a>
                                    </div>
                                </PixelLedgerRow>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-16">
                <PixelDivider label="Target universe" />
                <div className="mt-8 grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
                    <PixelMediaFrame
                        eyebrow="Grail vintage"
                        title={RECENT_CARD_COMPS[0].name}
                        caption={`${RECENT_CARD_COMPS[0].grade} • ${RECENT_CARD_COMPS[0].priceLabel}`}
                    >
                        <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr] lg:items-center">
                            <img
                                src={RECENT_CARD_COMPS[0].imageSrc}
                                alt={RECENT_CARD_COMPS[0].imageAlt}
                                className="aspect-[4/5] w-full rounded-[22px] object-cover"
                            />
                            <div className="px-2 pb-2">
                                <div className="pixel-font text-[0.68rem] uppercase tracking-[0.18em] text-[var(--accent-warning)]">
                                    Premium lane
                                </div>
                                <p className="mt-4 text-base leading-8 text-[var(--text-soft)]">
                                    The fund’s top-end lane: iconic vintage slabs, clear provenance, and visible premiums at the highest grades.
                                </p>
                            </div>
                        </div>
                    </PixelMediaFrame>

                    <div className="grid gap-6">
                        {PORTFOLIO_PREVIEW.slice(1).map((item, index) => (
                            <article key={item.name} className="border-t border-white/10 pt-5">
                                <div className="flex flex-wrap items-center gap-3">
                                    <PixelLabel tone={index === 0 ? 'live' : 'warning'}>{item.status}</PixelLabel>
                                    <span className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">{item.chain}</span>
                                </div>
                                <h3 className="mt-4 font-['Oxanium'] text-3xl font-semibold text-[var(--text-main)]">{item.name}</h3>
                                <div className="mt-3 text-sm leading-7 text-[var(--text-soft)]">Where it could trade: {item.venue}</div>
                                <div className="mt-3 text-sm font-semibold text-[var(--accent-live)]">Recent public comp: {item.recentComp}</div>
                                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{item.note}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-16 grid gap-12 xl:grid-cols-[0.95fr_1.05fr] xl:gap-16">
                <div>
                    <PixelDivider label="Example buys" />
                    <h2 className="mt-6 font-['Oxanium'] text-4xl font-semibold text-[var(--text-main)]">How buys could look.</h2>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
                        Simple examples, not live buys from the round.
                    </p>
                    <div className="mt-8 border-y border-white/8">
                        {SAMPLE_HISTORY.buys.map((item, index) => (
                            <PixelLedgerRow key={`${item.date}-${item.item}`}>
                                <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)_auto] lg:items-start lg:gap-8">
                                    <PixelLabel tone={index === 0 ? 'warning' : 'live'}>{item.date}</PixelLabel>
                                    <div>
                                        <h3 className="font-['Oxanium'] text-2xl font-semibold text-[var(--text-main)]">{item.item}</h3>
                                        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                                            {item.chain} • {item.venue}
                                        </p>
                                    </div>
                                    <div className="text-lg font-semibold text-[var(--accent-live)]">{item.amount}</div>
                                </div>
                            </PixelLedgerRow>
                        ))}
                    </div>
                </div>

                <div>
                    <PixelDivider label="Example sales" />
                    <h2 className="mt-6 font-['Oxanium'] text-4xl font-semibold text-[var(--text-main)]">How sales could look.</h2>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
                        Simple examples, not real exits. The gain or loss number compares the sale with the original buy after fees.
                    </p>
                    <div className="mt-8 border-y border-white/8">
                        {SAMPLE_HISTORY.sales.map((item) => (
                            <PixelLedgerRow key={`${item.date}-${item.item}`}>
                                <div className="grid gap-5">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <h3 className="font-['Oxanium'] text-2xl font-semibold text-[var(--text-main)]">{item.item}</h3>
                                        <div className={`text-sm font-semibold ${item.pnl.startsWith('+') ? 'text-[var(--accent-profit)]' : 'text-[var(--accent-loss)]'}`}>
                                            {item.pnl.startsWith('+') ? 'Gain ' : 'Loss '}
                                            {item.pnl}
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div>
                                            <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Sale price</div>
                                            <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{item.gross}</div>
                                        </div>
                                        <div>
                                            <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">After fees</div>
                                            <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{item.net}</div>
                                        </div>
                                        <div>
                                            <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Type</div>
                                            <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{item.date}</div>
                                        </div>
                                    </div>
                                </div>
                            </PixelLedgerRow>
                        ))}
                    </div>
                </div>
            </section>
        </Page>
    );
}
