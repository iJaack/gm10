import { useEffect, useState } from 'react';
import { PixelExternalLink, PixelLabel, PixelMenuLink, PixelMessageBox, PixelPanel } from './PixelUI';
import { SITE_LINKS } from '../data/protocol';

const showcaseCards = [
    {
        name: 'Charizard',
        subtitle: '1st Ed. Base Set / PSA 10',
        imageSrc: '/images/cards/charizard_psa10.png',
        imageAlt: '1st Edition Base Set Charizard PSA 10 slab',
        accent: 'shadow-[0_0_40px_rgba(243,130,84,0.15)]',
    },
    {
        name: 'Umbreon VMAX',
        subtitle: 'Moonbreon / BGS 10',
        imageSrc: '/images/cards/umbreon_vmax_bgs.png',
        imageAlt: 'Umbreon VMAX BGS 10 Black Label slab',
        accent: 'shadow-[0_0_40px_rgba(126,154,255,0.12)]',
    },
    {
        name: 'Lugia',
        subtitle: 'Neo Genesis / PSA 9',
        imageSrc: '/images/cards/lugia_psa9.png',
        imageAlt: 'Neo Genesis Lugia PSA 9 slab',
        accent: 'shadow-[0_0_40px_rgba(177,216,255,0.12)]',
    },
] as const;

export default function Hero() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <section className="relative overflow-hidden border-b border-[rgba(193,218,191,0.08)] px-4 pb-14 pt-28 sm:pt-32 lg:min-h-[calc(100svh-76px)] lg:pb-20">
            <div className="absolute inset-0 pixel-grid opacity-40" aria-hidden />
            <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(159,230,255,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(228,193,119,0.08),transparent_24%)]"
            />

            <div className="relative mx-auto grid max-w-[min(1760px,calc(100vw-48px))] items-center gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10">
                <div className={`${mounted ? 'scan-reveal' : 'opacity-0'} space-y-6 lg:max-w-[40rem]`}>
                    <div className="flex flex-wrap gap-3">
                        <PixelLabel tone="live">Fuji live</PixelLabel>
                        <PixelLabel tone="warning">Card fund</PixelLabel>
                    </div>

                    <div>
                        <div className="pixel-font text-[0.5rem] uppercase tracking-[0.24em] text-[var(--text-dim)]">
                            Gem Mint Strategy
                        </div>
                        <h1 className="mt-4 max-w-[11ch] text-4xl font-bold leading-[0.94] text-[var(--text-main)] sm:text-5xl lg:text-[5.65rem]">
                            Proxy access to elite Pokemon-card upside.
                        </h1>
                        <p className="mt-5 max-w-[33rem] text-lg leading-8 text-[var(--text-soft)]">
                            Get exposure to scarce, high-grade grails without buying, picking, grading, storing, or selling the slabs yourself.
                        </p>
                    </div>

                    <PixelMessageBox
                        title="$CATCH"
                        body="$CATCH is the tokenized way to follow and participate in the GM10 card run."
                        className="max-w-[32rem]"
                    />

                    <div className="flex flex-wrap gap-3">
                        <PixelMenuLink to="/fundraising" active>
                            Buy $CATCH
                        </PixelMenuLink>
                        <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer">
                            Follow on X
                        </PixelExternalLink>
                    </div>
                </div>

                <div className={`${mounted ? 'scan-reveal scan-delay-1' : 'opacity-0'} relative lg:-mr-2`}>
                    <PixelPanel className="pixel-grid overflow-hidden p-4 sm:p-6 lg:min-h-[700px] lg:p-8">
                        <div className="flex items-center justify-between gap-3 border-b border-[rgba(193,218,191,0.1)] pb-4">
                            <div>
                                <div className="pixel-font text-[0.5rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                                    Inspection screen
                                </div>
                                <div className="mt-2 text-2xl font-bold text-[var(--text-main)]">
                                    High-end slab watchlist
                                </div>
                            </div>
                            <PixelLabel tone="live">3 tracked</PixelLabel>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-[1.28fr_0.72fr] lg:h-[calc(100%-5.25rem)]">
                            <div className="pixel-window-live pixel-window flex flex-col p-3">
                                <div className="overflow-hidden border-2 border-[var(--pixel-border)] bg-[#d8e2d4]">
                                    <img
                                        src={showcaseCards[0].imageSrc}
                                        alt={showcaseCards[0].imageAlt}
                                        className={`aspect-[4/5] w-full object-cover lg:h-[34rem] lg:aspect-auto ${showcaseCards[0].accent}`}
                                        loading="eager"
                                    />
                                </div>
                                <div className="mt-3 flex items-start justify-between gap-4 lg:mt-auto">
                                    <div>
                                        <div className="text-xl font-bold text-[var(--text-main)]">{showcaseCards[0].name}</div>
                                        <div className="mt-1 text-sm text-[var(--text-soft)]">{showcaseCards[0].subtitle}</div>
                                    </div>
                                    <PixelLabel tone="warning">Lead grail</PixelLabel>
                                </div>
                            </div>

                            <div className="space-y-4 lg:flex lg:flex-col lg:justify-between">
                                {showcaseCards.slice(1).map((card) => (
                                    <div key={card.name} className="pixel-window flex items-center gap-4 p-3 lg:min-h-[16rem]">
                                        <div className="h-24 w-20 shrink-0 overflow-hidden border-2 border-[var(--pixel-border)] bg-[#d8e2d4] lg:h-40 lg:w-32">
                                            <img
                                                src={card.imageSrc}
                                                alt={card.imageAlt}
                                                className={`h-full w-full object-cover ${card.accent}`}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-lg font-bold text-[var(--text-main)]">{card.name}</div>
                                            <div className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{card.subtitle}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PixelPanel>
                </div>
            </div>
        </section>
    );
}
