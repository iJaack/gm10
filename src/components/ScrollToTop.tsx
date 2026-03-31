import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to top on every route change.
 * Fixes footer link navigation feeling broken on mobile (page stays scrolled to bottom).
 */
export default function ScrollToTop() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (hash) {
            window.requestAnimationFrame(() => {
                const target = document.querySelector(hash);
                if (target instanceof HTMLElement) {
                    const navOffset = 112;
                    const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
                    window.scrollTo({ top, behavior: 'instant' });
                }
            });
            return;
        }

        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [hash, pathname]);

    return null;
}
