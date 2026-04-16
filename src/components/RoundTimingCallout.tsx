import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import { ROUND_1_END_AT, ROUND_1_START_AT } from '../data/gm10Config';
import { BUY_PAGE_DEFAULTS, GLOBAL_CTA_ROUTE } from '../data/protocol';

type RoundTimingState = {
    isRoundOpen: boolean;
    isUpcoming: boolean;
    isClosed: boolean;
    roundId?: number;
    startsAt?: number;
    endsAt?: number;
    round?: {
        targetAmount: bigint;
        raisedAmount: bigint;
    };
};

function formatUtcTimestamp(timestamp: number) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
        timeZoneName: 'short',
    }).format(new Date(timestamp * 1000));
}

function formatLocalTimestamp(timestamp: number) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    }).format(new Date(timestamp * 1000));
}

function formatCountdown(seconds: number) {
    const bounded = Math.max(0, seconds);
    const days = Math.floor(bounded / 86_400);
    const hours = Math.floor((bounded % 86_400) / 3_600);
    const minutes = Math.floor((bounded % 3_600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export function RoundTimingCallout({
    roundState,
    compact = false,
}: {
    roundState: RoundTimingState;
    compact?: boolean;
}) {
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
    const startsAt = roundState.startsAt ?? ROUND_1_START_AT;
    const endsAt = roundState.endsAt ?? ROUND_1_END_AT;

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Math.floor(Date.now() / 1000));
        }, 30_000);

        return () => window.clearInterval(timer);
    }, []);

    const roundId = roundState.roundId ?? 1;
    const secondsToStart = startsAt - now;
    const secondsToEnd = endsAt - now;
    const target = roundState.round ? Number(formatEther(roundState.round.targetAmount)) : BUY_PAGE_DEFAULTS.targetAvax;
    const title = roundState.isUpcoming
        ? `Round ${roundId} opens in ${formatCountdown(secondsToStart)}`
        : roundState.isRoundOpen
            ? `Round ${roundId} closes in ${formatCountdown(secondsToEnd)}`
            : `Round ${roundId} is closed`;
    const detail = roundState.isUpcoming
        ? `Next public buy window starts ${formatUtcTimestamp(startsAt)} (${formatLocalTimestamp(startsAt)} local).`
        : roundState.isRoundOpen
            ? `Buying is live until ${formatUtcTimestamp(endsAt)}, unless the ${target.toLocaleString('en-US')} AVAX cap is reached first.`
            : `Round ${roundId} ran ${formatUtcTimestamp(startsAt)} to ${formatUtcTimestamp(endsAt)}.`;
    const raised = roundState.round ? Number(formatEther(roundState.round.raisedAmount)) : 0;
    const remaining = Math.max(0, target - raised);
    const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-secondary)] shadow-[var(--shadow-sm)] ${
                compact ? 'px-4 py-3' : 'px-5 py-5 sm:px-6'
            }`}
        >
            <div className="absolute inset-y-0 left-0 w-1 bg-[var(--accent)]" aria-hidden />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="label-font text-[var(--accent)]">
                        {roundState.isUpcoming ? 'Next opening' : roundState.isRoundOpen ? 'Current window' : 'Round status'}
                    </div>
                    <div className={`${compact ? 'mt-1 text-[1.05rem]' : 'mt-2 text-[1.45rem] sm:text-[1.75rem]'} font-extrabold tracking-[-0.035em] text-[var(--text-primary)]`}>
                        {title}
                    </div>
                    <p className={`${compact ? 'mt-1 text-[0.78rem]' : 'mt-2 text-[0.92rem]'} leading-[1.55] text-[var(--text-secondary)]`}>
                        {detail}
                    </p>
                </div>
                {!compact ? (
                    <Link to={GLOBAL_CTA_ROUTE} className="pixel-menu-link pixel-menu-link-active shrink-0 justify-center">
                        <span className="pixel-menu-cursor" aria-hidden>↗</span>
                        <span>{roundState.isUpcoming ? `Review Round ${roundId}` : roundState.isRoundOpen ? `Join Round ${roundId}` : 'Inspect Proof'}</span>
                    </Link>
                ) : null}
            </div>

            {/* Progress bar */}
            <div className={compact ? 'mt-3' : 'mt-4'}>
                <div className="flex items-center justify-between text-[0.75rem] text-[var(--text-secondary)]">
                    <span>
                        <span className="font-semibold text-[var(--text-primary)]">{raised.toLocaleString('en-US')} AVAX</span> raised
                    </span>
                    <span>
                        <span className="font-semibold text-[var(--text-primary)]">{remaining.toLocaleString('en-US')} AVAX</span> left of {target.toLocaleString('en-US')}
                    </span>
                </div>
                <div className={`${compact ? 'mt-1.5 h-2' : 'mt-2 h-3'} overflow-hidden rounded-full bg-[var(--bg-tertiary)]`}>
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${progress}%`,
                            background: roundState.isClosed
                                ? 'var(--text-tertiary)'
                                : 'linear-gradient(90deg, var(--accent), var(--accent-blue))',
                        }}
                    />
                </div>
                <div className="mt-1 text-right text-[0.7rem] font-semibold tabular-nums text-[var(--text-tertiary)]">
                    {progress.toFixed(1)}%
                </div>
            </div>
        </div>
    );
}

export function getRoundScheduleShortLabel(roundState: RoundTimingState) {
    const startsAt = roundState.startsAt ?? ROUND_1_START_AT;
    const endsAt = roundState.endsAt ?? ROUND_1_END_AT;

    if (roundState.isUpcoming) return `Opens ${formatUtcTimestamp(startsAt)}`;
    if (roundState.isRoundOpen) return `Closes ${formatUtcTimestamp(endsAt)}`;
    return 'Proof remains live';
}
