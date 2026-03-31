import Hero from '../components/Hero';
import {
    FundLifecycleDiagram,
    InvestorPnlDiagram,
    NavDecisionDiagram,
    ProfitWaterfallDiagram,
    SaleLifecycleDiagram,
    TokenAllocationDiagram,
} from '../components/ProtocolDiagrams';
import { PixelExternalLink, PixelLabel, PixelMenuLink, PixelPanel, PixelSectionFrame } from '../components/PixelUI';
import {
    EXPOSURE_STEPS,
    SITE_LINKS,
    THESIS_EVIDENCE,
    THESIS_PILLARS,
} from '../data/protocol';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';

function SectionLead({
    eyebrow,
    title,
    body,
}: {
    eyebrow: string;
    title: string;
    body: string;
}) {
    return (
        <div className="max-w-3xl">
            <div className="pixel-font text-[0.5rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">{eyebrow}</div>
            <h2 className="mt-4 text-3xl font-bold text-[var(--text-main)] md:text-5xl">{title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] md:text-base">{body}</p>
        </div>
    );
}

export default function Home() {
    const roundState = useFujiRoundState();
    const proofState = useFujiPortfolioPositions();

    return (
        <main>
            <Hero />

            <section id="why-gm10" className="px-4 py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <SectionLead
                        eyebrow="Why GM10"
                        title="The top end of the market is hard to reach alone."
                        body="The upside sits in iconic cards, scarce grades, and expensive slabs. GM10 turns that into shared exposure so people do not have to build and manage that card book on their own."
                    />

                    <div className="mt-10 grid gap-4 xl:grid-cols-[1.05fr_0.95fr_1fr]">
                        {THESIS_PILLARS.map((pillar, index) => (
                            <PixelPanel key={pillar.title} className={`pixel-grid ${index === 1 ? 'pixel-window-live' : ''}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <PixelLabel tone={index === 1 ? 'live' : 'base'}>0{index + 1}</PixelLabel>
                                    <div className="pixel-font text-[0.48rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Field note</div>
                                </div>
                                <h3 className="mt-5 text-2xl font-bold text-[var(--text-main)]">{pillar.title}</h3>
                                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{pillar.body}</p>
                            </PixelPanel>
                        ))}
                    </div>
                </div>
            </section>

            <section id="evidence" className="border-y border-[rgba(193,218,191,0.08)] px-4 py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <SectionLead
                        eyebrow="Evidence"
                        title="The thesis already has visible scarcity and visible premiums."
                        body="GM10 is not betting on nostalgia alone. The card, the grade, and the collector demand already show up in public sales and population data. Market evidence, not guaranteed results."
                    />

                    <div className="mt-10 grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
                        {THESIS_EVIDENCE.map((stat) => (
                            <PixelPanel key={stat.label} className="pixel-grid min-h-[18rem]">
                                <div className="pixel-font text-[0.46rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">{stat.label}</div>
                                <div className="mt-5 text-4xl font-bold text-[var(--accent-live)]">{stat.value}</div>
                                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{stat.takeaway}</p>
                                <a
                                    href={stat.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-live)] transition-colors hover:text-[var(--text-main)]"
                                >
                                    <span className="pixel-font text-[0.44rem]">►</span>
                                    <span>{stat.sourceLabel}</span>
                                </a>
                            </PixelPanel>
                        ))}
                    </div>

                </div>
            </section>

            <section id="how-it-works" className="px-4 py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <SectionLead
                        eyebrow="How GM10 works"
                        title="Join the round. GM10 buys the slabs. $CATCH stays tied to the run."
                        body="The product is simple on purpose. People enter the round, GM10 targets elite cards, and the token stays next to the full strategy instead of one person having to build a card portfolio alone."
                    />

                    <div className="mt-10 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
                        <div className="grid gap-4">
                            {EXPOSURE_STEPS.map((step, index) => (
                                <PixelPanel key={step.title}>
                                    <div className="flex items-center gap-3">
                                        <PixelLabel tone={index === 0 ? 'live' : index === 1 ? 'warning' : 'profit'}>Step {index + 1}</PixelLabel>
                                        <div className="text-xl font-bold text-[var(--text-main)]">{step.title}</div>
                                    </div>
                                    <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{step.body}</p>
                                </PixelPanel>
                            ))}
                        </div>
                        <PixelSectionFrame className="pixel-grid">
                            <FundLifecycleDiagram />
                        </PixelSectionFrame>
                    </div>
                </div>
            </section>

            <section className="border-y border-[rgba(193,218,191,0.08)] px-4 py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <SectionLead
                        eyebrow="System handbook"
                        title="The token, marks, exits, wallet view, and governance all stay in one public system."
                        body="The mechanics are compact, but they still need discipline. GM10 keeps the token model, pricing logic, sale path, wallet view, and governance roadmap visible in the open."
                    />

                    <div className="mt-10 grid gap-4 2xl:grid-cols-[1.05fr_1fr]">
                        <PixelSectionFrame id="token">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="pixel-font text-[0.48rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Token</div>
                                    <h3 className="mt-3 text-2xl font-bold text-[var(--text-main)]">$CATCH follows the full strategy.</h3>
                                </div>
                                <PixelLabel tone="live">Live token layer</PixelLabel>
                            </div>
                            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                                You do not need to buy the slabs yourself to get exposure to the strategy.
                            </p>
                            <div className="mt-6">
                                <TokenAllocationDiagram />
                            </div>
                        </PixelSectionFrame>

                        <PixelSectionFrame id="pricing">
                            <div className="pixel-font text-[0.48rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Pricing</div>
                            <h3 className="mt-3 text-2xl font-bold text-[var(--text-main)]">Marks stay strict when the market gets thin.</h3>
                            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                                Real trades reset value first. Strong comps come next. Soft estimates stay capped.
                            </p>
                            <div className="mt-6">
                                <NavDecisionDiagram />
                            </div>
                        </PixelSectionFrame>

                        <PixelSectionFrame id="exits">
                            <div className="pixel-font text-[0.48rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Exits</div>
                            <h3 className="mt-3 text-2xl font-bold text-[var(--text-main)]">Sale money comes home before anything else.</h3>
                            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                                Principal gets restored first. Realized profit then routes into treasury, buyback, LP, and reserve buckets.
                            </p>
                            <div className="mt-6 space-y-6">
                                <SaleLifecycleDiagram />
                                <ProfitWaterfallDiagram />
                            </div>
                        </PixelSectionFrame>

                        <div className="grid gap-4">
                            <PixelSectionFrame id="wallet">
                                <div className="pixel-font text-[0.48rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Wallet</div>
                                <h3 className="mt-3 text-2xl font-bold text-[var(--text-main)]">The wallet only shows what GM10 can prove.</h3>
                                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                                    Direct buys create basis. Attributable holdings sit against the latest mark.
                                </p>
                                <div className="mt-6">
                                    <InvestorPnlDiagram />
                                </div>
                            </PixelSectionFrame>

                            <PixelSectionFrame id="governance">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="pixel-font text-[0.48rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Governance</div>
                                        <h3 className="mt-3 text-2xl font-bold text-[var(--text-main)]">The community gets more control as the stack hardens.</h3>
                                    </div>
                                    <PixelLabel tone="warning">Phased</PixelLabel>
                                </div>
                                <div className="mt-5 grid gap-3 md:grid-cols-3">
                                    {[
                                        ['Round 1', 'Manager-led, with community input.'],
                                        ['Rounds 2-3', 'Hybrid lane for targets and new rounds.'],
                                        ['Later', 'Heavier onchain control.'],
                                    ].map(([title, body]) => (
                                        <div key={title} className="border border-[rgba(193,218,191,0.1)] bg-[rgba(232,240,227,0.03)] p-4">
                                            <div className="pixel-font text-[0.45rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">{title}</div>
                                            <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{body}</p>
                                        </div>
                                    ))}
                                </div>
                            </PixelSectionFrame>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <PixelSectionFrame className="pixel-grid">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl">
                                <div className="pixel-font text-[0.5rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Fuji</div>
                                <h2 className="mt-4 text-3xl font-bold text-[var(--text-main)] md:text-5xl">The mechanics are already live in public.</h2>
                                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                                    The fund thesis leads. Fuji already shows a live round and recorded onchain positions.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <PixelLabel tone={roundState.round?.isActive ? 'live' : 'warning'}>{roundState.status}</PixelLabel>
                                <PixelLabel tone="warning">{proofState.proofSummary.holdingsChipLabel}</PixelLabel>
                                <PixelLabel>{proofState.proofSummary.portfolioValueLabel} marked value</PixelLabel>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-4">
                            <PixelPanel>
                                <div className="pixel-font text-[0.45rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Live round</div>
                                <div className="mt-3 text-3xl font-bold text-[var(--text-main)]">Round {roundState.roundId}</div>
                            </PixelPanel>
                            <PixelPanel>
                                <div className="pixel-font text-[0.45rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Raised</div>
                                <div className="mt-3 text-3xl font-bold text-[var(--text-main)]">{roundState.raisedLabel}</div>
                            </PixelPanel>
                            <PixelPanel>
                                <div className="pixel-font text-[0.45rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Target</div>
                                <div className="mt-3 text-3xl font-bold text-[var(--text-main)]">{roundState.targetLabel}</div>
                            </PixelPanel>
                            <PixelPanel tone="live">
                                <div className="pixel-font text-[0.45rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Stack link</div>
                                <a
                                    href={proofState.links[0]?.snowtraceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center gap-2 text-lg font-bold text-[var(--accent-live)] transition-colors hover:text-[var(--text-main)]"
                                >
                                    <span className="pixel-font text-[0.45rem]">►</span>
                                    <span>Open on Snowtrace</span>
                                </a>
                            </PixelPanel>
                        </div>
                    </PixelSectionFrame>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <PixelMenuLink to="/fundraising">Buy $CATCH</PixelMenuLink>
                        <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer">
                            Follow on X
                        </PixelExternalLink>
                    </div>
                </div>
            </section>
        </main>
    );
}
