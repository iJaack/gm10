import { useEffect, useState } from 'react';
import type { CourtyardProfileNav } from '../data/courtyardNav';

const PROFILE_URL = 'https://courtyard.io/user/gm10xyz/collection';
const REFRESH_INTERVAL_MS = 30_000;

const initialState: CourtyardProfileNav = {
    source: 'courtyard',
    fetchedAt: '',
    profileUrl: PROFILE_URL,
    status: 'unavailable',
    reason: 'Not fetched yet',
};

export function useCourtyardProfileNav() {
    const [state, setState] = useState<CourtyardProfileNav>(initialState);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let activeController: AbortController | undefined;
        let disposed = false;

        async function loadNav(isInitialLoad = false) {
            activeController?.abort();
            const controller = new AbortController();
            activeController = controller;
            try {
                if (isInitialLoad) setIsLoading(true);
                const response = await fetch('/api/courtyard-profile-nav', {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) {
                    throw new Error(`Courtyard NAV returned ${response.status}`);
                }

                const payload = await response.json() as CourtyardProfileNav;
                if (!disposed && activeController === controller) setState(payload);
            } catch (error) {
                if (controller.signal.aborted) return;
                if (!disposed && isInitialLoad) {
                    setState({
                        ...initialState,
                        fetchedAt: new Date().toISOString(),
                        reason: error instanceof Error ? error.message : 'Courtyard NAV unavailable',
                    });
                }
            } finally {
                if (!controller.signal.aborted && !disposed && isInitialLoad) setIsLoading(false);
            }
        }

        void loadNav(true);
        const intervalId = window.setInterval(() => {
            void loadNav(false);
        }, REFRESH_INTERVAL_MS);

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
            activeController?.abort();
        };
    }, []);

    return { ...state, isLoading };
}
