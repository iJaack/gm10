import Page from '../components/Page';
import { PixelExternalLink, PixelLabel, PixelMenuLink } from '../components/PixelUI';
import { ScrollReveal } from '../components/ScrollReveal';
import { Web3Providers } from '../components/Web3Providers';
import { getRoundPrimaryCtaLabel } from '../data/protocol';
import { useCourtyardProfileNav } from '../hooks/useCourtyardProfileNav';
import { useFujiPortfolioPositions, useFujiRoundState, type Gm10PortfolioActivity } from '../hooks/useFujiProof';

function shortAddress(address?: string) {
    if (!address) return 'Pending';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortTokenId(tokenId: string) {
    if (tokenId.length <= 18) return tokenId;
    return `${tokenId.slice(0, 10)}...${tokenId.slice(-8)}`;
}

function formatFreshness(timestamp?: string) {
    if (!timestamp) return 'Not fetched';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(timestamp));
}

function ActivityRail({ activity }: { activity: readonly Gm10PortfolioActivity[] }) {
    return (
        <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="label-font">Activity</div>
            <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
                <div className="grid grid-cols-[0.7fr_1.6fr_0.8fr] border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    <span>Type</span>
                    <span>Asset</span>
                    <span className="text-right">Amount</span>
                </div>
                {activity.length > 0 ? activity.map((item) => (
                    <div key={item.id} className="grid grid-cols-[0.7fr_1.6fr_0.8fr] gap-3 border-b border-[var(--border)] px-4 py-3 text-[0.82rem] last:border-b-0">
                        <div>
                            <div className="font-semibold text-[var(--accent-green)]">{item.type}</div>
                            <div className="mt-1 text-[0.72rem] text-[var(--text-tertiary)]">{item.date}</div>
                        </div>
                        <div className="min-w-0">
                            <div className="truncate font-medium text-[var(--text-primary)]">{item.item}</div>
                            <div className="mt-1 truncate text-[0.72rem] text-[var(--text-tertiary)]">{item.detail}</div>
                        </div>
                        <div className="text-right font-semibold text-[var(--text-primary)]">{item.amount}</div>
                    </div>
                )) : (
                    <div className="px-4 py-5 text-[0.86rem] text-[var(--text-secondary)]">No recorded activity yet.</div>
                )}
            </div>
        </aside>
    );
}

function PortfolioContent() {
    const platformNav = useCourtyardProfileNav();
    const proofState = useFujiPortfolioPositions({
        status: platformNav.status,
        netWorthUsd: platformNav.netWorthUsd,
    });
    const roundState = useFujiRoundState();

    const stats = [
        { label: 'Cost basis', value: proofState.proofSummary.costBasisLabel, detail: 'Recorded acquisition price' },
        { label: 'Onchain current mark', value: proofState.proofSummary.onchainCurrentMarkLabel, detail: 'Registry currentValue' },
        { label: 'Courtyard platform NAV', value: platformNav.isLoading ? 'Checking...' : proofState.proofSummary.platformNavLabel, detail: formatFreshness(platformNav.fetchedAt) },
        { label: 'Unrealized P/L', value: proofState.proofSummary.unrealizedPnlLabel, detail: proofState.proofSummary.unrealizedSourceLabel },
        { label: 'Reference NAV/token', value: proofState.proofSummary.referenceNavLabel, detail: 'Onchain accounting' },
        { label: 'Liquid treasury', value: proofState.proofSummary.liquidTreasuryLabel, detail: 'Stable accounting' },
    ];

    return (
        <Page containerClassName="mx-auto max-w-[min(1440px,calc(100vw-48px))]">
            <section>
                <ScrollReveal>
                    <div className="flex flex-wrap items-center gap-2">
                        <PixelLabel tone="live">{proofState.proofSummary.holdingsChipLabel}</PixelLabel>
                        <PixelLabel tone={platformNav.status === 'available' ? 'profit' : 'warning'}>
                            Courtyard NAV {platformNav.status}
                        </PixelLabel>
                    </div>
                    <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="label-font">Portfolio</div>
                            <h1 className="mt-3 text-[2.3rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[3rem]">
                                Card portfolio
                            </h1>
                            <p className="mt-3 text-[0.98rem] leading-[1.7] text-[var(--text-secondary)]">
                                Cost basis is recorded acquisition price. Current NAV is the latest platform or registry mark. Claimable profit only comes from realized sale proceeds.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <PixelMenuLink to="/holders">Holder dashboard</PixelMenuLink>
                            <PixelMenuLink to="/fundraising" active>{getRoundPrimaryCtaLabel(roundState.isRoundOpen)}</PixelMenuLink>
                        </div>
                    </div>
                </ScrollReveal>

                <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
                    {stats.map((stat, index) => (
                        <ScrollReveal key={stat.label} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                            <div className="h-full bg-[var(--bg-primary)] p-5">
                                <div className="label-font">{stat.label}</div>
                                <div className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">{stat.value}</div>
                                <div className="mt-1 text-[0.78rem] text-[var(--text-tertiary)]">{stat.detail}</div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                {platformNav.status === 'unavailable' && !platformNav.isLoading ? (
                    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-[0.84rem] text-[var(--text-secondary)]">
                        Courtyard platform NAV is unavailable right now. The page is using onchain current marks for unrealized P/L.
                    </div>
                ) : null}
            </section>

            <section className="mt-14 grid gap-8 xl:grid-cols-[1fr_360px]">
                <div>
                    <div className="label-font">Holdings gallery</div>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                        {proofState.positions.length > 0 ? proofState.positions.map((position, index) => (
                            <ScrollReveal key={position.positionId} delay={Math.min(index + 1, 3) as 1 | 2 | 3}>
                                <article className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] transition-colors hover:border-[var(--border-strong)]">
                                    <div className="grid min-h-full sm:grid-cols-[180px_1fr]">
                                        <div className="relative min-h-[260px] overflow-hidden bg-black sm:min-h-full">
                                            <img
                                                src={position.imageSrc}
                                                alt={position.imageAlt}
                                                className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
                                            />
                                            <div className="absolute left-3 top-3">
                                                <PixelLabel tone={position.statusLabel === 'Active' ? 'live' : 'warning'}>{position.statusLabel}</PixelLabel>
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 flex-col p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="label-font">Position #{position.positionId}</div>
                                                    <h2 className="mt-2 text-xl font-bold leading-tight tracking-[-0.03em] text-[var(--text-primary)]">{position.title}</h2>
                                                    {position.subtitle ? <p className="mt-1 text-[0.82rem] text-[var(--text-tertiary)]">{position.subtitle}</p> : null}
                                                </div>
                                                <span className="shrink-0 rounded-full bg-[var(--surface-active)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--text-secondary)]">
                                                    {position.chain}
                                                </span>
                                            </div>

                                            <div className="mt-5 grid grid-cols-2 gap-3 text-[0.82rem]">
                                                <div>
                                                    <div className="label-font text-[0.6rem]">Cost basis</div>
                                                    <div className="mt-1 font-semibold text-[var(--text-primary)]">{position.acquisition}</div>
                                                </div>
                                                <div>
                                                    <div className="label-font text-[0.6rem]">Current mark</div>
                                                    <div className="mt-1 font-semibold text-[var(--text-primary)]">{position.currentValue}</div>
                                                </div>
                                                <div>
                                                    <div className="label-font text-[0.6rem]">Acquired</div>
                                                    <div className="mt-1 font-semibold text-[var(--text-primary)]">{position.acquisitionDateLabel}</div>
                                                </div>
                                                <div>
                                                    <div className="label-font text-[0.6rem]">Last mark</div>
                                                    <div className="mt-1 font-semibold text-[var(--text-primary)]">{position.lastValuationLabel}</div>
                                                </div>
                                            </div>

                                            <div className="mt-5 grid gap-2 border-t border-[var(--border)] pt-4 text-[0.78rem] text-[var(--text-secondary)]">
                                                <div className="flex justify-between gap-3">
                                                    <span>Collection</span>
                                                    <a href={position.snowtraceUrl} target="_blank" rel="noreferrer" className="font-mono text-[var(--accent-blue)]">
                                                        {shortAddress(position.collectionAddress)}
                                                    </a>
                                                </div>
                                                <div className="flex justify-between gap-3">
                                                    <span>Token ID</span>
                                                    <span className="font-mono">{shortTokenId(position.tokenId)}</span>
                                                </div>
                                            </div>

                                            {position.note ? <p className="mt-4 text-[0.82rem] leading-[1.55] text-[var(--text-secondary)]">{position.note}</p> : null}

                                            <div className="mt-auto flex flex-wrap gap-2 pt-5">
                                                {position.courtyardUrl ? (
                                                    <PixelExternalLink href={position.courtyardUrl} target="_blank" rel="noreferrer">Courtyard</PixelExternalLink>
                                                ) : null}
                                                <PixelExternalLink href={position.snowtraceUrl} target="_blank" rel="noreferrer">Collection</PixelExternalLink>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            </ScrollReveal>
                        )) : (
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-[0.9rem] text-[var(--text-secondary)]">
                                No card positions are recorded onchain yet.
                            </div>
                        )}
                    </div>
                </div>

                <ActivityRail activity={proofState.activity} />
            </section>
        </Page>
    );
}

export default function Portfolio() {
    return (
        <Web3Providers>
            <PortfolioContent />
        </Web3Providers>
    );
}
