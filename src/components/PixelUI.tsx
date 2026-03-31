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
            <span className="pixel-menu-cursor" aria-hidden>
                ►
            </span>
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
            <span className="pixel-menu-cursor" aria-hidden>
                ►
            </span>
            <span>{children}</span>
        </a>
    );
}
