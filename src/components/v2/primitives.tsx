/**
 * v2 Bloomberg × Art Gallery design primitives.
 *
 * Typography voices:
 *   <Display>    — massive editorial serif. H1 only.
 *   <DisplayItalic> — italic serif for pull quotes / accents.
 *   <DataMono>   — monospace tabular number / address / timestamp.
 *   <Label>      — small-caps mono label, tracked, muted.
 *   <Caption>    — inline mono, slightly larger than Label.
 *
 * Structure:
 *   <Hairline>   — full-width 1px rule.
 *   <Pulse>      — live indicator dot (respects reduced-motion).
 *
 * Data displays:
 *   <LedgerRow>  — bank-statement row with hairline bottom.
 *   <Ticker>     — horizontal auto-scrolling marquee.
 *   <Sparkline>  — tiny inline SVG trend line.
 *   <HoloShine>  — card holographic shine layer (cursor-tracked).
 */

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

/* ── Typography ─────────────────────────────────────────────── */

type DisplayProps = {
    children: ReactNode;
    as?: 'h1' | 'h2' | 'h3' | 'div' | 'p' | 'span';
    className?: string;
    style?: CSSProperties;
};

export function Display({ children, as: Tag = 'h1', className = '', style }: DisplayProps) {
    return (
        <Tag className={`v2-display ${className}`.trim()} style={style}>
            {children}
        </Tag>
    );
}

export function DisplayItalic({ children, as: Tag = 'span', className = '', style }: DisplayProps) {
    return (
        <Tag className={`v2-display-italic ${className}`.trim()} style={style}>
            {children}
        </Tag>
    );
}

type TextProps = {
    children: ReactNode;
    as?: 'span' | 'div' | 'p' | 'time' | 'code';
    className?: string;
    style?: CSSProperties;
    title?: string;
};

export function DataMono({ children, as: Tag = 'span', className = '', style, title }: TextProps) {
    return (
        <Tag className={`v2-mono ${className}`.trim()} style={style} title={title}>
            {children}
        </Tag>
    );
}

export function Label({ children, as: Tag = 'div', className = '', style }: TextProps) {
    return (
        <Tag className={`v2-label ${className}`.trim()} style={style}>
            {children}
        </Tag>
    );
}

/**
 * SectionLabel — eyebrow for prose sections. Production `label-font` style:
 * small caps, tracked, gold accent.
 */
export function SectionLabel({ children, as: Tag = 'div', className = '', style }: TextProps) {
    return (
        <Tag
            className={`label-font ${className}`.trim()}
            style={style}
        >
            {children}
        </Tag>
    );
}

export function Caption({ children, as: Tag = 'span', className = '', style }: TextProps) {
    return (
        <Tag className={`v2-caption ${className}`.trim()} style={style}>
            {children}
        </Tag>
    );
}

/* ── Structure ──────────────────────────────────────────────── */

export function Hairline({ strong = false, className = '' }: { strong?: boolean; className?: string }) {
    return <hr className={`${strong ? 'v2-rule-strong' : 'v2-rule'} ${className}`.trim()} />;
}

export function Pulse({ color, className = '' }: { color?: string; className?: string }) {
    const style: CSSProperties = color ? { background: color } : {};
    return <span className={`v2-pulse ${className}`.trim()} style={style} aria-hidden />;
}

/* ── Ledger ─────────────────────────────────────────────────── */

type LedgerRowProps = {
    cells: ReactNode[];
    /** grid template, defaults to equal columns */
    columns?: string;
    className?: string;
    align?: 'baseline' | 'center';
    /** Per-column horizontal alignment. Default 'left' for first column, 'left' for others unless overridden. */
    cellAlign?: ('left' | 'right' | 'center')[];
};

export function LedgerRow({ cells, columns, className = '', align = 'baseline', cellAlign }: LedgerRowProps) {
    const gridTemplateColumns = columns ?? `repeat(${cells.length}, minmax(0, 1fr))`;
    return (
        <div
            className={`grid gap-4 border-b border-[var(--rule)] py-3 items-${align} ${className}`.trim()}
            style={{ gridTemplateColumns }}
        >
            {cells.map((cell, i) => {
                const alignClass = cellAlign?.[i] === 'right'
                    ? 'text-right'
                    : cellAlign?.[i] === 'center'
                        ? 'text-center'
                        : '';
                return (
                    <div key={i} className={`${i === 0 ? 'v2-caption' : 'v2-mono'} ${alignClass}`.trim()}>
                        {cell}
                    </div>
                );
            })}
        </div>
    );
}

/* ── Ticker ─────────────────────────────────────────────────── */

type TickerItem = {
    id: string;
    label?: ReactNode;
    value: ReactNode;
    tone?: 'default' | 'up' | 'down' | 'live';
};

export function Ticker({
    items,
    speed = 40,
    className = '',
}: {
    items: TickerItem[];
    /** seconds for one full loop */
    speed?: number;
    className?: string;
}) {
    // duplicate items so the marquee loops smoothly
    const loop = [...items, ...items];
    return (
        <div
            className={`v2-ticker-outer relative overflow-hidden border-b border-[var(--rule)] ${className}`.trim()}
            onMouseEnter={(e) => {
                const el = e.currentTarget.querySelector<HTMLElement>('.v2-ticker-track');
                if (el) el.style.animationPlayState = 'paused';
            }}
            onMouseLeave={(e) => {
                const el = e.currentTarget.querySelector<HTMLElement>('.v2-ticker-track');
                if (el) el.style.animationPlayState = 'running';
            }}
        >
            <div
                className="v2-ticker-track flex whitespace-nowrap"
                style={{
                    animation: `v2-ticker ${speed}s linear infinite`,
                }}
            >
                {loop.map((item, i) => (
                    <span
                        key={`${item.id}-${i}`}
                        className="v2-mono inline-flex items-center gap-2 px-4 py-1.5 text-[0.72rem] tracking-[0.04em]"
                    >
                        {item.tone === 'live' ? <Pulse /> : null}
                        {item.label ? (
                            <span className="text-[var(--ink-faint)] uppercase">{item.label}</span>
                        ) : null}
                        <span
                            className={
                                item.tone === 'up'
                                    ? 'v2-up'
                                    : item.tone === 'down'
                                        ? 'v2-down'
                                        : 'text-[var(--text-primary)]'
                            }
                        >
                            {item.value}
                        </span>
                        <span className="text-[var(--ink-faint)] px-2">│</span>
                    </span>
                ))}
            </div>
            <style>{`
                @keyframes v2-ticker {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-50%); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .v2-ticker-track { animation: none !important; }
                }
            `}</style>
        </div>
    );
}

/* ── Sparkline ──────────────────────────────────────────────── */

export function Sparkline({
    values,
    width = 60,
    height = 16,
    color,
    className = '',
}: {
    values: number[];
    width?: number;
    height?: number;
    color?: string;
    className?: string;
}) {
    if (values.length < 2) {
        return <svg width={width} height={height} className={className} aria-hidden />;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = width / (values.length - 1);
    const points = values
        .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
        .join(' ');
    const isUp = values[values.length - 1] >= values[0];
    const stroke = color ?? (isUp ? 'var(--data-up)' : 'var(--data-down)');
    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            aria-hidden
        >
            <polyline
                fill="none"
                stroke={stroke}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
}

/* ── HoloShine ──────────────────────────────────────────────── */

/**
 * Pokémon-holo-inspired shine overlay. Renders a cursor-tracking gradient
 * layer over its wrapped content. Wrap an image with <HoloShine>...</HoloShine>.
 * The shine only activates on hover and respects reduced-motion.
 */
export function HoloShine({ children, className = '' }: { children: ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [pos, setPos] = useState({ x: 50, y: 50 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onMove = (e: MouseEvent) => {
            const r = el.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width) * 100;
            const y = ((e.clientY - r.top) / r.height) * 100;
            setPos({ x, y });
        };
        el.addEventListener('mousemove', onMove);
        return () => el.removeEventListener('mousemove', onMove);
    }, []);

    const gradient = active
        ? `radial-gradient(circle at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.18) 0%, rgba(251,191,36,0.08) 25%, rgba(79,168,224,0.06) 50%, transparent 70%)`
        : 'none';

    return (
        <div
            ref={ref}
            className={`relative ${className}`.trim()}
            onMouseEnter={() => setActive(true)}
            onMouseLeave={() => setActive(false)}
            style={{ ['--mx' as never]: `${pos.x}%`, ['--my' as never]: `${pos.y}%` }}
        >
            {children}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                style={{
                    background: gradient,
                    opacity: active ? 1 : 0,
                    mixBlendMode: 'screen',
                }}
            />
        </div>
    );
}

/* ── Price flash hook ──────────────────────────────────────────
 * Attach to a numeric value — briefly tints background when value changes.
 * Usage: const className = usePriceFlash(price);
 */
export function usePriceFlash(value: number | string | null | undefined) {
    const [className, setClassName] = useState('');
    const prev = useRef<number | null>(null);
    useEffect(() => {
        const current = typeof value === 'string' ? parseFloat(value) : value;
        if (current == null || isNaN(current as number)) return;
        if (prev.current != null && current !== prev.current) {
            setClassName(current > prev.current ? 'v2-flash-up' : 'v2-flash-down');
            const t = setTimeout(() => setClassName(''), 400);
            prev.current = current as number;
            return () => clearTimeout(t);
        }
        prev.current = current as number;
    }, [value]);
    return className;
}
