export type PublicValuationMark = {
    positionId: number;
    title?: string;
    valueUsdc6: string;
    generatedAt?: string;
    submittedTxHash?: string;
};

export type PublicValuationResponse = {
    packId?: string | null;
    generatedAt?: string | null;
    source?: 'submitted' | 'live';
    marks?: PublicValuationMark[];
};

export type PublicValuationOverride = {
    valueUsdt6: bigint;
    generatedAt?: string;
    submittedTxHash?: string;
};

function isPositiveRawUsdc6(value: string) {
    try {
        return BigInt(value) > 0n;
    } catch {
        return false;
    }
}

export function normalizePublicValuationOverrides(
    payload: PublicValuationResponse | undefined,
): Record<number, PublicValuationOverride> {
    const overrides: Record<number, PublicValuationOverride> = {};
    for (const mark of payload?.marks ?? []) {
        if (!Number.isInteger(mark.positionId) || mark.positionId <= 0) continue;
        if (!isPositiveRawUsdc6(mark.valueUsdc6)) continue;

        overrides[mark.positionId] = {
            valueUsdt6: BigInt(mark.valueUsdc6),
            generatedAt: mark.generatedAt ?? payload?.generatedAt ?? undefined,
            submittedTxHash: mark.submittedTxHash,
        };
    }

    return overrides;
}

export function publicValuationUrl() {
    const configuredOrigin = import.meta.env.VITE_GM10_ADMIN_ORIGIN;
    if (!configuredOrigin) return '/api/valuation-public';

    const origin = String(configuredOrigin).replace(/\/+$/, '');
    return `${origin}/api/valuation-public`;
}
