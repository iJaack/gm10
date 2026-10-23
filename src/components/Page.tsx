import type { ReactNode } from 'react';

type PageProps = {
    children: ReactNode;
    className?: string;
    containerClassName?: string;
};

export default function Page({ children, className, containerClassName }: PageProps) {
    return (
        <div className={`px-4 pb-16 pt-24 md:pt-28 ${className ?? ''}`}>
            <div className={containerClassName ?? 'site-container'}>{children}</div>
        </div>
    );
}
