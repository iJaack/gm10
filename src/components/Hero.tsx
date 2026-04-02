import { useEffect, useState } from 'react';
import { PixelExternalLink, PixelMenuLink } from './PixelUI';
import { SITE_LINKS } from '../data/protocol';
import { useTheme } from '../hooks/useTheme';

export default function Hero() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Text tokens derived from the actual overlay color — always maximally contrasted
    // against the photo background regardless of theme or viewport size
    const onPhoto = {
        primary:   theme === 'dark' ? '#ffffff'                : '#0f0e0a',
        secondary: theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(15,14,10,0.82)',
        muted:     theme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(15,14,10,0.55)',
        // Heavy layered halo — text stays readable against any part of the photo
        shadow:    theme === 'dark'
            ? '0 1px 4px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)'
            : '0 1px 4px rgba(255,255,255,1), 0 0 16px rgba(255,255,255,0.95), 0 0 40px rgba(255,255,255,0.75)',
    };

    return (
        <section className="relative overflow-hidden pb-6 pt-24 sm:pt-28 md:pb-8 md:pt-32">
            {/* Photo background — day in light mode, night in dark mode */}
            <div className="absolute inset-0 z-0">
                <img
                    src={theme === 'dark' ? '/brand/cover-pokeball-night.png' : '/brand/cover-pokeball.png'}
                    alt=""
                    aria-hidden
                    className="h-full w-full object-cover object-center"
                />
                {/* Overlay sm→lg — very faint, photo almost fully visible */}
                <div
                    className="absolute inset-0 hidden sm:block lg:hidden"
                    style={{
                        background: theme === 'dark'
                            ? 'linear-gradient(105deg, rgba(11,10,20,0.14) 0%, rgba(11,10,20,0.05) 60%, rgba(11,10,20,0.01) 100%)'
                            : 'linear-gradient(105deg, rgba(250,247,240,0.10) 0%, rgba(250,247,240,0.03) 60%, rgba(250,247,240,0.00) 100%)',
                    }}
                />
                {/* Overlay lg+ — slightly more present for wide layouts */}
                <div
                    className="absolute inset-0 hidden lg:block"
                    style={{
                        background: theme === 'dark'
                            ? 'linear-gradient(105deg, rgba(11,10,20,0.28) 0%, rgba(11,10,20,0.10) 60%, rgba(11,10,20,0.02) 100%)'
                            : 'linear-gradient(105deg, rgba(250,247,240,0.22) 0%, rgba(250,247,240,0.08) 60%, rgba(250,247,240,0.01) 100%)',
                    }}
                />
            </div>

            {/* Mobile-only frosted backdrop — keeps text legible against the photo */}
            <div
                className="absolute inset-x-0 bottom-0 top-0 z-[5] sm:hidden"
                style={{
                    background: theme === 'dark'
                        ? 'linear-gradient(to bottom, rgba(11,10,20,0.68) 0%, rgba(11,10,20,0.50) 70%, rgba(11,10,20,0.20) 100%)'
                        : 'linear-gradient(to bottom, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.60) 70%, rgba(255,255,255,0.15) 100%)',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                }}
            />

            <div className="relative z-10 mx-auto max-w-[min(1440px,calc(100vw-48px))] px-4">
                {/* Headline */}
                <h1
                    className={`mt-6 max-w-[20ch] text-[2.8rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[3.4rem] lg:text-[4.2rem] ${mounted ? 'scan-reveal scan-delay-1' : 'opacity-0'}`}
                    style={{ color: onPhoto.primary, textShadow: onPhoto.shadow }}
                >
                    The 'mons you can't $CATCH alone.
                </h1>

                {/* Subtitle + Tagline — frosted pill guarantees readability over any photo */}
                <div
                    className={`mt-5 w-fit max-w-[34rem] rounded-2xl px-4 py-3 ${mounted ? 'scan-reveal scan-delay-2' : 'opacity-0'}`}
                    style={{
                        background: theme === 'dark' ? 'rgba(11,10,20,0.55)' : 'rgba(255,255,255,0.72)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                    }}
                >
                    <p
                        className="text-[1.05rem] leading-[1.65] sm:text-[1.15rem]"
                        style={{ color: onPhoto.secondary }}
                    >
                        Share the upside of trophy-grade Pokémon grails — without buying them solo. One fund, one token, zero card work.
                    </p>
                    <p
                        className="mt-2 text-[0.88rem]"
                        style={{ color: onPhoto.muted }}
                    >
                        <span style={{ fontWeight: 600, color: onPhoto.secondary }}>$CATCH</span> is your share. Built on Avalanche. Agent-ready.
                    </p>
                </div>

                {/* CTAs */}
                <div className={`mt-8 flex flex-wrap gap-3 ${mounted ? 'scan-reveal scan-delay-3' : 'opacity-0'}`}>
                    <PixelMenuLink to="/fundraising" active>
                        Buy $CATCH
                    </PixelMenuLink>
                    <PixelExternalLink
                        href={SITE_LINKS.x}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            background: theme === 'dark' ? 'rgba(10,10,10,0.65)' : 'rgba(255,255,255,0.72)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
                            color: onPhoto.primary,
                        }}
                    >
                        Follow on X
                    </PixelExternalLink>
                </div>
            </div>

            {/* Photo credit */}
            <p
                className="absolute bottom-2 right-3 z-10 text-[0.65rem]"
                style={{ color: onPhoto.muted }}
            >
                Photo by{' '}
                <a
                    href="https://unsplash.com/@bahnijitb?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: onPhoto.muted }}
                >
                    Bahnijit Barman
                </a>{' '}
                on{' '}
                <a
                    href="https://unsplash.com/photos/two-red-and-white-balls-sitting-in-the-grass-1fZC2rYbpsU?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: onPhoto.muted }}
                >
                    Unsplash
                </a>
            </p>
        </section>
    );
}
