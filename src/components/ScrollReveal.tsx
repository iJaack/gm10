import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';

type ScrollRevealProps<T extends ElementType = 'div'> = {
    children: ReactNode;
    delay?: 0 | 1 | 2 | 3 | 4 | 5;
    as?: T;
    className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'children' | 'className'>;

export function ScrollReveal<T extends ElementType = 'div'>({
    children,
    delay = 0,
    as,
    className = '',
    ...props
}: ScrollRevealProps<T>) {
    const Tag = (as ?? 'div') as ElementType;
    const { ref, isVisible } = useScrollReveal();

    const delayClass = delay > 0 ? `scroll-delay-${delay}` : '';
    const visibleClass = isVisible ? 'is-visible' : '';

    return (
        <Tag
            ref={ref}
            className={`scroll-fade-up ${delayClass} ${visibleClass} ${className}`.trim()}
            {...props}
        >
            {children}
        </Tag>
    );
}
