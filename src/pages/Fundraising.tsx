import { useMemo, useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, parseEther } from 'viem';
import Page from '../components/Page';
import { ScrollReveal } from '../components/ScrollReveal';
import { useTheme } from '../hooks/useTheme';
import {
    PixelExternalLink,
    PixelLabel,
    PixelMessageBox,
    PixelMeter,
    PixelMenuLink,
    PixelPanel,
} from '../components/PixelUI';
import { GM10_FUND_ABI } from '../data/contracts';
import { BUY_PAGE_DEFAULTS, FUJI_PRIMARY_DEPLOYMENT, SITE_LINKS } from '../data/protocol';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from '../components/Web3Providers';

const AVAX_USD_ESTIMATE = 25;

function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function FundraisingContent() {
    const { theme } = useTheme();
    const { isConnected } = useAccount();
    const { data: hash, error: writeError, isPending, reset, writeContract } = useWriteContract();
    const {
        error: receiptError,
        isError: isReceiptError,
        isLoading: isConfirming,
        isSuccess: isConfirmed,
    } = useWaitForTransactionReceipt({ hash });
    const [amount, setAmount] = useState('');
    const [txError, setTxError] = useState<string | null>(null);
    const roundState = useFujiRoundState();
    const proofState = useFujiPortfolioPositions();

    const activeRoundId = roundState.roundId;
    const roundData = roundState.round;

    const roundTarget = roundData ? Number(formatEther(roundData.targetAmount)) : BUY_PAGE_DEFAULTS.targetAvax;
    const roundRaised = roundData ? Number(formatEther(roundData.raisedAmount)) : 0;
    const tokenPrice = roundData ? Number(formatEther(roundData.tokenPrice)) : BUY_PAGE_DEFAULTS.priceAvax;
    const minInvestment = roundData ? Number(formatEther(roundData.minInvestment)) : BUY_PAGE_DEFAULTS.minAvax;
    const maxInvestment = roundData ? Number(formatEther(roundData.maxInvestment)) : BUY_PAGE_DEFAULTS.maxAvax;
    const isRoundActive = roundState.isRoundOpen;

    const progress = roundTarget > 0 ? Math.min((roundRaised / roundTarget) * 100, 100) : 0;
    const estimatedTokens = amount ? (Number(amount) / tokenPrice).toFixed(2) : '0.00';

    const displayError = useMemo(() => {
        if (txError) return txError;
        const surfacedError = receiptError ?? writeError;
        if (!surfacedError) return null;
        const message = surfacedError.message;
        if (message.includes('RoundNotActive')) return 'This Fuji test round is closed. Mainnet round coming soon.';
        if (message.includes('reverted')) return 'This Fuji test round is closed. Mainnet round coming soon.';
        if (message.includes('InvestmentBelowMinimum')) return `Minimum buy is ${minInvestment} AVAX.`;
        if (message.includes('InvestmentAboveMaximum')) return `Maximum buy is ${maxInvestment} AVAX.`;
        if (message.includes('TargetReached')) return 'The current round is already full.';
        return message;
    }, [txError, receiptError, writeError, minInvestment, maxInvestment]);

    function handleInvest() {
        if (!amount) return;
        setTxError(null);
        reset();

        if (!roundData || !roundState.isRoundOpen) {
            setTxError('This Fuji test round is closed. Mainnet round coming soon.');
            return;
        }

        try {
            writeContract({
                address: FUJI_PRIMARY_DEPLOYMENT.proxy.address,
                abi: GM10_FUND_ABI,
                functionName: 'invest',
                args: [BigInt(activeRoundId)],
                value: parseEther(amount),
            });
        } catch (error) {
            setTxError(error instanceof Error ? error.message : 'Transaction failed');
        }
    }

    return (
        <Page containerClassName="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
            {/* Status bar */}
            <ScrollReveal>
                <div className="flex flex-wrap gap-2">
                    <PixelLabel tone={isRoundActive ? 'live' : 'warning'}>{roundState.status}</PixelLabel>
                    <PixelLabel tone="warning">Test AVAX only</PixelLabel>
                    <PixelLabel tone="live">Verified on Snowtrace</PixelLabel>
                </div>
            </ScrollReveal>

            {/* Header + info cards */}
            <section className="mt-6">
                <ScrollReveal>
                    <div>
                        <div className="label-font">Buy</div>
                        <h1 className="mt-4 text-[2.8rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[3.4rem]">
                            Enter the round.
                        </h1>
                        <p className="mt-3 text-[1.05rem] leading-[1.7] text-[var(--text-secondary)]">
                            The live round is open on Fuji. Inspect the contracts, review the flow, then buy in when you're ready.
                        </p>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={1}>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {[
                            ['🎯', 'Exposure', "You're not buying one card. You're buying into the full strategy."],
                            ['💰', 'Pricing', 'Marks come from executed trades first, then the strongest available comps.'],
                            ['🚪', 'Exits', 'Sale proceeds return onchain before any splits are calculated.'],
                        ].map(([emoji, title, body]) => (
                            <div key={title} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--border-strong)]">
                                <span className="shrink-0 text-lg" aria-hidden>{emoji}</span>
                                <div>
                                    <div className="text-[0.85rem] font-bold text-[var(--text-primary)]">{title}</div>
                                    <p className="mt-0.5 text-[0.84rem] leading-[1.6] text-[var(--text-secondary)]">{body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollReveal>
            </section>

            {/* Buy panel — full width, single flow */}
            <section className="mt-8">
                <ScrollReveal delay={2}>
                    <PixelPanel tone={isRoundActive ? 'live' : 'warning'} className="!rounded-2xl !p-0 !overflow-hidden">
                        {/* Progress strip */}
                        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">Buy $CATCH</h2>
                                <PixelLabel tone="warning">Fuji</PixelLabel>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="hidden w-40 sm:block">
                                    <PixelMeter value={progress} tone={isRoundActive ? 'live' : 'warning'} />
                                </div>
                                <span className="text-[0.85rem] font-semibold text-[var(--text-primary)]">{progress.toFixed(1)}%</span>
                            </div>
                        </div>

                        {/* Stats strip */}
                        <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)] text-center">
                            {[
                                { label: 'Min buy', value: `${minInvestment} AVAX` },
                                { label: 'Max buy', value: `${maxInvestment} AVAX` },
                                { label: 'Token price', value: `${tokenPrice} AVAX` },
                            ].map((stat) => (
                                <div key={stat.label} className="px-4 py-3">
                                    <div className="label-font" style={{ fontSize: '0.6rem' }}>{stat.label}</div>
                                    <div className="mt-1 text-[0.95rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Input + CTA */}
                        <div className="flex flex-col items-stretch gap-3 px-6 py-5 lg:flex-row lg:items-center lg:gap-3">
                            {/* Amount input */}
                            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-2.5 transition-colors focus-within:border-[var(--border-strong)] lg:flex-1">
                                <input
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    placeholder="1.0"
                                    className="w-full min-w-0 bg-transparent text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                                />
                                <span className="shrink-0 text-[0.75rem] font-medium text-[var(--text-tertiary)]">AVAX</span>
                            </div>

                            {/* Arrow + output */}
                            <div className="hidden shrink-0 text-[0.8rem] text-[var(--text-tertiary)] lg:flex lg:items-center lg:gap-1.5">
                                <span>→</span>
                                <span className="font-semibold text-[var(--accent-blue)]">{estimatedTokens} CATCH</span>
                                <span className="text-[0.72rem]">(~${(Number(amount || 0) * AVAX_USD_ESTIMATE).toFixed(2)})</span>
                            </div>

                            {/* CTA buttons — always side-by-side */}
                            <div className="flex shrink-0 items-center gap-3">
                                {!isConnected ? (
                                    <ConnectButton />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleInvest}
                                        disabled={!amount || !roundState.isRoundOpen || isPending || isConfirming}
                                        className="pixel-menu-link pixel-menu-link-active shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span className="pixel-menu-cursor opacity-100">↗</span>
                                        <span>{isPending || isConfirming ? 'Submitting...' : roundState.isRoundOpen ? 'Buy $CATCH' : 'Round closed'}</span>
                                    </button>
                                )}
                                <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer" className="shrink-0">
                                    Follow on X
                                </PixelExternalLink>
                            </div>
                        </div>

                        {/* Mobile output (hidden on desktop) */}
                        <div className="border-t border-[var(--border)] px-6 py-2.5 text-[0.8rem] text-[var(--text-tertiary)] lg:hidden">
                            → <span className="font-semibold text-[var(--accent-blue)]">{estimatedTokens} CATCH</span>
                            <span className="ml-2">(~${(Number(amount || 0) * AVAX_USD_ESTIMATE).toFixed(2)} USD)</span>
                        </div>

                        {!displayError && !isRoundActive ? (
                            <div className="border-t border-[var(--border)] px-6 py-4">
                                <PixelMessageBox title="Round closed" body="The Fuji test round has expired. Mainnet round coming soon." />
                            </div>
                        ) : null}
                        {displayError ? (
                            <div className="border-t border-[var(--border)] px-6 py-4">
                                <PixelMessageBox title="Error" body={displayError} />
                            </div>
                        ) : null}
                        {isReceiptError && !displayError ? (
                            <div className="border-t border-[var(--border)] px-6 py-4">
                                <PixelMessageBox title="Error" body="The transaction reverted onchain." />
                            </div>
                        ) : null}
                        {isConfirmed ? (
                            <div className="border-t border-[var(--border)] px-6 py-4">
                                <PixelMessageBox title="Confirmed" body="Buy confirmed onchain." />
                            </div>
                        ) : null}

                        {/* Disclaimer */}
                        <div className="border-t border-[var(--border)] px-6 py-3 text-[0.75rem] text-[var(--text-tertiary)]">
                            Test AVAX only. This surface gives proxy access to the run while keeping the live mechanics public.
                        </div>
                    </PixelPanel>
                </ScrollReveal>
            </section>

            {/* ── PROOF SECTION ── */}
            <section id="proof" className="mt-10 scroll-mt-28">
                <ScrollReveal>
                    <div className="label-font">Fuji stack</div>
                    <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                        Inspect everything.
                    </h2>
                    <p className="mt-2 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                        Contracts, round state, and recorded positions. All live on Fuji, all verified on Snowtrace.
                    </p>
                </ScrollReveal>

                {/* Stats */}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                        { emoji: '📦', label: 'Positions', value: proofState.collectiblePositionCount },
                        { emoji: '📊', label: 'Marked value', value: proofState.proofSummary.portfolioValueLabel },
                        { emoji: '💵', label: 'Cash buffer', value: proofState.proofSummary.liquidTreasuryLabel },
                    ].map((stat, index) => (
                        <ScrollReveal key={stat.label} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--border-strong)]">
                                <div className="flex items-center gap-2">
                                    <span aria-hidden>{stat.emoji}</span>
                                    <span className="label-font">{stat.label}</span>
                                </div>
                                <div className="mt-2 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">{stat.value}</div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                {/* Contracts */}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[...roundState.links, ...proofState.links].map((contract, index) => (
                        <ScrollReveal key={`${contract.address}-${index}`} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <a
                                href={contract.snowtraceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-all duration-200 hover:border-[var(--accent-blue)]/20 hover:shadow-[var(--shadow-sm)]"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="label-font truncate">{contract.label}</span>
                                    <span className="shrink-0 text-[0.7rem] font-medium text-[var(--accent-blue)] opacity-0 transition-opacity group-hover:opacity-100">↗</span>
                                </div>
                                <div className="mt-1.5 truncate font-mono text-[0.78rem] text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                                    {formatAddress(contract.address)}
                                </div>
                            </a>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            {/* ── BOTTOM CTA ── */}
            <section className="mt-10">
                <ScrollReveal>
                    <div
                        className="rounded-2xl border border-[var(--border)] px-6 py-12 text-center transition-colors"
                        style={{
                            background: theme === 'dark'
                                ? 'radial-gradient(ellipse 70% 80% at 20% 50%, rgba(240,192,48,0.09) 0%, transparent 65%), radial-gradient(ellipse 60% 70% at 80% 30%, rgba(79,168,224,0.08) 0%, transparent 65%), var(--bg-secondary)'
                                : 'radial-gradient(ellipse 70% 80% at 20% 50%, rgba(240,192,48,0.10) 0%, transparent 65%), radial-gradient(ellipse 60% 70% at 80% 30%, rgba(79,168,224,0.09) 0%, transparent 65%), var(--bg-secondary)',
                        }}
                    >
                        <div className="label-font">What you are buying</div>
                        <h2 className="mx-auto mt-3 max-w-[22ch] text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                            The full strategy. One token.
                        </h2>
                        <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-[1.7] text-[var(--text-secondary)]">
                            GM10 acquires the cards. $CATCH tracks the round, the holdings, and every exit.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <PixelMenuLink to="/portfolio">Open portfolio</PixelMenuLink>
                            <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer">
                                Follow on X
                            </PixelExternalLink>
                        </div>
                    </div>
                </ScrollReveal>
            </section>
        </Page>
    );
}

export default function Fundraising() {
    return (
        <Web3Providers>
            <FundraisingContent />
        </Web3Providers>
    );
}
