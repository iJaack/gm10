import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
    threshold?: number;
    rootMargin?: string;
}

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
    const { threshold = 0.15, rootMargin = '0px 0px -60px 0px' } = options;
    const ref = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mql.matches) {
            setIsVisible(true);
        }

        const onChange = () => {
            if (mql.matches) setIsVisible(true);
        };
        mql.addEventListener('change', onChange);

        const element = ref.current;
        if (!element || mql.matches) {
            return () => mql.removeEventListener('change', onChange);
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);
        return () => {
            mql.removeEventListener('change', onChange);
            observer.disconnect();
        };
    }, [threshold, rootMargin]);

    return { ref, isVisible };
}
