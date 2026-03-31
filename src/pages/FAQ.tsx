import Page from '../components/Page';
import { PixelDivider, PixelExternalLink, PixelMenuLink } from '../components/PixelUI';
import { FAQ_TOPICS, SITE_LINKS } from '../data/protocol';

export default function FAQ() {
    return (
        <Page containerClassName="mx-auto max-w-[min(1480px,calc(100vw-48px))]">
            <section className="mx-auto max-w-3xl text-center">
                <div className="pixel-font text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">FAQ</div>
                <h1 className="mt-5 font-['Oxanium'] text-5xl font-semibold text-[var(--text-main)] md:text-6xl">The short answers.</h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-soft)]">
                    What GM10 is. What $CATCH does. Why the fund chases high-grade cards. Why Fuji is live first.
                </p>
            </section>

            <section className="mt-16">
                <PixelDivider label="Questions" />
                <div className="mt-6 pixel-font text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Answers</div>

                <div className="mt-6 divide-y divide-white/8 border-y border-white/8">
                    {FAQ_TOPICS.map((faq) => (
                        <details key={faq.question} className="group py-5">
                            <summary className="cursor-pointer list-none text-left font-['Oxanium'] text-2xl font-semibold text-[var(--text-main)] marker:hidden">
                                <span className="flex items-start justify-between gap-4">
                                    <span>{faq.question}</span>
                                    <span className="text-[var(--accent-live)] transition-transform duration-200 group-open:rotate-45">+</span>
                                </span>
                            </summary>
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="mt-16">
                <PixelDivider label="Go next" />
                <div className="mt-8 grid gap-6 border-t border-white/8 pt-8 xl:grid-cols-[0.7fr_0.3fr] xl:items-center">
                    <div>
                        <h2 className="font-['Oxanium'] text-4xl font-semibold text-[var(--text-main)]">Buy the round or follow the story.</h2>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
                            The live round is on Fuji today. The product story, card thesis, and public updates continue from there.
                        </p>
                    </div>
                    <div className="grid gap-3">
                        <PixelMenuLink to="/fundraising" active className="w-full justify-between">
                            Buy $CATCH
                        </PixelMenuLink>
                        <PixelMenuLink to="/portfolio" className="w-full justify-between">
                            Portfolio
                        </PixelMenuLink>
                        <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer" className="w-full justify-between">
                            <span>Follow on X</span>
                            <span>@gm10xyz</span>
                        </PixelExternalLink>
                    </div>
                </div>
            </section>
        </Page>
    );
}
