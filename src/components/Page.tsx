import type { ReactNode } from 'react';

type PageProps = {
    children: ReactNode;
    className?: string;
    containerClassName?: string;
};

export default function Page({ children, className, containerClassName }: PageProps) {
    return (
        <div className={`px-4 pb-16 pt-24 text-[var(--text-main)] md:pt-28 ${className ?? ''}`}>
            <div className={containerClassName ?? 'mx-auto max-w-[min(1360px,calc(100vw-48px))]'}>{children}</div>
        </div>
    );
}
