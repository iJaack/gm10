import { formatEther, formatUnits } from 'viem';
import Page from '../components/Page';
import { PixelExternalLink, PixelLabel } from '../components/PixelUI';
import { ScrollReveal } from '../components/ScrollReveal';
import { Web3Providers } from '../components/Web3Providers';
import type { MarketPool } from '../data/marketData';
import { useCatchMarketData } from '../hooks/useCatchMarketData';
import { useHolderDashboard } from '../hooks/useHolderDashboard';

function formatUsd(value?: number) {
    if (value === undefined) return 'Unavailable';
    return new Intl.NumberFormat(undefined, {
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
    const avax = pool.fallbackAvax !== undefined ? `${Number(formatEther(pool.fallbackAvax)).toLocaleString(undefined, { maximumFractionDigits: 4 })} AVAX` : 'Unavailable';
    const catchAmount = pool.fallbackCatch !== undefined ? `${Number(formatUnits(pool.fallbackCatch, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 })} CATCH` : 'Unavailable';
    return `${avax} / ${catchAmount}`;
}

function PoolRow({ pool }: { pool: MarketPool }) {
    return (
        <div className="grid gap-3 border-b border-[var(--border)] px-4 py-4 text-[0.84rem] last:border-b-0 md:grid-cols-[0.9fr_0.9fr_0.9fr_0.9fr_1fr] md:items-center">
            <div>
                <div className="font-semibold text-[var(--text-primary)]">{pool.venue}</div>
                <div className="mt-1 font-mono text-[0.72rem] text-[var(--text-tertiary)]">{shortAddress(pool.pairAddress)}</div>
            </div>
            <div>
                <div className="label-font text-[0.6rem]">Quote</div>
                <div className="mt-1 text-[var(--text-secondary)]">{pool.quoteToken ?? 'Unavailable'}</div>
            </div>
            <div>
                <div className="label-font text-[0.6rem]">Liquidity</div>
                <div className="mt-1 text-[var(--text-secondary)]">{pool.status === 'available' ? formatUsd(pool.liquidityUsd) : fallbackLiquidity(pool)}</div>
            </div>
            <div>
                <div className="label-font text-[0.6rem]">24h volume</div>
                <div className="mt-1 text-[var(--text-secondary)]">{formatUsd(pool.volume24hUsd)}</div>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
                <div>
                    <div className="label-font text-[0.6rem]">24h change</div>
                    <div className={`mt-1 font-semibold ${(pool.priceChange24h ?? 0) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                        {pool.priceChange24h !== undefined ? `${pool.priceChange24h.toFixed(2)}%` : 'Unavailable'}
                    </div>
                </div>
                {pool.url ? <PixelExternalLink href={pool.url} target="_blank" rel="noreferrer">Pool</PixelExternalLink> : null}
            </div>
        </div>
    );
}

function HoldersContent() {
    const holder = useHolderDashboard();
    const market = useCatchMarketData();

    const accountStats = [
        { label: 'Your CATCH', value: holder.labels.catchBalance, detail: holder.isConnected ? 'Connected wallet balance' : 'Wallet required' },
        { label: 'Remaining cost basis', value: holder.labels.remainingCostBasis, detail: 'Investor accounting' },
        { label: 'Current reference value', value: holder.labels.currentReferenceValue, detail: 'Wallet tokens x NAV' },
        { label: 'Unrealized reference P/L', value: holder.labels.unrealizedReferencePnl, detail: 'Not claimable' },
        { label: 'Claimable realized profit', value: holder.labels.claimableProfit, detail: 'Completed sale proceeds only' },
        { label: 'Already claimed', value: holder.labels.claimedProfit, detail: 'AVAX distributions' },
    ];

    const protocolStats = [
        { label: 'Total supply', value: holder.labels.totalSupply },
        { label: 'Profit eligible supply', value: holder.labels.profitEligibleSupply },
        { label: 'Reference NAV', value: holder.labels.referenceNav },
        { label: 'Current NAV', value: holder.labels.navPerToken },
        { label: 'Liquid treasury', value: holder.labels.liquidTreasury },
        { label: 'Sale profit liability', value: holder.labels.holderDistributionAccrued },
    ];

    return (
        <Page containerClassName="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
            <section>
                <ScrollReveal>
                    <div className="flex flex-wrap items-center gap-2">
                        <PixelLabel tone="live">$CATCH</PixelLabel>
                        <PixelLabel tone={holder.claimState.canClaim ? 'profit' : 'warning'}>
                            {holder.claimState.canClaim ? 'Claim ready' : 'Claim gated'}
                        </PixelLabel>
                    </div>
                    <div className="mt-5 max-w-3xl">
                        <div className="label-font">Token holders</div>
                        <h1 className="mt-3 text-[2.3rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[3rem]">
                            Holder dashboard
                        </h1>
                        <p className="mt-3 text-[0.98rem] leading-[1.7] text-[var(--text-secondary)]">
                            Track $CATCH accounting, live market liquidity, and realized AVAX profit. Card NAV is exposure; only completed sale proceeds become claimable.
                        </p>
                    </div>
                </ScrollReveal>

                <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
                    {protocolStats.map((stat, index) => (
                        <ScrollReveal key={stat.label} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <div className="h-full bg-[var(--bg-primary)] p-5">
                                <div className="label-font">{stat.label}</div>
                                <div className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{stat.value}</div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            <section className="mt-12 grid gap-8 xl:grid-cols-[1fr_360px]">
                <div>
                    <div className="label-font">Connected account</div>
                    <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] md:grid-cols-2">
                        {accountStats.map((stat, index) => (
                            <ScrollReveal key={stat.label} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                                <div className="h-full bg-[var(--bg-primary)] p-5">
                                    <div className="label-font">{stat.label}</div>
                                    <div className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{stat.value}</div>
                                    <div className="mt-1 text-[0.78rem] text-[var(--text-tertiary)]">{stat.detail}</div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>

                <aside className="xl:sticky xl:top-24 xl:self-start">
                    <div className="label-font">Claim status</div>
                    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                        <div className="text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{holder.labels.claimableProfit}</div>
                        <p className="mt-3 text-[0.86rem] leading-[1.6] text-[var(--text-secondary)]">
                            {holder.claimState.reason}
                        </p>
                        <button
                            type="button"
                            disabled
                            className="mt-5 w-full rounded-lg bg-[var(--surface-active)] px-4 py-3 text-[0.88rem] font-semibold text-[var(--text-tertiary)]"
                        >
                            Claim AVAX disabled
                        </button>
                        <p className="mt-3 text-[0.74rem] leading-[1.5] text-[var(--text-tertiary)]">
                            The public site does not call mint, invest, or admin functions. Claim writes stay disabled until a verified profit distributor claim function is configured.
                        </p>
                    </div>
                </aside>
            </section>

            <section className="mt-12">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="label-font">Market data</div>
                        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">$CATCH price and liquidity</h2>
                    </div>
                    <div className="text-[0.82rem] text-[var(--text-tertiary)]">
                        {market.fetchedAt ? `Updated ${new Date(market.fetchedAt).toLocaleString()}` : market.error ?? 'Checking market data'}
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                        <div className="label-font">Spot price</div>
                        <div className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">{formatUsd(market.spotPriceUsd)}</div>
                        <div className="mt-2 text-[0.82rem] text-[var(--text-secondary)]">
                            Source: LFJ or Pharaoh pair data when indexed.
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                        <PoolRow pool={market.lfj} />
                        <PoolRow pool={market.pharaoh} />
                    </div>
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
