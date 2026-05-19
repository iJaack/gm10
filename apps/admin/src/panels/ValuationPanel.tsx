import { useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useReadContract, useReadContracts, useSignMessage, useWriteContract } from 'wagmi';
import { FUND_ADMIN_ABI, REGISTRY_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { AdminButton, AdminPage, LedgerPanel, MetricCard, MetricGrid, OperatorFlowPanel, OperatorSummaryGrid, SectionPanel as Section } from '../components/AdminPrimitives';
import { TxResult } from '../components/TxButton';
import { useSafeAppInfo } from '../hooks/useSafeAppInfo';
import { READ_STATUS } from '../lib/adminMetrics.js';
import { resolveSafeAwareAdminAddress } from '../lib/safeContext.js';
import {
    fetchLatestValuationPack,
    generateValuationPack,
    type SourceObservation,
    type ValuationPack,
    type ValuationPackCard,
    updateValuationPackCard,
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
type CardIdentityOverrideMap = Record<string, {
    title?: string;
    subtitle?: string;
    search?: string;
    grade?: string;
    tcgPlayerId?: string;
    courtyardAssetId?: string;
    courtyardUrl?: string;
    days?: number;
}>;

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

function parseCardIdentityOverrides(json: string) {
    const trimmed = json.trim();
    if (!trimmed) return {} as CardIdentityOverrideMap;
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Card identity JSON must be an object keyed by position id or cardKey.');
    }
    return parsed as CardIdentityOverrideMap;
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
    const submittedTxHash = card.submittedTxHash || '';

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
                    <div className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                        {submittedTxHash ? 'Submitted' : approved ? 'Approved' : 'Not approved'}
                    </div>
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
                    {submittedTxHash ? <> · Tx {submittedTxHash}</> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    <AdminButton
                        onClick={onApprove}
                        disabled={!passed || approved || isSubmitting}
                    >
                        Approve mark
                    </AdminButton>
                    <AdminButton
                        variant="primary"
                        onClick={onSubmit}
                        disabled={!canSubmit || isSubmitting}
                    >
                        Submit onchain mark
                    </AdminButton>
                </div>
            </div>
        </div>
    );
}

export function ValuationPanel() {
    const [pack, setPack] = useState<ValuationPack | null>(null);
    const [sourceObservationsJson, setSourceObservationsJson] = useState('');
    const [cardIdentityJson, setCardIdentityJson] = useState('');
    const [approvedCards, setApprovedCards] = useState<Record<string, true>>({});
    const [persistingCards, setPersistingCards] = useState<Record<string, true>>({});
    const [localError, setLocalError] = useState('');
    const [activeFlowStep, setActiveFlowStep] = useState<'pack' | 'review'>('pack');
    const { address } = useAccount();
    const safeAppInfo = useSafeAppInfo();
    const authAddress = resolveSafeAwareAdminAddress({
        safeAddress: safeAppInfo.safeAddress,
        connectedAddress: address,
        safeContextTimedOut: safeAppInfo.timedOut || safeAppInfo.isLoading,
        fallbackSafeAddress: MAINNET.treasurySafe,
        fallbackSignerAddress: MAINNET.teamWallet,
    }) as `0x${string}` | undefined;
    const isAuthLoading = false;
    const { signMessageAsync, error: signError, isPending: isSigning } = useSignMessage();
    const { writeContractAsync, data: txHash, error: txError, isPending, reset } = useWriteContract();

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
        setPersistingCards({});
    }

    async function signUpdateRequest() {
        if (isAuthLoading) {
            throw new Error('Safe app context is still loading. Wait a moment and try again.');
        }
        if (!authAddress) {
            throw new Error('Connect an authorized admin wallet before updating a valuation pack.');
        }

        const message = `GM10 valuation pack update:${new Date().toISOString()}`;
        const signature = await signMessageAsync({ message });
        return { address: authAddress, message, signature };
    }

    async function persistCardReviewState(input: {
        positionId: number;
        decision: ValuationPackCard['decision'];
        submittedTxHash?: string;
    }) {
        if (!pack) {
            throw new Error('Load or generate a valuation pack before updating card review state.');
        }

        const auth = await signUpdateRequest();
        const payload = await updateValuationPackCard({
            packId: pack.packId,
            ...input,
        }, auth);
        setPack(payload.pack);
        return payload.pack;
    }

    async function loadLatestPack() {
        setLocalError('');
        reset();
        try {
            if (isAuthLoading) {
                throw new Error('Safe app context is still loading. Wait a moment and try again.');
            }
            if (!authAddress) {
                throw new Error('Connect an authorized admin wallet before loading a valuation pack.');
            }

            const message = `GM10 valuation pack read:${new Date().toISOString()}`;
            const signature = await signMessageAsync({ message });
            const payload = await fetchLatestValuationPack({ address: authAddress, message, signature });
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
            if (isAuthLoading) {
                throw new Error('Safe app context is still loading. Wait a moment and try again.');
            }
            if (!authAddress) {
                throw new Error('Connect an authorized admin wallet before generating a valuation pack.');
            }

            const sourceOverrides = parseSourceOverrides(sourceObservationsJson);
            const cardIdentityOverrides = parseCardIdentityOverrides(cardIdentityJson);
            const hasSourceOverrides = Object.keys(sourceOverrides).length > 0;
            const cards = hasSourceOverrides ? activeCards.map((card) => {
                const override = unwrapObservationOverride(sourceOverrides[String(card.positionId)] ?? sourceOverrides[card.cardKey]);
                return {
                    ...card,
                    observations: override ?? card.observations,
                };
            }) : [];
            const message = `GM10 valuation pack generate:${new Date().toISOString()}`;
            const signature = await signMessageAsync({ message });
            const payload = await generateValuationPack({
                cards,
                cardIdentityOverrides,
            }, { address: authAddress, message, signature });
            setPack(payload.pack);
            clearApprovals();
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : 'Unable to generate valuation pack.');
        }
    }

    async function approveCard(card: ValuationPackCard) {
        const positionKey = String(card.positionId);
        setLocalError('');
        setApprovedCards((current) => ({ ...current, [positionKey]: true }));
        setPersistingCards((current) => ({ ...current, [positionKey]: true }));

        try {
            await persistCardReviewState({
                positionId: card.positionId,
                decision: 'approved',
            });
        } catch (error) {
            setApprovedCards((current) => {
                const next = { ...current };
                delete next[positionKey];
                return next;
            });
            setLocalError(error instanceof Error ? error.message : 'Unable to approve valuation card.');
        } finally {
            setPersistingCards((current) => {
                const next = { ...current };
                delete next[positionKey];
                return next;
            });
        }
    }

    async function submitOnchainMark(card: ValuationPackCard) {
        if (card.consensus.status !== 'passed') return;
        const approved = card.decision === 'approved' || Boolean(approvedCards[String(card.positionId)]);
        if (!card.consensus.proposedValueUsdc6 || !approved || isPending) return;
        const positionKey = String(card.positionId);
        setLocalError('');
        setPersistingCards((current) => ({ ...current, [positionKey]: true }));

        try {
            const submittedTxHash = await writeContractAsync({
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

            await persistCardReviewState({
                positionId: card.positionId,
                decision: 'approved',
                submittedTxHash,
            });
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : 'Unable to submit valuation mark.');
        } finally {
            setPersistingCards((current) => {
                const next = { ...current };
                delete next[positionKey];
                return next;
            });
        }
    }

    const approvedCount = pack
        ? pack.cards.filter((card) => card.decision === 'approved' || Boolean(approvedCards[String(card.positionId)])).length
        : Object.values(approvedCards).filter(Boolean).length;
    const submittedCount = pack?.cards.filter((card) => Boolean(card.submittedTxHash)).length ?? 0;
    const needsReviewCount = pack
        ? pack.cards.filter((card) => !card.submittedTxHash && !(card.decision === 'approved' || Boolean(approvedCards[String(card.positionId)]))).length
        : activeCards.length;
    const submittableCount = pack
        ? pack.cards.filter((card) => {
            const approved = card.decision === 'approved' || Boolean(approvedCards[String(card.positionId)]);
            return approved && card.consensus.status === 'passed' && Boolean(card.consensus.proposedValueUsdc6) && !card.submittedTxHash;
        }).length
        : 0;
    const reviewStatus = localError
        ? READ_STATUS.error
        : submittableCount > 0
            ? READ_STATUS.partial
            : submittedCount > 0 && needsReviewCount === 0
                ? READ_STATUS.live
                : pack
                    ? READ_STATUS.partial
                    : READ_STATUS.unavailable;
    return (
        <AdminPage
            eyebrow="Valuation controls"
            title="Valuation workflow"
            description="Run weekly FMV consensus, review provider evidence, and submit approved marks with explicit signing and readiness states."
            statusItems={[
                { label: activeCards.length ? `${activeCards.length} active positions` : 'positions unavailable', status: activeCards.length ? READ_STATUS.live : READ_STATUS.unavailable },
                { label: pack ? 'pack loaded' : 'pack not loaded', status: pack ? READ_STATUS.live : READ_STATUS.unavailable },
                { label: isAuthLoading ? 'Safe context loading' : 'Safe context ready', status: isAuthLoading ? READ_STATUS.partial : READ_STATUS.live },
                { label: localError ? 'local error' : 'no local errors', status: localError ? READ_STATUS.error : READ_STATUS.live },
            ]}
        >
            <OperatorFlowPanel
                title="Valuation review flow"
                description="Generate or load the valuation pack, then approve and submit marks from the active review step."
                steps={[
                    {
                        id: 'valuation-controls',
                        label: 'Build valuation pack',
                        detail: pack ? `Loaded ${pack.packId}.` : 'Sign, generate, or load the latest FMV pack.',
                        status: localError ? READ_STATUS.error : pack ? READ_STATUS.live : activeCards.length ? READ_STATUS.partial : READ_STATUS.unavailable,
                        active: activeFlowStep === 'pack',
                        primary: activeFlowStep === 'pack',
                        onClick: () => setActiveFlowStep('pack'),
                        children: activeFlowStep === 'pack' ? (
                            <Section variant="inline" title="Build valuation pack">
                                <label className="grid gap-2">
                                    <span className="label-font" style={{ color: 'var(--text-tertiary)' }}>Card identity overrides JSON</span>
                                    <textarea
                                        value={cardIdentityJson}
                                        onChange={(event) => setCardIdentityJson(event.target.value)}
                                        className="min-h-24 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/50 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-strong)]"
                                        placeholder='{"4":{"title":"Pokemon card title","grade":"psa10","courtyardUrl":"https://courtyard.io/asset/..."}}'
                                        aria-label="Card identity overrides JSON"
                                    />
                                    <span className="text-xs text-[var(--text-tertiary)]">
                                        Optional. Use this only when a new card is not in custody metadata yet.
                                    </span>
                                </label>
                                <label className="grid gap-2">
                                    <span className="label-font" style={{ color: 'var(--text-tertiary)' }}>Source observations JSON</span>
                                    <textarea
                                        value={sourceObservationsJson}
                                        onChange={(event) => setSourceObservationsJson(event.target.value)}
                                        className="min-h-28 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/50 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-strong)]"
                                        placeholder='{"1":[...]}'
                                        aria-label="Source observations JSON"
                                    />
                                    <span className="text-xs text-[var(--text-tertiary)]">
                                        Optional. Leave empty for PokemonPriceTracker and Courtyard provider discovery.
                                    </span>
                                </label>

                                <div className="flex flex-wrap gap-3">
                                    <AdminButton variant="primary" onClick={runValuationNow} disabled={isSigning || isAuthLoading}>
                                        {isAuthLoading ? 'Loading Safe context' : isSigning ? 'Sign valuation request' : 'Run valuation now'}
                                    </AdminButton>
                                    <AdminButton onClick={loadLatestPack} disabled={isSigning || isAuthLoading}>
                                        {isAuthLoading ? 'Loading Safe context' : isSigning ? 'Sign valuation request' : 'Load latest pack'}
                                    </AdminButton>
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
                            </Section>
                        ) : null,
                    },
                    {
                        id: 'valuation-review-queue',
                        label: 'Review and submit marks',
                        detail: pack ? `${needsReviewCount} needs review, ${submittableCount} submittable.` : 'Load a valuation pack before review.',
                        status: reviewStatus,
                        active: activeFlowStep === 'review',
                        onClick: () => setActiveFlowStep('review'),
                        children: activeFlowStep === 'review' ? (
                            <Section variant="inline" title="Review and submit marks">
                                {pack ? (
                                    <div className="grid gap-4">
                                        {pack.cards.map((card) => {
                                            const approved = card.decision === 'approved' || Boolean(approvedCards[String(card.positionId)]);
                                            const isCardPersisting = Boolean(persistingCards[String(card.positionId)]);
                                            const canSubmit =
                                                approved &&
                                                card.consensus.status === 'passed' &&
                                                Boolean(card.consensus.proposedValueUsdc6) &&
                                                !card.submittedTxHash &&
                                                !isCardPersisting &&
                                                !isPending;

                                            return (
                                                <PackCardView
                                                    key={card.positionId}
                                                    card={card}
                                                    approved={approved}
                                                    onApprove={() => approveCard(card)}
                                                    onSubmit={() => submitOnchainMark(card)}
                                                    canSubmit={canSubmit}
                                                    isSubmitting={isPending || isCardPersisting || isSigning}
                                                />
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-gray-400">
                                        No valuation pack loaded. Generate or load a pack in the first step before reviewing card marks.
                                    </div>
                                )}
                            </Section>
                        ) : null,
                    },
                ]}
            />

            <TxResult hash={txHash} error={txError} />

            <OperatorSummaryGrid>
                <MetricCard
                    label="Valuation decision queue"
                    value={
                        <div className="grid gap-2">
                            <span className="text-3xl tabular-nums">{pack ? needsReviewCount : activeCards.length}</span>
                            <span className="text-base font-semibold text-gray-300">{pack ? 'cards need review' : 'active cards to pack'}</span>
                        </div>
                    }
                    status={pack ? reviewStatus : activeCards.length ? READ_STATUS.partial : READ_STATUS.unavailable}
                    sourceLabel={pack ? 'loaded pack' : 'registry'}
                    accent={reviewStatus === READ_STATUS.error ? 'red' : submittableCount > 0 ? 'yellow' : pack ? 'green' : 'blue'}
                    detail={pack ? `Pack ${pack.packId} generated ${formatTimestamp(pack.generatedAt)}.` : 'Run or load a valuation pack before approving marks.'}
                />
                <LedgerPanel
                    title="Valuation ledger"
                    caption="Registry, pack, approval, and submission state separated from the form controls."
                    rows={[
                        {
                            label: 'Active positions',
                            value: activeCards.length.toString(),
                            status: activeCards.length ? READ_STATUS.live : READ_STATUS.unavailable,
                            detail: 'Registry positions eligible for valuation pack generation.',
                        },
                        {
                            label: 'Loaded pack',
                            value: pack?.packId ?? 'Unavailable',
                            status: pack ? READ_STATUS.live : READ_STATUS.unavailable,
                            detail: pack ? `Generated ${formatTimestamp(pack.generatedAt)}.` : 'Run or load a pack.',
                        },
                        {
                            label: 'Needs review',
                            value: needsReviewCount.toString(),
                            status: pack ? (needsReviewCount > 0 ? READ_STATUS.partial : READ_STATUS.live) : READ_STATUS.unavailable,
                            detail: 'Cards without local or persisted approval.',
                        },
                        {
                            label: 'Approved marks',
                            value: approvedCount.toString(),
                            status: approvedCount > 0 ? READ_STATUS.live : READ_STATUS.unavailable,
                            detail: 'Local or persisted approvals.',
                        },
                        {
                            label: 'Submittable marks',
                            value: submittableCount.toString(),
                            status: submittableCount > 0 ? READ_STATUS.partial : READ_STATUS.unavailable,
                            detail: 'Approved consensus-passed marks not yet submitted.',
                        },
                        {
                            label: 'Submission signer',
                            value: authAddress ? `${authAddress.slice(0, 6)}...${authAddress.slice(-4)}` : 'Unavailable',
                            status: authAddress ? READ_STATUS.configured : READ_STATUS.unavailable,
                            detail: safeAppInfo.isSafeApp ? 'Safe app context.' : 'Wallet or fallback signer.',
                        },
                    ]}
                />
            </OperatorSummaryGrid>

            <MetricGrid>
                <MetricCard label="Active cards" value={activeCards.length.toString()} status={activeCards.length ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel="registry" />
                <MetricCard label="Valuation pack" value={pack?.packId ?? 'Unavailable'} status={pack ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel={pack ? 'loaded' : 'not loaded'} detail={pack ? `Generated ${formatTimestamp(pack.generatedAt)}` : 'Run or load a pack.'} />
                <MetricCard label="Approved cards" value={approvedCount.toString()} status={approvedCount > 0 ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel="local review" />
                <MetricCard label="Submission signer" value={authAddress ? `${authAddress.slice(0, 6)}...${authAddress.slice(-4)}` : 'Unavailable'} status={authAddress ? READ_STATUS.configured : READ_STATUS.unavailable} sourceLabel={safeAppInfo.isSafeApp ? 'Safe app' : 'wallet'} />
            </MetricGrid>

        </AdminPage>
    );
}
