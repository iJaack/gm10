import { formatEther, formatUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Page from '../components/Page';
import { PixelExternalLink, PixelLabel } from '../components/PixelUI';
import { ScrollReveal } from '../components/ScrollReveal';
import { Web3Providers } from '../components/Web3Providers';
import type { MarketPool } from '../data/marketData';
import { useCatchMarketData } from '../hooks/useCatchMarketData';
import { useFujiPortfolioPositions } from '../hooks/useFujiProof';
import { useHolderDashboard } from '../hooks/useHolderDashboard';

function formatUsd(value?: number) {
    if (value === undefined) return 'Unavailable';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: value < 1 ? 4 : 2,
        maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
}

function shortAddress(address?: string) {
    if (!address) return 'Not configured';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function fallbackLiquidity(pool: MarketPool) {
    if (pool.status === 'available') return null;
    const avax = pool.fallbackAvax !== undefined ? `${Number(formatEther(pool.fallbackAvax)).toLocaleString('en-US', { maximumFractionDigits: 4 })} AVAX` : 'Unavailable';
    const catchAmount = pool.fallbackCatch !== undefined ? `${Number(formatUnits(pool.fallbackCatch, 18)).toLocaleString('en-US', { maximumFractionDigits: 4 })} CATCH` : 'Unavailable';
    return `${avax} / ${catchAmount}`;
}

function PoolRow({ pool }: { pool: MarketPool }) {
    const change = pool.priceChange24h;
    const changePositive = (change ?? 0) >= 0;

    return (
        <div className="grid gap-4 border-b border-[var(--border)] px-5 py-4 text-[0.84rem] last:border-b-0 md:grid-cols-[1fr_0.7fr_0.9fr_0.9fr_auto] md:items-center">
            <div>
                <div className="font-semibold text-[var(--text-primary)]">{pool.venue}</div>
                <div className="mt-1 font-mono text-[0.7rem] text-[var(--text-tertiary)]">{shortAddress(pool.pairAddress)}</div>
            </div>
            <div>
                <div className="label-font text-[0.58rem]">Quote</div>
                <div className="mt-1 text-[var(--text-secondary)]">{pool.quoteToken ?? 'Unavailable'}</div>
            </div>
            <div>
                <div className="label-font text-[0.58rem]">Liquidity</div>
                <div className="mt-1 text-[var(--text-secondary)]">
                    {pool.status === 'available' ? formatUsd(pool.liquidityUsd) : fallbackLiquidity(pool)}
                </div>
            </div>
            <div>
                <div className="label-font text-[0.58rem]">24h volume</div>
                <div className="mt-1 text-[var(--text-secondary)]">{formatUsd(pool.volume24hUsd)}</div>
            </div>
            <div className="flex items-center gap-3">
                {change !== undefined ? (
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold ${
                            changePositive
                                ? 'bg-[color-mix(in_srgb,var(--accent-green)_15%,transparent)] text-[var(--accent-green)]'
                                : 'bg-[color-mix(in_srgb,var(--accent-red)_15%,transparent)] text-[var(--accent-red)]'
                        }`}
                    >
                        {changePositive ? '+' : ''}{change.toFixed(2)}%
                    </span>
                ) : (
                    <span className="text-[0.78rem] text-[var(--text-tertiary)]">—</span>
                )}
                {pool.url ? (
                    <PixelExternalLink href={pool.url} target="_blank" rel="noreferrer">Pool</PixelExternalLink>
                ) : null}
            </div>
        </div>
    );
}

function HoldersContent() {
    const holder = useHolderDashboard();
    const market = useCatchMarketData();
    const portfolio = useFujiPortfolioPositions();

    const pnlValue = holder.labels.unrealizedReferencePnl;
    const pnlIsPositive = typeof pnlValue === 'string' && !pnlValue.startsWith('-') && pnlValue !== 'Unavailable' && pnlValue !== '—';
    const pnlIsNegative = typeof pnlValue === 'string' && pnlValue.startsWith('-');

    return (
        <Page containerClassName="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
            {/* Header */}
            <section>
                <ScrollReveal>
                    <div className="flex flex-wrap items-center gap-2">
                        <PixelLabel tone="live">$CATCH</PixelLabel>
                        <PixelLabel tone="warning">
                            Claims disabled
                        </PixelLabel>
                    </div>
                    <div className="mt-5 max-w-3xl">
                        <div className="label-font">Token holders</div>
                        <h1 className="mt-3 text-[2.3rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[3rem]">
                            Holder dashboard
                        </h1>
                        <p className="mt-3 text-[0.98rem] leading-[1.7] text-[var(--text-secondary)]">
                            Track $CATCH accounting, live market liquidity, and sale-profit routing. Card NAV is exposure; completed sale proceeds restore principal first, then route by market snapshot into buying power, LP support, or buyback-and-burn reserve.
                        </p>
                    </div>
                </ScrollReveal>

                {/* Protocol stats — 3 grouped cards */}
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {/* Supply card */}
                    <ScrollReveal delay={1}>
                        <div
                            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
                            style={{ borderLeft: '2px solid var(--accent)' }}
                        >
                            <div className="label-font text-[0.6rem] text-[var(--text-tertiary)]">Supply</div>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <div className="label-font text-[0.58rem]">Total supply</div>
                                    <div className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.totalSupply}</div>
                                </div>
                                <div>
                                    <div className="label-font text-[0.58rem]">Profit eligible supply</div>
                                    <div className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.profitEligibleSupply}</div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Valuation card */}
                    <ScrollReveal delay={2}>
                        <div
                            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
                            style={{ borderLeft: '2px solid var(--accent)' }}
                        >
                            <div className="label-font text-[0.6rem] text-[var(--text-tertiary)]">Valuation</div>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <div className="label-font text-[0.58rem]">Reference NAV</div>
                                    <div className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.referenceNav}</div>
                                </div>
                                <div>
                                    <div className="label-font text-[0.58rem]">Current NAV</div>
                                    <div className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.navPerToken}</div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Treasury card */}
                    <ScrollReveal delay={3}>
                        <div
                            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
                            style={{ borderLeft: '2px solid var(--accent)' }}
                        >
                            <div className="label-font text-[0.6rem] text-[var(--text-tertiary)]">Treasury</div>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <div className="label-font text-[0.58rem]">Liquid treasury</div>
                                    <div className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{portfolio.proofSummary.liquidTreasuryLabel}</div>
                                </div>
                                <div>
                                    <div className="label-font text-[0.58rem]">Market support reserve</div>
                                    <div className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.marketSupportReserve}</div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* Connected account */}
            <section className="mt-12">
                <div className="label-font">Connected account</div>

                {!holder.isConnected ? (
                    <ScrollReveal delay={1}>
                        <div className="mt-4 flex flex-col items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-10 text-center">
                            <div>
                                <p className="text-lg font-semibold text-[var(--text-primary)]">Connect your wallet to view your position</p>
                                <p className="mt-1 text-[0.88rem] text-[var(--text-secondary)]">
                                    See your CATCH balance, cost basis, unrealized P/L, and reference NAV.
                                </p>
                            </div>
                            <ConnectButton />
                        </div>
                    </ScrollReveal>
                ) : (
                    <>
                        {/* Hero — CATCH balance */}
                        <ScrollReveal delay={1}>
                            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-8 text-center"
                                style={{ borderLeft: '2px solid var(--accent)' }}
                            >
                                <div className="label-font text-[0.6rem] text-[var(--text-tertiary)]">Your CATCH</div>
                                <div className="mt-2 text-[2.8rem] font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">
                                    {holder.labels.catchBalance}
                                </div>
                                <div className="mt-1 text-[0.84rem] text-[var(--text-secondary)]">Connected wallet balance</div>
                            </div>
                        </ScrollReveal>

                        {/* 2×2 stats grid */}
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <ScrollReveal delay={1}>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                                    <div className="label-font text-[0.58rem]">Remaining cost basis</div>
                                    <div className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.remainingCostBasis}</div>
                                    <div className="mt-1 text-[0.76rem] text-[var(--text-tertiary)]">Investor accounting</div>
                                </div>
                            </ScrollReveal>

                            <ScrollReveal delay={2}>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                                    <div className="label-font text-[0.58rem]">Current reference value</div>
                                    <div className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.currentReferenceValue}</div>
                                    <div className="mt-1 text-[0.76rem] text-[var(--text-tertiary)]">Wallet tokens × NAV</div>
                                </div>
                            </ScrollReveal>

                            <ScrollReveal delay={1}>
                                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                                    <div className="label-font text-[0.58rem]">Unrealized reference P/L</div>
                                    <div
                                        className="mt-2 text-xl font-bold tracking-[-0.03em]"
                                        style={{
                                            color: pnlIsPositive
                                                ? 'var(--accent-green)'
                                                : pnlIsNegative
                                                ? 'var(--accent-red)'
                                                : 'var(--text-primary)',
                                        }}
                                    >
                                        {holder.labels.unrealizedReferencePnl}
                                    </div>
                                    <div className="mt-1 text-[0.76rem] text-[var(--text-tertiary)]">Not claimable</div>
                                </div>
                            </ScrollReveal>

                            <ScrollReveal delay={2}>
                                <div
                                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
                                    style={{ borderLeft: '2px solid var(--accent)' }}
                                >
                                    <div className="label-font text-[0.58rem]">Market support</div>
                                    <div className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.marketSupportReserve}</div>
                                    <div className="mt-1 text-[0.76rem] text-[var(--text-tertiary)]">Buyback-burn and LP support</div>
                                </div>
                            </ScrollReveal>
                        </div>
                    </>
                )}

                {/* Claim status — full width row */}
                <ScrollReveal delay={1}>
                    <div
                        className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1">
                                <div className="label-font text-[0.58rem]">Continuous accrual</div>
                                <div className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.marketSupportReserve}</div>
                                <p className="mt-2 text-[0.84rem] leading-[1.6] text-[var(--text-secondary)]">Routine holder claims are disabled. Realized sale profits restore principal first, then route from the market snapshot into card-buying power or market support.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:items-end">
                                <button
                                    type="button"
                                    disabled
                                    className="cursor-not-allowed rounded-2xl bg-[var(--surface-active)] px-6 py-3 text-[0.88rem] font-semibold text-[var(--text-tertiary)] transition-opacity"
                                >
                                    Public claims disabled
                                </button>
                                <p className="max-w-xs text-right text-[0.72rem] leading-[1.5] text-[var(--text-tertiary)]">
                                    Sale profit accrues only after settlement and snapshot-based routing.
                                </p>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </section>

            {/* Market data */}
            <section className="mt-12">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="label-font">Market data</div>
                        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">$CATCH price and liquidity</h2>
                    </div>
                    <div className="text-[0.82rem] text-[var(--text-tertiary)]">
                        {market.fetchedAt ? `Updated ${new Date(market.fetchedAt).toLocaleString('en-US')}` : market.error ?? 'Checking market data'}
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
                    {/* Spot price card */}
                    <ScrollReveal delay={1}>
                        <div className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                            <div className="flex items-center gap-2">
                                <span className="label-font text-[0.6rem]">Spot price</span>
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-green)] opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                                </span>
                            </div>
                            <div className="mt-4 text-[2rem] font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                                {formatUsd(market.spotPriceUsd)}
                            </div>
                            <div className="mt-2 text-[0.8rem] text-[var(--text-secondary)]">
                                Source: LFJ or Pharaoh pair data when indexed.
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Pool rows */}
                    <ScrollReveal delay={2}>
                        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                            <PoolRow pool={market.lfj} />
                            <PoolRow pool={market.pharaoh} />
                        </div>
                    </ScrollReveal>
                </div>

                <div className="mt-4 text-[0.78rem] text-[var(--text-tertiary)]">
                    External DEX data is best effort. If a pool is not indexed, the row falls back to protocol-deployed liquidity totals where available.
                </div>
            </section>
        </Page>
    );
}

export default function Holders() {
    return (
        <Web3Providers>
            <HoldersContent />
        </Web3Providers>
    );
}
