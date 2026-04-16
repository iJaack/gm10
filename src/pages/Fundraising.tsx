import { useMemo, useState } from 'react';
import { useAccount, useBalance, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, parseEther } from 'viem';
import { useAvaxPrice } from '../hooks/useAvaxPrice';
import Page from '../components/Page';
import { ScrollReveal } from '../components/ScrollReveal';
import {
    PixelExternalLink,
    PixelLabel,
    PixelMessageBox,
    PixelMeter,
    PixelMenuLink,
    PixelPanel,
} from '../components/PixelUI';
import { GM10_FUND_ABI } from '../data/contracts';
import { BUY_PAGE_DEFAULTS, SITE_LINKS, SUPPORT_PAGE_COPY, getRoundPrimaryCtaLabel } from '../data/protocol';
import {
    GM10_NETWORK_LABEL,
    GM10_PRIMARY_DEPLOYMENT,
    ROUND_1_END_AT,
    ROUND_1_START_AT,
} from '../data/gm10Config';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from '../components/Web3Providers';
import { RoundTimingCallout } from '../components/RoundTimingCallout';

const GAS_RESERVE = 0.05; // keep 0.05 AVAX for gas

function formatAddress(address?: string) {
    if (!address) return 'Pending deployment';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUtcTimestamp(timestamp: number) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
    }).format(new Date(timestamp * 1000));
}

function FundraisingContent() {
    const { address, isConnected } = useAccount();
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
    const avaxUsd = useAvaxPrice();
    const { data: balanceData } = useBalance({ address, query: { enabled: Boolean(address) } });
    const walletAvax = balanceData ? Number(formatEther(balanceData.value)) : 0;
    const spendableAvax = Math.max(0, walletAvax - GAS_RESERVE);

    const activeRoundId = roundState.roundId;
    const roundData = roundState.round;

    const roundTarget = roundData ? Number(formatEther(roundData.targetAmount)) : BUY_PAGE_DEFAULTS.targetAvax;
    const roundRaised = roundData ? Number(formatEther(roundData.raisedAmount)) : 0;
    const tokenPrice = roundData ? Number(formatEther(roundData.tokenPrice)) : BUY_PAGE_DEFAULTS.priceAvax;
    const minInvestment = roundData ? Number(formatEther(roundData.minInvestment)) : BUY_PAGE_DEFAULTS.minAvax;
    const maxInvestment = roundData ? Number(formatEther(roundData.maxInvestment)) : BUY_PAGE_DEFAULTS.maxAvax;
    const isRoundActive = roundState.isRoundOpen;
    const isUpcoming = roundState.isUpcoming;
    const isClosed = roundState.isClosed;
    const buyUnavailable = !roundState.isRoundOpen || !GM10_PRIMARY_DEPLOYMENT.proxy.address;
    const roundWindowLabel = `${formatUtcTimestamp(roundState.startsAt ?? ROUND_1_START_AT)} UTC → ${formatUtcTimestamp(roundState.endsAt ?? ROUND_1_END_AT)} UTC`;
    const progress = roundTarget > 0 ? Math.min((roundRaised / roundTarget) * 100, 100) : 0;
    const estimatedTokens = amount ? (Number(amount) / tokenPrice).toFixed(2) : '0.00';
    const pageCopy = SUPPORT_PAGE_COPY.fundraising;

    const displayError = useMemo(() => {
        if (txError) return txError;
        const surfacedError = receiptError ?? writeError;
        if (!surfacedError) return null;
        const message = surfacedError.message;
        if (message.includes('RoundNotActive')) return `Round ${activeRoundId} is not open for buying right now.`;
        if (message.includes('reverted')) return 'The round rejected this transaction.';
        if (message.includes('InvestmentBelowMinimum')) return `Minimum buy is ${minInvestment} AVAX.`;
        if (message.includes('InvestmentAboveMaximum')) return `Maximum buy is ${maxInvestment} AVAX.`;
        if (message.includes('TargetReached')) return `Round ${activeRoundId} is already at capacity.`;
        return message;
    }, [txError, receiptError, writeError, minInvestment, maxInvestment]);

    function handleInvest() {
        if (!amount) return;
        setTxError(null);
        reset();

        if (!GM10_PRIMARY_DEPLOYMENT.proxy.address) {
            setTxError('Mainnet fund address has not been configured yet.');
            return;
        }

        if (!roundState.isRoundOpen) {
            setTxError(
                isUpcoming
                    ? `Round ${activeRoundId} has not opened yet. Buying stays disabled until the start timestamp.`
                    : `Round ${activeRoundId} is closed for new buys.`,
            );
            return;
        }

        try {
            writeContract({
                address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
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
                    <PixelLabel tone={isRoundActive ? 'live' : isUpcoming ? 'warning' : 'base'}>{roundState.status}</PixelLabel>
                    <PixelLabel tone="warning">{GM10_NETWORK_LABEL}</PixelLabel>
                    <PixelLabel tone="live">Verified on Snowtrace</PixelLabel>
                </div>
            </ScrollReveal>

            {/* Header + info cards */}
            <section className="mt-6">
                <ScrollReveal>
                    <div>
                        <div className="label-font">{pageCopy.eyebrow}</div>
                        <h1 className="mt-4 text-[2.8rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[3.4rem]">
                            {pageCopy.title}
                        </h1>
                        <p className="mt-3 text-[1.05rem] leading-[1.7] text-[var(--text-secondary)]">
                            {isRoundActive
                                ? pageCopy.body
                                : isUpcoming
                                    ? `Round ${activeRoundId} is about to open on Avalanche mainnet. Buying activates at the exact start timestamp — the live terms, timeline, and proof links are already visible below.`
                                    : `Round ${activeRoundId} is closed for new buys. The page still shows exactly what the position represents, how the module works, and where to inspect the live proof.`}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <PixelMenuLink to={pageCopy.primaryCtaTo} active>
                                {getRoundPrimaryCtaLabel(isRoundActive)}
                            </PixelMenuLink>
                            <PixelMenuLink to={pageCopy.secondaryCtaTo}>
                                Inspect the Proof
                            </PixelMenuLink>
                        </div>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={1}>
                    <div className="mt-6">
                        <RoundTimingCallout roundState={roundState} />
                    </div>
                </ScrollReveal>

                {/* Round summary — shown when round is closed */}
                {isClosed ? (
                    <ScrollReveal delay={2}>
                        <div className="mt-6">
                            <div className="label-font text-[var(--accent-green)]">Round {activeRoundId} complete</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5" style={{ borderLeft: '3px solid var(--accent-green)' }}>
                                    <div className="label-font text-[0.6rem]">Total raised</div>
                                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{roundRaised.toLocaleString('en-US')} AVAX</div>
                                    <div className="mt-1 text-[0.78rem] text-[var(--text-tertiary)]">~${(roundRaised * avaxUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD at current price</div>
                                </div>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5" style={{ borderLeft: '3px solid var(--accent)' }}>
                                    <div className="label-font text-[0.6rem]">Filled in</div>
                                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">~45 hours</div>
                                    <div className="mt-1 text-[0.78rem] text-[var(--text-tertiary)]">13 Apr 20:13 → 15 Apr 16:48 UTC</div>
                                </div>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5" style={{ borderLeft: '3px solid var(--accent-blue)' }}>
                                    <div className="label-font text-[0.6rem]">Deployed to cards</div>
                                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{proofState.proofSummary.costBasisLabel}</div>
                                    <div className="mt-1 text-[0.78rem] text-[var(--text-tertiary)]">{proofState.proofSummary.holdingsChipLabel}</div>
                                </div>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5" style={{ borderLeft: '3px solid var(--accent)' }}>
                                    <div className="label-font text-[0.6rem]">Liquid treasury</div>
                                    <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{proofState.proofSummary.liquidTreasuryLabel}</div>
                                    <div className="mt-1 text-[0.78rem] text-[var(--text-tertiary)]">Remaining AVAX in fund</div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                ) : null}

                <ScrollReveal delay={isClosed ? 3 : 2}>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {[
                            ['🎯', 'Exposure', "You're not buying one card. You're buying into the full strategy."],
                            ['🕒', 'Round window', roundWindowLabel],
                            ['💸', 'Profit share', 'Profitable exits route 40% of realized profit into claimable AVAX distributions for eligible holders.'],
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
            <section id="buy-panel" className="mt-8 scroll-mt-28">
                <ScrollReveal delay={3}>
                    <PixelPanel tone={isRoundActive ? 'live' : 'warning'} className="!rounded-2xl !p-0 !overflow-hidden">
                        {/* Progress strip */}
                        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">Buy $CATCH</h2>
                                <PixelLabel tone="warning">{GM10_NETWORK_LABEL}</PixelLabel>
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
                                <span className="text-[0.72rem]">(~${(Number(amount || 0) * avaxUsd).toFixed(2)})</span>
                            </div>

                            {/* CTA buttons — always side-by-side */}
                            <div className="flex shrink-0 items-center gap-3">
                                {!isConnected ? (
                                    <ConnectButton />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleInvest}
                                        disabled={!amount || buyUnavailable || isPending || isConfirming}
                                        className="pixel-menu-link pixel-menu-link-active shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span className="pixel-menu-cursor opacity-100">↗</span>
                                        <span>
                                            {isPending || isConfirming
                                                ? 'Submitting...'
                                                : isUpcoming
                                                    ? 'Round upcoming'
                                                    : isClosed
                                                        ? 'Round closed'
                                                        : !GM10_PRIMARY_DEPLOYMENT.proxy.address
                                                            ? 'Awaiting deploy'
                                                            : 'Buy $CATCH'}
                                        </span>
                                    </button>
                                )}
                                <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer" className="shrink-0">
                                    Follow on X
                                </PixelExternalLink>
                            </div>
                        </div>

                        {/* Wallet balance + quick-fill */}
                        {isConnected && walletAvax > 0 ? (
                            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-6 py-2.5">
                                <span className="text-[0.78rem] text-[var(--text-tertiary)]">
                                    Balance: {walletAvax.toFixed(4)} AVAX
                                </span>
                                <div className="flex gap-1.5">
                                    {[25, 50, 75, 100].map((pct) => {
                                        const raw = spendableAvax * (pct / 100);
                                        const clamped = Math.min(Math.max(raw, minInvestment), maxInvestment);
                                        const value = Number(clamped.toFixed(4));
                                        return (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => setAmount(String(value))}
                                                className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                                            >
                                                {pct === 100 ? 'MAX' : `${pct}%`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}

                        {/* Mobile output (hidden on desktop) */}
                        <div className="border-t border-[var(--border)] px-6 py-2.5 text-[0.8rem] text-[var(--text-tertiary)] lg:hidden">
                            → <span className="font-semibold text-[var(--accent-blue)]">{estimatedTokens} CATCH</span>
                            <span className="ml-2">(~${(Number(amount || 0) * avaxUsd).toFixed(2)} USD)</span>
                        </div>

                        {!displayError && !isRoundActive ? (
                            <div className="border-t border-[var(--border)] px-6 py-4">
                                <PixelMessageBox
                                    title={isUpcoming ? 'Round upcoming' : 'Round closed'}
                                    body={isUpcoming
                                        ? `Buying stays disabled until ${roundWindowLabel}.`
                                        : `Round ${activeRoundId} is closed for new buys. Use this page to review the module and inspect the proof.`}
                                />
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
                                <PixelMessageBox
                                    title="Confirmed"
                                    body={
                                        <span>
                                            Buy confirmed onchain.{' '}
                                            {hash ? (
                                                <a
                                                    href={`https://snowtrace.io/tx/${hash}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="font-semibold text-[var(--accent-blue)] underline underline-offset-2"
                                                >
                                                    View on Snowtrace ↗
                                                </a>
                                            ) : null}
                                        </span>
                                    }
                                />
                            </div>
                        ) : null}

                        {/* Disclaimer */}
                        <div className="border-t border-[var(--border)] px-6 py-3 text-[0.75rem] text-[var(--text-tertiary)]">
                            Round {activeRoundId} is live on Avalanche mainnet. The buy window closes when the {roundTarget.toLocaleString('en-US')} AVAX cap is reached or the end timestamp passes.
                        </div>
                    </PixelPanel>
                </ScrollReveal>
            </section>

            {/* ── PROOF SECTION ── */}
            <section id="proof" className="mt-10 scroll-mt-28">
                <ScrollReveal>
                    <div className="label-font">Mainnet proof</div>
                    <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                        Inspect everything.
                    </h2>
                    <p className="mt-2 text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                        Contracts, round state, and recorded positions. All wired for Avalanche mainnet and verified on Snowtrace.
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
                    {proofState.links.map((contract, index) => (
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
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-12 text-center transition-colors">
                        <div className="label-font">What the position represents</div>
                        <h2 className="mx-auto mt-3 max-w-[24ch] text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                            One contribution buys exposure to the full GM10 strategy, not a single card.
                        </h2>
                        <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-[1.7] text-[var(--text-secondary)]">
                            Use the portfolio page to review target selection, or stay on this page and inspect the proof stack before, during, or after Round {activeRoundId}.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <PixelMenuLink to="/portfolio">Open portfolio</PixelMenuLink>
                            <PixelMenuLink to="/fundraising#proof">Inspect the Proof</PixelMenuLink>
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
