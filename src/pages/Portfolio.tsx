import Page from '../components/Page';
import { PixelExternalLink, PixelLabel, PixelPanel, PixelSectionFrame } from '../components/PixelUI';
import { PORTFOLIO_PREVIEW, SAMPLE_HISTORY } from '../data/protocol';
import { useFujiPortfolioPositions } from '../hooks/useFujiProof';

function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function SectionHeading({
    eyebrow,
    title,
    body,
}: {
    eyebrow: string;
    title: string;
    body?: string;
}) {
    return (
        <div className="max-w-3xl">
            <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">{eyebrow}</div>
            <h2 className="mt-3 text-3xl font-bold text-[var(--text-main)] md:text-4xl">{title}</h2>
            {body ? <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">{body}</p> : null}
        </div>
    );
}

export default function Portfolio() {
    const proofState = useFujiPortfolioPositions();

    return (
        <Page containerClassName="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
            <section className="grid items-start gap-8 xl:grid-cols-[1.02fr_0.98fr] xl:gap-10">
                <div className="max-w-[42rem]">
                    <div className="pixel-font text-[0.5rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Portfolio</div>
                    <h1 className="mt-5 text-4xl font-bold leading-[0.94] text-[var(--text-main)] sm:text-5xl md:text-6xl xl:text-[4.25rem]">
                        The card universe first. The live stack underneath.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
                        GM10 is built around scarce, high-grade cards with real demand, thin top-grade supply, and cleaner comp history.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <PixelLabel>Target roster</PixelLabel>
                        <PixelLabel tone="warning">{proofState.proofSummary.holdingsChipLabel}</PixelLabel>
                    </div>
                </div>

                <PixelSectionFrame className="pixel-grid">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Live on Fuji</div>
                            <h2 className="mt-3 text-2xl font-bold text-[var(--text-main)]">The stack is already onchain.</h2>
                        </div>
                        <PixelLabel tone="live">Current round live</PixelLabel>
                    </div>

                    <div className="mt-6 grid gap-3 lg:grid-cols-3">
                        <PixelPanel tone="warning">
                            <div className="pixel-font text-[0.42rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Positions</div>
                            <div className="mt-2 text-2xl font-bold text-[var(--text-main)]">{proofState.collectiblePositionCount}</div>
                        </PixelPanel>
                        <PixelPanel>
                            <div className="pixel-font text-[0.42rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Marked value</div>
                            <div className="mt-2 text-2xl font-bold text-[var(--accent-live)]">{proofState.proofSummary.portfolioValueLabel}</div>
                        </PixelPanel>
                        <PixelPanel>
                            <div className="pixel-font text-[0.42rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Cash buffer</div>
                            <div className="mt-2 text-2xl font-bold text-[var(--text-main)]">{proofState.proofSummary.liquidTreasuryLabel}</div>
                        </PixelPanel>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                        {proofState.links.map((link) => (
                            <PixelExternalLink
                                key={link.address}
                                href={link.snowtraceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full justify-between"
                            >
                                <span className="block">
                                    <span className="pixel-font block text-[0.42rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">{link.label}</span>
                                    <span className="mt-2 block text-sm text-[var(--text-soft)]">{formatAddress(link.address)}</span>
                                </span>
                                <span>Snowtrace</span>
                            </PixelExternalLink>
                        ))}
                    </div>
                </PixelSectionFrame>
            </section>

            <section className="mt-12">
                <SectionHeading
                    eyebrow="Target roster"
                    title="Three lanes the fund is built around."
                    body="One grail vintage lane. One blue-chip vintage lane. One premium modern chase lane."
                />

                <div className="mt-8 grid gap-4 xl:grid-cols-3">
                    {PORTFOLIO_PREVIEW.map((item, index) => (
                        <PixelPanel key={item.name} className={`pixel-grid ${index === 0 ? 'pixel-window-warning' : ''}`}>
                            <div className="flex items-center justify-between gap-3">
                                <PixelLabel tone={index === 0 ? 'warning' : 'base'}>{item.status}</PixelLabel>
                                <div className="pixel-font text-[0.44rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">{item.chain}</div>
                            </div>
                            <h2 className="mt-5 text-2xl font-bold text-[var(--text-main)]">{item.name}</h2>
                            <div className="mt-2 text-sm text-[var(--text-soft)]">Where it could trade: {item.venue}</div>
                            <div className="mt-4 text-sm font-bold text-[var(--accent-live)]">Recent public comp: {item.recentComp}</div>
                            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{item.note}</p>
                        </PixelPanel>
                    ))}
                </div>
            </section>

            <section className="mt-12 grid gap-4 xl:grid-cols-2">
                <PixelSectionFrame>
                    <SectionHeading
                        eyebrow="Example buys"
                        title="How buys could look."
                        body="Simple examples, not live buys from the round."
                    />
                    <div className="mt-6 space-y-4">
                        {SAMPLE_HISTORY.buys.map((item) => (
                            <PixelPanel key={`${item.date}-${item.item}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <PixelLabel>Example</PixelLabel>
                                    <div className="text-sm font-bold text-[var(--accent-live)]">{item.amount}</div>
                                </div>
                                <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">{item.item}</h3>
                                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                                    {item.chain} • {item.venue} • {item.date}
                                </p>
                            </PixelPanel>
                        ))}
                    </div>
                </PixelSectionFrame>

                <PixelSectionFrame>
                    <SectionHeading
                        eyebrow="Example sales"
                        title="How sales could look."
                        body="Simple examples, not a record of completed exits."
                    />
                    <div className="mt-6 space-y-4">
                        {SAMPLE_HISTORY.sales.map((item) => (
                            <PixelPanel key={`${item.date}-${item.item}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <PixelLabel>Example</PixelLabel>
                                    <div className={`text-sm font-bold ${item.pnl.startsWith('+') ? 'text-[var(--accent-profit)]' : 'text-[var(--accent-loss)]'}`}>
                                        {item.pnl}
                                    </div>
                                </div>
                                <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">{item.item}</h3>
                                <div className="mt-4 grid gap-3 text-sm text-[var(--text-soft)] sm:grid-cols-3">
                                    <div>
                                        Gross
                                        <div className="mt-1 font-medium text-[var(--text-main)]">{item.gross}</div>
                                    </div>
                                    <div>
                                        Net
                                        <div className="mt-1 font-medium text-[var(--text-main)]">{item.net}</div>
                                    </div>
                                    <div>
                                        Date
                                        <div className="mt-1 font-medium text-[var(--text-main)]">{item.date}</div>
                                    </div>
                                </div>
                            </PixelPanel>
                        ))}
                    </div>
                </PixelSectionFrame>
            </section>
        </Page>
    );
}
