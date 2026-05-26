import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, formatUnits, parseUnits } from 'viem';
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
import {
    BUY_PAGE_DEFAULTS,
    ROUND_PROCEEDS_ALLOCATION,
    SITE_LINKS,
    SUPPORT_PAGE_COPY,
    getRoundPrimaryCtaLabel,
} from '../data/protocol';
import {
    GM10_NETWORK_LABEL,
    GM10_PRIMARY_DEPLOYMENT,
} from '../data/gm10Config';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from '../components/Web3Providers';
import { RoundTimingCallout } from '../components/RoundTimingCallout';

function formatAddress(address?: string) {
    if (!address) return 'Pending deployment';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAvaxAmount(value: number, maximumFractionDigits = value < 1 ? 6 : 4) {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits,
    });
}

function parseUsdt6(value: string) {
    try {
        return parseUnits(value || '0', 6);
    } catch {
        return 0n;
    }
}

function formatUsdc(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return `${Number(formatUnits(value, 6)).toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC`;
}

function formatCatch(value?: bigint) {
    if (value === undefined) return '0.00';
    return Number(formatUnits(value, 18)).toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function FundraisingContent() {
    const { isConnected } = useAccount();
    const [amount, setAmount] = useState('');
    const [txError, setTxError] = useState<string | null>(null);
    const roundState = useFujiRoundState();
    const proofState = useFujiPortfolioPositions();
    const settlementAmountUsdt6 = useMemo(() => parseUsdt6(amount), [amount]);

    const { data: navPerTokenUsdt6 } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'navPerTokenUsdt6',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: continuousMintPaused } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'continuousMintPaused',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: buybackPaused } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'buybackPaused',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: lpSupportPaused } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'lpSupportPaused',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: mintSpreadBps } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'mintSpreadBps',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: redemptionsPermanentlyDisabled } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'redemptionsPermanentlyDisabled',
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address) },
    });
    const { data: continuousPreview } = useReadContract({
        address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
        abi: GM10_FUND_ABI,
        functionName: 'previewContinuousMint',
        args: [settlementAmountUsdt6],
        query: { enabled: Boolean(GM10_PRIMARY_DEPLOYMENT.proxy.address && settlementAmountUsdt6 > 0n) },
    });

    const activeRoundId = roundState.roundId;
    const roundData = roundState.round;

    const roundTarget = roundData ? Number(formatEther(roundData.targetAmount)) : BUY_PAGE_DEFAULTS.targetAvax;
    const roundRaised = roundData ? Number(formatEther(roundData.raisedAmount)) : 0;
    const isRoundActive = roundState.isRoundOpen;
    const commitPreviewUnavailable = !GM10_PRIMARY_DEPLOYMENT.proxy.address || settlementAmountUsdt6 === 0n;
    const progress = roundTarget > 0 ? Math.min((roundRaised / roundTarget) * 100, 100) : 0;
    const estimatedTokens = formatCatch(continuousPreview?.[0]);
    const mintPriceLabel = continuousPreview?.[2] !== undefined ? formatUsdc(continuousPreview[2]) : navPerTokenUsdt6 !== undefined && mintSpreadBps !== undefined ? 'Enter an amount' : 'Unavailable';
    const spreadLabel = mintSpreadBps !== undefined ? `${mintSpreadBps.toString()} bps` : 'Unavailable';
    const pageCopy = SUPPORT_PAGE_COPY.fundraising;
    const allocationBaseAvax = roundRaised > 0 ? roundRaised : roundTarget;
    const liveAllocation = ROUND_PROCEEDS_ALLOCATION.buckets.map((bucket) => ({
        ...bucket,
        currentAvax: allocationBaseAvax * (bucket.percent / 100),
    }));
    const archiveRound = roundState.archiveRound;
    const archiveRaised = archiveRound ? Number(formatEther(archiveRound.raisedAmount)) : 0;
    const archiveTarget = archiveRound ? Number(formatEther(archiveRound.targetAmount)) : 0;
    const archiveProgress = archiveTarget > 0 ? Math.min((archiveRaised / archiveTarget) * 100, 100) : 0;

    const displayError = useMemo(() => {
        if (txError) return txError;
        return null;
    }, [txError]);

    function handleInvest() {
        if (!amount) return;
        setTxError(null);

        if (!GM10_PRIMARY_DEPLOYMENT.proxy.address) {
            setTxError('Mainnet fund address has not been configured yet.');
            return;
        }

        if (continuousMintPaused !== false) {
            setTxError(
                continuousMintPaused === true
                    ? 'Continuous commits are still paused onchain. The preview is live, but settlement cannot mint yet.'
                    : 'Continuous commit pause state is still loading. Wait for the onchain control read before previewing the route.',
            );
            return;
        }

        const amountNumber = Number(amount);
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            setTxError('Enter a valid USDC-equivalent amount.');
            return;
        }

        setTxError('Preview is ready. The executable LI.FI/Mobula route should be published only after the settlement receiver is verified.');
    }

    return (
        <Page containerClassName="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
            {/* Status bar */}
            <ScrollReveal>
                <div className="flex flex-wrap gap-2">
                    <PixelLabel tone={continuousMintPaused === false ? 'live' : 'warning'}>
                        {continuousMintPaused === false ? 'Continuous commits live' : 'Continuous commits paused'}
                    </PixelLabel>
                    <PixelLabel tone="warning">{GM10_NETWORK_LABEL}</PixelLabel>
                    <PixelLabel tone="base">Legacy raise finalized</PixelLabel>
                    <PixelLabel tone="live">V8 verified on Snowtrace</PixelLabel>
                    <PixelLabel tone={buybackPaused === true ? 'base' : 'warning'}>Buyback {buybackPaused === true ? 'paused' : 'live'}</PixelLabel>
                    <PixelLabel tone={lpSupportPaused === true ? 'base' : 'warning'}>LP {lpSupportPaused === true ? 'paused' : 'live'}</PixelLabel>
                    <PixelLabel tone={redemptionsPermanentlyDisabled ? 'base' : 'warning'}>Redemptions disabled</PixelLabel>
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
                            The fixed round is closed. New $CATCH entry moves through a continuous commit rail: supported source tokens route into Avalanche settlement, then V8 mints buyer $CATCH at the live NAV-derived price.
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
                    <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
                        <RoundTimingCallout roundState={roundState} />
                        <div className="grid gap-3">
                            {[
                                ['🕒', 'Commit mode', continuousMintPaused === false ? 'The mint gate is live on Avalanche. Cross-chain route publishing depends on the verified settlement receiver.' : 'The V8 preview is live; the mint gate is still paused until controlled activation.'],
                                ['💸', 'Sale-profit accrual', 'Profitable exits preserve card-buying power and can route bounded support to LP or CATCH buyback-and-burn.'],
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
                                <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">Continuous $CATCH Preview</h2>
                                <PixelLabel tone="warning">{GM10_NETWORK_LABEL}</PixelLabel>
                                <PixelLabel tone={continuousMintPaused === false ? 'live' : 'warning'}>
                                    {continuousMintPaused === false ? 'Mint gate live' : 'Mint gate paused'}
                                </PixelLabel>
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
                                { label: 'NAV', value: formatUsdc(navPerTokenUsdt6) },
                                { label: 'Mint spread', value: spreadLabel },
                                { label: 'Mint price', value: mintPriceLabel },
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
                                    placeholder="100.00"
                                    className="w-full min-w-0 bg-transparent text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                                />
                                <span className="shrink-0 text-[0.75rem] font-medium text-[var(--text-tertiary)]">USDC</span>
                            </div>
                            {/* Arrow + output */}
                            <div className="hidden shrink-0 text-[0.8rem] text-[var(--text-tertiary)] lg:flex lg:items-center lg:gap-1.5">
                                <span>→</span>
                                <span className="font-semibold text-[var(--accent-blue)]">{estimatedTokens} CATCH</span>
                                <span className="text-[0.72rem]">(~${Number(amount || 0).toFixed(2)})</span>
                            </div>

                            {/* CTA buttons — always side-by-side */}
                            <div className="flex shrink-0 items-center gap-3">
                                {!isConnected ? (
                                    <ConnectButton />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleInvest}
                                        disabled={!amount || commitPreviewUnavailable}
                                        className="pixel-menu-link pixel-menu-link-active shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span className="pixel-menu-cursor opacity-100">↗</span>
                                        <span>
                                            {!GM10_PRIMARY_DEPLOYMENT.proxy.address
                                                ? 'Awaiting deploy'
                                                : continuousMintPaused
                                                    ? 'Preview paused rail'
                                                    : 'Preview commit'}
                                        </span>
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
                            <span className="ml-2">(~${Number(amount || 0).toFixed(2)} USD)</span>
                        </div>

                        {!displayError ? (
                            <div className="border-t border-[var(--border)] px-6 py-4">
                                <PixelMessageBox
                                    title={continuousMintPaused ? 'Continuous commit paused' : 'Continuous commit preview'}
                                    body={continuousMintPaused
                                        ? 'The V8 preview reads live NAV and spread, but settlement minting stays paused until governance activates the gate.'
                                        : 'The V8 mint gate is live. Public route execution should use a verified LI.FI or Mobula settlement receiver before any user funds move.'}
                                />
                            </div>
                        ) : null}
                        {displayError ? (
                            <div className="border-t border-[var(--border)] px-6 py-4">
                                <PixelMessageBox title="Error" body={displayError} />
                            </div>
                        ) : null}
                        {/* Disclaimer */}
                        <div className="border-t border-[var(--border)] px-6 py-3 text-[0.75rem] text-[var(--text-tertiary)]">
                            Direct fixed-round buys are disabled. Continuous commits must be backed by verified Avalanche settlement before manager mint settlement.
                        </div>
                    </PixelPanel>
                </ScrollReveal>
            </section>

            {/* ── CONTINUOUS ROUND ALLOCATION ── */}
            <section id="continuous-round-allocation" className="mt-10 scroll-mt-28">
                <ScrollReveal>
                    <div className="label-font">Continuous round value routing</div>
                    <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                        Every verified settlement has a defined route.
                    </h2>
                    <p className="mt-2 max-w-3xl text-[0.92rem] leading-[1.7] text-[var(--text-secondary)]">
                        Fixed-window proceeds are archive material. The active surface is continuous: settled value mints buyer $CATCH immediately, preserves strategy buying power, and accrues bounded market-support reserves.
                    </p>
                </ScrollReveal>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {liveAllocation.map((bucket, index) => (
                        <ScrollReveal key={bucket.label} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-colors hover:border-[var(--border-strong)]">
                                <div className="label-font">{bucket.percent}%</div>
                                <h3 className="mt-2 text-[1rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                                    {bucket.label}
                                </h3>
                                <p className="mt-2 text-[0.84rem] leading-[1.6] text-[var(--text-secondary)]">
                                    {bucket.detail}
                                </p>
                                <div className="mt-4 border-t border-[var(--border)] pt-3 text-[0.8rem] text-[var(--text-tertiary)]">
                                    <div>
                                        Full cap: <span className="font-semibold text-[var(--text-primary)]">{bucket.fullCapAvax.toLocaleString('en-US')} AVAX</span>
                                    </div>
                                    <div className="mt-1">
                                        Current raised route: <span className="font-semibold text-[var(--text-primary)]">{formatAvaxAmount(bucket.currentAvax, 4)} AVAX</span>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                <ScrollReveal delay={2}>
                    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                        <div className="label-font">Legacy full-cap example</div>
                        <p className="mt-2 text-[0.9rem] leading-[1.7] text-[var(--text-secondary)]">
                            At 5,000 AVAX raised: 4,250 AVAX goes to the strategy/card acquisition treasury, 250 AVAX goes to LFJ LP, 250 AVAX goes to Pharaoh LP, and 250 AVAX goes to the team wallet for bootstrapping expenses.
                        </p>
                        <p className="mt-2 break-all font-mono text-[0.78rem] text-[var(--text-tertiary)]">
                            Team wallet: {ROUND_PROCEEDS_ALLOCATION.teamWallet}
                        </p>
                    </div>
                </ScrollReveal>

                <ScrollReveal delay={3}>
                    <div className="mt-4">
                        <PixelMessageBox
                            title="Separate from realized sale profit"
                            body={ROUND_PROCEEDS_ALLOCATION.realizedProfitWaterfall}
                        />
                    </div>
                </ScrollReveal>
            </section>

            {/* ── ROUND 1 ARCHIVE ── */}
            <section id="round-1-archive" className="mt-10 scroll-mt-28">
                <ScrollReveal>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="label-font text-[var(--text-tertiary)]">Archived round</div>
                                <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                                    Round 1 archive
                                </h2>
                                <p className="mt-2 max-w-2xl text-[0.88rem] leading-[1.7] text-[var(--text-secondary)]">
                                    Round 1 is historical context only. The active decision surface on this page is the continuous round; archived Round 1 data stays here for auditability and proof review.
                                </p>
                            </div>
                            <PixelMenuLink to="/fundraising#proof">
                                Inspect archived proof
                            </PixelMenuLink>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-4">
                                <div className="label-font text-[0.58rem]">Raised</div>
                                <div className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                                    {archiveRound ? `${formatAvaxAmount(archiveRaised, 4)} AVAX` : 'Unavailable'}
                                </div>
                                <div className="mt-1 text-[0.74rem] text-[var(--text-tertiary)]">
                                    {archiveRound ? `${archiveProgress.toFixed(1)}% of ${formatAvaxAmount(archiveTarget, 4)} AVAX` : 'Waiting for archive read'}
                                </div>
                            </div>
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-4">
                                <div className="label-font text-[0.58rem]">Status</div>
                                <div className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                                    {archiveRound?.isFinalized || archiveProgress >= 100 ? 'Finalized' : 'Closed'}
                                </div>
                                <div className="mt-1 text-[0.74rem] text-[var(--text-tertiary)]">
                                    Archive only; continuous commits are current
                                </div>
                            </div>
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-4">
                                <div className="label-font text-[0.58rem]">Current focus</div>
                                <div className="mt-2 text-lg font-bold text-[var(--text-primary)]">Continuous round</div>
                                <div className="mt-1 text-[0.74rem] text-[var(--text-tertiary)]">
                                    5,000 AVAX cap, 500 AVAX max wallet
                                </div>
                            </div>
                        </div>
                    </div>
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
