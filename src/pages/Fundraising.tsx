import { useMemo, useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, parseEther } from 'viem';
import Page from '../components/Page';
import {
    PixelDivider,
    PixelExternalLink,
    PixelLabel,
    PixelLedgerRow,
    PixelMessageBox,
    PixelMeter,
    PixelMenuLink,
    PixelPanel,
    PixelStatRail,
} from '../components/PixelUI';
import { GM10_FUND_ABI } from '../data/contracts';
import { BUY_PAGE_DEFAULTS, FUJI_PRIMARY_DEPLOYMENT, SITE_LINKS } from '../data/protocol';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';

const AVAX_USD_ESTIMATE = 25;

function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Fundraising() {
    const { isConnected } = useAccount();
    const { data: hash, error: writeError, isPending, reset, writeContract } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
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
    const isRoundActive = roundData ? roundData.isActive : false;

    const progress = roundTarget > 0 ? Math.min((roundRaised / roundTarget) * 100, 100) : 0;
    const estimatedTokens = amount ? (Number(amount) / tokenPrice).toFixed(2) : '0.00';

    const displayError = useMemo(() => {
        if (txError) return txError;
        if (!writeError) return null;
        const message = writeError.message;
        if (message.includes('RoundNotActive')) return 'This round is not active on Fuji.';
        if (message.includes('InvestmentBelowMinimum')) return `Minimum buy is ${minInvestment} AVAX.`;
        if (message.includes('InvestmentAboveMaximum')) return `Maximum buy is ${maxInvestment} AVAX.`;
        if (message.includes('TargetReached')) return 'The current round is already full.';
        return message;
    }, [txError, writeError, minInvestment, maxInvestment]);

    function handleInvest() {
        if (!amount) return;
        setTxError(null);
        reset();
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
        <Page containerClassName="mx-auto max-w-[min(1760px,calc(100vw-48px))]">
            <section className="grid gap-12 xl:grid-cols-[0.68fr_0.32fr] xl:items-start">
                <div>
                    <div className="flex flex-wrap gap-3">
                        <PixelLabel tone={isRoundActive ? 'live' : 'warning'}>{roundState.status}</PixelLabel>
                        <PixelLabel tone="warning">Test AVAX only</PixelLabel>
                        <PixelLabel tone="live">Verified on Snowtrace</PixelLabel>
                    </div>

                    <div className="mt-8 max-w-4xl">
                        <div className="pixel-font text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">Buy</div>
                        <h1 className="mt-5 font-['Oxanium'] text-5xl font-semibold leading-[0.92] text-[var(--text-main)] md:text-6xl xl:max-w-[11ch]">
                            Join the live testnet round for Pokemon-card exposure.
                        </h1>
                        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
                            Buy into the live Fuji round now. The public mainnet launch stays separate, but the mechanics are already open here for anyone who wants to inspect them.
                        </p>
                    </div>

                    <div className="mt-10">
                        <PixelStatRail
                            items={[
                                {
                                    label: 'Raised',
                                    value: `${roundRaised.toLocaleString()} AVAX`,
                                    tone: isRoundActive ? 'live' : 'warning',
                                },
                                {
                                    label: 'Target',
                                    value: `${roundTarget.toLocaleString()} AVAX`,
                                },
                                {
                                    label: 'Token price',
                                    value: `${tokenPrice} AVAX`,
                                },
                            ]}
                        />
                    </div>

                    <div className="mt-8 max-w-5xl">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Round progress</div>
                            <div className="text-sm text-[var(--text-soft)]">{progress.toFixed(1)}%</div>
                        </div>
                        <PixelMeter value={progress} tone={isRoundActive ? 'live' : 'warning'} />
                    </div>

                    <div className="mt-10 max-w-4xl border-y border-white/8">
                        {[
                            ['Exposure', 'You are not buying one slab. You are buying into the run.'],
                            ['Price discipline', 'Marks reset from real trades first, then from the strongest available comps.'],
                            ['Exit path', 'Sale money returns onchain before anything is counted across the stack.'],
                        ].map(([title, body]) => (
                            <PixelLedgerRow key={title}>
                                <div className="grid gap-3 lg:grid-cols-[160px_1fr] lg:gap-8">
                                    <div className="pixel-font text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">{title}</div>
                                    <p className="text-sm leading-7 text-[var(--text-soft)]">{body}</p>
                                </div>
                            </PixelLedgerRow>
                        ))}
                    </div>
                </div>

                <PixelPanel className="xl:sticky xl:top-28">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Current round</div>
                            <h2 className="mt-3 font-['Oxanium'] text-3xl font-semibold text-[var(--text-main)]">Buy $CATCH</h2>
                        </div>
                        <PixelLabel tone="warning">Fuji</PixelLabel>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                        Use test AVAX only. This surface gives proxy access to the run while keeping the live mechanics public.
                    </p>

                    <div className="mt-6">
                        <PixelStatRail
                            className="md:grid-cols-2"
                            items={[
                                { label: 'Min buy', value: `${minInvestment} AVAX` },
                                { label: 'Max buy', value: `${maxInvestment} AVAX` },
                            ]}
                        />
                    </div>

                    <div className="mt-6">
                        <label className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                            Amount
                        </label>
                        <div className="mt-3 rounded-[22px] border border-white/10 bg-[rgba(11,17,30,0.84)] px-4 py-4">
                            <input
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                placeholder="1.0"
                                className="w-full bg-transparent text-2xl font-semibold text-[var(--text-main)] outline-none placeholder:text-[var(--text-dim)]"
                            />
                            <span className="pixel-font text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-soft)]">AVAX</span>
                        </div>
                        <div className="mt-4 text-sm text-[var(--text-soft)]">
                            Estimated output: <span className="font-semibold text-[var(--accent-live)]">{estimatedTokens} CATCH</span>
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-dim)]">
                            Approx. value: ${(Number(amount || 0) * AVAX_USD_ESTIMATE).toFixed(2)} USD
                        </div>
                    </div>

                    <div className="mt-6">
                        {!isConnected ? (
                            <div className="[&_.iekbcc0]:!rounded-[999px] [&_.iekbcc0]:!border [&_.iekbcc0]:!border-white/10 [&_.iekbcc0]:!bg-[rgba(14,21,40,0.76)] [&_.iekbcc0]:!px-4 [&_.iekbcc0]:!shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_34px_rgba(0,0,0,0.26)] [&_.iekbcc0]:!font-['Space_Grotesk'] [&_.ju367v7]:!font-['Space_Grotesk']">
                                <ConnectButton />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleInvest}
                                disabled={!amount || isPending || isConfirming}
                                className="pixel-menu-link pixel-menu-link-active w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="pixel-menu-cursor opacity-100">↗</span>
                                <span>{isPending || isConfirming ? 'Submitting...' : 'Buy $CATCH'}</span>
                            </button>
                        )}
                    </div>

                    {displayError ? (
                        <div className="mt-4">
                            <PixelMessageBox title="Error" body={displayError} />
                        </div>
                    ) : null}
                    {isConfirmed ? (
                        <div className="mt-4">
                            <PixelMessageBox title="Confirmed" body="Buy confirmed onchain." />
                        </div>
                    ) : null}

                    <div className="mt-6">
                        <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer" className="w-full">
                            Follow on X
                        </PixelExternalLink>
                    </div>
                </PixelPanel>
            </section>

            <section id="proof" className="mt-16 scroll-mt-28">
                <PixelDivider label="Fuji stack" />
                <div className="mt-8 grid gap-10 xl:grid-cols-[0.62fr_1.38fr] xl:gap-12">
                    <div className="max-w-2xl">
                        <h2 className="font-['Oxanium'] text-4xl font-semibold text-[var(--text-main)]">
                            The upgraded Fuji stack is already public.
                        </h2>
                        <p className="mt-4 text-base leading-8 text-[var(--text-soft)]">
                            The module links, round state, and recorded positions are already visible onchain.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <PixelLabel tone="live">Verified on Snowtrace</PixelLabel>
                            <PixelLabel tone="warning">{proofState.proofSummary.holdingsChipLabel}</PixelLabel>
                        </div>
                    </div>

                    <div className="grid gap-6">
                        <PixelStatRail
                            items={[
                                { label: 'Positions', value: proofState.collectiblePositionCount, tone: 'warning' },
                                { label: 'Marked value', value: proofState.proofSummary.portfolioValueLabel, tone: 'live' },
                                { label: 'Cash buffer', value: proofState.proofSummary.liquidTreasuryLabel },
                            ]}
                        />

                        <div className="border-y border-white/8">
                                {[...roundState.links, ...proofState.links].map((contract, index) => (
                                    <PixelLedgerRow key={`${contract.address}-${index}`}>
                                        <div className="grid gap-3 md:grid-cols-[170px_1fr_auto] md:items-center">
                                            <div className="pixel-font text-[0.66rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">{contract.label}</div>
                                            <div className="text-sm text-[var(--text-soft)]">{formatAddress(contract.address)}</div>
                                            <a
                                                href={contract.snowtraceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm font-medium text-[var(--accent-live)]"
                                            >
                                                Snowtrace
                                            </a>
                                        </div>
                                    </PixelLedgerRow>
                                ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-16">
                <div className="grid gap-8 border-t border-white/8 pt-8 xl:grid-cols-[0.72fr_0.28fr] xl:items-center">
                    <div>
                        <div className="pixel-font text-[0.72rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">What you are buying</div>
                        <h2 className="mt-4 font-['Oxanium'] text-4xl font-semibold text-[var(--text-main)]">
                            Exposure to the card run, not a single slab.
                        </h2>
                        <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-soft)]">
                            GM10 buys the cards. You follow the round, the holdings, and the exit path through one live token layer.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 xl:justify-end">
                        <PixelMenuLink to="/portfolio">Open portfolio</PixelMenuLink>
                        <PixelExternalLink href={SITE_LINKS.x} target="_blank" rel="noreferrer">
                            Follow on X
                        </PixelExternalLink>
                    </div>
                </div>
            </section>
        </Page>
    );
}
