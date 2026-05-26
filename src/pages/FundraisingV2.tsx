/**
 * FundraisingV2 — trading terminal for the live round + archive for past rounds.
 *
 * Sections (when Round 2 live):
 *   1. Status strip          (live / mainnet / verified + countdown)
 *   2. Title + round number
 *   3. Spec ledger           (target, raised, price, min/max, window)
 *   4. Progress meter        (thin hairline filled with brass)
 *   5. Trading terminal      (wallet, amount input, preview, confirm)
 *   6. Round 1 archive       (raised, filled in, participants, deployed, treasury, bar chart)
 *   7. Proof listing         (contracts with click-to-copy)
 */

import { useMemo, useState } from 'react';
import { useAccount, useBalance, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import { useAvaxPrice } from '../hooks/useAvaxPrice';
import {
    Caption,
    DataMono,
    Display,
    DisplayItalic,
    Hairline,
    LedgerRow,
    SectionLabel,
} from '../components/v2/primitives';
import { GM10_FUND_ABI } from '../data/contracts';
import {
    BUY_PAGE_DEFAULTS,
    ROUND_2_CLOSE_LEDGER,
    ROUND_PROCEEDS_ALLOCATION,
} from '../data/protocol';
import { CONTINUOUS_COMMIT_RAILS } from '../data/continuousAccrual';
import {
    GM10_PRIMARY_DEPLOYMENT,
    ROUND_2_END_AT,
    ROUND_2_START_AT,
} from '../data/gm10Config';
import { useFujiPortfolioPositions, useFujiRoundState } from '../hooks/useFujiProof';
import { Web3Providers } from '../components/Web3Providers';

const GAS_RESERVE = 0.05;
const WEI_PER_AVAX = 10n ** 18n;
const MAX_AVAX_DECIMALS = 18;

function fmtAvax(n: number, digits = n < 1 ? 4 : 2) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

type NormalizedInvestmentAmount =
    | {
        ok: true;
        amountNumber: number;
        amountWei: bigint;
        normalizedAmount: string;
    }
    | {
        ok: false;
        error: string;
    };

function normalizeInvestmentAmount(rawAmount: string): NormalizedInvestmentAmount {
    const raw = rawAmount.trim();
    const amountNumber = Number(raw);
    if (!raw || !Number.isFinite(amountNumber) || amountNumber <= 0) {
        return { ok: false, error: 'Enter a valid AVAX amount.' };
    }

    const match = raw.match(/^\+?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
    if (!match) {
        return { ok: false, error: 'Enter a valid AVAX amount.' };
    }

    const integerPart = match[1] ?? '0';
    const fractionPart = match[2] ?? match[3] ?? '';
    const exponent = Number(match[4] ?? '0');
    const digits = `${integerPart}${fractionPart}` || '0';
    const decimalIndex = integerPart.length + exponent;

    let normalizedInteger: string;
    let normalizedFraction: string;
    if (decimalIndex <= 0) {
        normalizedInteger = '0';
        normalizedFraction = `${'0'.repeat(Math.abs(decimalIndex))}${digits}`;
    } else if (decimalIndex >= digits.length) {
        normalizedInteger = `${digits}${'0'.repeat(decimalIndex - digits.length)}`;
        normalizedFraction = '';
    } else {
        normalizedInteger = digits.slice(0, decimalIndex);
        normalizedFraction = digits.slice(decimalIndex);
    }

    normalizedInteger = normalizedInteger.replace(/^0+(?=\d)/, '') || '0';
    normalizedFraction = normalizedFraction.replace(/0+$/, '');

    if (normalizedFraction.length > MAX_AVAX_DECIMALS) {
        const extraDecimals = normalizedFraction.slice(MAX_AVAX_DECIMALS);
        if (!/^0+$/.test(extraDecimals)) {
            return { ok: false, error: 'AVAX amount supports up to 18 decimal places.' };
        }
        normalizedFraction = normalizedFraction.slice(0, MAX_AVAX_DECIMALS).replace(/0+$/, '');
    }

    const fractionWei = (normalizedFraction || '0').padEnd(MAX_AVAX_DECIMALS, '0');
    const amountWei = (BigInt(normalizedInteger) * WEI_PER_AVAX) + BigInt(fractionWei);
    if (amountWei <= 0n) {
        return { ok: false, error: 'Enter an AVAX amount of at least 0.000000000000000001.' };
    }

    return {
        ok: true,
        amountNumber,
        amountWei,
        normalizedAmount: normalizedFraction ? `${normalizedInteger}.${normalizedFraction}` : normalizedInteger,
    };
}

type InvestmentValidationInput = {
    rawAmount: string;
    minInvestmentWei: bigint;
    maxInvestmentWei: bigint;
    remainingWei: bigint;
    exactDustCloseAmount: string | null;
    roundId: number;
    minInvestmentLabel: number;
    maxInvestmentLabel: number;
    remainingLabel: number;
    hasBalanceData: boolean;
    spendableAvax: number;
};

type InvestmentValidationResult =
    | {
        ok: true;
        normalizedAmount: string;
        amountWei: bigint;
    }
    | {
        ok: false;
        error: string;
    };

function validateInvestmentAmount(input: InvestmentValidationInput): InvestmentValidationResult {
    const normalized = normalizeInvestmentAmount(input.rawAmount);
    if (!normalized.ok) return normalized;

    if (input.remainingWei > 0n && normalized.amountWei > input.remainingWei) {
        return {
            ok: false,
            error: input.exactDustCloseAmount
                ? `Only ${input.exactDustCloseAmount} AVAX remains. Use that exact amount to close Round ${input.roundId}; overpaying the remaining cap reverts.`
                : `Only ${fmtAvax(input.remainingLabel)} AVAX remains in Round ${input.roundId}.`,
        };
    }

    if (input.exactDustCloseAmount && normalized.amountWei !== input.remainingWei) {
        return {
            ok: false,
            error: `Round ${input.roundId} has only ${input.exactDustCloseAmount} AVAX left. Use the exact final amount to close and auto-finalize the round.`,
        };
    }

    if (!input.exactDustCloseAmount && normalized.amountWei < input.minInvestmentWei) {
        return { ok: false, error: `Minimum buy is ${input.minInvestmentLabel} AVAX.` };
    }

    if (normalized.amountWei > input.maxInvestmentWei) {
        return { ok: false, error: `Maximum buy is ${input.maxInvestmentLabel} AVAX.` };
    }

    if (input.hasBalanceData && normalized.amountNumber > input.spendableAvax) {
        return { ok: false, error: `Insufficient spendable balance. Keep ${GAS_RESERVE} AVAX for gas.` };
    }

    return {
        ok: true,
        amountWei: normalized.amountWei,
        normalizedAmount: normalized.normalizedAmount,
    };
}

function fmtUtc(ts: number) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: false, timeZone: 'UTC',
    }).format(new Date(ts * 1000));
}

function shortAddr(a?: string) {
    if (!a) return 'pending';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtCountdown(seconds: number) {
    const secs = Math.max(0, seconds);
    const d = Math.floor(secs / 86_400);
    const h = Math.floor((secs % 86_400) / 3_600);
    const m = Math.floor((secs % 3_600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

/* ── Round 1 archive ─────────────────────────────────── */

function Round1Archive() {
    const { archiveRound } = useFujiRoundState();
    const portfolio = useFujiPortfolioPositions();
    const avaxUsd = useAvaxPrice();
    if (!archiveRound) return null;

    const raised = Number(formatEther(archiveRound.raisedAmount));
    const target = Number(formatEther(archiveRound.targetAmount));
    const filledLabel = '~45 hours'; // from onchain analysis: first tx 13 Apr 20:13 → last 15 Apr 16:48
    const participantsLabel = '24 addresses';
    const usdValue = raised * avaxUsd;
    const lotCount = portfolio.positions.length;
    const lotWord = lotCount === 1 ? 'lot' : 'lots';
    const lotCountLabel = lotCount > 0 ? `${lotCount} ${lotWord}` : 'lots';
    const archiveRows = [
        {
            label: 'Raised',
            detail: `${fmtAvax(raised)} / ${fmtAvax(target)} AVAX · 100%`,
            value: `$${usdValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        },
        {
            label: 'Fill time',
            detail: '13 Apr 2026, 20:13 UTC → 15 Apr 2026, 16:48 UTC',
            value: filledLabel,
        },
        {
            label: 'Participants',
            detail: 'Unique invest() callers',
            value: participantsLabel,
        },
        {
            label: 'Deployed',
            detail: `Acquired ${lotCountLabel} via Courtyard custody`,
            value: `${portfolio.proofSummary.costBasisLabel} cost basis`,
        },
        {
            label: '$CATCH minted',
            detail: 'Tokens issued to Round 1 participants',
            value: `${(raised / Number(formatEther(archiveRound.tokenPrice))).toLocaleString('en-US', { maximumFractionDigits: 0 })} $CATCH`,
        },
    ];

    return (
        <section className="px-4 py-20 border-t border-[var(--rule)]">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <SectionLabel>Round 01 · Archive</SectionLabel>
                <Display as="h2" className="mt-4 text-[clamp(1.8rem,3.5vw,2.6rem)]">
                    Round 1 closed early: capital filled in 45 hours.
                </Display>
                <p className="mt-4 max-w-[56ch] text-[0.98rem] leading-[1.7] text-[var(--ink-muted)]">
                    500 AVAX raised across 24 wallets, well before the end timestamp.
                    Capital was deployed into the first {lotCountLabel}, all custodied by Courtyard on Polygon.
                    Round 2 is now closed, so the next visible work is post-close sourcing, valuation, and execution proof.
                </p>

                <div className="mt-10 border-t border-[var(--rule)]">
                    <div className="md:hidden divide-y divide-[var(--rule)]">
                        {archiveRows.map((row) => (
                            <div key={row.label} className="py-5">
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{row.label}</Caption>
                                <div className="mt-2 text-[1rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                                    {row.value}
                                </div>
                                <p className="mt-1 text-[0.86rem] leading-[1.55] text-[var(--ink-muted)]">
                                    {row.detail}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:block">
                        {archiveRows.map((row) => (
                            <LedgerRow key={row.label} columns="240px 1fr 240px" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{row.label}</Caption>,
                                <span className="text-[var(--ink-faint)]">{row.detail}</span>,
                                <span className="text-right text-[var(--text-primary)]">{row.value}</span>,
                            ]} />
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-6">
                    <a
                        href="/portfolio"
                        className="v2-mono text-[0.82rem] tracking-[0.05em] text-[var(--accent-brass)] hover:text-[var(--text-primary)]"
                    >
                        → View the collection
                    </a>
                </div>
            </div>
        </section>
    );
}

/* ── Proof listing ───────────────────────────────────── */

function Proof() {
    const round = useFujiRoundState();
    return (
        <section className="px-4 py-20 border-t border-[var(--rule)]">
            <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                <SectionLabel>Proof surface</SectionLabel>
                <Hairline className="mt-6" />
                {round.links.map((link) => (
                    <LedgerRow
                        key={link.label}
                        columns="220px 1fr auto"
                        cells={[
                            <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{link.label}</Caption>,
                            <DataMono className="break-all text-[0.78rem] text-[var(--text-primary)]">{link.address ?? 'pending'}</DataMono>,
                            <a
                                href={link.snowtraceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="v2-mono text-[0.82rem] text-[var(--accent-brass)] hover:text-[var(--text-primary)]"
                            >
                                → Snowtrace
                            </a>,
                        ]}
                    />
                ))}
            </div>
        </section>
    );
}

/* ── Post-close ledger ───────────────────────────────── */

function PostCloseLedger({ avaxUsd }: { avaxUsd: number }) {
    const raisedUsd = ROUND_2_CLOSE_LEDGER.raisedAvax * avaxUsd;

    return (
        <div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <DataMono className="block text-[0.68rem] tracking-[0.08em] uppercase text-[var(--ink-faint)]">
                        Buying closed · Proof live
                    </DataMono>
                    <DataMono className="text-[0.72rem] font-semibold tracking-[0.04em] text-[var(--ink-muted)]">
                        Finalized {ROUND_2_CLOSE_LEDGER.finalizedAtLabel}
                    </DataMono>
                </div>
                <p className="mt-2 text-[0.82rem] leading-[1.45] text-[var(--ink-muted)]">
                    Direct buys are closed. The close, routing, and contract proof remain public.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4 border-y border-[var(--rule)] py-3">
                    <div>
                        <Caption className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">Raised</Caption>
                        <DataMono className="mt-1 block text-[1.12rem] font-bold text-[var(--text-primary)]">
                            {ROUND_2_CLOSE_LEDGER.raisedLabel}
                        </DataMono>
                        <DataMono className="text-[0.72rem] font-semibold text-[var(--ink-muted)]">
                            ~${raisedUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </DataMono>
                    </div>
                    <div className="text-right">
                        <Caption className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">Finalized</Caption>
                        <DataMono className="mt-1 block text-[1.12rem] font-bold text-[var(--accent-brass)]">
                            Block {ROUND_2_CLOSE_LEDGER.finalizedBlock.toLocaleString('en-US')}
                        </DataMono>
                        <DataMono className="text-[0.72rem] font-semibold text-[var(--ink-muted)]">
                            {ROUND_2_CLOSE_LEDGER.progressLabel} of original cap
                        </DataMono>
                    </div>
                </div>
                <div className="mt-2 border-t border-[var(--rule)]">
                    {ROUND_2_CLOSE_LEDGER.rows.map((row) => (
                        <div key={row.label}>
                            <div className="md:hidden border-b border-[var(--rule)] py-3">
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{row.label}</Caption>
                                <DataMono className="mt-1.5 block text-[0.9rem] text-[var(--text-primary)]">{row.value}</DataMono>
                                <p className="mt-1 text-[0.8rem] leading-[1.45] text-[var(--ink-muted)]">{row.detail}</p>
                            </div>
                            <div className="hidden md:block">
                                <LedgerRow
                                    columns="170px 1fr 150px"
                                    className="py-2.5"
                                    cells={[
                                        <Caption className="text-[0.66rem] uppercase tracking-[0.06em] text-[var(--ink-faint)]">{row.label}</Caption>,
                                        <span className="text-[0.84rem] leading-[1.45] text-[var(--ink-faint)]">{row.detail}</span>,
                                        <span className="text-right text-[0.9rem] text-[var(--text-primary)]">{row.value}</span>,
                                    ]}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Main page ───────────────────────────────────────── */

function FundraisingContent() {
    const { address, isConnected } = useAccount();
    const { data: hash, error: writeError, isPending, reset, writeContract } = useWriteContract();
    const { error: receiptError, isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash });

    const [amount, setAmount] = useState('');
    const [txError, setTxError] = useState<string | null>(null);
    const round = useFujiRoundState();
    const portfolio = useFujiPortfolioPositions();
    const avaxUsd = useAvaxPrice();

    const { data: balanceData } = useBalance({ address, query: { enabled: Boolean(address) } });
    const walletAvax = balanceData ? Number(formatEther(balanceData.value)) : 0;
    const spendableAvax = Math.max(0, walletAvax - GAS_RESERVE);

    const roundId = round.roundId;
    const target = round.round ? Number(formatEther(round.round.targetAmount)) : BUY_PAGE_DEFAULTS.targetAvax;
    const raised = round.round ? Number(formatEther(round.round.raisedAmount)) : 0;
    const tokenPrice = round.round ? Number(formatEther(round.round.tokenPrice)) : BUY_PAGE_DEFAULTS.priceAvax;
    const minInvestment = round.round ? Number(formatEther(round.round.minInvestment)) : BUY_PAGE_DEFAULTS.minAvax;
    const maxInvestment = round.round ? Number(formatEther(round.round.maxInvestment)) : BUY_PAGE_DEFAULTS.maxAvax;
    const remainingWei = round.round && round.round.targetAmount > round.round.raisedAmount
        ? round.round.targetAmount - round.round.raisedAmount
        : 0n;
    const remaining = round.round ? Number(formatEther(remainingWei)) : Math.max(0, target - raised);
    const exactDustCloseAmount = round.round && remainingWei > 0n && remainingWei < round.round.minInvestment
        ? formatEther(remainingWei)
        : null;
    const maxContribution = remaining > 0 ? Math.min(maxInvestment, remaining) : maxInvestment;
    const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
    const isPlanned = round.isPlanned;
    const isRoundActive = round.isRoundOpen;
    const isUpcoming = round.isUpcoming;
    const isClosed = round.isClosed;
    const isPostRound2Close = isClosed && roundId === ROUND_2_CLOSE_LEDGER.roundId;
    const buyUnavailable = isPlanned || !round.isRoundOpen || !GM10_PRIMARY_DEPLOYMENT.proxy.address;
    const estimatedTokens = amount ? (Number(amount) / tokenPrice).toFixed(2) : '0.00';
    const amountUsd = amount ? Number(amount) * avaxUsd : 0;

    const displayError = useMemo(() => {
        if (txError) return txError;
        const err = receiptError ?? writeError;
        if (!err) return null;
        const msg = err.message;
        if (msg.includes('RoundNotActive')) return `Round ${roundId} is not open for buying right now.`;
        if (msg.includes('reverted')) return 'The round rejected this transaction.';
        if (msg.includes('InvestmentBelowMinimum')) return `Minimum buy is ${minInvestment} AVAX.`;
        if (msg.includes('InvestmentAboveMaximum')) return `Maximum buy is ${maxInvestment} AVAX.`;
        if (msg.includes('TargetReached')) return `Round ${roundId} is already at capacity.`;
        return msg;
    }, [txError, receiptError, writeError, roundId, minInvestment, maxInvestment]);

    function handleInvest() {
        if (!amount) return;
        setTxError(null);
        reset();
        if (!GM10_PRIMARY_DEPLOYMENT.proxy.address) {
            setTxError('Mainnet fund address has not been configured yet.');
            return;
        }
        if (isPlanned) {
            setTxError(`Round ${roundId} has not been created onchain yet.`);
            return;
        }
        if (!round.isRoundOpen) {
            setTxError(isUpcoming ? `Round ${roundId} has not opened yet.` : `Round ${roundId} is closed for new buys.`);
            return;
        }
        const validation = validateInvestmentAmount({
            rawAmount: amount,
            minInvestmentWei: round.round.minInvestment,
            maxInvestmentWei: round.round.maxInvestment,
            remainingWei,
            exactDustCloseAmount,
            roundId,
            minInvestmentLabel: minInvestment,
            maxInvestmentLabel: maxInvestment,
            remainingLabel: remaining,
            hasBalanceData: Boolean(balanceData),
            spendableAvax,
        });
        if (!validation.ok) {
            setTxError(validation.error);
            return;
        }
        try {
            writeContract({
                address: GM10_PRIMARY_DEPLOYMENT.proxy.address,
                abi: GM10_FUND_ABI,
                functionName: 'invest',
                args: [BigInt(roundId)],
                value: validation.amountWei,
            });
        } catch (error) {
            setTxError(error instanceof Error ? error.message : 'Transaction failed');
        }
    }

    function setQuick(frac: number) {
        if (exactDustCloseAmount) {
            setAmount(exactDustCloseAmount);
            return;
        }
        const v = Math.max(0, Math.min(maxContribution, spendableAvax * frac));
        setAmount(Number(v.toFixed(4)).toString());
    }

    const roundWindow = `${fmtUtc(round.startsAt ?? ROUND_2_START_AT)} UTC → ${fmtUtc(round.endsAt ?? ROUND_2_END_AT)} UTC`;
    const roundHeadline = isRoundActive
        ? 'Live now.'
        : isClosed
            ? `${round.status}.`
            : isPlanned
            ? round.status.toLowerCase() === 'round 2 in progress'
                ? 'In progress.'
                : round.status.toLowerCase().includes('in progress')
                ? 'Setup in progress.'
                : round.status.toLowerCase().includes('delayed')
                    ? 'Setup delayed.'
                    : 'Setup pending.'
            : isUpcoming
                ? 'Opens soon.'
                : 'Closed.';
    const timeMetricLabel = isClosed ? 'Close status' : 'Time left';
    const timeMetricValue = isClosed
        ? `${isPostRound2Close ? 'Finalized' : round.status} · proof live`
        : fmtCountdown((round.endsAt ?? ROUND_2_END_AT) - Math.floor(Date.now() / 1000));
    const emptyProgressLabel = isClosed ? 'Unfilled cap' : 'Remaining';

    return (
        <main>
            {/* Status strip */}
            <section className="px-4 pt-28 md:pt-32 pb-4">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <div className="flex flex-wrap items-center gap-3 text-[0.7rem]">
                        <DataMono className="text-[var(--ink-faint)] tracking-[0.08em] uppercase">
                            <a href="/" className="hover:text-[var(--text-primary)]">Gm10</a>
                            {' · '}
                            <span className="text-[var(--text-primary)]">Round status</span>
                        </DataMono>
                        <DataMono className="tracking-[0.04em]">
                            <span className={isRoundActive ? 'v2-up' : 'text-[var(--ink-faint)]'}>
                                {isRoundActive ? 'LIVE' : round.status.toUpperCase()}
                            </span>
                        </DataMono>
                        <DataMono className="text-[var(--ink-faint)] tracking-[0.04em]">
                            AVALANCHE MAINNET · VERIFIED
                        </DataMono>
                    </div>

                    {/* Title */}
                    <div className="mt-10 flex flex-wrap items-end gap-8">
                        <div>
                            <SectionLabel>Current round</SectionLabel>
                            <Display as="h1" className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)]">
                                Round {String(roundId).padStart(2, '0')}
                            </Display>
                        </div>
                        <DisplayItalic as="div" className="text-[clamp(1.4rem,3vw,2.2rem)] text-[var(--ink-muted)] pb-3">
                            {roundHeadline}
                        </DisplayItalic>
                    </div>
                </div>
            </section>

            {/* Round spec + terminal grid */}
            <section className="px-4 pb-20">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
                        {/* Spec */}
                        <div>
                            <SectionLabel>Specs</SectionLabel>
                            <Hairline className="mt-3" />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Target</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{fmtAvax(target)} AVAX · ~${(target * avaxUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Price</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{tokenPrice} AVAX / $CATCH</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Min / Max</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{minInvestment} — {maxInvestment} AVAX</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Window</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{roundWindow}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">{timeMetricLabel}</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">{timeMetricValue}</span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Tokens at cap</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">
                                    {(target / tokenPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })} $CATCH
                                </span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Round target value</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">
                                    ~${(target * avaxUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                    <span className="text-[var(--ink-faint)] ml-2"> (uncapped supply; no FDV)</span>
                                </span>,
                            ]} />
                            <LedgerRow columns="160px 1fr" cells={[
                                <Caption className="uppercase tracking-[0.06em] text-[var(--ink-faint)]">Tokens minted so far</Caption>,
                                <span className="v2-mono text-right text-[var(--text-primary)]">
                                    {(raised / tokenPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })} $CATCH
                                </span>,
                            ]} />
                        </div>

                        {/* Terminal */}
                        <div>
                            {!isClosed ? (
                                <>
                                    <SectionLabel>Trading terminal</SectionLabel>
                                    <Hairline className="mt-3" />
                                    {!isConnected ? (
                                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
                                    <DataMono className="block text-[0.72rem] tracking-[0.08em] uppercase text-[var(--ink-faint)]">
                                        Wallet disconnected
                                    </DataMono>
                                    <p className="mt-3 text-[0.92rem] leading-[1.6] text-[var(--ink-muted)]">
                                        Connect a wallet on Avalanche mainnet to buy $CATCH from Round {round.roundId}.
                                    </p>
                                    <div className="mt-5">
                                        <ConnectButton.Custom>
                                            {({ openConnectModal }) => (
                                                <button
                                                    type="button"
                                                    onClick={openConnectModal}
                                                    className="pixel-menu-link pixel-menu-link-active"
                                                >
                                                    <span className="pixel-menu-cursor" aria-hidden>↗</span>
                                                    <span>Connect wallet</span>
                                                </button>
                                            )}
                                        </ConnectButton.Custom>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 border border-[var(--rule-strong)] bg-[var(--bg-secondary)] px-4 shadow-[0_0_0_1px_var(--accent-muted)]">
                                    <div className="flex items-baseline justify-between border-b border-[var(--rule)] py-3">
                                        <DataMono className="text-[0.75rem] font-semibold tracking-[0.04em] text-[var(--ink-muted)]">
                                            WALLET · <span className="text-[var(--text-primary)]">{shortAddr(address)}</span>
                                        </DataMono>
                                        <DataMono className="text-[0.88rem] font-semibold text-[var(--text-primary)]">
                                            {fmtAvax(walletAvax, 4)} AVAX
                                        </DataMono>
                                    </div>

                                    {/* Amount input */}
                                    <div className="py-4">
                                        <div className="flex items-baseline justify-between">
                                            <Caption className="block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Amount</Caption>
                                            <div className="flex items-center gap-4">
                                                {[0.25, 0.5, 0.75, 1].map((f) => (
                                                    <button
                                                        key={f}
                                                        type="button"
                                                        onClick={() => setQuick(f)}
                                                        className="v2-mono text-[0.72rem] font-semibold tracking-[0.04em] text-[var(--ink-muted)] hover:text-[var(--accent-brass)] transition-colors"
                                                    >
                                                        {f === 1 ? 'MAX' : `${f * 100}%`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-3 border-b border-[var(--rule-strong)] pb-2">
                                            <input
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                inputMode="decimal"
                                                className="w-full min-w-0 bg-transparent v2-mono text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-[-0.02em] text-[var(--text-primary)] outline-none placeholder:text-[var(--ink-faint)]"
                                            />
                                            <DataMono className="shrink-0 text-[0.9rem] font-semibold text-[var(--ink-muted)]">AVAX</DataMono>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="grid grid-cols-2 gap-4 border-y border-[var(--rule-strong)] bg-[var(--accent-muted)] px-4 py-4">
                                        <div>
                                            <Caption className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">You pay</Caption>
                                            <DataMono className="mt-1.5 block text-[clamp(1.3rem,2vw,1.55rem)] font-bold text-[var(--text-primary)]">
                                                {amount || '0.00'} <span className="text-[0.9rem] font-semibold text-[var(--ink-muted)]">AVAX</span>
                                            </DataMono>
                                            <DataMono className="text-[0.78rem] font-semibold text-[var(--ink-muted)]">
                                                ~${amountUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                            </DataMono>
                                        </div>
                                        <div className="text-right">
                                            <Caption className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">You receive</Caption>
                                            <DataMono className="mt-1.5 block text-[clamp(1.3rem,2vw,1.55rem)] font-bold text-[var(--accent-brass)]">
                                                {estimatedTokens} <span className="text-[0.9rem] font-semibold">$CATCH</span>
                                            </DataMono>
                                            <DataMono className="text-[0.78rem] font-semibold text-[var(--ink-muted)]">
                                                @ {tokenPrice} AVAX each
                                            </DataMono>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="py-4">
                                        <button
                                            type="button"
                                            onClick={handleInvest}
                                            disabled={buyUnavailable || isPending || isConfirming || !amount}
                                            className="v2-mono flex h-14 w-full items-center justify-center gap-2 border border-[var(--accent-brass)] bg-[var(--accent-brass)] px-4 text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[var(--bg-primary)] shadow-[0_0_24px_var(--accent-muted)] transition-all hover:-translate-y-0.5 hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] disabled:cursor-not-allowed disabled:border-[var(--rule-strong)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--ink-muted)] disabled:shadow-none disabled:hover:translate-y-0"
                                        >
                                            {isPending || isConfirming ? (
                                                <><span className="v2-pulse" /> Confirm in wallet…</>
                                            ) : isConfirmed ? (
                                                <>✓ Confirmed</>
                                            ) : (
                                                <>Commit now</>
                                            )}
                                        </button>

                                        {hash ? (
                                            <a
                                                href={`https://snowtrace.io/tx/${hash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-3 inline-block v2-mono text-[0.78rem] font-medium text-[var(--ink-muted)] hover:text-[var(--text-primary)]"
                                            >
                                                → Snowtrace
                                            </a>
                                        ) : null}
                                    </div>

                                    {displayError ? (
                                        <div className="pb-4 v2-mono text-[0.82rem] font-medium v2-down">
                                            ⚠ {displayError}
                                        </div>
                                    ) : null}
                                </div>
                                    )}
                                </>
                            ) : (
                                <PostCloseLedger avaxUsd={avaxUsd} />
                            )}
                        </div>
                    </div>

                    {/* Full-width progress bar + disclaimer (spans specs + terminal) */}
                    <div className="mt-12">
                        <div className="relative h-24 w-full overflow-hidden rounded-2xl bg-[var(--bg-tertiary)]">
                            {/* Filled portion */}
                            <div
                                className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                                style={{
                                    width: `${progress}%`,
                                    background: 'linear-gradient(90deg, var(--accent), var(--accent-blue))',
                                }}
                            />

                            {/* Raised (inside filled side) */}
                            <div className="absolute inset-y-0 left-0 flex flex-col justify-center pl-5 z-10" style={{ maxWidth: `${progress}%` }}>
                                <Caption className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[rgba(15,14,20,0.7)]">Raised</Caption>
                                <div className="text-[1.45rem] font-extrabold leading-tight tracking-[-0.02em] text-[#0f0e13] whitespace-nowrap">
                                    {fmtAvax(raised)} <span className="text-[0.9rem] font-semibold opacity-75">AVAX</span>
                                </div>
                            </div>

                            {/* Remaining (inside empty side) */}
                            <div className="absolute inset-y-0 right-0 flex flex-col justify-center pr-5 text-right z-10" style={{ maxWidth: `${100 - progress}%` }}>
                                <Caption className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">{emptyProgressLabel}</Caption>
                                <div className="text-[1.45rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-primary)] whitespace-nowrap">
                                    {fmtAvax(remaining)} <span className="text-[0.9rem] font-semibold text-[var(--text-secondary)]">AVAX</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 flex items-baseline justify-between text-[0.78rem] text-[var(--text-tertiary)]">
                            <span>0</span>
                            <span className="text-[1.05rem] font-bold tabular-nums text-[var(--accent)]">{progress.toFixed(1)}%</span>
                            <span>{fmtAvax(target)}</span>
                        </div>
                    </div>

                    <p className="mt-8 text-[0.86rem] leading-[1.7] text-[var(--ink-muted)]">
                        {isClosed
                            ? `Round ${round.roundId} is closed for new buys. It finalized at ${fmtAvax(raised, 4)} AVAX, with the remaining cap left unfilled and the proof surface kept public.`
                            : `Round ${round.roundId} stays open until ${fmtUtc(round.endsAt ?? ROUND_2_END_AT)} UTC — or earlier if the ${fmtAvax(target)} AVAX cap fills first. $CATCH starts moving freely once the round closes.`}
                    </p>
                </div>
            </section>

            {/* Continuous commit rail */}
            <section className="px-4 py-16 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <SectionLabel>Continuous round</SectionLabel>
                    <Display as="div" className="mt-4 text-[clamp(1.4rem,2.8vw,2rem)] max-w-[58ch]">
                        The next commit flow is infinite: every settled route mints immediately.
                    </Display>
                    <p className="mt-2 max-w-[72ch] text-[0.84rem] leading-[1.7] text-[var(--ink-muted)]">
                        Users commit from any LI.FI or Mobula-supported chain and token. The route settles on Avalanche first, then CATCH is minted per commit and delivered back through the prepared LayerZero OFT path when supported.
                    </p>
                    <div className="mt-8 grid gap-3 md:grid-cols-4">
                        {CONTINUOUS_COMMIT_RAILS.map((rail, index) => (
                            <div key={rail.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                                <DataMono className="text-[0.72rem] text-[var(--accent-brass)]">0{index + 1}</DataMono>
                                <h3 className="mt-3 text-[0.95rem] font-bold text-[var(--text-primary)]">{rail.label}</h3>
                                <p className="mt-2 text-[0.78rem] leading-[1.55] text-[var(--ink-muted)]">{rail.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Allocation preview */}
            <section className="px-4 py-16 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))]">
                    <SectionLabel>{isClosed ? 'Close routing' : 'Proceeds allocation'}</SectionLabel>
                    <Display as="div" className="mt-4 text-[clamp(1.4rem,2.8vw,2rem)] max-w-[56ch]">
                        {isClosed
                            ? `How the finalized ${fmtAvax(raised, 4)} AVAX Round ${round.roundId} raise routed after close.`
                            : `How the ${fmtAvax(raised)} AVAX raised so far will split once Round ${round.roundId} closes.`}
                    </Display>
                    <p className="mt-2 text-[0.82rem] text-[var(--ink-faint)]">
                        {isClosed
                            ? `Actual close: ${ROUND_2_CLOSE_LEDGER.raisedLabel} raised, ${ROUND_2_CLOSE_LEDGER.progressLabel} of the original ${ROUND_2_CLOSE_LEDGER.targetLabel} cap. Liquidity split 50/50 across LFJ and Pharaoh.`
                            : `At full cap (${fmtAvax(target)} AVAX): ${fmtAvax(target * 0.85)} treasury · ${fmtAvax(target * 0.10)} LP · ${fmtAvax(target * 0.05)} team.`}
                    </p>
                    <div className="mt-8 border-t border-[var(--rule)]">
                    {ROUND_PROCEEDS_ALLOCATION.buckets.map((bucket) => {
                        const base = raised > 0 ? raised : target;
                        const allocated = base * (bucket.percent / 100);
                        const detail = isClosed
                            ? bucket.label === 'Liquidity'
                                ? 'Split 50/50 across LFJ and Pharaoh after finalization.'
                                : bucket.label === 'Team wallet'
                                    ? 'Sent after finalization as the 5% bootstrap allocation.'
                                    : 'Kept with the strategy for card acquisition and execution.'
                            : bucket.detail;
                        return (
                            <div key={bucket.label}>
                                <div className="md:hidden border-b border-[var(--rule)] py-5">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <DataMono className="text-[var(--accent-brass)] text-[0.9rem]">{bucket.percent}%</DataMono>
                                        <div className="text-right">
                                            <div className="text-[var(--text-primary)]">{fmtAvax(allocated)} AVAX</div>
                                            <div className="v2-mono mt-1 text-[0.78rem] text-[var(--ink-faint)]">~${(allocated * avaxUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[var(--text-primary)]">{bucket.label}</div>
                                    <p className="mt-1 text-[0.86rem] leading-[1.55] text-[var(--ink-muted)]">{detail}</p>
                                </div>
                                <div className="hidden md:block">
                                    <LedgerRow
                                        columns="48px 1fr 160px 140px"
                                        cells={[
                                            <DataMono className="text-[var(--accent-brass)] text-[0.9rem]">{bucket.percent}%</DataMono>,
                                            <span>
                                                <span className="text-[var(--text-primary)]">{bucket.label}</span>
                                                <span className="ml-3 text-[var(--ink-faint)]"> {detail}</span>
                                            </span>,
                                            <span className="text-right text-[var(--text-primary)]">{fmtAvax(allocated)} AVAX</span>,
                                            <span className="text-right text-[var(--ink-faint)]">~${(allocated * avaxUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>,
                                        ]}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            </section>

            <Round1Archive />
            <Proof />

            {/* closer */}
            <section className="px-4 py-20 border-t border-[var(--rule)]">
                <div className="mx-auto max-w-[min(1440px,calc(100vw-48px))] lg:max-w-[min(1800px,calc(100vw-64px))] flex flex-wrap items-center justify-between gap-4">
                    <Display className="text-[clamp(1.2rem,2.4vw,1.6rem)]">
                        Questions about the terms?
                    </Display>
                    <a href="/faq" className="v2-mono text-[0.88rem] tracking-[0.05em] text-[var(--accent-brass)] hover:text-[var(--text-primary)]">
                        → FAQ
                    </a>
                </div>
            </section>

            {/* Used to keep TS happy with variables we may later reference */}
            <span className="hidden">{portfolio.proofSummary.holdingsLabel}{isClosed ? '' : ''}</span>
        </main>
    );
}

export default function FundraisingV2() {
    return (
        <Web3Providers>
            <FundraisingContent />
        </Web3Providers>
    );
}
