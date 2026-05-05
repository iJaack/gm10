import { describe, expect, it } from 'vitest';
import { normalizePublicValuationOverrides, publicValuationUrl } from './publicValuation';

describe('public valuation overrides', () => {
    it('keeps submitted positive marks keyed by position id', () => {
        const overrides = normalizePublicValuationOverrides({
            generatedAt: '2026-04-21T10:00:00.000Z',
            marks: [
                {
                    positionId: 7,
                    valueUsdc6: '1100000000',
                    submittedTxHash: '0xabc',
                },
            ],
        });

        expect(overrides[7].valueUsdt6).toBe(1100_000000n);
        expect(overrides[7].generatedAt).toBe('2026-04-21T10:00:00.000Z');
        expect(overrides[7].submittedTxHash).toBe('0xabc');
    });

    it('ignores malformed or zero marks', () => {
        const overrides = normalizePublicValuationOverrides({
            marks: [
                { positionId: 0, valueUsdc6: '100000000' },
                { positionId: 1, valueUsdc6: '0' },
                { positionId: 2, valueUsdc6: 'nope' },
            ],
        });

        expect(overrides).toEqual({});
    });

    it('uses the unified same-origin valuation API by default', () => {
        const previousOrigin = import.meta.env.VITE_GM10_ADMIN_ORIGIN;
        delete (import.meta.env as Record<string, string | undefined>).VITE_GM10_ADMIN_ORIGIN;

        try {
            expect(publicValuationUrl()).toBe('/api/valuation-public');
        } finally {
            if (previousOrigin === undefined) {
                delete (import.meta.env as Record<string, string | undefined>).VITE_GM10_ADMIN_ORIGIN;
            } else {
                (import.meta.env as Record<string, string | undefined>).VITE_GM10_ADMIN_ORIGIN = previousOrigin;
            }
        }
    });

    it('keeps the explicit admin origin override when configured', () => {
        const previousOrigin = import.meta.env.VITE_GM10_ADMIN_ORIGIN;
        (import.meta.env as Record<string, string | undefined>).VITE_GM10_ADMIN_ORIGIN = 'https://admin.gm10.xyz/';

        try {
            expect(publicValuationUrl()).toBe('https://admin.gm10.xyz/api/valuation-public');
        } finally {
            if (previousOrigin === undefined) {
                delete (import.meta.env as Record<string, string | undefined>).VITE_GM10_ADMIN_ORIGIN;
            } else {
                (import.meta.env as Record<string, string | undefined>).VITE_GM10_ADMIN_ORIGIN = previousOrigin;
            }
        }
    });
});
