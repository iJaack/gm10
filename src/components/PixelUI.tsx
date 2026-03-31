import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Tone = 'base' | 'live' | 'warning' | 'profit' | 'loss';

const panelToneClass: Record<Tone, string> = {
    base: 'pixel-window',
    live: 'pixel-window pixel-window-live',
    warning: 'pixel-window pixel-window-warning',
    profit: 'pixel-window pixel-window-profit',
    loss: 'pixel-window pixel-window-loss',
};

const labelToneClass: Record<Tone, string> = {
    base: 'pixel-label',
    live: 'pixel-label pixel-label-live',
    warning: 'pixel-label pixel-label-warning',
    profit: 'pixel-label pixel-label-profit',
    loss: 'pixel-label pixel-label-loss',
};

const railToneClass: Record<Tone, string> = {
    base: '',
    live: 'pixel-stat-rail-item-live',
    warning: 'pixel-stat-rail-item-warning',
    profit: 'pixel-stat-rail-item-profit',
    loss: 'pixel-stat-rail-item-loss',
};

export function PixelPanel({
    children,
    className = '',
    tone = 'base',
}: {
    children: ReactNode;
    className?: string;
    tone?: Tone;
}) {
    return <div className={`${panelToneClass[tone]} ${className}`.trim()}>{children}</div>;
}

export function PixelSectionFrame({
    children,
    className = '',
    ...props
}: {
    children: ReactNode;
    className?: string;
} & ComponentPropsWithoutRef<'section'>) {
    return (
        <section {...props} className={`pixel-section ${className}`.trim()}>
            {children}
        </section>
    );
}

export function PixelLabel({
    children,
    tone = 'base',
    className = '',
}: {
    children: ReactNode;
    tone?: Tone;
    className?: string;
}) {
    return <span className={`${labelToneClass[tone]} ${className}`.trim()}>{children}</span>;
}

export function PixelDivider({
    label,
    className = '',
}: {
    label: string;
    className?: string;
}) {
    return (
        <div className={`pixel-divider ${className}`.trim()}>
            <span className="pixel-divider-label">{label}</span>
        </div>
    );
}

export function PixelMeter({
    value,
    className = '',
    tone = 'live',
}: {
    value: number;
    className?: string;
    tone?: Extract<Tone, 'live' | 'warning' | 'profit' | 'loss'>;
}) {
    const bounded = Math.max(0, Math.min(100, value));

    return (
        <div className={`pixel-meter ${className}`.trim()} aria-hidden>
            <div
                className={`pixel-meter-fill pixel-meter-fill-${tone}`}
                style={{ width: `${bounded}%` }}
            />
        </div>
    );
}

export function PixelStatRail({
    items,
    className = '',
}: {
    items: {
        label: string;
        value: ReactNode;
        detail?: ReactNode;
        tone?: Tone;
    }[];
    className?: string;
}) {
    return (
        <div className={`pixel-stat-rail ${className}`.trim()}>
            {items.map((item) => (
                <div
                    key={item.label}
                    className={`pixel-stat-rail-item ${railToneClass[item.tone ?? 'base']}`.trim()}
                >
                    <div className="pixel-stat-label">{item.label}</div>
                    <div className="pixel-stat-value">{item.value}</div>
                    {item.detail ? <div className="pixel-stat-detail">{item.detail}</div> : null}
                </div>
            ))}
        </div>
    );
}

export function PixelLedgerRow({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return <div className={`pixel-ledger-row ${className}`.trim()}>{children}</div>;
}

export function PixelMediaFrame({
    children,
    eyebrow,
    title,
    caption,
    badge,
    className = '',
}: {
    children: ReactNode;
    eyebrow?: string;
    title?: string;
    caption?: string;
    badge?: ReactNode;
    className?: string;
}) {
    return (
        <figure className={`pixel-media-frame ${className}`.trim()}>
            {(eyebrow || badge) ? (
                <div className="pixel-media-header">
                    {eyebrow ? <div className="pixel-media-eyebrow">{eyebrow}</div> : <span />}
                    {badge}
                </div>
            ) : null}
            <div className="pixel-media-body">{children}</div>
            {(title || caption) ? (
                <figcaption className="pixel-media-caption">
                    <div>
                        {title ? <div className="pixel-media-title">{title}</div> : null}
                        {caption ? <div className="pixel-media-copy">{caption}</div> : null}
                    </div>
                </figcaption>
            ) : null}
        </figure>
    );
}

export function PixelMenuLink({
    to,
    children,
    active = false,
    className = '',
    ...props
}: {
    to: string;
    children: ReactNode;
    active?: boolean;
    className?: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, 'to' | 'className'>) {
    return (
        <Link
            to={to}
            {...props}
            className={`pixel-menu-link ${active ? 'pixel-menu-link-active' : ''} ${className}`.trim()}
        >
            <span className="pixel-menu-cursor" aria-hidden>↗</span>
            <span>{children}</span>
        </Link>
    );
}

export function PixelMessageBox({
    title,
    body,
    className = '',
}: {
    title?: string;
    body: string;
    className?: string;
}) {
    return (
        <div className={`pixel-message-box ${className}`.trim()}>
            {title ? <div className="pixel-message-title">{title}</div> : null}
            <p className="pixel-message-body">{body}</p>
        </div>
    );
}

export function PixelExternalLink({
    children,
    className = '',
    ...props
}: ComponentPropsWithoutRef<'a'>) {
    return (
        <a
            {...props}
            className={`pixel-menu-link pixel-external-link ${className}`.trim()}
        >
            <span className="pixel-menu-cursor" aria-hidden>↗</span>
            <span>{children}</span>
        </a>
    );
}
