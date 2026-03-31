import Page from '../components/Page';
import { PixelExternalLink, PixelLabel, PixelMenuLink, PixelSectionFrame } from '../components/PixelUI';
import { FAQ_TOPICS, SITE_LINKS } from '../data/protocol';

export default function FAQ() {
    return (
        <Page containerClassName="mx-auto max-w-[min(1400px,calc(100vw-48px))]">
            <section className="mx-auto max-w-3xl text-center">
                <div className="pixel-font text-[0.5rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">FAQ</div>
                <h1 className="mt-4 text-4xl font-bold text-[var(--text-main)] md:text-6xl">The short answers.</h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
                    What GM10 is. What $CATCH does. Why the fund chases high-grade cards. Why Fuji is live first.
                </p>
            </section>

            <section className="mt-14">
                <PixelSectionFrame className="pixel-grid">
                    <div className="flex items-center justify-between gap-3">
                        <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Manual</div>
                        <PixelLabel tone="warning">7 entries</PixelLabel>
                    </div>

                    <div className="mt-6 space-y-4">
                        {FAQ_TOPICS.map((faq) => (
                            <details key={faq.question} className="pixel-window group open:border-[rgba(159,230,255,0.45)]">
                                <summary className="cursor-pointer list-none text-xl font-bold text-[var(--text-main)] marker:hidden">
                                    <span className="flex items-start gap-3">
                                        <span className="pixel-font pt-2 text-[0.45rem] text-[var(--accent-live)]">►</span>
                                        <span>{faq.question}</span>
                                    </span>
                                </summary>
                                <p className="mt-4 border-t border-[rgba(193,218,191,0.08)] pt-4 text-sm leading-7 text-[var(--text-soft)]">
                                    {faq.answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </PixelSectionFrame>
            </section>

            <section className="mt-12">
                <PixelSectionFrame>
                    <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Go next</div>
                    <h2 className="mt-3 text-3xl font-bold text-[var(--text-main)]">Buy the round or follow the story.</h2>
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        {[
                            ['Buy $CATCH', '/fundraising'],
                            ['Portfolio', '/portfolio'],
                        ].map(([label, href], index) => (
                            <PixelMenuLink
                                key={label}
                                to={href}
                                active={index === 0}
                                className="w-full justify-between"
                            >
                                {label}
                            </PixelMenuLink>
                        ))}
                        <PixelExternalLink
                            href={SITE_LINKS.x}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full justify-between"
                        >
                            <span>Follow on X</span>
                            <span>@gm10xyz</span>
                        </PixelExternalLink>
                    </div>
                </PixelSectionFrame>
            </section>
        </Page>
    );
}
