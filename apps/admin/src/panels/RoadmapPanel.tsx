import { MARKETPLACE_CHECKLIST_ITEMS } from '../data/marketplaceChecklist';
import { LedgerPanel, MetricCard, OperatorActionsPanel, PageHeader, StatusStrip } from '../components/AdminPrimitives';
import { READ_STATUS } from '../lib/adminMetrics.js';

type RoadmapStatus = 'Done' | 'In progress' | 'Blocked' | 'Planned';

type RoadmapStageId =
    | 'proof'
    | 'marketplaces'
    | 'distribution'
    | 'tokenomics'
    | 'strategy'
    | 'governance';

type RoadmapNode = {
    id: string;
    title: string;
    status: RoadmapStatus;
    area: string;
    stage: RoadmapStageId;
    notes: string;
    blockedBy?: string[];
    detail?: string;
};

type RoadmapStage = {
    id: RoadmapStageId;
    title: string;
    summary: string;
};

const STAGES: RoadmapStage[] = [
    {
        id: 'proof',
        title: 'Proof foundations',
        summary: 'Public surfaces, valuation data, and roadmap hygiene.',
    },
    {
        id: 'marketplaces',
        title: 'Marketplace system',
        summary: 'Repeatable acquisition and exit workflows.',
    },
    {
        id: 'distribution',
        title: 'Staking and distributions',
        summary: 'veCATCH, gauges, claims, and streams.',
    },
    {
        id: 'tokenomics',
        title: 'Tokenomics review',
        summary: 'Supply policy and migration work.',
    },
    {
        id: 'strategy',
        title: 'Strategy expansion',
        summary: 'Partner pilots and treasury leverage.',
    },
    {
        id: 'governance',
        title: 'Governance hardening',
        summary: 'Timelocks, monitors, and decentralization controls.',
    },
];

const STATUS_STYLES: Record<RoadmapStatus, string> = {
    Done: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    'In progress': 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    Blocked: 'border-red-400/25 bg-red-400/10 text-red-200',
    Planned: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
};

const STATUS_DOT_STYLES: Record<RoadmapStatus, string> = {
    Done: 'bg-emerald-300',
    'In progress': 'bg-sky-300',
    Blocked: 'bg-red-300',
    Planned: 'bg-amber-300',
};

const ROADMAP_NODES: RoadmapNode[] = [
    {
        id: 'public-proof',
        title: 'Public proof surfaces',
        status: 'Done',
        area: 'Proof',
        stage: 'proof',
        notes: 'Public proof, portfolio, holder, and valuation surfaces are live from the unified gm10 deployment.',
    },
    {
        id: 'valuation-public',
        title: 'Public valuation projection',
        status: 'Done',
        area: 'Proof',
        stage: 'proof',
        notes: 'Website consumes submitted or live public valuation marks from the unified deployment API.',
        detail: 'Completed before this roadmap pass. Keep mark-source details updated as providers change.',
    },
    {
        id: 'living-roadmap',
        title: 'Living roadmap process',
        status: 'Done',
        area: 'Process',
        stage: 'proof',
        notes: 'Public and private roadmaps now use statuses and completion details.',
        detail: 'This admin tab is now a horizontal blocker diagram. Update it whenever work ships or blockers change.',
    },
    {
        id: 'marketplace-checklist',
        title: 'Reusable marketplace checklist',
        status: 'Done',
        area: 'Marketplace ops',
        stage: 'marketplaces',
        notes: 'Canonical checklist covering approval, fee model, custody ref, settlement proof, valuation source, and failure handling is live in Operations.',
        detail: `The checklist has ${MARKETPLACE_CHECKLIST_ITEMS.length} required gates and uses Courtyard as the regression fixture for the next venue.`,
    },
    {
        id: 'second-adapter',
        title: 'Second marketplace adapter',
        status: 'Planned',
        area: 'Marketplace ops',
        stage: 'marketplaces',
        notes: 'Implement another venue only after the checklist is accepted and Courtyard remains the regression fixture.',
        blockedBy: ['marketplace-checklist'],
    },
    {
        id: 'profit-waterfall',
        title: 'Profit-waterfall reconciliation',
        status: 'Done',
        area: 'Governance',
        stage: 'distribution',
        notes: 'Realized-profit split is reconciled across contract accounting, public copy, and admin copy: 25% treasury, 40% holder claim bucket, 35% LP replenishment.',
        detail: 'The LP bucket is split between a $CATCH market-buy half and an AVAX pairing half before adding LFJ and Pharaoh liquidity 50/50.',
    },
    {
        id: 'claim-dashboard',
        title: 'Read-only claim dashboard',
        status: 'Done',
        area: 'Holders',
        stage: 'distribution',
        notes: 'Holder pages show claimability, excluded status, lifetime deposited profit, and claimable amounts when available.',
    },
    {
        id: 'gauge-spec',
        title: 'Gauge architecture spec',
        status: 'Planned',
        area: 'Staking',
        stage: 'distribution',
        notes: 'Define lock durations, voting weight, gauge creation, boost rules, early unlock policy, and reward routing.',
        blockedBy: ['supply-audit'],
    },
    {
        id: 'public-claim-actions',
        title: 'Public claim and stream actions',
        status: 'Blocked',
        area: 'Distribution',
        stage: 'distribution',
        notes: 'Blocked until distributor capabilities, exclusions, and claim/stream accounting are finalized and tested.',
        blockedBy: ['gauge-spec'],
        detail: 'Current UI intentionally keeps public claim writes disabled.',
    },
    {
        id: 'supply-audit',
        title: 'Supply enforcement audit',
        status: 'In progress',
        area: 'Tokenomics',
        stage: 'tokenomics',
        notes: 'V7 replaces fixed-cap language with no max supply, round-based buyer mints, and five 1% segment allocations per finalized round.',
        blockedBy: ['public-proof'],
    },
    {
        id: 'max-supply-model',
        title: 'Dynamic-supply model',
        status: 'In progress',
        area: 'Tokenomics',
        stage: 'tokenomics',
        notes: 'Model holder dilution, future rounds, excluded segment wallets, attribution-gated redemption, liquidity, treasury flexibility, and governance power before Safe execution.',
        blockedBy: ['supply-audit'],
    },
    {
        id: 'migration-plan',
        title: 'Supply migration plan',
        status: 'Planned',
        area: 'Tokenomics',
        stage: 'tokenomics',
        notes: 'The migration needs V7 contract enforcement, tokenomics-controller configuration, UI copy updates, holder dashboard updates, docs, and public explanation.',
        blockedBy: ['max-supply-model'],
    },
    {
        id: 'pilot-requirements',
        title: '@CardChaseFun pilot requirements',
        status: 'Planned',
        area: 'Strategy',
        stage: 'strategy',
        notes: 'Define maximum exposure, collateral, oracle source, liquidation rules, unwind path, reporting cadence, and pause authority.',
        blockedBy: ['marketplace-checklist'],
    },
    {
        id: 'performance-report',
        title: 'Performance reporting template',
        status: 'Planned',
        area: 'Strategy',
        stage: 'strategy',
        notes: 'Create a standard report before any partner strategy can graduate to a public gauge.',
        blockedBy: ['pilot-requirements'],
    },
    {
        id: 'partner-gauges',
        title: 'Partner strategy gauges',
        status: 'Planned',
        area: 'Strategy',
        stage: 'strategy',
        notes: 'Graduate partner strategies into gauges only after public performance reporting and operational review.',
        blockedBy: ['gauge-spec', 'performance-report'],
    },
    {
        id: 'timelock-controls',
        title: 'Timelock-sensitive controls',
        status: 'Planned',
        area: 'Governance',
        stage: 'governance',
        notes: 'Marketplace approvals, gauge creation, profit module config, strategy limits, and supply changes should move behind Safe/timelock/governance paths.',
        blockedBy: ['marketplace-checklist', 'gauge-spec', 'migration-plan'],
    },
    {
        id: 'operational-monitors',
        title: 'Operational monitors',
        status: 'Planned',
        area: 'Monitoring',
        stage: 'governance',
        notes: 'Track treasury value, pending settlements, valuation freshness, distributor balances, gauge emissions, and abnormal claim activity.',
        blockedBy: ['public-claim-actions', 'partner-gauges'],
    },
];

const NODE_BY_ID = ROADMAP_NODES.reduce<Record<string, RoadmapNode>>((acc, node) => {
    acc[node.id] = node;
    return acc;
}, {});

const CRITICAL_CHAINS = [
    ['marketplace-checklist', 'second-adapter'],
    ['profit-waterfall', 'gauge-spec', 'public-claim-actions'],
    ['supply-audit', 'max-supply-model', 'migration-plan'],
    ['pilot-requirements', 'performance-report', 'partner-gauges'],
    ['migration-plan', 'timelock-controls', 'operational-monitors'],
] as const;

function StatusBadge({ status }: { status: RoadmapStatus }) {
    return (
        <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[status]}`}>
            {status}
        </span>
    );
}

function BlockerChips({ blockers = [] }: { blockers?: string[] }) {
    if (blockers.length === 0) {
        return (
            <div className="mt-3 rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-[0.72rem] leading-5 text-emerald-100">
                No active blockers.
            </div>
        );
    }

    return (
        <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2">
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-red-200">Blocked by</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {blockers.map((blockerId) => {
                    const blocker = NODE_BY_ID[blockerId];
                    return (
                        <span key={blockerId} className="rounded-full border border-red-300/20 bg-black/30 px-2 py-1 text-[0.68rem] leading-none text-red-100">
                            {blocker?.title ?? blockerId}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

function DiagramNodeCard({ node }: { node: RoadmapNode }) {
    return (
        <article id={`roadmap-${node.id}`} className="rounded-xl border border-white/10 bg-black/25 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_STYLES[node.status]}`} />
                        <span className="label-font text-[0.55rem]">{node.area}</span>
                    </div>
                    <h3 className="mt-1.5 text-[0.95rem] font-bold leading-snug text-white">{node.title}</h3>
                </div>
                <StatusBadge status={node.status} />
            </div>
            <p className="mt-3 text-[0.82rem] leading-6 text-gray-400">{node.notes}</p>
            <BlockerChips blockers={node.blockedBy} />
            {node.detail ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.73rem] leading-5 text-gray-300">
                    {node.detail}
                </div>
            ) : null}
        </article>
    );
}

function CriticalChain({ chain }: { chain: readonly string[] }) {
    return (
        <div className="flex min-w-max items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            {chain.map((nodeId, index) => {
                const node = NODE_BY_ID[nodeId];
                return (
                    <div key={nodeId} className="flex items-center gap-2">
                        <a href={`#roadmap-${nodeId}`} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.72rem] font-medium text-gray-200 hover:border-[var(--accent)]/40 hover:text-white">
                            {node?.title ?? nodeId}
                        </a>
                        {index < chain.length - 1 ? <span className="text-[0.7rem] text-gray-500">-&gt;</span> : null}
                    </div>
                );
            })}
        </div>
    );
}

export function RoadmapPanel() {
    const completed = ROADMAP_NODES.filter((node) => node.status === 'Done').length;
    const blockedNodes = ROADMAP_NODES.filter((node) => node.status === 'Blocked');
    const plannedNodes = ROADMAP_NODES.filter((node) => node.status === 'Planned');
    const inProgressNodes = ROADMAP_NODES.filter((node) => node.status === 'In progress');
    const blocked = blockedNodes.length;
    const total = ROADMAP_NODES.length;
    const nextBlockedNode = blockedNodes[0];
    const nextPlannedNode = plannedNodes[0];
    const decisionFocus = nextBlockedNode ?? nextPlannedNode;
    const scrollToNode = (nodeId?: string) => {
        if (!nodeId) return;
        document.getElementById(`roadmap-${nodeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="grid gap-6">
            <PageHeader
                eyebrow="Operational roadmap"
                title="Execution dependency map"
                description="Track marketplace rollout, valuation data truth, holder claims, LP deployment, tokenomics, and governance as operational readiness states."
            />
            <StatusStrip
                items={[
                    { label: `${completed} done`, status: READ_STATUS.live },
                    { label: `${blocked} blocked`, status: blocked ? READ_STATUS.error : READ_STATUS.live },
                    { label: `${total} total nodes`, status: READ_STATUS.configured },
                    { label: `${MARKETPLACE_CHECKLIST_ITEMS.length} marketplace gates`, status: READ_STATUS.configured },
                ]}
            />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)_minmax(0,1.05fr)]">
                <MetricCard
                    label="Decision queue"
                    value={
                        <div className="grid gap-2">
                            <span className="text-2xl tabular-nums">{decisionFocus?.title ?? 'Clear'}</span>
                            <span className="text-base font-semibold text-gray-300">{decisionFocus?.area ?? 'No blocked node'}</span>
                        </div>
                    }
                    status={nextBlockedNode ? READ_STATUS.error : nextPlannedNode ? READ_STATUS.partial : READ_STATUS.live}
                    sourceLabel={decisionFocus?.status ?? 'roadmap'}
                    accent={nextBlockedNode ? 'red' : nextPlannedNode ? 'yellow' : 'green'}
                    detail={decisionFocus?.notes ?? 'Every roadmap node is either done or unblocked.'}
                />
                <OperatorActionsPanel
                    title="Roadmap actions"
                    actions={[
                        {
                            label: 'Open top blocker',
                            detail: nextBlockedNode ? nextBlockedNode.notes : 'No blocked node is currently active.',
                            onClick: () => scrollToNode(nextBlockedNode?.id),
                            disabled: !nextBlockedNode,
                            primary: Boolean(nextBlockedNode),
                            status: nextBlockedNode ? READ_STATUS.error : READ_STATUS.live,
                        },
                        {
                            label: 'Open next planned',
                            detail: nextPlannedNode ? nextPlannedNode.notes : 'No planned node remains.',
                            onClick: () => scrollToNode(nextPlannedNode?.id),
                            disabled: !nextPlannedNode,
                            status: nextPlannedNode ? READ_STATUS.partial : READ_STATUS.live,
                        },
                        {
                            label: 'Marketplace gates',
                            detail: `${MARKETPLACE_CHECKLIST_ITEMS.length} required gates before new venue adapters.`,
                            onClick: () => scrollToNode('marketplace-checklist'),
                            status: READ_STATUS.configured,
                        },
                        {
                            label: 'Critical chains',
                            detail: `${CRITICAL_CHAINS.length} dependency chains define the current operating order.`,
                            onClick: () => document.getElementById('critical-chains')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                            status: READ_STATUS.configured,
                        },
                    ]}
                />
                <LedgerPanel
                    title="Roadmap ledger"
                    caption="Current blockers and planned decisions, separate from the full dependency diagram."
                    rows={[
                        ...blockedNodes.slice(0, 4).map((node) => ({
                            label: node.title,
                            value: node.status,
                            status: READ_STATUS.error,
                            detail: node.blockedBy?.length ? `Blocked by ${node.blockedBy.map((id) => NODE_BY_ID[id]?.title ?? id).join(', ')}.` : node.notes,
                        })),
                        ...plannedNodes.slice(0, Math.max(0, 6 - Math.min(blockedNodes.length, 4))).map((node) => ({
                            label: node.title,
                            value: node.status,
                            status: READ_STATUS.partial,
                            detail: node.blockedBy?.length ? `Depends on ${node.blockedBy.map((id) => NODE_BY_ID[id]?.title ?? id).join(', ')}.` : node.notes,
                        })),
                    ]}
                />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Done" value={`${completed} / ${total}`} status={READ_STATUS.live} sourceLabel="roadmap" accent="green" />
                <MetricCard label="Blocked" value={blocked.toString()} status={blocked ? READ_STATUS.error : READ_STATUS.live} sourceLabel="readiness" accent={blocked ? 'red' : 'green'} />
                <MetricCard label="Marketplace gates" value={MARKETPLACE_CHECKLIST_ITEMS.length.toString()} status={READ_STATUS.configured} sourceLabel="checklist" />
                <MetricCard label="In progress" value={inProgressNodes.length.toString()} status={inProgressNodes.length ? READ_STATUS.partial : READ_STATUS.unavailable} sourceLabel="operator queue" detail={inProgressNodes.length ? inProgressNodes.map((node) => node.title).join(', ') : 'No in-progress roadmap node is marked.'} />
            </div>

            <section id="critical-chains" className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-white">Blocker chains</h2>
                        <p className="mt-1 text-sm leading-6 text-gray-400">These are the dependency paths most likely to block shipping work.</p>
                    </div>
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-gray-500">Click a node to jump</div>
                </div>
                <div className="flex max-w-full gap-3 overflow-x-auto pb-2">
                    {CRITICAL_CHAINS.map((chain) => (
                        <CriticalChain key={chain.join('|')} chain={chain} />
                    ))}
                </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-5">
                    <h2 className="text-lg font-bold text-white">Horizontal roadmap diagram</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-400">
                        Work develops from left to right. A red blocker box means the item should not advance until every listed dependency is resolved.
                    </p>
                </div>

                <div className="max-w-full overflow-x-auto pb-4">
                    <div className="flex min-w-[1800px] items-stretch gap-4">
                        {STAGES.map((stage, index) => {
                            const nodes = ROADMAP_NODES.filter((node) => node.stage === stage.id);
                            return (
                                <div key={stage.id} className="flex min-w-[285px] flex-1 items-stretch gap-4">
                                    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/20">
                                        <div className="border-b border-white/10 p-4">
                                            <div className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                                                Step {index + 1}
                                            </div>
                                            <h3 className="mt-1 text-base font-bold text-white">{stage.title}</h3>
                                            <p className="mt-1 text-[0.78rem] leading-5 text-gray-500">{stage.summary}</p>
                                        </div>
                                        <div className="grid flex-1 content-start gap-3 p-3">
                                            {nodes.map((node) => (
                                                <DiagramNodeCard key={node.id} node={node} />
                                            ))}
                                        </div>
                                    </div>
                                    {index < STAGES.length - 1 ? (
                                        <div className="hidden w-7 shrink-0 items-center justify-center xl:flex" aria-hidden="true">
                                            <div className="h-px w-full bg-[var(--border-strong)]" />
                                            <div className="-ml-1 h-2 w-2 rotate-45 border-r border-t border-[var(--border-strong)]" />
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
