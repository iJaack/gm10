import type { ReactNode } from 'react';

type PageProps = {
    children: ReactNode;
    className?: string;
    containerClassName?: string;
};

export default function Page({ children, className, containerClassName }: PageProps) {
    return (
        <div className={`min-h-screen pt-28 px-4 pb-20 bg-transparent text-[var(--text-main)] ${className ?? ''}`}>
            <div className={containerClassName ?? 'max-w-6xl mx-auto'}>{children}</div>
        </div>
    );
}
