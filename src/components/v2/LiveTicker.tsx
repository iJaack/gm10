/**
 * LiveTicker — top-of-page monospace data marquee.
 *
 * Pulls from:
 *   - useAvaxPrice()            AVAX/USD
 *   - useCatchMarketData()      CATCH price + 24h change
 *   - useFujiRoundState()       round status, raised, cap
 *   - useFujiPortfolioPositions portfolio NAV
 *
 * Wrapped in Web3Providers so it can use wagmi hooks even when rendered
 * above the route-level provider trees.
 */

import { useEffect, useState } from 'react';
import { useAvaxPrice } from '../../hooks/useAvaxPrice';
import { useCatchMarketData } from '../../hooks/useCatchMarketData';
import { useFujiPortfolioPositions, useFujiRoundState } from '../../hooks/useFujiProof';
import { Web3Providers } from '../Web3Providers';
import { Ticker } from './primitives';

function formatPct(n: number | undefined) {
    if (n === undefined || !isFinite(n)) return null;
    const rounded = Math.round(n * 10) / 10;
    const sign = rounded > 0 ? '▲' : rounded < 0 ? '▼' : '–';
    return `${sign}${Math.abs(rounded).toFixed(1)}%`;
}

function formatUsd(n: number | undefined, digits = 2) {
    if (n === undefined || !isFinite(n)) return null;
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function Countdown({ endsAt, isOpen }: { endsAt: number | undefined; isOpen: boolean }) {
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
    useEffect(() => {
        const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
        return () => clearInterval(t);
    }, []);
    if (!endsAt) return <>—</>;
    const secs = Math.max(0, endsAt - now);
    const d = Math.floor(secs / 86_400);
    const h = Math.floor((secs % 86_400) / 3_600);
    const m = Math.floor((secs % 3_600) / 60);
    const verb = isOpen ? 'CLOSES' : 'OPENS';
    if (d > 0) return <>{verb} IN {d}d {h}h</>;
    if (h > 0) return <>{verb} IN {h}h {m}m</>;
    return <>{verb} IN {m}m</>;
}

function LiveTickerContent() {
    const avaxUsd = useAvaxPrice();
    const market = useCatchMarketData();
    const round = useFujiRoundState();
    const portfolio = useFujiPortfolioPositions();

    const catchPrice = market.spotPriceUsd ?? market.lfj.priceUsd ?? market.pharaoh.priceUsd;
    const catchChange = market.lfj.priceChange24h ?? market.pharaoh.priceChange24h;

    const items = [
        {
            id: 'avax',
            label: 'AVAX',
            value: formatUsd(avaxUsd, 2) ?? '—',
            tone: 'default' as const,
        },
        {
            id: 'catch',
            label: '$CATCH',
            value: catchPrice ? formatUsd(catchPrice, 4) : '—',
            tone: (catchChange ?? 0) >= 0 ? ('up' as const) : ('down' as const),
        },
        {
            id: 'catch24',
            label: 'CATCH 24H',
            value: formatPct(catchChange) ?? '—',
            tone: (catchChange ?? 0) >= 0 ? ('up' as const) : ('down' as const),
        },
        {
            id: 'round',
            label: `ROUND ${round.roundId}`,
            value: (
                <>
                    <Countdown endsAt={round.isRoundOpen ? round.endsAt : round.startsAt} isOpen={round.isRoundOpen} />
                </>
            ),
            tone: 'live' as const,
        },
        {
            id: 'progress',
            label: 'RAISED',
            value: `${round.raisedLabel} / ${round.targetLabel}`,
            tone: 'default' as const,
        },
        {
            id: 'nav',
            label: 'PORTFOLIO NAV',
            value: portfolio.proofSummary.onchainCurrentMarkLabel ?? '—',
            tone: 'default' as const,
        },
        {
            id: 'treasury',
            label: 'TREASURY',
            value: portfolio.proofSummary.liquidTreasuryLabel ?? '—',
            tone: 'default' as const,
        },
        {
            id: 'chain',
            label: 'NETWORK',
            value: 'AVALANCHE · VERIFIED',
            tone: 'default' as const,
        },
    ];

    return <Ticker items={items} speed={60} />;
}

export function LiveTicker() {
    return (
        <Web3Providers>
            <LiveTickerContent />
        </Web3Providers>
    );
}
