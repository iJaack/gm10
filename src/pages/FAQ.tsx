import { useRef, useState } from 'react';
import Page from '../components/Page';
import { ScrollReveal } from '../components/ScrollReveal';
import { PixelDivider, PixelMenuLink } from '../components/PixelUI';
import { FAQ_TOPICS, SUPPORT_PAGE_COPY, getRoundPrimaryCtaLabel } from '../data/protocol';
import { useTheme } from '../hooks/useTheme';
import { useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from '../components/Web3Providers';

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);

    return (
        <ScrollReveal delay={Math.min(index % 5, 5) as 0 | 1 | 2 | 3 | 4 | 5}>
            <div
                className={`group rounded-2xl px-5 py-1 transition-colors duration-200 ${isOpen ? 'bg-[var(--surface-active)]' : 'hover:bg-[var(--surface-hover)]'}`}
            >
                <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 py-5 text-left"
                    onClick={() => setIsOpen((v) => !v)}
                    aria-expanded={isOpen}
                >
                    <span className="text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-2xl">
                        {question}
                    </span>
                    <span
                        className="mt-1 shrink-0 text-xl text-[var(--accent)] transition-transform duration-300"
                        style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
                        aria-hidden
                    >
                        +
                    </span>
                </button>
                <div
                    ref={bodyRef}
                    className="overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                        maxHeight: isOpen ? `${bodyRef.current?.scrollHeight ?? 300}px` : '0px',
                        opacity: isOpen ? 1 : 0,
                        transition: 'max-height 400ms cubic-bezier(0.16,1,0.3,1), opacity 300ms ease',
                    }}
                >
                    <p className="pb-5 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">{answer}</p>
                </div>
            </div>
            <div className="mx-5 border-b border-[var(--border)] last:border-0" />
        </ScrollReveal>
    );
}

function FAQContent() {
    const { theme } = useTheme();
    const roundState = useFujiRoundState();
    const pageCopy = SUPPORT_PAGE_COPY.faq;
    return (
        <Page containerClassName="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
            {/* ── HEADER ── */}
            <section className="mx-auto max-w-3xl text-center">
                <ScrollReveal>
                    <div className="label-font">{pageCopy.eyebrow}</div>
                    <h1 className="mt-5 text-[2.8rem] font-extrabold tracking-[-0.035em] text-[var(--text-primary)] md:text-[3.4rem]">
                        {pageCopy.title}
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-[1.1rem] leading-[1.7] text-[var(--text-secondary)]">
                        {pageCopy.body}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <PixelMenuLink to={pageCopy.primaryCtaTo} active>
                            {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
                        </PixelMenuLink>
                        <PixelMenuLink to={pageCopy.secondaryCtaTo}>Inspect the Proof</PixelMenuLink>
                    </div>
                </ScrollReveal>
            </section>

            {/* ── QUESTIONS ── */}
            <section className="mt-16">
                <div className="mt-4">
                    {FAQ_TOPICS.map((faq, index) => (
                        <FAQItem
                            key={faq.question}
                            question={faq.question}
                            answer={faq.answer}
                            index={index}
                        />
                    ))}
                </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section className="mt-16">
                <PixelDivider label="Go next" />
                <ScrollReveal>
                    <div
                        className="mt-6 rounded-2xl border border-[var(--border)] px-6 py-12 text-center transition-colors"
                        style={{
                            background: theme === 'dark'
                                ? 'radial-gradient(ellipse 70% 80% at 15% 50%, rgba(79,168,224,0.09) 0%, transparent 65%), radial-gradient(ellipse 60% 70% at 85% 30%, rgba(240,192,48,0.08) 0%, transparent 65%), var(--bg-secondary)'
                                : 'radial-gradient(ellipse 70% 80% at 15% 50%, rgba(79,168,224,0.10) 0%, transparent 65%), radial-gradient(ellipse 60% 70% at 85% 30%, rgba(240,192,48,0.09) 0%, transparent 65%), var(--bg-secondary)',
                        }}
                    >
                        <h2 className="mx-auto max-w-[22ch] text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                            Ready to get started?
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-[1rem] leading-[1.7] text-[var(--text-secondary)]">
                            {roundState.isRoundOpen
                                ? 'The round page is where the answer set turns into a decision: review the module, what the position means, and the proof stack.'
                                : `The round page still contains the proof stack and module behavior even while Round ${roundState.roundId} is upcoming or closed.`}
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <PixelMenuLink to="/fundraising" active>
                                {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
                            </PixelMenuLink>
                            <PixelMenuLink to="/fundraising#proof">Inspect the Proof</PixelMenuLink>
                        </div>
                    </div>
                </ScrollReveal>
            </section>
        </Page>
    );
}

export default function FAQ() {
    return (
        <Web3Providers>
            <FAQContent />
        </Web3Providers>
    );
}
