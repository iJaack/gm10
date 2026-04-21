import { describe, expect, it } from 'vitest';
import {
    MARKETPLACE_CHECKLIST_ITEMS,
    isMarketplaceChecklistItemId,
    summarizeMarketplaceChecklist,
} from './marketplaceChecklist';

describe('marketplace checklist', () => {
    it('covers every required marketplace onboarding gate', () => {
        expect(MARKETPLACE_CHECKLIST_ITEMS.map((item) => item.id)).toEqual([
            'registry-approval',
            'custody-reference',
            'fee-model',
            'settlement-proof',
            'valuation-source',
            'failure-handling',
        ]);

        for (const item of MARKETPLACE_CHECKLIST_ITEMS) {
            expect(item.requiredEvidence.length).toBeGreaterThanOrEqual(3);
            expect(item.gate).toContain('.');
            expect(item.courtyardFixture.toLowerCase()).toContain('courtyard');
        }
    });

    it('summarizes accepted checklist evidence and ignores unknown ids', () => {
        const summary = summarizeMarketplaceChecklist([
            'registry-approval',
            'registry-approval',
            'custody-reference',
            'unknown-gate',
        ]);

        expect(summary).toEqual({
            total: 6,
            completed: 2,
            complete: false,
            missingIds: ['fee-model', 'settlement-proof', 'valuation-source', 'failure-handling'],
        });
    });

    it('detects a complete marketplace checklist', () => {
        const ids = MARKETPLACE_CHECKLIST_ITEMS.map((item) => item.id);

        expect(ids.every(isMarketplaceChecklistItemId)).toBe(true);
        expect(summarizeMarketplaceChecklist(ids).complete).toBe(true);
    });
});
