import { useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useReadContract, useReadContracts, useSignMessage, useWriteContract } from 'wagmi';
import { FUND_ADMIN_ABI, REGISTRY_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { TxResult } from '../components/TxButton';
import {
    fetchLatestValuationPack,
    generateValuationPack,
    type SourceObservation,
    type ValuationPack,
    type ValuationPackCard,
} from '../lib/valuationClient';

const COMPARABLE_SALES = 2 as const;
const MAX_ACTIVE_POSITIONS = 200;

type RegistryPosition = {
    id: bigint;
    originPurchaseKey: `0x${string}`;
    externalAssetId: `0x${string}`;
    currentValueUsdt6: bigint;
    status: bigint;
};

type SourceOverrideMap = Record<string, SourceObservation[] | { observations?: SourceObservation[] }>;

function formatUsdc6(value?: string | bigint | number) {
    if (value === undefined) return 'Unavailable';
    return `$${Number(formatUnits(BigInt(value), 6)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatTimestamp(value?: string) {
    if (!value) return 'Unavailable';
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

function defaultObservations(cardKey: string): SourceObservation[] {
    const now = new Date().toISOString();
    return [
        {
            sourceId: 'primary',
            sourceName: 'Primary source',
            cardKey,
            observedAt: now,
            fetchedAt: now,
            valueUsdc6: '0',
            currency: 'USD',
            confidence: 0,
            rawPayloadRef: 'placeholder://primary',
            sourceUrl: '',
            matchReason: 'placeholder observation',
        },
        {
            sourceId: 'benchmark',
            sourceName: 'Benchmark source',
            cardKey,
            observedAt: now,
            fetchedAt: now,
            valueUsdc6: '0',
            currency: 'USD',
            confidence: 0,
            rawPayloadRef: 'placeholder://benchmark',
            sourceUrl: '',
            matchReason: 'placeholder observation',
        },
        {
            sourceId: 'evidence',
            sourceName: 'Evidence source',
            cardKey,
            observedAt: now,
            fetchedAt: now,
            valueUsdc6: '0',
            currency: 'USD',
            confidence: 0,
            rawPayloadRef: 'placeholder://evidence',
            sourceUrl: '',
            matchReason: 'placeholder observation',
        },
    ];
}

function unwrapObservationOverride(value: SourceOverrideMap[string]) {
    if (Array.isArray(value)) return value;
    return value?.observations;
}

function getPositionTitle(position: RegistryPosition) {
    const title = `Position #${position.id?.toString?.() ?? 'unknown'}`;
    const cardKey = `${position.originPurchaseKey}:${position.externalAssetId}`;
    return { title, cardKey };
}

function deriveCard(position: RegistryPosition) {
    const { title, cardKey } = getPositionTitle(position);
    return {
        positionId: Number(position.id),
        cardKey,
        title,
        currentValueUsdc6: position.currentValueUsdt6.toString(),
        observations: defaultObservations(cardKey),
    };
}

function parseSourceOverrides(json: string) {
    const trimmed = json.trim();
    if (!trimmed) return {} as SourceOverrideMap;
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Source observations JSON must be an object keyed by position id or cardKey.');
    }
    return parsed as SourceOverrideMap;
}

function PackCardView({
    card,
    approved,
    onApprove,
    onSubmit,
    canSubmit,
    isSubmitting,
}: {
    card: ValuationPackCard;
    approved: boolean;
    onApprove: () => void;
    onSubmit: () => void;
    canSubmit: boolean;
    isSubmitting: boolean;
}) {
    const passed = card.consensus.status === 'passed';
    const currentMark = formatUsdc6(card.currentValueUsdc6);
    const proposedMark = card.consensus.proposedValueUsdc6 ? formatUsdc6(card.consensus.proposedValueUsdc6) : 'Unavailable';

    return (
        <div className="admin-card grid gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{card.title}</h3>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        Position {card.positionId} · Current mark {currentMark}
                    </p>
                </div>
                <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                        passed ? 'bg-[rgba(78,201,138,0.16)] text-[var(--accent-green)]' : 'bg-[rgba(240,192,48,0.14)] text-[var(--accent)]'
                    }`}
                >
                    {passed ? 'Consensus passed' : 'Needs review'}
                </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/45 p-3">
                    <div className="text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Proposed mark</div>
                    <div className="mt-2 text-base font-semibold text-[var(--text-primary)]">{proposedMark}</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/45 p-3">
                    <div className="text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Sources</div>
                    <div className="mt-2 text-base font-semibold text-[var(--text-primary)]">{card.consensus.validSourceCount}</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/45 p-3">
                    <div className="text-[0.7rem] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Approval</div>
                    <div className="mt-2 text-base font-semibold text-[var(--text-primary)]">{approved ? 'Approved' : 'Not approved'}</div>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
                {card.observations.map((source) => (
                    <div key={source.sourceId} className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/35 p-3">
                        <div className="text-xs font-semibold text-[var(--text-primary)]">{source.sourceName}</div>
                        <div className="mt-2 text-sm text-[var(--text-secondary)]">
                            <div>Observation: {formatUsdc6(source.valueUsdc6)}</div>
                            <div>Confidence: {Math.round(source.confidence * 100)}%</div>
                            <div className="break-words">Evidence: {source.matchReason}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/35 p-3 text-sm text-[var(--text-secondary)]">
                <div className="font-semibold text-[var(--text-primary)]">Warnings</div>
                {card.consensus.warnings.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                        {card.consensus.warnings.map((warning) => (
                            <li key={warning}>• {warning}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2">None.</p>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[var(--text-tertiary)]">
                    Source ref {card.sourceRef} · Proof hash {card.proofHash}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="admin-cta-secondary"
                        onClick={onApprove}
                        disabled={!passed}
                    >
                        Approve mark
                    </button>
                    <button
                        type="button"
                        className="admin-cta"
                        onClick={onSubmit}
                        disabled={!canSubmit || isSubmitting}
                    >
                        Submit onchain mark
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ValuationPanel() {
    const [pack, setPack] = useState<ValuationPack | null>(null);
    const [sourceObservationsJson, setSourceObservationsJson] = useState('');
    const [approvedCards, setApprovedCards] = useState<Record<string, true>>({});
    const [localError, setLocalError] = useState('');
    const { address } = useAccount();
    const { signMessageAsync, error: signError, isPending: isSigning } = useSignMessage();
    const { writeContract, data: txHash, error: txError, isPending, reset } = useWriteContract();

    const { data: positionCount } = useReadContract({
        address: MAINNET.portfolioRegistry,
        abi: REGISTRY_ABI,
        functionName: 'collectiblePositionCount',
    });

    const positionIds = useMemo(() => {
        const count = Number(positionCount ?? 0n);
        const capped = Number.isFinite(count) ? Math.min(count, MAX_ACTIVE_POSITIONS) : 0;
        return Array.from({ length: capped }, (_, index) => BigInt(index + 1));
    }, [positionCount]);

    const { data: positionReads } = useReadContracts({
        contracts: positionIds.map((positionId) => ({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'getCollectiblePosition',
            args: [positionId],
        })),
        query: { enabled: positionIds.length > 0 },
    }) as {
        data?: Array<{ status: string; result?: RegistryPosition }>;
    };

    const activeCards = useMemo(() => {
        return (
            positionReads
                ?.flatMap((read) => {
                    if (read.status !== 'success' || !read.result) return [];
                    return [read.result as RegistryPosition];
                })
                .filter((position) => Number(position.status) === 1)
                .map((position) => {
                    return deriveCard(position);
                }) ?? []
        );
    }, [positionReads]);

    function clearApprovals() {
        setApprovedCards({});
    }

    async function loadLatestPack() {
        setLocalError('');
        reset();
        try {
            if (!address) {
                throw new Error('Connect an authorized admin wallet before loading a valuation pack.');
            }

            const message = `GM10 valuation pack read:${new Date().toISOString()}`;
            const signature = await signMessageAsync({ message });
            const payload = await fetchLatestValuationPack({ address, message, signature });
            setPack(payload.pack);
            clearApprovals();
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : 'Unable to load latest valuation pack.');
        }
    }

    async function runValuationNow() {
        setLocalError('');
        reset();

        try {
            if (!address) {
                throw new Error('Connect an authorized admin wallet before generating a valuation pack.');
            }

            const overrides = parseSourceOverrides(sourceObservationsJson);
            const cards = activeCards.map((card) => {
                const override = unwrapObservationOverride(overrides[String(card.positionId)] ?? overrides[card.cardKey]);
                return {
                    ...card,
                    observations: override ?? card.observations,
                };
            });
            const message = `GM10 valuation pack generate:${new Date().toISOString()}`;
            const signature = await signMessageAsync({ message });
            const payload = await generateValuationPack(cards, { address, message, signature });
            setPack(payload.pack);
            clearApprovals();
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : 'Unable to generate valuation pack.');
        }
    }

    function approveCard(positionId: number) {
        setApprovedCards((current) => ({ ...current, [String(positionId)]: true }));
    }

    function submitOnchainMark(card: ValuationPackCard) {
        if (card.consensus.status !== 'passed') return;
        if (!card.consensus.proposedValueUsdc6 || !approvedCards[String(card.positionId)] || isPending) return;

        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'submitValuationObservation',
            args: [
                BigInt(card.positionId),
                COMPARABLE_SALES,
                card.sourceRef,
                BigInt(card.consensus.proposedValueUsdc6),
                card.proofHash,
            ],
        });
    }

    return (
        <div className="grid gap-6">
            <div className="grid gap-3">
                <h1 className="text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">Valuation workflow</h1>
                <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                    Weekly Friday FMV marks use 2-of-3 consensus. Source observations are evidence. An approved onchain submission creates the official mark.
                </p>
            </div>

            <div className="admin-card grid gap-4 p-5">
                <label className="grid gap-2">
                    <span className="label-font" style={{ color: 'var(--text-tertiary)' }}>Source observations JSON</span>
                    <textarea
                        value={sourceObservationsJson}
                        onChange={(event) => setSourceObservationsJson(event.target.value)}
                        className="min-h-28 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/50 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-strong)]"
                        placeholder='{"1":[...]}'
                        aria-label="Source observations JSON"
                    />
                </label>

                <div className="flex flex-wrap gap-3">
                    <button type="button" className="admin-cta" onClick={runValuationNow} disabled={activeCards.length === 0 || isSigning}>
                        {isSigning ? 'Sign valuation request' : 'Run valuation now'}
                    </button>
                    <button type="button" className="admin-cta-secondary" onClick={loadLatestPack} disabled={isSigning}>
                        {isSigning ? 'Sign valuation request' : 'Load latest pack'}
                    </button>
                </div>

                <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
                    <div>Active cards: {activeCards.length}</div>
                    {pack ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span>Pack {pack.packId}</span>
                            <span>Generated {formatTimestamp(pack.generatedAt)}</span>
                            <span>Unit {pack.unit}</span>
                        </div>
                    ) : (
                        <div>No valuation pack loaded.</div>
                    )}
                </div>

                {localError ? (
                    <div className="rounded-lg border border-[rgba(232,69,58,0.35)] bg-[rgba(232,69,58,0.12)] px-3 py-2 text-sm text-[var(--accent-red)]">
                        {localError}
                    </div>
                ) : null}
                {signError ? (
                    <div className="rounded-lg border border-[rgba(232,69,58,0.35)] bg-[rgba(232,69,58,0.12)] px-3 py-2 text-sm text-[var(--accent-red)]">
                        {signError.message}
                    </div>
                ) : null}
            </div>

            {pack ? (
                <div className="grid gap-4">
                    {pack.cards.map((card) => {
                        const approved = Boolean(approvedCards[String(card.positionId)]);
                        const canSubmit =
                            approved &&
                            card.consensus.status === 'passed' &&
                            Boolean(card.consensus.proposedValueUsdc6) &&
                            !isPending;

                        return (
                            <PackCardView
                                key={card.positionId}
                                card={card}
                                approved={approved}
                                onApprove={() => approveCard(card.positionId)}
                                onSubmit={() => submitOnchainMark(card)}
                                canSubmit={canSubmit}
                                isSubmitting={isPending}
                            />
                        );
                    })}
                </div>
            ) : null}

            <TxResult hash={txHash} error={txError} />
        </div>
    );
}
