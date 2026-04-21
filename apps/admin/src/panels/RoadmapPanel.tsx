type RoadmapStatus = 'Done' | 'In progress' | 'Blocked' | 'Planned';

type RoadmapItem = {
    title: string;
    status: RoadmapStatus;
    area: string;
    notes: string;
    detail?: string;
};

type RoadmapWorkstream = {
    title: string;
    summary: string;
    items: RoadmapItem[];
};

const STATUS_STYLES: Record<RoadmapStatus, string> = {
    Done: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    'In progress': 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    Blocked: 'border-red-400/25 bg-red-400/10 text-red-200',
    Planned: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
};

const ROADMAP_WORKSTREAMS: RoadmapWorkstream[] = [
    {
        title: 'Marketplace checklist and adapter rollout',
        summary: 'Make every acquisition and exit follow the same proof-backed operating lane.',
        items: [
            {
                title: 'Courtyard purchase and custody workflow',
                status: 'Done',
                area: 'Marketplace ops',
                notes: 'Reference flow exists through the admin Courtyard wizard and recorded position/provenance fields.',
                detail: 'Keep using this as the baseline adapter pattern for new venues.',
            },
            {
                title: 'Reusable marketplace checklist',
                status: 'In progress',
                area: 'Marketplace ops',
                notes: 'Needs one canonical checklist covering approval, fee model, custody ref, settlement proof, valuation source, and failure handling.',
            },
            {
                title: 'Second marketplace adapter',
                status: 'Planned',
                area: 'Marketplace ops',
                notes: 'Implement only after the checklist is accepted and Courtyard remains the regression fixture.',
            },
        ],
    },
    {
        title: 'veCATCH lock and gauge system',
        summary: 'Move staking toward a ve(3,3)-inspired routing model instead of simple passive staking.',
        items: [
            {
                title: 'Gauge architecture spec',
                status: 'Planned',
                area: 'Staking',
                notes: 'Define lock durations, voting weight, gauge creation, boost rules, early unlock policy, and reward routing.',
            },
            {
                title: 'Gauge accounting tests',
                status: 'Planned',
                area: 'Staking',
                notes: 'Cover lock creation, weight decay, gauge votes, reward distribution, exclusions, and emergency pause.',
            },
        ],
    },
    {
        title: 'Profit claim and stream module',
        summary: 'Separate realized-profit distribution from marks and unrealized portfolio value.',
        items: [
            {
                title: 'Read-only claim dashboard',
                status: 'Done',
                area: 'Holders',
                notes: 'Holder pages show claimability, excluded status, lifetime deposited profit, and claimable amounts when available.',
            },
            {
                title: 'Public claim actions',
                status: 'Blocked',
                area: 'Distribution',
                notes: 'Blocked until distributor capabilities, exclusions, and claim/stream accounting are finalized and tested.',
                detail: 'Current UI intentionally keeps public claim writes disabled.',
            },
            {
                title: 'Streamed-profit design',
                status: 'Planned',
                area: 'Distribution',
                notes: 'Decide whether v1 streams only AVAX, then defer multi-asset streams until accounting is mature.',
            },
        ],
    },
    {
        title: '$CATCH max-supply review and migration',
        summary: 'Resolve supply policy before changing tokenomics language or publishing new numbers.',
        items: [
            {
                title: 'Supply enforcement audit',
                status: 'Blocked',
                area: 'Tokenomics',
                notes: 'Public copy references a 100M fixed supply, while the inspected round-mint path needs explicit max-supply enforcement review.',
            },
            {
                title: 'Max-supply model',
                status: 'Planned',
                area: 'Tokenomics',
                notes: 'Model holder dilution, future rounds, gauges, liquidity, treasury flexibility, and governance power before selecting a new cap.',
            },
            {
                title: 'Migration plan',
                status: 'Planned',
                area: 'Tokenomics',
                notes: 'Any max-supply change needs contract enforcement, UI copy updates, holder dashboard updates, docs, and public explanation.',
            },
        ],
    },
    {
        title: 'Delta-neutral pilots with @CardChaseFun',
        summary: 'Treat partner strategies as measured pilots before treasury allocation or gauge routing.',
        items: [
            {
                title: 'Pilot requirements',
                status: 'Planned',
                area: 'Strategy',
                notes: 'Define maximum exposure, collateral, oracle source, liquidation rules, unwind path, reporting cadence, and pause authority.',
            },
            {
                title: 'Performance reporting template',
                status: 'Planned',
                area: 'Strategy',
                notes: 'Create a standard report before any partner strategy can graduate to a public gauge.',
            },
        ],
    },
    {
        title: 'Governance, timelock, and safety controls',
        summary: 'Move execution controls from ops-led actions toward transparent governance paths.',
        items: [
            {
                title: 'Public proof surfaces',
                status: 'Done',
                area: 'Governance',
                notes: 'Public proof, portfolio, holder, and valuation surfaces are live on gm10.xyz/admin.gm10.xyz.',
            },
            {
                title: 'Profit-waterfall reconciliation',
                status: 'Blocked',
                area: 'Governance',
                notes: 'Repo copy and contract behavior must be reconciled before staking/claim launch messaging.',
            },
            {
                title: 'Timelock-sensitive controls',
                status: 'Planned',
                area: 'Governance',
                notes: 'Marketplace approvals, gauge creation, profit module config, strategy limits, and supply changes should move behind Safe/timelock/governance paths.',
            },
        ],
    },
    {
        title: 'Monitoring and launch readiness',
        summary: 'Make completed work visible and keep roadmaps updated as part of the definition of done.',
        items: [
            {
                title: 'Living roadmap process',
                status: 'Done',
                area: 'Process',
                notes: 'Public and private roadmaps now use statuses/checklists and should be updated when relevant work ships.',
                detail: 'Add commit, production URL, contract address, or shipped date when a completed item needs detail.',
            },
            {
                title: 'Operational monitors',
                status: 'Planned',
                area: 'Monitoring',
                notes: 'Track treasury value, pending settlements, valuation freshness, distributor balances, gauge emissions, and abnormal claim activity.',
            },
        ],
    },
];

function StatusBadge({ status }: { status: RoadmapStatus }) {
    return (
        <span className={`rounded-full border px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[status]}`}>
            {status}
        </span>
    );
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="label-font text-[0.58rem]">{item.area}</div>
                    <h3 className="mt-1 text-base font-bold text-white">{item.title}</h3>
                </div>
                <StatusBadge status={item.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-400">{item.notes}</p>
            {item.detail ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-gray-300">
                    {item.detail}
                </div>
            ) : null}
        </div>
    );
}

export function RoadmapPanel() {
    const completed = ROADMAP_WORKSTREAMS.flatMap((workstream) => workstream.items)
        .filter((item) => item.status === 'Done').length;
    const total = ROADMAP_WORKSTREAMS.flatMap((workstream) => workstream.items).length;

    return (
        <div className="grid gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="label-font">Private roadmap</div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Execution roadmap</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                            Internal checklist for marketplace rollout, gauges, staking, profit distribution, tokenomics, partner pilots, and decentralization work.
                            Update this tab whenever roadmap-related work ships or a blocker changes.
                        </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Done</div>
                        <div className="mt-1 text-xl font-bold text-white">{completed} / {total}</div>
                    </div>
                </div>
            </div>

            <div className="grid gap-5">
                {ROADMAP_WORKSTREAMS.map((workstream) => (
                    <section key={workstream.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-white">{workstream.title}</h2>
                            <p className="mt-1 text-sm leading-6 text-gray-400">{workstream.summary}</p>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                            {workstream.items.map((item) => (
                                <RoadmapCard key={`${workstream.title}-${item.title}`} item={item} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
