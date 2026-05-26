/**
 * FAQ — v2 chrome. Minimal list with progressive disclosure.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrollReveal } from '../components/ScrollReveal';
import { Web3Providers } from '../components/Web3Providers';
import {
    DataMono,
    Display,
    Hairline,
    SectionLabel,
} from '../components/v2/primitives';
import { FAQ_TOPICS, SUPPORT_PAGE_COPY, getRoundPrimaryCtaLabel } from '../data/protocol';
import { useFujiRoundState } from '../hooks/useFujiProof';

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const num = String(index + 1).padStart(2, '0');

    return (
        <ScrollReveal delay={Math.min(index % 5, 5) as 0 | 1 | 2 | 3 | 4 | 5}>
            <div className="border-b border-[var(--rule)]">
                <button
                    type="button"
                    className="flex w-full items-baseline justify-between gap-6 py-5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                    onClick={() => setIsOpen((v) => !v)}
                    aria-expanded={isOpen}
                >
                    <div className="flex items-baseline gap-6 flex-1 min-w-0">
                        <DataMono className="shrink-0 text-[0.7rem] tracking-[0.1em] text-[var(--ink-faint)]">
                            {num}
                        </DataMono>
                        <Display as="span" className="text-[clamp(1.05rem,1.6vw,1.3rem)] text-[var(--text-primary)]">
                            {question}
                        </Display>
                    </div>
                    <span
                        className="v2-mono shrink-0 text-[1rem] text-[var(--accent-brass)] transition-transform duration-300"
                        style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
                        aria-hidden
                    >
                        +
                    </span>
                </button>
                <div
                    ref={bodyRef}
                    className="overflow-hidden"
                    style={{
                        maxHeight: isOpen ? `${bodyRef.current?.scrollHeight ?? 300}px` : '0px',
                        opacity: isOpen ? 1 : 0,
                        transition: 'max-height 400ms cubic-bezier(0.16,1,0.3,1), opacity 300ms ease',
                    }}
                >
                    <div className="pl-16 pb-6 pr-4">
                        <p className="text-[0.94rem] leading-[1.7] text-[var(--ink-muted)]">{answer}</p>
                    </div>
                </div>
            </div>
        </ScrollReveal>
    );
}

function FAQContent() {
    const roundState = useFujiRoundState();
    const roundAvailability = 'The continuous round page is where the answers turn into a decision: NAV-derived mint preview, value routing, and the Avalanche proof stack in one surface.';
    const pageCopy = SUPPORT_PAGE_COPY.faq;

    return (
        <main>
            <section className="px-4 pt-28 md:pt-32 pb-4">
                <div className="mx-auto max-w-[min(1200px,calc(100vw-48px))]">
                    {/* Breadcrumb */}
                    <div className="flex flex-wrap items-center gap-3 text-[0.7rem] v2-mono tracking-[0.08em] uppercase text-[var(--ink-faint)]">
                        <Link to="/" className="hover:text-[var(--text-primary)]">Gm10</Link>
                        <span>·</span>
                        <span className="text-[var(--text-primary)]">FAQ</span>
                    </div>

                    {/* Title */}
                    <div className="mt-10">
                        <SectionLabel>{pageCopy.eyebrow}</SectionLabel>
                        <Display as="h1" className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
                            {pageCopy.title}
                        </Display>
                        <p className="mt-4 text-[0.98rem] leading-[1.7] text-[var(--ink-muted)]">
                            {pageCopy.body}
                        </p>
                    </div>
                </div>
            </section>

            {/* Questions */}
            <section className="px-4 pt-12 pb-16">
                <div className="mx-auto max-w-[min(1200px,calc(100vw-48px))]">
                    <Hairline strong />
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

            {/* Closer */}
            <section className="px-4 py-20 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1200px,calc(100vw-48px))]">
                    <SectionLabel>Go next</SectionLabel>
                    <Display as="div" className="mt-4 text-[clamp(1.5rem,3vw,2.2rem)] max-w-[32ch]">
                        Ready to act on it?
                    </Display>
                    <p className="mt-3 max-w-[56ch] text-[0.95rem] leading-[1.7] text-[var(--ink-muted)]">
                        {roundAvailability}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-6">
                        <Link to="/fundraising" className="v2-mono text-[0.88rem] tracking-[0.05em] text-[var(--accent-brass)] hover:text-[var(--text-primary)]">
                            → {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
                        </Link>
                        <Link to="/fundraising#proof" className="v2-mono text-[0.88rem] tracking-[0.05em] text-[var(--ink-muted)] hover:text-[var(--text-primary)]">
                            → Inspect the proof
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default function FAQ() {
    return (
        <Web3Providers>
            <FAQContent />
        </Web3Providers>
    );
}
