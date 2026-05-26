import { formatEther } from 'viem';
import { ROUND_2_END_AT, ROUND_2_START_AT } from '../data/gm10Config';
import { BUY_PAGE_DEFAULTS } from '../data/protocol';

type RoundTimingState = {
    isRoundOpen: boolean;
    isUpcoming: boolean;
    isClosed: boolean;
    isPlanned?: boolean;
    status?: string;
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

export function RoundTimingCallout({
    roundState,
    compact = false,
}: {
    roundState: RoundTimingState;
    compact?: boolean;
}) {
    const startsAt = roundState.startsAt ?? ROUND_2_START_AT;
    const endsAt = roundState.endsAt ?? ROUND_2_END_AT;

    const target = roundState.round ? Number(formatEther(roundState.round.targetAmount)) : BUY_PAGE_DEFAULTS.targetAvax;
    const title = 'Continuous round is the current entry mode';
    const detail = `Fixed-window buys are archived. Round ${roundState.roundId ?? BUY_PAGE_DEFAULTS.roundId} ran ${formatUtcTimestamp(startsAt)} to ${formatUtcTimestamp(endsAt)}; new commits settle continuously at live NAV-derived pricing.`;
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
            <div>
                <div>
                    <div className="label-font text-[var(--accent)]">
                        Continuous round
                    </div>
                    <div className={`${compact ? 'mt-1 text-[1.05rem]' : 'mt-2 text-[1.45rem] sm:text-[1.75rem]'} font-extrabold tracking-[-0.035em] text-[var(--text-primary)]`}>
                        {title}
                    </div>
                    <p className={`${compact ? 'mt-1 text-[0.78rem]' : 'mt-2 text-[0.92rem]'} leading-[1.55] text-[var(--text-secondary)]`}>
                        {detail}
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className={compact ? 'mt-3' : 'mt-4'}>
                <div className="flex items-center justify-between text-[0.75rem] text-[var(--text-secondary)]">
                    <span>
                        <span className="font-semibold text-[var(--text-primary)]">{raised.toLocaleString('en-US')} AVAX</span> legacy raised
                    </span>
                    <span>
                        <span className="font-semibold text-[var(--text-primary)]">{remaining.toLocaleString('en-US')} AVAX</span> unfilled legacy cap
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
    if (roundState.isRoundOpen) return 'Continuous commits active';
    return 'Continuous round';
}
