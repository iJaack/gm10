import { useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { BUY_PAGE_DEFAULTS } from '../data/protocol';
import { ROUND_1_END_AT } from '../data/gm10Config';

type RoundProgressBarProps = {
    round?: {
        targetAmount: bigint;
        raisedAmount: bigint;
    };
    endsAt?: number;
    isRoundOpen: boolean;
    isClosed: boolean;
};

function formatCountdown(seconds: number) {
    const bounded = Math.max(0, seconds);
    const days = Math.floor(bounded / 86_400);
    const hours = Math.floor((bounded % 86_400) / 3_600);
    const minutes = Math.floor((bounded % 3_600) / 60);
    const secs = bounded % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    return `${minutes}m ${secs}s`;
}

export function RoundProgressBar({ round, endsAt, isRoundOpen, isClosed }: RoundProgressBarProps) {
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

    useEffect(() => {
        if (!isRoundOpen) return;
        const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
        return () => clearInterval(timer);
    }, [isRoundOpen]);

    const target = round ? Number(formatEther(round.targetAmount)) : BUY_PAGE_DEFAULTS.targetAvax;
    const raised = round ? Number(formatEther(round.raisedAmount)) : 0;
    const remaining = Math.max(0, target - raised);
    const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
    const endTimestamp = endsAt ?? ROUND_1_END_AT;
    const secondsLeft = Math.max(0, endTimestamp - now);

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            {/* Header row */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {isRoundOpen ? (
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-green)] opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                        </span>
                    ) : null}
                    <span className="text-[0.82rem] font-bold text-[var(--text-primary)]">
                        {isClosed ? 'Round 1 closed' : isRoundOpen ? 'Round 1 live' : 'Round 1 upcoming'}
                    </span>
                </div>
                <span className="text-[0.82rem] font-bold tabular-nums text-[var(--text-primary)]">
                    {progress.toFixed(1)}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                        width: `${progress}%`,
                        background: isClosed
                            ? 'var(--text-tertiary)'
                            : 'linear-gradient(90deg, var(--accent-green), var(--accent-blue))',
                    }}
                />
            </div>

            {/* Stats row */}
            <div className="mt-3 flex items-center justify-between text-[0.78rem]">
                <span className="text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">{raised.toLocaleString()} AVAX</span>
                    {' '}raised of {target.toLocaleString()}
                </span>
                <span className="text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">{remaining.toLocaleString()} AVAX</span>
                    {' '}left
                </span>
            </div>

            {/* Time remaining */}
            {isRoundOpen && secondsLeft > 0 ? (
                <div className="mt-2 text-center text-[0.75rem] text-[var(--text-tertiary)]">
                    {formatCountdown(secondsLeft)} remaining
                </div>
            ) : null}
        </div>
    );
}
