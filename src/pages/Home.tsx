import { Suspense, lazy, useEffect, useState } from 'react';
import Hero from '../components/Hero';
import CAGRChart from '../components/CAGRChart';
import { ScrollReveal } from '../components/ScrollReveal';
import {
    PixelExternalLink,
    PixelMenuLink,
} from '../components/PixelUI';
import {
    EXPOSURE_STEPS,
    GOVERNANCE_PHASES,
    SITE_LINKS,
    THESIS_EVIDENCE,
    THESIS_PILLARS,
} from '../data/protocol';
import { useTheme } from '../hooks/useTheme';
import { useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from '../components/Web3Providers';

const HomeFujiSection = lazy(() => import('../components/HomeFujiSection'));

const SYSTEM_NOTES = [
    { id: 'token', emoji: '🪙', title: 'Token', body: '$CATCH tracks the full GM10 strategy — not a single card. Every entry, holding, and exit flows through it.' },
    { id: 'pricing', emoji: '💰', title: 'Pricing', body: 'Executed trades set the mark first. Strong comps come next. Thin markets stay conservative.' },
    { id: 'exits', emoji: '🚪', title: 'Exits', body: 'Sale proceeds land onchain before anything else. Principal restored first, then profit splits into treasury, buyback, LP, and reserve.' },
    { id: 'wallet', emoji: '👛', title: 'Wallet', body: 'Only shows what GM10 can prove: contributed basis, current holdings, and the latest marked value.' },
    { id: 'governance', emoji: '🗳️', title: 'Governance', body: 'Rounds 1–3: centralized card selection. Rounds 4–5: offchain community selection. From Round 6: buy/sell decisions enforced onchain.' },
    { id: 'agents', emoji: '🤖', title: 'Agents', body: 'GM10 is agent-ready. Every contract, position, and round is inspectable by humans and their agents. Built on Avalanche.' },
];

function HomeContent() {
    const { theme } = useTheme();
    const [showFujiSection, setShowFujiSection] = useState(false);
    const roundState = useFujiRoundState();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setShowFujiSection(true);
        }, 1200);

        return () => window.clearTimeout(timer);
    }, []);

    const fujiSectionFallback = (
        <section className="px-4 py-16 md:py-24">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${roundState.isRoundOpen ? 'animate-ping bg-[var(--accent-green)]' : 'bg-[var(--accent)]'}`} />
                        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${roundState.isRoundOpen ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent)]'}`} />
                    </span>
                    <span className={`label-font ${roundState.isRoundOpen ? 'text-[var(--accent-green)]' : 'text-[var(--accent)]'}`}>
                        {roundState.isRoundOpen ? 'Live on Fuji' : 'Fuji round closed'}
                    </span>
                </div>
                <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                    Already inspectable.
                </h2>
                <p className="mt-4 max-w-[42rem] text-[1rem] leading-[1.7] text-[var(--text-secondary)]">
                    {roundState.isRoundOpen
                        ? 'The live proof block loads after first paint so the hero renders first, but the onchain data is still available below the fold.'
                        : 'The Fuji test round is closed. The proof block still loads below the fold so anyone can inspect the contracts and state while mainnet gets lined up.'}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <PixelMenuLink to="/fundraising#proof">Inspect the Fuji stack</PixelMenuLink>
                    <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer">
                        Follow on X
                    </PixelExternalLink>
                </div>
            </div>
        </section>
    );

    return (
        <main>
            <Hero />

            {/* ── WHY GM10 ── */}
            {(() => {
                // Text tokens derived from overlay — always maximally contrasted against the background
                const whyPrimary   = theme === 'dark' ? '#ffffff'               : '#1a1510';
                const whySecondary = theme === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(26,21,16,0.72)';
                const whyMuted     = theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(26,21,16,0.45)';
                const whyCardBg    = theme === 'dark' ? 'rgba(0,0,0,0.45)'       : 'rgba(255,255,255,0.60)';
                const whyCardBorder= theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(26,21,16,0.12)';
                return (
                    <section id="why-gm10" className="relative overflow-hidden border-b border-[var(--border)] px-4 py-16 md:py-24">
                        {/* Card pile background */}
                        <img
                            src="/brand/why-bg.webp"
                            aria-hidden alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover object-center"
                            style={{ filter: theme === 'light' ? 'saturate(0.55) brightness(1.15)' : 'saturate(0.7) brightness(0.6)' }}
                        />
                        {/* Overlay — dark tint in dark mode, warm white in light mode */}
                        <div
                            className="absolute inset-0"
                            style={{ background: theme === 'dark' ? 'rgba(11,10,20,0.80)' : 'rgba(250,247,240,0.82)' }}
                        />
                        <div className="relative z-10 mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                            <ScrollReveal>
                                <div>
                                    <div className="label-font" style={{ color: whyMuted }}>Why GM10</div>
                                    <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[2.5rem]" style={{ color: whyPrimary }}>
                                        Trophy-tier cards shouldn't require trophy-tier capital.
                                    </h2>
                                    <p className="mt-4 max-w-[42rem] text-[1rem] leading-[1.7]" style={{ color: whySecondary }}>
                                        The top of the Pokémon market is expensive, illiquid, and hard to build around alone. GM10 changes that with one shared fund and one token.
                                    </p>
                                </div>
                            </ScrollReveal>

                            <div className="mt-12 grid gap-6 md:grid-cols-3">
                                {THESIS_PILLARS.map((pillar, index) => (
                                    <ScrollReveal key={pillar.title} delay={(index + 1) as 1 | 2 | 3}>
                                        <div
                                            className="relative rounded-2xl p-6 transition-all duration-200"
                                            style={{
                                                background: whyCardBg,
                                                border: `1px solid ${whyCardBorder}`,
                                                backdropFilter: 'blur(14px)',
                                                WebkitBackdropFilter: 'blur(14px)',
                                            }}
                                        >
                                            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em]" style={{ color: whyMuted }}>
                                                {index === 0 ? 'Access' : index === 1 ? 'Premium' : 'Exposure'}
                                            </div>
                                            <h3 className="mt-3 text-lg font-bold tracking-[-0.02em]" style={{ color: whyPrimary }}>
                                                {pillar.title}
                                            </h3>
                                            <p className="mt-2 text-[0.9rem] leading-[1.65]" style={{ color: whySecondary }}>{pillar.body}</p>
                                        </div>
                                    </ScrollReveal>
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })()}

            {/* ── EVIDENCE ── */}
            <section id="evidence" className="border-y border-[var(--border)] px-4 py-16 md:py-24">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                    <div className="grid gap-10 md:grid-cols-[1fr_280px] md:items-start lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_580px]">

                        {/* ── Left: text + stats ── */}
                        <div>
                            <ScrollReveal>
                                <div className="label-font">Evidence</div>
                                <p className="mt-2 max-w-[48rem] text-[0.92rem] leading-[1.65] text-[var(--text-secondary)]">
                                    The demand, scarcity, and grade premium are already visible in public data. Market evidence, not guaranteed results.
                                </p>

                                <a
                                    href={THESIS_EVIDENCE[0].sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group mt-8 block"
                                >
                                    <div className="holo-shimmer text-[3.5rem] font-extrabold leading-none tracking-[-0.04em] sm:text-[5rem] lg:text-[6rem]">
                                        {THESIS_EVIDENCE[0].value}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                                        <span className="label-font">{THESIS_EVIDENCE[0].label}</span>
                                        <span className="text-[0.92rem] text-[var(--text-secondary)]">{THESIS_EVIDENCE[0].takeaway}</span>
                                    </div>
                                </a>
                            </ScrollReveal>

                            <div className="mt-12 grid gap-8 border-t border-[var(--border)] pt-10 lg:grid-cols-3">
                                {THESIS_EVIDENCE.slice(1).map((stat, index) => (
                                    <ScrollReveal key={stat.label} delay={(index + 1) as 1 | 2 | 3}>
                                        <a
                                            href={stat.sourceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group block"
                                        >
                                            <div className="label-font">{stat.label}</div>
                                            <div className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                                                {stat.value}
                                            </div>
                                            <p className="mt-2 text-[0.9rem] leading-[1.65] text-[var(--text-secondary)]">{stat.takeaway}</p>
                                            <span className="mt-3 inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-[var(--accent-blue)] transition-colors group-hover:text-[var(--accent)]">
                                                {stat.sourceLabel} <span aria-hidden>↗</span>
                                            </span>
                                        </a>
                                    </ScrollReveal>
                                ))}
                            </div>
                        </div>

                        {/* ── Right: evidence photo — no card frame, sits inline ── */}
                        <ScrollReveal delay={1}>
                            <img
                                src="/brand/evidence-bg.webp"
                                alt="Pokémon Illustrator card — evidence of trophy-grade demand"
                                loading="lazy"
                                decoding="async"
                                className="w-full rounded-xl"
                                style={{
                                    filter: theme === 'light'
                                        ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))'
                                        : 'drop-shadow(0 8px 24px rgba(0,0,0,0.40))',
                                }}
                            />
                        </ScrollReveal>

                    </div>
                </div>
            </section>

            {/* ── CAGR CHART — full-bleed ── */}
            <section className="border-b border-[var(--border)]">
                <ScrollReveal>
                    <CAGRChart />
                </ScrollReveal>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section
                id="how-it-works"
                className="relative overflow-hidden px-4 py-16 md:py-24"
                style={{
                    background: theme === 'dark'
                        ? 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(79,168,224,0.07) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 80% 30%, rgba(240,192,48,0.06) 0%, transparent 70%), var(--bg-primary)'
                        : 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(79,168,224,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 80% 30%, rgba(240,192,48,0.07) 0%, transparent 70%), var(--bg-primary)',
                }}
            >
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                    <ScrollReveal>
                        <div>
                            <div className="label-font">How it works</div>
                            <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                                Three steps. One token. The rest is on us.
                            </h2>
                        </div>
                    </ScrollReveal>

                    <div className="mt-12 grid gap-8 md:grid-cols-3">
                        {EXPOSURE_STEPS.map((step, index) => (
                            <ScrollReveal key={step.title} delay={(index + 1) as 1 | 2 | 3}>
                                <div>
                                    <span className="label-font text-[var(--accent)]">
                                        0{index + 1}
                                    </span>
                                    <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">{step.title}</h3>
                                    <p className="mt-2 text-[0.9rem] leading-[1.65] text-[var(--text-secondary)]">{step.body}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SYSTEM NOTES ── */}
            <section className="border-y border-[var(--border)] px-4 py-16 md:py-24">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                    <ScrollReveal>
                        <div>
                            <div className="label-font">System notes</div>
                            <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                                Everything stays public.
                            </h2>
                            <p className="mt-4 text-[1rem] leading-[1.7] text-[var(--text-secondary)]">
                                Token model, pricing, exits, wallet view, and governance. Short notes, not a second homepage.
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {SYSTEM_NOTES.map((note, index) => (
                            <ScrollReveal key={note.id} delay={Math.min(index + 1, 5) as 1 | 2 | 3 | 4 | 5}>
                                <article
                                    id={note.id}
                                    className="holo-border group relative h-full scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 transition-all duration-300 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
                                >
                                    <div className="flex items-start gap-4">
                                        <span className="shrink-0 text-2xl" aria-hidden>{note.emoji}</span>
                                        <div>
                                            <h3 className="text-[0.95rem] font-bold tracking-[-0.01em] text-[var(--text-primary)]">{note.title}</h3>
                                            <p className="mt-1.5 text-[0.88rem] leading-[1.65] text-[var(--text-secondary)]">{note.body}</p>
                                        </div>
                                    </div>
                                </article>
                            </ScrollReveal>
                        ))}
                    </div>

                    {/* Governance roadmap */}
                    <div className="mt-12">
                        <ScrollReveal>
                            <div className="label-font">Governance roadmap</div>
                            <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                                Progressive decentralization.
                            </h3>
                        </ScrollReveal>
                        <div className="mt-6 flex flex-col gap-0 md:flex-row md:items-stretch">
                            {GOVERNANCE_PHASES.flatMap((phase, index) => {
                                const circleClass = index === 0
                                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                    : 'border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]';
                                const items = [
                                    <ScrollReveal key={phase.rounds} delay={(index + 1) as 1 | 2 | 3} className="md:flex-1">
                                        <div className="flex md:flex-col md:flex-1">
                                            {/* Mobile: vertical stem on left */}
                                            <div className="mr-4 flex flex-col items-center md:hidden">
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[0.78rem] font-extrabold ${circleClass}`}>
                                                    {index + 1}
                                                </div>
                                                {index < GOVERNANCE_PHASES.length - 1 && (
                                                    <div className="mt-1 h-full w-px bg-[var(--border)]" />
                                                )}
                                            </div>
                                            {/* Desktop: number centered above card */}
                                            <div className="mb-4 hidden justify-center md:flex">
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[0.78rem] font-extrabold ${circleClass}`}>
                                                    {index + 1}
                                                </div>
                                            </div>
                                            <div className={`mb-4 flex-1 rounded-2xl border bg-[var(--bg-secondary)] p-5 transition-all duration-200 hover:border-[var(--border-strong)] md:mb-0 ${index === 0 ? 'border-[var(--accent)]/30' : 'border-[var(--border)]'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="label-font text-[var(--accent)]">{phase.rounds}</span>
                                                    {index === 0 && <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--accent)]">Current</span>}
                                                </div>
                                                <h4 className="mt-2.5 text-[0.95rem] font-bold text-[var(--text-primary)]">{phase.title}</h4>
                                                <p className="mt-1.5 text-[0.84rem] leading-[1.6] text-[var(--text-secondary)]">{phase.detail}</p>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                ];
                                if (index < GOVERNANCE_PHASES.length - 1) {
                                    items.push(
                                        <div key={`arrow-${index}`} className="hidden shrink-0 items-start pt-1.5 md:flex">
                                            <span className="text-lg text-[var(--text-tertiary)]">→</span>
                                        </div>
                                    );
                                }
                                return items;
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {showFujiSection ? (
                <Suspense fallback={fujiSectionFallback}>
                    <HomeFujiSection />
                </Suspense>
            ) : fujiSectionFallback}
        </main>
    );
}

export default function Home() {
    return (
        <Web3Providers>
            <HomeContent />
        </Web3Providers>
    );
}
