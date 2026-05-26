import { BUY_PAGE_DEFAULTS, PURCHASE_FLOW, SALE_FLOW, TOKEN_ALLOCATION, WATERFALL } from '../data/protocol';
import { PixelDivider, PixelLabel, PixelLedgerRow, PixelStatRail } from './PixelUI';

type FlowProps = {
    steps: readonly { title: string; detail: string }[];
};

function FlowDiagram({ steps }: FlowProps) {
    return (
        <div>
            {steps.map((step, index) => (
                <PixelLedgerRow key={step.title}>
                    <div className="grid gap-4 md:grid-cols-[140px_1fr] md:gap-8">
                        <div className="flex items-start gap-3">
                            <PixelLabel tone={index === 0 ? 'live' : index === steps.length - 1 ? 'warning' : 'base'}>
                                Step {index + 1}
                            </PixelLabel>
                            {index < steps.length - 1 ? (
                                <span className="pixel-font pt-1 text-[0.55rem] text-[var(--text-tertiary)]">↓</span>
                            ) : null}
                        </div>
                        <div>
                            <h4 className="text-2xl font-bold text-[var(--text-primary)]">{step.title}</h4>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{step.detail}</p>
                        </div>
                    </div>
                </PixelLedgerRow>
            ))}
        </div>
    );
}

export function FundLifecycleDiagram() {
    return <FlowDiagram steps={PURCHASE_FLOW} />;
}

export function SaleLifecycleDiagram() {
    return <FlowDiagram steps={SALE_FLOW} />;
}

export function ProfitWaterfallDiagram() {
    return (
        <div>
            <PixelDivider label="Profit waterfall" />
            <div className="mt-6 overflow-hidden border-2 border-[var(--border)] bg-[var(--bg-tertiary)] shadow-[0_0_0_2px_var(--shadow-sm)]">
                <div className="flex h-8 w-full">
                    {WATERFALL.map((slice) => (
                        <div
                            key={slice.label}
                            className={`bg-gradient-to-r ${slice.color}`}
                            style={{ width: `${slice.percent}%` }}
                            title={`${slice.label} ${slice.percent}%`}
                        />
                    ))}
                </div>
            </div>
            <div className="mt-6">
                {WATERFALL.map((slice) => (
                    <PixelLedgerRow key={slice.label}>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:items-start">
                            <div className="flex items-center gap-3">
                                <div className={`h-3 w-3 border border-[rgba(232,240,227,0.18)] bg-gradient-to-r ${slice.color}`} />
                                <div className="text-lg font-bold text-[var(--text-primary)]">{slice.label}</div>
                            </div>
                            <div className="grid gap-2 md:grid-cols-[auto_1fr] md:items-start">
                                <div className="text-2xl font-bold text-[var(--accent-blue)]">{slice.percent}%</div>
                                <div className="text-sm leading-7 text-[var(--text-secondary)]">
                                    {slice.label === 'Buying power' && 'Returned to the strategy so realized profits can buy more cards and keep liquid execution capacity.'}
                                    {slice.label === 'LP support' && 'Reserved for bounded liquidity support without counting protocol-owned LP in conservative NAV.'}
                                    {slice.label === 'Buyback-burn reserve' && 'Reserved under discount conditions to buy CATCH and remove it from supply.'}
                                </div>
                            </div>
                        </div>
                    </PixelLedgerRow>
                ))}
            </div>
        </div>
    );
}

export function NavDecisionDiagram() {
    return (
        <div>
            {[
                {
                    label: 'Rule 1',
                    title: 'Exact trade',
                    detail: 'Use the exact executed buy or sale of the same asset when it exists.',
                    tone: 'live' as const,
                },
                {
                    label: 'Rule 2',
                    title: 'Comparable sales',
                    detail: 'Use strong comps from matching collection, condition, chain, and venue context.',
                    tone: 'base' as const,
                },
                {
                    label: 'Rule 3',
                    title: 'Listing-band fallback',
                    detail: 'If trades are thin, mark conservatively and cap inferred weekly moves.',
                    tone: 'warning' as const,
                },
            ].map((rule, index, rules) => (
                <PixelLedgerRow key={rule.title}>
                    <div className={`grid gap-4 rounded-[1.75rem] border p-5 ${
                        rule.tone === 'live'
                            ? 'border-sky-500/25 bg-sky-500/10'
                            : rule.tone === 'warning'
                                ? 'border-amber-500/25 bg-amber-500/10'
                                : 'border-white/10 bg-white/[0.03]'
                    }`}>
                        <div className="flex items-center gap-3">
                            <PixelLabel tone={rule.tone}>{rule.label}</PixelLabel>
                            {index < rules.length - 1 ? (
                                <span className="pixel-font text-[0.5rem] text-[var(--text-tertiary)]">↓</span>
                            ) : null}
                        </div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">{rule.title}</div>
                        <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{rule.detail}</p>
                    </div>
                </PixelLedgerRow>
            ))}
        </div>
    );
}

export function InvestorPnlDiagram() {
    const sampleCostBasis = 10_000;
    const sampleValue = 12_500;
    const sampleUnrealized = sampleValue - sampleCostBasis;

    return (
        <div>
            <PixelStatRail
                items={[
                    {
                        label: 'Direct contribution',
                        value: '$10,000',
                    },
                    {
                        label: 'Attributable holdings',
                        value: '4,000 CATCH',
                    },
                    {
                        label: 'Current NAV value',
                        value: `$${sampleValue.toLocaleString('en-US')}`,
                        tone: 'profit',
                    },
                    {
                        label: 'Unrealized PnL',
                        value: `$${sampleUnrealized.toLocaleString('en-US')}`,
                        tone: 'live',
                    },
                ]}
            />
            <div className="mt-6 flex flex-wrap gap-3">
                <PixelLabel tone="live">Transferred-in tokens stay visible</PixelLabel>
                <PixelLabel>No inherited cost basis</PixelLabel>
            </div>
        </div>
    );
}

export function RoundOneChart() {
    return (
        <PixelStatRail
            items={[
                {
                    label: 'Live network',
                    value: BUY_PAGE_DEFAULTS.networkLabel,
                    detail: 'Public buy flow',
                },
                {
                    label: 'Default target',
                    value: BUY_PAGE_DEFAULTS.targetAvax,
                    detail: 'AVAX on Avalanche mainnet',
                },
                {
                    label: 'Price',
                    value: BUY_PAGE_DEFAULTS.priceAvax,
                    detail: 'AVAX per CATCH',
                },
            ]}
        />
    );
}

export function TestnetProofTimeline() {
    const steps = [
        'Mainnet fund proxy deployed and verified',
        'V8 continuous commit controls verified on mainnet',
        'Each backed settlement mints CATCH per commit at NAV-derived pricing',
        'Proof links expose fund, registry, and investor accounting',
        'Acquired cards appear after fundraising finalization',
    ] as const;

    return (
        <div>
            {steps.map((step, index) => (
                <PixelLedgerRow key={step}>
                    <div className="grid gap-4 md:grid-cols-[140px_1fr] md:gap-8">
                        <PixelLabel tone={index === steps.length - 1 ? 'warning' : 'live'}>Proof {index + 1}</PixelLabel>
                        <p className="text-sm leading-7 text-[var(--text-secondary)]">{step}</p>
                    </div>
                </PixelLedgerRow>
            ))}
        </div>
    );
}

export function TokenAllocationDiagram() {
    return (
        <div>
            <div className="overflow-hidden border-2 border-[var(--border)] bg-[var(--bg-tertiary)] shadow-[0_0_0_2px_var(--shadow-sm)]">
                <div className="flex h-8 w-full">
                    {TOKEN_ALLOCATION.map((slice) => (
                        <div
                            key={slice.label}
                            className={`bg-gradient-to-r ${slice.color}`}
                            style={{ width: `${slice.percent}%` }}
                            title={`${slice.label} ${slice.percent}%`}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-6">
                {TOKEN_ALLOCATION.map((slice) => (
                    <PixelLedgerRow key={slice.label}>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.25fr)_minmax(0,1.2fr)] lg:items-start">
                            <div className="flex items-center gap-3">
                                <div className={`h-3 w-3 border border-[rgba(232,240,227,0.18)] bg-gradient-to-r ${slice.color}`} />
                                <div className="text-lg font-bold text-[var(--text-primary)]">{slice.label}</div>
                            </div>
                            <div className="text-2xl font-bold text-[var(--accent-blue)]">{slice.percent}%</div>
                            <p className="text-sm leading-7 text-[var(--text-secondary)]">{slice.detail}</p>
                        </div>
                    </PixelLedgerRow>
                ))}
            </div>
        </div>
    );
}
