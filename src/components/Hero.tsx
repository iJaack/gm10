import { useEffect, useState } from 'react';
import { PixelDivider, PixelExternalLink, PixelLabel, PixelMediaFrame, PixelMenuLink } from './PixelUI';
import { RECENT_CARD_COMPS, SITE_LINKS } from '../data/protocol';

const [charizard, umbreon, lugia] = RECENT_CARD_COMPS;

export default function Hero() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <section className="relative overflow-hidden border-b border-white/8 pb-8 pt-16 sm:pt-20 lg:min-h-[calc(100svh-76px)] lg:pb-10">
            <div className="absolute inset-0 pixel-grid opacity-30" aria-hidden />
            <div
                className="absolute inset-0"
                aria-hidden
                style={{
                    background:
                        'radial-gradient(circle at 72% 18%, rgba(105,200,255,0.16), transparent 22%), radial-gradient(circle at 24% 72%, rgba(217,177,99,0.12), transparent 22%), linear-gradient(140deg, rgba(105,200,255,0.05), transparent 32%, rgba(217,177,99,0.04) 80%, transparent 100%)',
                }}
            />

            <div className="relative mx-auto max-w-[min(1820px,calc(100vw-40px))] px-4">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:items-start lg:gap-6 xl:gap-10">
                    <div className={`${mounted ? 'scan-reveal' : 'opacity-0'} max-w-[38rem] lg:pt-0`}>
                        <div className="flex flex-wrap gap-3">
                            <PixelLabel tone="live">GM10</PixelLabel>
                            <PixelLabel tone="warning">Live on Fuji</PixelLabel>
                        </div>

                        <div className="mt-7">
                            <div className="pixel-font text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">
                                Gem Mint Strategy
                            </div>
                            <h1 className="mt-4 max-w-[12ch] font-['Oxanium'] text-[3.35rem] font-semibold leading-[0.9] text-[var(--text-main)] sm:text-[4rem] lg:text-[4.85rem]">
                                Proxy access to elite Pokemon-card upside.
                            </h1>
                        </div>

                        <p className="mt-5 max-w-[33rem] text-lg leading-8 text-[var(--text-soft)] sm:text-[1.08rem]">
                            Get exposure to scarce, high-grade grails without picking, buying, storing, or exiting the slabs yourself.
                        </p>

                        <div className="mt-4 max-w-[34rem] text-sm leading-7 text-[var(--text-soft)]">
                            <span className="font-semibold text-[var(--text-main)]">$CATCH</span> follows entries, holdings, exits, and the upside path of the full card run.
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <PixelMenuLink to="/fundraising" active>
                                Buy $CATCH
                            </PixelMenuLink>
                            <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer">
                                Follow on X
                            </PixelExternalLink>
                        </div>

                    </div>

                    <div className={`${mounted ? 'scan-reveal scan-delay-1' : 'opacity-0'} relative min-h-[360px] sm:min-h-[430px] lg:min-h-[500px]`}>
                        <PixelDivider label="Premium TCG spread" className="mb-5" />

                        <div className="relative h-full">
                            <div className="absolute inset-[6%_2%_8%_4%] rounded-[44px] border border-white/8 bg-[radial-gradient(circle_at_28%_30%,rgba(105,200,255,0.18),transparent_20%),radial-gradient(circle_at_85%_18%,rgba(217,177,99,0.12),transparent_18%),linear-gradient(145deg,rgba(255,255,255,0.04),transparent_28%),rgba(8,13,24,0.42)] shadow-[0_26px_90px_rgba(0,0,0,0.34)]" />
                            <div className="absolute inset-[12%_6%_14%_12%] rounded-[46px] bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_28%),rgba(7,12,23,0.24)]" />

                            <PixelMediaFrame
                                eyebrow="Anchor card"
                                title={`${charizard.name} ${charizard.grade}`}
                                caption={`${charizard.priceLabel} • ${charizard.recencyLabel}`}
                                className="absolute left-[18%] top-[10%] z-30 w-[43%] max-w-[410px] -rotate-[8deg]"
                            >
                                <img
                                    src={charizard.imageSrc}
                                    alt={charizard.imageAlt}
                                    className="aspect-[4/5] w-full rounded-[22px] object-cover"
                                    loading="eager"
                                />
                            </PixelMediaFrame>

                            <PixelMediaFrame
                                eyebrow="Modern chase"
                                title={umbreon.name}
                                caption={`${umbreon.grade} • ${umbreon.priceLabel}`}
                                className="absolute left-[2%] bottom-[8%] z-20 w-[27%] max-w-[245px] -rotate-[2deg]"
                            >
                                <img
                                    src={umbreon.imageSrc}
                                    alt={umbreon.imageAlt}
                                    className="aspect-[4/5] w-full rounded-[22px] object-cover"
                                    loading="lazy"
                                />
                            </PixelMediaFrame>

                            <PixelMediaFrame
                                eyebrow="Vintage signal"
                                title={lugia.name}
                                caption={`${lugia.grade} • ${lugia.priceLabel}`}
                                className="absolute right-[4%] top-[18%] z-20 w-[24%] max-w-[215px] rotate-[9deg]"
                            >
                                <img
                                    src={lugia.imageSrc}
                                    alt={lugia.imageAlt}
                                    className="aspect-[4/5] w-full rounded-[22px] object-cover"
                                    loading="lazy"
                                />
                            </PixelMediaFrame>

                            <div className="absolute bottom-[10%] right-[8%] z-40 w-[36%] min-w-[220px] max-w-[290px] rounded-[28px] border border-[rgba(217,177,99,0.24)] bg-[linear-gradient(140deg,rgba(255,255,255,0.04),transparent_32%),rgba(9,14,25,0.88)] p-5 shadow-[0_20px_54px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                                <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--accent-warning)]">
                                    Grade premium
                                </div>
                                <div className="mt-3 text-3xl font-bold text-[var(--text-main)]">$550k</div>
                                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                                    Trophy-tier cards clear in a different price band than ordinary inventory.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
