import type { ReactNode } from 'react';

type PageProps = {
    children: ReactNode;
    className?: string;
    containerClassName?: string;
};

export default function Page({ children, className, containerClassName }: PageProps) {
    return (
        <div className={`min-h-screen pt-32 px-4 pb-20 bg-[#0a0f1c] text-white ${className ?? ''}`}>
            <div className={containerClassName ?? 'max-w-6xl mx-auto'}>{children}</div>
        </div>
    );
}

