import type { ReactNode } from 'react';
import { READ_STATUS } from '../lib/adminMetrics.js';
import { STATUS_DOT_STYLES, STATUS_STYLES, statusLabel } from '../lib/adminStatus.js';

type ReadStatus = typeof READ_STATUS[keyof typeof READ_STATUS];

export function StatusChip({ status, children }: { status: ReadStatus; children?: ReactNode }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] ${STATUS_STYLES[status]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_STYLES[status]}`} />
            {children ?? statusLabel(status)}
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
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
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
        <div className={`rounded-lg border border-white/10 border-t-2 ${accentClass} bg-white/[0.045] p-4`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="label-font text-[0.58rem] text-gray-500">{label}</div>
                    <div className="mt-2 break-words text-xl font-bold leading-tight text-white">{value}</div>
                </div>
                {sourceLabel ? <StatusChip status={status}>{sourceLabel}</StatusChip> : null}
            </div>
            {detail ? <div className="mt-3 text-xs leading-5 text-gray-400">{detail}</div> : null}
        </div>
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
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.045]">
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
