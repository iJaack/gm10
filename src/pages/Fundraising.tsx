import { useMemo, useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, parseEther } from 'viem';
import Page from '../components/Page';
import { PixelExternalLink, PixelLabel, PixelMeter, PixelMessageBox, PixelPanel, PixelSectionFrame } from '../components/PixelUI';
import { GM10_FUND_ABI } from '../data/contracts';
import { BUY_PAGE_DEFAULTS, FUJI_PRIMARY_DEPLOYMENT, SITE_LINKS } from '../data/protocol';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';

const AVAX_USD_ESTIMATE = 25;

function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <PixelPanel>
            <div className="pixel-font text-[0.46rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">{label}</div>
            <div className="mt-3 text-2xl font-bold text-[var(--text-main)]">{value}</div>
        </PixelPanel>
    );
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
            <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <PixelSectionFrame className="pixel-grid xl:min-h-[42rem]">
                    <div className="flex flex-wrap gap-3">
                        <PixelLabel tone={isRoundActive ? 'live' : 'warning'}>{roundState.status}</PixelLabel>
                        <PixelLabel tone="warning">Test AVAX only</PixelLabel>
                        <PixelLabel tone="live">Verified on Snowtrace</PixelLabel>
                    </div>
                    <div className="mt-6 max-w-3xl">
                        <div className="pixel-font text-[0.5rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Buy</div>
                        <h1 className="mt-4 text-4xl font-bold leading-[0.98] text-[var(--text-main)] md:text-6xl">
                            Join the live testnet round for Pokemon-card exposure.
                        </h1>
                        <p className="mt-5 text-base leading-8 text-[var(--text-soft)]">
                            This is the public Fuji command screen. The round is live here first, while the public mainnet launch stays separate.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-4 xl:grid-cols-3">
                        <StatBox label="Raised" value={`${roundRaised.toLocaleString()} AVAX`} />
                        <StatBox label="Target" value={`${roundTarget.toLocaleString()} AVAX`} />
                        <StatBox label="Token price" value={`${tokenPrice} AVAX`} />
                    </div>

                    <div className="mt-6">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="pixel-font text-[0.46rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Round meter</div>
                            <div className="text-sm text-[var(--text-soft)]">{progress.toFixed(1)}%</div>
                        </div>
                        <PixelMeter value={progress} tone={isRoundActive ? 'live' : 'warning'} />
                    </div>

                    <div className="mt-6 max-w-3xl">
                        <PixelMessageBox
                            title="Exposure"
                            body="You are not buying one slab. You are buying into the run."
                        />
                    </div>
                </PixelSectionFrame>

                <PixelSectionFrame className="xl:min-h-[34rem]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="pixel-font text-[0.5rem] uppercase tracking-[0.18em] text-[var(--text-dim)]">Command</div>
                            <h2 className="mt-3 text-3xl font-bold text-[var(--text-main)]">Buy $CATCH in the current round.</h2>
                        </div>
                        <PixelLabel tone="warning">Fuji</PixelLabel>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                        Use test AVAX only. The live stack is public here so the mechanics can be inspected in the open.
                    </p>

                    <div className="mt-6 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <StatBox label="Min buy" value={`${minInvestment} AVAX`} />
                            <StatBox label="Max buy" value={`${maxInvestment} AVAX`} />
                        </div>

                        <div>
                            <label className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">
                                Amount
                            </label>
                            <div className="mt-2 pixel-window flex items-center gap-3 p-4">
                                <input
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    placeholder="1.0"
                                    className="w-full bg-transparent text-xl text-[var(--text-main)] outline-none placeholder:text-[var(--text-dim)]"
                                />
                                <span className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-soft)]">AVAX</span>
                            </div>
                            <div className="mt-3 text-sm text-[var(--text-soft)]">
                                Estimated output: <span className="font-bold text-[var(--accent-live)]">{estimatedTokens} CATCH</span>
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-dim)]">
                                Approx. value: ${(Number(amount || 0) * AVAX_USD_ESTIMATE).toFixed(2)} USD
                            </div>
                        </div>

                        {!isConnected ? (
                            <div className="[&_.iekbcc0]:!font-['Space_Grotesk'] [&_.iekbcc0]:!rounded-none [&_.iekbcc0]:!border-2 [&_.iekbcc0]:!border-[var(--pixel-border)] [&_.iekbcc0]:!bg-[var(--bg-panel)] [&_.iekbcc0]:!shadow-[0_0_0_2px_var(--pixel-shadow)] [&_.ju367v7]:!font-['Space_Grotesk']">
                                <ConnectButton />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleInvest}
                                disabled={!amount || isPending || isConfirming}
                                className="pixel-menu-link pixel-menu-link-active w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="pixel-menu-cursor opacity-100">►</span>
                                <span>{isPending || isConfirming ? 'Submitting...' : 'Buy $CATCH'}</span>
                            </button>
                        )}

                        {displayError ? (
                            <PixelPanel tone="loss">
                                <div className="text-sm text-[var(--accent-loss)]">{displayError}</div>
                            </PixelPanel>
                        ) : null}
                        {isConfirmed ? (
                            <PixelPanel tone="profit">
                                <div className="text-sm text-[var(--accent-profit)]">Buy confirmed onchain.</div>
                            </PixelPanel>
                        ) : null}

                        <div className="pt-2">
                            <PixelExternalLink
                                href={SITE_LINKS.x}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full justify-between"
                            >
                                Follow on X
                            </PixelExternalLink>
                        </div>
                    </div>
                </PixelSectionFrame>
            </section>

            <section className="mt-8 grid gap-4 xl:grid-cols-2">
                <PixelSectionFrame>
                    <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Exposure</div>
                    <h2 className="mt-3 text-3xl font-bold text-[var(--text-main)]">The fund buys the cards. You follow the run.</h2>
                    <div className="mt-6 space-y-3 text-sm leading-7 text-[var(--text-soft)]">
                        <p>GM10 targets scarce, high-grade Pokemon cards that most people would not want to source and manage alone.</p>
                        <p>$CATCH is the tokenized way to follow and participate in that run without owning the slabs directly.</p>
                    </div>
                </PixelSectionFrame>

                <PixelSectionFrame>
                    <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Why Fuji first</div>
                    <h2 className="mt-3 text-3xl font-bold text-[var(--text-main)]">The public mechanics are live here first.</h2>
                    <div className="mt-6 space-y-3 text-sm leading-7 text-[var(--text-soft)]">
                        <p>Fuji lets the flow stay public before the public mainnet round is opened.</p>
                        <p>The stack already shows recorded onchain positions.</p>
                        <p>This is public testnet infrastructure, not a promise about future returns.</p>
                    </div>
                </PixelSectionFrame>
            </section>

            <section id="proof" className="mt-8 scroll-mt-28">
                <PixelSectionFrame className="pixel-grid">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Fuji</div>
                            <h2 className="mt-3 text-3xl font-bold text-[var(--text-main)]">The upgraded Fuji stack is already public.</h2>
                            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                                The module links and the recorded positions are open records.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <PixelLabel tone="live">Verified on Snowtrace</PixelLabel>
                            <PixelLabel tone="warning">{proofState.proofSummary.holdingsChipLabel}</PixelLabel>
                            <PixelLabel>{proofState.proofSummary.portfolioValueLabel} marked value</PixelLabel>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {roundState.links.map((contract) => (
                            <PixelExternalLink
                                key={contract.address}
                                href={contract.snowtraceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full justify-between"
                            >
                                <span className="block">
                                    <span className="pixel-font block text-[0.42rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">
                                        {contract.label}
                                    </span>
                                    <span className="mt-2 block text-xs text-[var(--text-soft)]">{formatAddress(contract.address)}</span>
                                </span>
                            </PixelExternalLink>
                        ))}
                    </div>

                    <div className="mt-8">
                        <div className="pixel-font text-[0.5rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Recorded onchain positions</div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                            <PixelPanel>
                                <div className="pixel-font text-[0.44rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">Count</div>
                                <div className="mt-2 text-3xl font-bold text-[var(--accent-live)]">{proofState.collectiblePositionCount}</div>
                                <div className="mt-2 text-sm text-[var(--text-soft)]">Recorded through the modular Fuji stack.</div>
                            </PixelPanel>
                            <div className="grid gap-4 md:grid-cols-2">
                                {proofState.links.map((link) => (
                                    <PixelExternalLink
                                        key={link.address}
                                        href={link.snowtraceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full justify-between"
                                    >
                                        <span className="block">
                                            <span className="pixel-font block text-[0.42rem] uppercase tracking-[0.16em] text-[var(--text-dim)]">
                                                {link.label}
                                            </span>
                                            <span className="mt-2 block text-xs text-[var(--text-soft)]">{formatAddress(link.address)}</span>
                                        </span>
                                        <span>Open</span>
                                    </PixelExternalLink>
                                ))}
                            </div>
                        </div>
                    </div>
                </PixelSectionFrame>
            </section>
        </Page>
    );
}
