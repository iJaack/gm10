import type { ReactNode } from 'react';
import { READ_STATUS } from '../lib/adminMetrics.js';
import { STATUS_DOT_STYLES, STATUS_STYLES, statusLabel } from '../lib/adminStatus.js';

type ReadStatus = typeof READ_STATUS[keyof typeof READ_STATUS];
type LedgerRow = { label: string; value: ReactNode; status: ReadStatus; detail?: ReactNode };
type OperatorAction = {
    label: string;
    detail: string;
    onClick?: () => void;
    primary?: boolean;
    disabled?: boolean;
    status?: ReadStatus;
};

export type { ReadStatus };

export function liveStatus(value: unknown) {
    return value !== undefined && value !== null ? READ_STATUS.live : READ_STATUS.unavailable;
}

export function StatusChip({ status, children }: { status: ReadStatus; children?: ReactNode }) {
    return (
        <span className={`inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] ${STATUS_STYLES[status]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_STYLES[status]}`} />
            <span className="min-w-0 whitespace-nowrap">{children ?? statusLabel(status)}</span>
        </span>
    );
}

export function PageHeader({
    title,
    eyebrow,
    description,
    actions,
}: {
    title: string;
    eyebrow?: string;
    description: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
                {eyebrow ? <div className="label-font mb-2 text-[0.62rem]">{eyebrow}</div> : null}
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
    );
}

export function StatusStrip({ items }: { items: Array<{ label: string; status: ReadStatus }> }) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <StatusChip key={`${item.label}-${item.status}`} status={item.status}>{item.label}</StatusChip>
            ))}
        </div>
    );
}

export function MetricCard({
    label,
    value,
    detail,
    status = READ_STATUS.unavailable,
    sourceLabel,
    accent,
}: {
    label: string;
    value: ReactNode;
    detail?: ReactNode;
    status?: ReadStatus;
    sourceLabel?: string;
    accent?: 'blue' | 'yellow' | 'green' | 'red';
}) {
    const accentClass = accent === 'yellow'
        ? 'border-t-amber-300/70'
        : accent === 'green'
            ? 'border-t-emerald-300/70'
            : accent === 'red'
                ? 'border-t-red-300/70'
                : 'border-t-sky-300/70';

    return (
        <div className={`min-w-0 rounded-lg border border-white/10 border-t-2 ${accentClass} bg-white/[0.045] p-4`}>
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div className="min-w-0">
                    <div className="label-font text-[0.58rem] text-gray-500">{label}</div>
                    <div className="mt-2 min-w-0 break-words text-xl font-bold leading-tight text-white [overflow-wrap:anywhere]">{value}</div>
                </div>
                {sourceLabel ? <StatusChip status={status}>{sourceLabel}</StatusChip> : null}
            </div>
            {detail ? <div className="mt-3 text-xs leading-5 text-gray-400">{detail}</div> : null}
        </div>
    );
}

export function LedgerPanel({
    title,
    caption,
    rows,
}: {
    title: string;
    caption: string;
    rows: LedgerRow[];
}) {
    return (
        <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{caption}</p>
                </div>
            </div>
            <div className="grid gap-2">
                {rows.map((row) => (
                    <div key={row.label} className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-200">{row.label}</div>
                            {row.detail ? <div className="mt-1 break-words text-[0.7rem] leading-4 text-gray-500 [overflow-wrap:anywhere]">{row.detail}</div> : null}
                        </div>
                        <div className="min-w-0 break-words font-mono text-sm tabular-nums text-white [overflow-wrap:anywhere]">{row.value}</div>
                        <StatusChip status={row.status} />
                    </div>
                ))}
            </div>
        </section>
    );
}

export function OperatorActionsPanel({
    eyebrow = 'Next actions',
    title = 'Operator shortcuts',
    actions,
}: {
    eyebrow?: string;
    title?: string;
    actions: OperatorAction[];
}) {
    return (
        <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-3">
                <div className="label-font text-[0.58rem] text-gray-500">{eyebrow}</div>
                <h2 className="mt-2 text-base font-semibold text-white">{title}</h2>
            </div>
            <div className="grid gap-2">
                {actions.map((action) => {
                    const isInteractive = Boolean(action.onClick);
                    return (
                        <button
                            key={action.label}
                            type="button"
                            onClick={action.onClick}
                            disabled={!isInteractive || action.disabled}
                            className={`group grid min-w-0 gap-1 rounded-md border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/60 disabled:cursor-default disabled:opacity-70 ${
                                action.primary
                                    ? 'border-[var(--accent)]/60 bg-[var(--accent)] text-[#0b0a14] enabled:hover:bg-[#ffd75b]'
                                    : 'border-white/10 bg-black/20 text-white enabled:hover:border-white/20 enabled:hover:bg-white/[0.06]'
                            }`}
                        >
                            <span className="flex min-w-0 items-center justify-between gap-3 text-sm font-semibold">
                                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{action.label}</span>
                                {action.status ? (
                                    <StatusChip status={action.status} />
                                ) : isInteractive ? (
                                    <span aria-hidden="true" className="text-base leading-none transition-transform group-hover:translate-x-0.5">{'->'}</span>
                                ) : null}
                            </span>
                            <span className={`min-w-0 break-words text-xs leading-5 [overflow-wrap:anywhere] ${action.primary ? 'text-black/65' : 'text-gray-500'}`}>{action.detail}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

export function ReadHealthPanel({
    title = 'Read health',
    rows,
}: {
    title?: string;
    rows: Array<{ label: string; value: string; status: ReadStatus; detail?: string }>;
}) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">{title}</h2>
                <span className="text-xs text-gray-500">{rows.length} checks</span>
            </div>
            <div className="grid gap-2">
                {rows.map((row) => (
                    <div key={row.label} className="grid gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-200">{row.label}</div>
                            <div className="mt-1 break-all text-[0.7rem] leading-4 text-gray-500">{row.detail ?? row.value}</div>
                        </div>
                        <StatusChip status={row.status}>{row.value}</StatusChip>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ReconciliationTable({
    rows,
}: {
    rows: Array<{ metric: string; live: string; stored: string; status: ReadStatus }>;
}) {
    return (
        <div className="min-w-0 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.045]">
            <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-white/10 bg-black/20 text-gray-500">
                    <tr>
                        <th className="px-4 py-3 font-semibold">Metric</th>
                        <th className="px-4 py-3 font-semibold">Live / source</th>
                        <th className="px-4 py-3 font-semibold">Stored accounting</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {rows.map((row) => (
                        <tr key={row.metric}>
                            <td className="px-4 py-3 font-semibold text-gray-200">{row.metric}</td>
                            <td className="px-4 py-3 text-gray-400">{row.live}</td>
                            <td className="px-4 py-3 text-gray-400">{row.stored}</td>
                            <td className="px-4 py-3"><StatusChip status={row.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function WorkflowTimeline({
    steps,
}: {
    steps: Array<{ label: string; status: ReadStatus; detail?: string }>;
}) {
    return (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
                <div key={`${step.label}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-gray-500">Step {index + 1}</span>
                        <StatusChip status={step.status} />
                    </div>
                    <div className="text-sm font-semibold text-white">{step.label}</div>
                    {step.detail ? <div className="mt-1 text-xs leading-5 text-gray-400">{step.detail}</div> : null}
                </div>
            ))}
        </div>
    );
}

export function ActionReadinessPanel({
    title,
    rows,
}: {
    title: string;
    rows: Array<{ label: string; status: ReadStatus; detail: string }>;
}) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <div className="mt-3 grid gap-2">
                {rows.map((row) => (
                    <div key={row.label} className="flex flex-col gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-xs font-semibold text-gray-200">{row.label}</div>
                            <div className="mt-1 text-[0.7rem] leading-4 text-gray-500">{row.detail}</div>
                        </div>
                        <StatusChip status={row.status} />
                    </div>
                ))}
            </div>
        </div>
    );
}
