export type MarketplaceChecklistItem = {
    id: string;
    title: string;
    gate: string;
    requiredEvidence: readonly string[];
    courtyardFixture: string;
};

export const MARKETPLACE_CHECKLIST_ITEMS = [
    {
        id: 'registry-approval',
        title: 'Registry approval',
        gate: 'Marketplace label is approved in the portfolio registry before funds or collectibles move.',
        requiredEvidence: ['Marketplace label', 'marketplace ID', 'approval transaction'],
        courtyardFixture: 'COURTYARD marketplace approval is the first fixture.',
    },
    {
        id: 'custody-reference',
        title: 'Custody reference',
        gate: 'The venue-specific vault, wallet, or custody account is linked to the position provenance.',
        requiredEvidence: ['Custody Safe or wallet', 'external asset ID', 'marketplace provenance ref'],
        courtyardFixture: 'Polygon custody Safe plus Courtyard asset ID.',
    },
    {
        id: 'fee-model',
        title: 'Fee model',
        gate: 'Gross price, marketplace fees, bridge fees, and net proceeds can be reconciled in USDT terms.',
        requiredEvidence: ['Gross amount', 'marketplace fees', 'bridge or withdrawal fees', 'net amount'],
        courtyardFixture: 'Courtyard sale form records gross proceeds, marketplace fees, bridge fees, and net proceeds.',
    },
    {
        id: 'settlement-proof',
        title: 'Settlement proof',
        gate: 'Purchase or sale settlement has a durable proof reference before the final state is recorded.',
        requiredEvidence: ['Execution ref', 'settlement or proceeds ref', 'proof ref'],
        courtyardFixture: 'Courtyard buy or sale tx plus supporting transfer/proceeds proof.',
    },
    {
        id: 'valuation-source',
        title: 'Valuation source',
        gate: 'The venue can feed public marks directly or through an accepted comparable/listing source.',
        requiredEvidence: ['Primary mark source', 'fallback source', 'freshness expectation'],
        courtyardFixture: 'Public valuation projection can use Courtyard marks when PokemonPriceTracker is unavailable.',
    },
    {
        id: 'failure-handling',
        title: 'Failure handling',
        gate: 'Operators have an unwind path for expired listings, failed settlements, stale marks, and partial proceeds.',
        requiredEvidence: ['Cancel path', 'refund or unwind path', 'stale-data fallback', 'operator owner'],
        courtyardFixture: 'Courtyard workflow includes cancelable purchase and sale authorizations.',
    },
] as const satisfies readonly MarketplaceChecklistItem[];

export type MarketplaceChecklistItemId = typeof MARKETPLACE_CHECKLIST_ITEMS[number]['id'];

const MARKETPLACE_CHECKLIST_IDS = new Set<string>(MARKETPLACE_CHECKLIST_ITEMS.map((item) => item.id));

export type MarketplaceChecklistSummary = {
    total: number;
    completed: number;
    complete: boolean;
    missingIds: MarketplaceChecklistItemId[];
};

export function isMarketplaceChecklistItemId(value: string): value is MarketplaceChecklistItemId {
    return MARKETPLACE_CHECKLIST_IDS.has(value);
}

export function summarizeMarketplaceChecklist(completedIds: readonly string[]): MarketplaceChecklistSummary {
    const completed = new Set(completedIds.filter(isMarketplaceChecklistItemId));
    const missingIds = MARKETPLACE_CHECKLIST_ITEMS
        .map((item) => item.id)
        .filter((id) => !completed.has(id));

    return {
        total: MARKETPLACE_CHECKLIST_ITEMS.length,
        completed: completed.size,
        complete: missingIds.length === 0,
        missingIds,
    };
}
