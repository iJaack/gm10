import { BUY_PAGE_DEFAULTS, PURCHASE_FLOW, SALE_FLOW, TOKEN_ALLOCATION, WATERFALL } from '../data/protocol';

type FlowProps = {
    steps: readonly { title: string; detail: string }[];
};

function FlowDiagram({ steps }: FlowProps) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {steps.map((step, index) => (
                <div key={step.title} className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/80">
                            Step {index + 1}
                        </span>
                        {index < steps.length - 1 ? (
                            <span className="hidden xl:inline-flex text-white/20">→</span>
                        ) : null}
                    </div>
                    <div className="text-lg font-semibold text-white">{step.title}</div>
                    <p className="mt-3 text-sm leading-6 text-white/60">{step.detail}</p>
                </div>
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
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-white/40">Profit waterfall</div>
                    <h3 className="mt-2 text-2xl font-semibold text-white">Realized profit only</h3>
                </div>
                <div className="text-sm text-white/50">Principal always returns to treasury before this split starts.</div>
            </div>

            <div className="mt-6 overflow-hidden rounded-full border border-white/10 bg-[#09101c]">
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

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {WATERFALL.map((slice) => (
                    <div key={slice.label} className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                        <div className="text-sm font-semibold text-white">{slice.label}</div>
                        <div className="mt-2 text-3xl font-black text-sky-200">{slice.percent}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function NavDecisionDiagram() {
    return (
        <div className="grid grid-cols-1 gap-3">
            <div className="w-full rounded-3xl border border-sky-500/20 bg-sky-500/10 p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-sky-200/80">Rule 1</div>
                <div className="mt-2 text-xl font-semibold text-white">Exact trade</div>
                <p className="mt-3 text-sm text-white/60">
                    Use the exact executed buy or sale of the same asset when it exists.
                </p>
            </div>
            <div className="flex items-center justify-center text-white/20">↓</div>
            <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">Rule 2</div>
                <div className="mt-2 text-xl font-semibold text-white">Comparable sales</div>
                <p className="mt-3 text-sm text-white/60">
                    Use strong comps from matching collection, condition, chain, and venue context.
                </p>
            </div>
            <div className="flex items-center justify-center text-white/20">↓</div>
            <div className="w-full rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Rule 3</div>
                <div className="mt-2 text-xl font-semibold text-white">Listing-band fallback</div>
                <p className="mt-3 text-sm text-white/60">
                    If trades are thin, mark conservatively and cap inferred weekly moves.
                </p>
            </div>
        </div>
    );
}

export function InvestorPnlDiagram() {
    const sampleCostBasis = 10_000;
    const sampleValue = 12_500;
    const sampleUnrealized = sampleValue - sampleCostBasis;

    return (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                    <div className="text-sm text-white/50">Direct contribution</div>
                    <div className="mt-2 text-3xl font-black text-white">$10,000</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                    <div className="text-sm text-white/50">Attributable holdings</div>
                    <div className="mt-2 text-3xl font-black text-white">4,000 CATCH</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                    <div className="text-sm text-white/50">Current NAV value</div>
                    <div className="mt-2 text-3xl font-black text-emerald-300">${sampleValue.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                    <div className="text-sm text-white/50">Unrealized PnL</div>
                    <div className="mt-2 text-3xl font-black text-sky-300">${sampleUnrealized.toLocaleString()}</div>
                </div>
            </div>

            <div className="mt-6 flex items-center gap-3 text-sm text-white/50">
                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1">Transferred-in tokens stay visible</span>
                <span className="rounded-full border border-white/10 px-3 py-1">No inherited cost basis</span>
            </div>
        </div>
    );
}

export function RoundOneChart() {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">Live network</div>
                <div className="mt-2 text-4xl font-black text-white">{BUY_PAGE_DEFAULTS.networkLabel}</div>
                <div className="mt-1 text-sm text-white/50">Public buy flow</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">Default target</div>
                <div className="mt-2 text-4xl font-black text-white">{BUY_PAGE_DEFAULTS.targetAvax}</div>
                <div className="mt-1 text-sm text-white/50">AVAX on Fuji</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">Price</div>
                <div className="mt-2 text-4xl font-black text-white">{BUY_PAGE_DEFAULTS.priceAvax}</div>
                <div className="mt-1 text-sm text-white/50">AVAX per CATCH</div>
            </div>
        </div>
    );
}

export function TestnetProofTimeline() {
    const steps = [
        'Fresh modular V3 proxy deployed on Fuji',
        'Live Fuji round created for the public Buy flow',
        'Test AVAX contributed into the round',
        'Two purchase authorizations recorded onchain',
        'Two ERC-721 holdings written into the portfolio registry',
    ] as const;

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {steps.map((step, index) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/80">
                        Proof {index + 1}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-white/60">{step}</p>
                </div>
            ))}
        </div>
    );
}

export function TokenAllocationDiagram() {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-white/40">Supply breakdown</div>
                    <h3 className="mt-2 text-2xl font-semibold text-white">Most of the supply is reserved for the rounds</h3>
                </div>
                <div className="text-sm text-white/50">Community-led distribution first, long-dated insider unlocks second.</div>
            </div>

            <div className="mt-6 overflow-hidden rounded-full border border-white/10 bg-[#09101c]">
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

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {TOKEN_ALLOCATION.map((slice) => (
                    <div key={slice.label} className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                        <div className="text-sm font-semibold text-white">{slice.label}</div>
                        <div className="mt-2 text-3xl font-black text-sky-200">{slice.percent}%</div>
                        <p className="mt-2 text-sm leading-6 text-white/55">{slice.detail}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
