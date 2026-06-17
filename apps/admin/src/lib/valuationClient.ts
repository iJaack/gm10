export type SourceObservation = {
    sourceId: string;
    sourceName: string;
    cardKey: string;
    observedAt: string;
    fetchedAt: string;
    valueUsdc6: string;
    currency: string;
    confidence: number;
    rawPayloadRef: string;
    sourceUrl: string;
    matchReason: string;
};

export type ValuationPackCard = {
    positionId: number;
    cardKey: string;
    title: string;
    currentValueUsdc6: string;
    observations: SourceObservation[];
    consensus: {
        status: 'passed' | 'needs_review';
        proposedValueUsdc6?: string;
        validSourceCount: number;
        agreeingSourceIds: string[];
        warnings: string[];
    };
    decision: 'pending' | 'approved' | 'rejected';
    sourceRef: `0x${string}`;
    proofHash: `0x${string}`;
    submittedTxHash: string;
};

export type ValuationPack = {
    packId: string;
    generatedAt: string;
    cadence: string;
    unit: 'USDC_6';
    cards: ValuationPackCard[];
};

export type ValuationSourceReadiness = {
    providers: Array<{
        sourceId: string;
        providerId: string;
        sourceName: string;
        status: 'configured' | 'missing_auth' | 'missing_provider' | 'available_with_identity';
        detail: string;
    }>;
    sourceQuality: Array<{
        sourceId: string;
        live: number;
        missing: number;
        rateLimited: number;
        examples: Array<{
            positionId: number;
            sourceName: string;
            reason: string;
        }>;
    }>;
};

type ValuationPackCardInput = Pick<
    ValuationPackCard,
    'positionId' | 'cardKey' | 'title' | 'currentValueUsdc6' | 'observations'
>;

type CardIdentityOverrides = Record<string, {
    title?: string;
    subtitle?: string;
    search?: string;
    grade?: string;
    tcgPlayerId?: string;
    courtyardAssetId?: string;
    courtyardUrl?: string;
    days?: number;
}>;

type GenerateValuationPackInput = {
    cards?: ValuationPackCardInput[];
    cardIdentityOverrides?: CardIdentityOverrides;
};

type ValuationPackResponse = {
    pack: ValuationPack | null;
    sourceReadiness?: ValuationSourceReadiness;
};

type GenerateValuationPackResponse = {
    pack: ValuationPack;
    sourceReadiness?: ValuationSourceReadiness;
    error?: string;
};

export type ValuationPackAuth = {
    address: `0x${string}`;
    message: string;
    signature: `0x${string}`;
};

export type GenerateValuationPackAuth = ValuationPackAuth;

type UpdateValuationPackCardInput = {
    packId: string;
    positionId: number;
    decision: ValuationPackCard['decision'];
    submittedTxHash?: string;
};

function valuationPackAuthHeaders(auth: ValuationPackAuth) {
    return {
        'x-gm10-admin-address': auth.address,
        'x-gm10-admin-message': auth.message,
        'x-gm10-admin-signature': auth.signature,
    };
}

export async function fetchLatestValuationPack(auth: ValuationPackAuth) {
    const response = await fetch('/api/valuation-pack', {
        headers: {
            Accept: 'application/json',
            ...valuationPackAuthHeaders(auth),
        },
    });

    if (!response.ok) {
        throw new Error(`Valuation pack returned ${response.status}`);
    }

    return response.json() as Promise<ValuationPackResponse>;
}

export async function generateValuationPack(input: GenerateValuationPackInput, auth: GenerateValuationPackAuth) {
    const response = await fetch('/api/valuation-pack', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...valuationPackAuthHeaders(auth),
        },
        body: JSON.stringify({
            action: 'generate',
            cards: input.cards ?? [],
            cardIdentityOverrides: input.cardIdentityOverrides,
        }),
    });
    const payload = (await response.json()) as GenerateValuationPackResponse;

    if (!response.ok) {
        throw new Error(payload.error || `Valuation pack returned ${response.status}`);
    }

    return payload as { pack: ValuationPack; sourceReadiness?: ValuationSourceReadiness };
}

export async function updateValuationPackCard(input: UpdateValuationPackCardInput, auth: ValuationPackAuth) {
    const response = await fetch('/api/valuation-pack', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...valuationPackAuthHeaders(auth),
        },
        body: JSON.stringify({
            action: 'update-card',
            packId: input.packId,
            positionId: input.positionId,
            decision: input.decision,
            submittedTxHash: input.submittedTxHash,
        }),
    });
    const payload = (await response.json()) as GenerateValuationPackResponse;

    if (!response.ok) {
        throw new Error(payload.error || `Valuation pack returned ${response.status}`);
    }

    return payload as { pack: ValuationPack; sourceReadiness?: ValuationSourceReadiness };
}
