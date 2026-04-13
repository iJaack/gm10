import Hero from '../components/Hero';
import { ScrollReveal } from '../components/ScrollReveal';
import { PixelMenuLink } from '../components/PixelUI';
import HomeFujiSection from '../components/HomeFujiSection';
import {
    EXPOSURE_STEPS,
    HOME_GM10_ADVANTAGES,
    HOME_INVESTOR_OBJECTIONS,
    HOME_MARKET_REASONS,
    getRoundPrimaryCtaLabel,
} from '../data/protocol';
import { useTheme } from '../hooks/useTheme';
import { useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from '../components/Web3Providers';

function HomeContent() {
    const { theme } = useTheme();
    const roundState = useFujiRoundState();

    return (
        <main>
            <Hero />

            <section id="why-market" className="border-b border-[var(--border)] px-4 py-16 md:py-24">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                    <ScrollReveal>
                        <div>
                            <div className="label-font">Why this market</div>
                            <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                                The top end of the Pokemon market already behaves like a real alternative asset lane.
                            </h2>
                            <p className="mt-4 max-w-[44rem] text-[1rem] leading-[1.7] text-[var(--text-secondary)]">
                                Demand, scarcity, grade premiums, and public auction comps give GM10 a market with visible signals instead of purely narrative pricing.
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="mt-12 grid gap-6 md:grid-cols-3">
                        {HOME_MARKET_REASONS.map((item, index) => (
                            <ScrollReveal key={item.title} delay={(index + 1) as 1 | 2 | 3}>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]">
                                    <h3 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">{item.title}</h3>
                                    <p className="mt-3 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">{item.body}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            <section
                id="why-gm10"
                className="relative overflow-hidden border-b border-[var(--border)] px-4 py-16 md:py-24"
                style={{
                    background: theme === 'dark'
                        ? 'radial-gradient(ellipse 80% 60% at 12% 30%, rgba(79,168,224,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 84% 28%, rgba(240,192,48,0.06) 0%, transparent 70%), var(--bg-primary)'
                        : 'radial-gradient(ellipse 80% 60% at 12% 30%, rgba(79,168,224,0.10) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 84% 28%, rgba(240,192,48,0.08) 0%, transparent 70%), var(--bg-primary)',
                }}
            >
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                    <ScrollReveal>
                        <div>
                            <div className="label-font">Why GM10</div>
                            <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                                GM10 gives crypto investors the exposure without the collectible operations.
                            </h2>
                            <p className="mt-4 max-w-[42rem] text-[1rem] leading-[1.7] text-[var(--text-secondary)]">
                                Instead of asking each investor to become a specialist in sourcing, validation, custody, and resale, GM10 wraps those jobs into one strategy and one reporting layer.
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="mt-12 grid gap-6 md:grid-cols-3">
                        {HOME_GM10_ADVANTAGES.map((item, index) => (
                            <ScrollReveal key={item.title} delay={(index + 1) as 1 | 2 | 3}>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/90 p-6 backdrop-blur-sm transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]">
                                    <div className="label-font text-[var(--accent)]">GM10 advantage</div>
                                    <h3 className="mt-3 text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">{item.title}</h3>
                                    <p className="mt-3 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">{item.body}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="border-b border-[var(--border)] px-4 py-16 md:py-24">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                    <ScrollReveal>
                        <div>
                            <div className="label-font">How a round works</div>
                            <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                                One round opens the door to the entire strategy.
                            </h2>
                        </div>
                    </ScrollReveal>

                    <div className="mt-12 grid gap-8 md:grid-cols-3">
                        {EXPOSURE_STEPS.map((step, index) => (
                            <ScrollReveal key={step.title} delay={(index + 1) as 1 | 2 | 3}>
                                <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]">
                                    <span className="label-font text-[var(--accent)]">0{index + 1}</span>
                                    <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">{step.title}</h3>
                                    <p className="mt-3 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">{step.body}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            <HomeFujiSection />

            <section id="investor-objections" className="border-y border-[var(--border)] px-4 py-16 md:py-24">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                    <ScrollReveal>
                        <div>
                            <div className="label-font">Investor objections</div>
                            <h2 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.5rem]">
                                The key questions should have clean answers before any buy decision.
                            </h2>
                        </div>
                    </ScrollReveal>

                    <div className="mt-10 grid gap-4 md:grid-cols-2">
                        {HOME_INVESTOR_OBJECTIONS.map((item, index) => (
                            <ScrollReveal key={item.question} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                                <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]">
                                    <h3 className="text-[1.05rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">{item.question}</h3>
                                    <p className="mt-3 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">{item.answer}</p>
                                </article>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:py-24">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                    <ScrollReveal>
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-12 text-center shadow-[var(--shadow-sm)]">
                            <div className="label-font">Next step</div>
                            <h2 className="mx-auto mt-4 max-w-[18ch] text-[2.1rem] font-bold tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.6rem]">
                                Move from the story to the live round and proof.
                            </h2>
                            <p className="mx-auto mt-4 max-w-[42rem] text-[0.98rem] leading-[1.75] text-[var(--text-secondary)]">
                                The round page is where GM10 turns into a decision: see status, review what the position represents, and inspect the live Avalanche proof in one place.
                            </p>
                            <div className="mt-8 flex flex-wrap justify-center gap-3">
                                <PixelMenuLink to="/fundraising" active>
                                    {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
                                </PixelMenuLink>
                                <PixelMenuLink to="/fundraising#proof">
                                    Inspect the Proof
                                </PixelMenuLink>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </section>
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
