import Hero from '../components/Hero';
import {
    PixelExternalLink,
    PixelLedgerRow,
    PixelMenuLink,
    PixelStatRail,
} from '../components/PixelUI';
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
            <div className="pixel-font text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">{eyebrow}</div>
            <h2 className="mt-5 font-['Oxanium'] text-4xl font-semibold leading-[0.95] text-[var(--text-main)] md:text-5xl">
                {title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-soft)]">{body}</p>
        </div>
    );
}

function SystemNote({
    id,
    title,
    body,
}: {
    id: string;
    title: string;
    body: string;
}) {
    return (
        <article id={id} className="scroll-mt-28">
            <PixelLedgerRow>
                <div className="grid gap-3 md:grid-cols-[170px_1fr] md:gap-8">
                    <div className="pixel-font text-[0.66rem] uppercase tracking-[0.2em] text-[var(--text-dim)]">{title}</div>
                    <p className="max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{body}</p>
                </div>
            </PixelLedgerRow>
        </article>
    );
}

export default function Home() {
    const roundState = useFujiRoundState();
    const proofState = useFujiPortfolioPositions();

    return (
        <main>
            <Hero />

            <section id="why-gm10" className="px-4 py-16 md:py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <div className="grid gap-12 xl:grid-cols-[0.72fr_1.28fr] xl:gap-16">
                        <SectionLead
                            eyebrow="Why GM10"
                            title="The best cards are expensive, thin, and hard to build around alone."
                            body="GM10 gives people one cleaner way into the top end of the Pokemon market: shared exposure to iconic high-grade cards instead of solo card-picking, storage, and exit work."
                        />

                        <div className="grid gap-8 md:grid-cols-3">
                            {THESIS_PILLARS.map((pillar, index) => (
                                <article key={pillar.title} className="border-t border-white/10 pt-5">
                                    <div className="pixel-font text-[0.66rem] uppercase tracking-[0.2em] text-[var(--text-dim)]">
                                        {index === 0 ? 'Access' : index === 1 ? 'Premium' : 'Exposure'}
                                    </div>
                                    <h3 className="mt-4 font-['Oxanium'] text-2xl font-semibold text-[var(--text-main)]">
                                        {pillar.title}
                                    </h3>
                                    <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{pillar.body}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="evidence" className="border-y border-white/8 px-4 py-16 md:py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <SectionLead
                        eyebrow="Evidence"
                        title="The thesis already shows up in public sales and population data."
                        body="GM10 is not built on vague nostalgia. The demand, scarcity, and top-grade premium already exist in the open. Market evidence, not guaranteed results."
                    />

                    <div className="mt-12 grid gap-x-10 gap-y-12 lg:grid-cols-2">
                        {THESIS_EVIDENCE.map((stat) => (
                            <a
                                key={stat.label}
                                href={stat.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group border-t border-white/10 pt-6 transition-colors duration-200 hover:border-[rgba(105,200,255,0.32)]"
                            >
                                <div className="pixel-font text-[0.66rem] uppercase tracking-[0.2em] text-[var(--text-dim)]">
                                    {stat.label}
                                </div>
                                <div className="mt-4 font-['Oxanium'] text-5xl font-semibold leading-none text-[var(--text-main)]">
                                    {stat.value}
                                </div>
                                <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-soft)]">{stat.takeaway}</p>
                                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-live)]">
                                    <span>{stat.sourceLabel}</span>
                                    <span aria-hidden>↗</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="px-4 py-16 md:py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <div className="grid gap-12 xl:grid-cols-[0.68fr_1.32fr] xl:gap-16">
                        <SectionLead
                            eyebrow="How it works"
                            title="A live round, a focused card mandate, and one token tied to the run."
                            body="The flow is simple by design. Join the round, let GM10 chase elite slabs, and let $CATCH stay next to the full strategy instead of one card."
                        />

                        <div className="grid gap-5">
                            {EXPOSURE_STEPS.map((step, index) => (
                                <PixelLedgerRow key={step.title}>
                                    <div className="grid gap-4 lg:grid-cols-[130px_1fr] lg:gap-8">
                                        <div className="pixel-font text-[0.68rem] uppercase tracking-[0.2em] text-[var(--text-dim)]">
                                            Step {index + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-['Oxanium'] text-2xl font-semibold text-[var(--text-main)]">{step.title}</h3>
                                            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{step.body}</p>
                                        </div>
                                    </div>
                                </PixelLedgerRow>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y border-white/8 px-4 py-16 md:py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <SectionLead
                        eyebrow="System notes"
                        title="The deeper mechanics stay public, but they do not need to dominate the landing page."
                        body="The token model, pricing discipline, exit path, wallet view, and governance phasing stay public. They just sit in short notes instead of a second homepage."
                    />

                    <div className="mt-8 border-y border-white/8">
                        <SystemNote
                            id="token"
                            title="Token"
                            body="$CATCH follows the full GM10 strategy, not one card. It sits next to entries, holdings, exits, and the upside path as the system matures."
                        />
                        <SystemNote
                            id="pricing"
                            title="Pricing"
                            body="Real executed trades reset marks first. Strong comparable sales come next. Soft estimates stay conservative when liquidity gets thin."
                        />
                        <SystemNote
                            id="exits"
                            title="Exits"
                            body="Sale money lands back onchain before anything else. Principal gets restored first, and realized profit then routes into treasury, buyback, LP, and reserve buckets."
                        />
                        <SystemNote
                            id="wallet"
                            title="Wallet"
                            body="The wallet view only shows what GM10 can prove: contributed basis, attributable holdings, and the latest marked value of the strategy."
                        />
                        <SystemNote
                            id="governance"
                            title="Governance"
                            body="Early rounds stay execution-led. Later rounds move more target and round decisions into the open as the system hardens."
                        />
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:py-20">
                <div className="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
                    <div className="grid gap-10 xl:grid-cols-[0.72fr_1.28fr] xl:items-end">
                        <SectionLead
                            eyebrow="Fuji live"
                            title="The mechanics are already live in public."
                            body="The stack is already visible on Fuji today, while the public-facing mainnet launch stays separate."
                        />
                        <PixelStatRail
                            items={[
                                {
                                    label: 'Live round',
                                    value: `Round ${roundState.roundId}`,
                                    tone: roundState.round?.isActive ? 'live' : 'warning',
                                },
                                {
                                    label: 'Raised',
                                    value: roundState.raisedLabel,
                                },
                                {
                                    label: 'Marked value',
                                    value: proofState.proofSummary.portfolioValueLabel,
                                    tone: 'warning',
                                },
                            ]}
                        />
                    </div>

                    <div className="mt-10 grid gap-8 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
                        <div className="border-t border-white/8 pt-6">
                            <div className="pixel-font text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">
                                Live links
                            </div>
                            <div className="mt-6 border-y border-white/8">
                                {proofState.links.map((link) => (
                                    <PixelLedgerRow key={link.address}>
                                        <div className="grid gap-3 md:grid-cols-[170px_1fr_auto] md:items-center">
                                            <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">{link.label}</div>
                                            <div className="truncate text-sm text-[var(--text-soft)]">{link.address}</div>
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

                        <div className="flex flex-wrap gap-3">
                            <PixelMenuLink to="/fundraising">Buy $CATCH</PixelMenuLink>
                            <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer">
                                Follow on X
                            </PixelExternalLink>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
