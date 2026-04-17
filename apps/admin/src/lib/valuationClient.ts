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

type ValuationPackCardInput = Pick<
    ValuationPackCard,
    'positionId' | 'cardKey' | 'title' | 'currentValueUsdc6' | 'observations'
>;

type ValuationPackResponse = {
    pack: ValuationPack | null;
};

type GenerateValuationPackResponse = {
    pack: ValuationPack;
    error?: string;
};

export async function fetchLatestValuationPack() {
    const response = await fetch('/api/valuation-pack', {
        headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Valuation pack returned ${response.status}`);
    }

    return response.json() as Promise<ValuationPackResponse>;
}

export async function generateValuationPack(cards: ValuationPackCardInput[]) {
    const response = await fetch('/api/valuation-pack', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate', cards }),
    });
    const payload = (await response.json()) as GenerateValuationPackResponse;

    if (!response.ok) {
        throw new Error(payload.error || `Valuation pack returned ${response.status}`);
    }

    return payload as { pack: ValuationPack };
}
