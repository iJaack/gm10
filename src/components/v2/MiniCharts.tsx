/**
 * MiniCharts — a small library of inline SVG data-viz components used on the
 * Holders page (and elsewhere).
 *
 * Every chart includes:
 *   - A visible caption explaining what the chart is measuring
 *   - A legend / labels where needed
 *   - `aria-hidden` on the pure-decorative SVG shapes
 *   - A textual fallback for assistive tech via a `role="img"` wrapper + aria-label
 *
 * Charts are colour-coded with design tokens only (no hardcoded hex beyond
 * decorative palette), so they inherit light/dark mode automatically.
 */

import type { ReactNode } from 'react';

type Slice = { label: string; value: number; color: string };

/**
 * Donut chart. Shows proportional slices with a centered total label + an
 * optional right-side legend row. Pure SVG, no animation.
 */
export function DonutChart({
    slices,
    totalLabel,
    totalValue,
    size = 180,
    strokeWidth = 22,
    caption,
    ariaLabel,
}: {
    slices: Slice[];
    totalLabel?: string;
    totalValue?: string;
    size?: number;
    strokeWidth?: number;
    caption?: string;
    ariaLabel?: string;
}) {
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    const R = (size - strokeWidth) / 2;
    const r = R - strokeWidth;
    const cx = size / 2;
    const cy = size / 2;
    let angle = -Math.PI / 2;

    const paths = slices.map((slice) => {
        const sliceAngle = (slice.value / total) * Math.PI * 2;
        const a0 = angle;
        const a1 = angle + sliceAngle;
        angle = a1;
        const x0 = cx + R * Math.cos(a0);
        const y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1);
        const y1 = cy + R * Math.sin(a1);
        const xi0 = cx + r * Math.cos(a0);
        const yi0 = cy + r * Math.sin(a0);
        const xi1 = cx + r * Math.cos(a1);
        const yi1 = cy + r * Math.sin(a1);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const d = [
            `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
            `A ${R} ${R} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
            `L ${xi1.toFixed(2)} ${yi1.toFixed(2)}`,
            `A ${r} ${r} 0 ${largeArc} 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)}`,
            'Z',
        ].join(' ');
        return { d, color: slice.color };
    });

    return (
        <figure className="flex flex-col items-center gap-3" role="img" aria-label={ariaLabel}>
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
                {paths.map((p, i) => (
                    <path key={i} d={p.d} fill={p.color} stroke="var(--bg-primary)" strokeWidth="1.2" />
                ))}
                {totalLabel ? (
                    <text
                        x={cx}
                        y={cy - 6}
                        textAnchor="middle"
                        className="fill-[var(--ink-muted)]"
                        style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}
                    >
                        {totalLabel}
                    </text>
                ) : null}
                {totalValue ? (
                    <text
                        x={cx}
                        y={cy + 12}
                        textAnchor="middle"
                        className="fill-[var(--text-primary)]"
                        style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}
                    >
                        {totalValue}
                    </text>
                ) : null}
            </svg>
            {caption ? (
                <figcaption className="text-[0.72rem] leading-[1.5] text-[var(--ink-faint)] text-center max-w-[28ch]">
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    );
}

/**
 * Horizontal segmented bar. Same inputs as the donut but flattened. Useful when
 * we want to show a split inline without taking a full square of space.
 */
export function SegmentedBar({
    slices,
    height = 14,
    caption,
    ariaLabel,
}: {
    slices: Slice[];
    height?: number;
    caption?: string;
    ariaLabel?: string;
}) {
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    return (
        <figure className="flex flex-col gap-2" role="img" aria-label={ariaLabel}>
            <div
                className="flex w-full overflow-hidden rounded-full"
                style={{ height, background: 'var(--bg-tertiary)' }}
            >
                {slices.map((s, i) => (
                    <div
                        key={i}
                        style={{
                            width: `${(s.value / total) * 100}%`,
                            background: s.color,
                            borderRight: i < slices.length - 1 ? '1px solid var(--bg-primary)' : undefined,
                        }}
                        aria-hidden
                    />
                ))}
            </div>
            {caption ? (
                <figcaption className="text-[0.72rem] leading-[1.5] text-[var(--ink-faint)]">
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    );
}

/**
 * A row of vertical bars for quick value comparison. Each bar is normalized so
 * the tallest fills the full height. Bar value + label render below each bar.
 */
export function ComparisonBars({
    bars,
    height = 140,
    caption,
    ariaLabel,
}: {
    bars: { label: string; value: number; display: string; color?: string; hint?: string; hintTone?: 'up' | 'down' | 'neutral' }[];
    height?: number;
    caption?: string;
    ariaLabel?: string;
}) {
    const max = Math.max(...bars.map((b) => b.value), 1);
    return (
        <figure className="flex flex-col gap-3" role="img" aria-label={ariaLabel}>
            <div className="flex items-end gap-6" style={{ height }}>
                {bars.map((b, i) => {
                    const h = (b.value / max) * (height - 24);
                    return (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                            <div
                                className="w-full rounded-t-md transition-all"
                                style={{
                                    height: `${Math.max(2, h)}px`,
                                    background: b.color ?? 'var(--accent)',
                                }}
                                aria-hidden
                            />
                        </div>
                    );
                })}
            </div>
            <div className="flex items-start gap-6">
                {bars.map((b, i) => {
                    const hintClass =
                        b.hintTone === 'up' ? 'v2-up'
                            : b.hintTone === 'down' ? 'v2-down'
                                : 'text-[var(--ink-faint)]';
                    return (
                        <div key={i} className="flex flex-1 flex-col items-center text-center min-w-0">
                            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                                {b.label}
                            </div>
                            <div className="mt-1 text-[0.95rem] font-bold tabular-nums text-[var(--text-primary)]">
                                {b.display}
                            </div>
                            {b.hint ? (
                                <div className={`mt-0.5 text-[0.68rem] ${hintClass}`}>{b.hint}</div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
            {caption ? (
                <figcaption className="text-[0.72rem] leading-[1.5] text-[var(--ink-faint)]">
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    );
}

/**
 * Wrapper that pairs a chart with a title + description. Meant to be rendered
 * inline inside a stat group so the chart has clear context.
 */
export function ChartCard({
    title,
    description,
    children,
    aside,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    aside?: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
            <header className="flex items-baseline justify-between gap-4">
                <div>
                    <h4 className="text-[0.82rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                        {title}
                    </h4>
                    {description ? (
                        <p className="mt-1 max-w-[68ch] text-[0.78rem] leading-[1.55] text-[var(--ink-muted)]">
                            {description}
                        </p>
                    ) : null}
                </div>
                {aside}
            </header>
            <div className="mt-5">{children}</div>
        </section>
    );
}

/**
 * Legend list — colored dot + label + value + percent. Sits next to DonutChart
 * when you want the pie + legend side-by-side.
 */
export function ChartLegend({
    items,
}: {
    items: { color: string; label: string; value: string; pct?: number }[];
}) {
    return (
        <ul className="flex flex-col gap-1">
            {items.map((it) => (
                <li
                    key={it.label}
                    className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-2 last:border-b-0 min-w-0"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: it.color }}
                            aria-hidden
                        />
                        <span className="text-[0.82rem] text-[var(--text-primary)] truncate">{it.label}</span>
                    </div>
                    <div className="flex items-baseline gap-3 shrink-0 tabular-nums">
                        <span className="text-[0.82rem] font-semibold text-[var(--text-primary)]">{it.value}</span>
                        {it.pct !== undefined ? (
                            <span className="text-[0.7rem] text-[var(--ink-faint)]">
                                {it.pct.toFixed(1)}%
                            </span>
                        ) : null}
                    </div>
                </li>
            ))}
        </ul>
    );
}
