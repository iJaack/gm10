import { useEffect, useState } from 'react';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd';
const FALLBACK_PRICE = 9.5;
const REFRESH_MS = 60_000; // 1 minute

export function useAvaxPrice() {
    const [price, setPrice] = useState(FALLBACK_PRICE);

    useEffect(() => {
        let cancelled = false;

        let warned = false;
        async function fetchPrice() {
            try {
                const res = await fetch(COINGECKO_URL, { cache: 'no-cache' });
                if (!res.ok) {
                    if (!warned) { console.warn('[useAvaxPrice] CoinGecko non-200, using fallback', res.status); warned = true; }
                    return;
                }
                const data = await res.json();
                const usd = data?.['avalanche-2']?.usd;
                if (typeof usd === 'number' && !cancelled) setPrice(usd);
            } catch (err) {
                if (!warned) { console.warn('[useAvaxPrice] CoinGecko fetch failed, using fallback', err); warned = true; }
            }
        }

        fetchPrice();
        const interval = setInterval(fetchPrice, REFRESH_MS);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    return price;
}
