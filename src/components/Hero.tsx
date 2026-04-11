import { PixelMenuLink } from './PixelUI';
import { HOME_PROOF_STRIP, getRoundPrimaryCtaLabel } from '../data/protocol';
import { useTheme } from '../hooks/useTheme';
import { useFujiRoundState } from '../hooks/useFujiProof';

export default function Hero() {
    const { theme } = useTheme();
    const roundState = useFujiRoundState();

    const onPhoto = {
        primary: theme === 'dark' ? '#ffffff' : '#0f0e0a',
        secondary: theme === 'dark' ? 'rgba(255,255,255,0.86)' : 'rgba(15,14,10,0.82)',
        muted: theme === 'dark' ? 'rgba(255,255,255,0.62)' : 'rgba(15,14,10,0.56)',
        shadow: theme === 'dark'
            ? '0 1px 4px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)'
            : '0 1px 4px rgba(255,255,255,1), 0 0 16px rgba(255,255,255,0.95), 0 0 40px rgba(255,255,255,0.75)',
    };

    return (
        <section className="relative overflow-hidden px-4 pb-14 pt-24 sm:pt-28 md:pb-20 md:pt-32">
            <div className="absolute inset-0 z-0">
                <img
                    src={theme === 'dark' ? '/brand/cover-pokeball-night.webp' : '/brand/cover-pokeball.webp'}
                    alt=""
                    aria-hidden
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover object-center"
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background: theme === 'dark'
                            ? 'linear-gradient(120deg, rgba(11,10,20,0.72) 0%, rgba(11,10,20,0.44) 48%, rgba(11,10,20,0.18) 100%)'
                            : 'linear-gradient(120deg, rgba(250,247,240,0.70) 0%, rgba(250,247,240,0.42) 48%, rgba(250,247,240,0.16) 100%)',
                    }}
                />
            </div>

            <div className="relative z-10 mx-auto max-w-[min(1440px,calc(100vw-48px))]">
                <div className="max-w-[44rem]">
                    <div className="label-font scan-reveal scan-delay-1" style={{ color: onPhoto.muted }}>
                        Onchain collectible exposure
                    </div>
                    <h1
                        className="mt-5 max-w-[18ch] text-[2.9rem] font-extrabold leading-[1.02] tracking-[-0.04em] scan-reveal scan-delay-1 sm:text-[3.5rem] lg:text-[4.35rem]"
                        style={{ color: onPhoto.primary, textShadow: onPhoto.shadow }}
                    >
                        Get exposure to trophy-grade Pokemon cards without running the card book yourself.
                    </h1>
                    <div
                        className="mt-6 max-w-[38rem] rounded-3xl px-5 py-4 scan-reveal scan-delay-2"
                        style={{
                            background: theme === 'dark' ? 'rgba(11,10,20,0.55)' : 'rgba(255,255,255,0.72)',
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                        }}
                    >
                        <p className="text-[1.08rem] leading-[1.72] sm:text-[1.14rem]" style={{ color: onPhoto.secondary }}>
                            GM10 turns sourcing, diligence, custody, valuation, and exits into one managed onchain strategy, so a single position can track the full portfolio.
                        </p>
                        <p className="mt-2 text-[0.88rem]" style={{ color: onPhoto.muted }}>
                            Avalanche mainnet is the reporting and execution layer for Round 1, with public proof links and contract-enforced timing.
                        </p>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-3 scan-reveal scan-delay-3">
                        <PixelMenuLink to="/fundraising" active>
                            {getRoundPrimaryCtaLabel(roundState.isRoundOpen)}
                        </PixelMenuLink>
                        <PixelMenuLink to="/fundraising#proof">
                            Inspect the Proof
                        </PixelMenuLink>
                    </div>
                </div>

                <div className="mt-12 grid gap-3 md:grid-cols-3">
                    {HOME_PROOF_STRIP.map((item, index) => (
                        <div
                            key={item.label}
                            className={`rounded-2xl border border-[var(--border)] px-5 py-4 backdrop-blur-sm scan-reveal scan-delay-${Math.min(index + 2, 3)}`}
                            style={{
                                background: theme === 'dark' ? 'rgba(11,10,20,0.58)' : 'rgba(255,255,255,0.66)',
                            }}
                        >
                            <div className="label-font" style={{ color: onPhoto.muted }}>{item.label}</div>
                            <div className="mt-2 text-lg font-bold tracking-[-0.02em]" style={{ color: onPhoto.primary }}>
                                {item.value}
                            </div>
                            <p className="mt-2 text-[0.9rem] leading-[1.6]" style={{ color: onPhoto.secondary }}>
                                {item.detail}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
