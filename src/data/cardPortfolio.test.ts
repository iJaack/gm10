import { describe, expect, it } from 'vitest';
import { hasCuratedMetadataForPosition, metadataForPosition } from './cardPortfolio';

describe('card portfolio metadata', () => {
    it('keeps curated metadata for known positions', () => {
        expect(hasCuratedMetadataForPosition(1)).toBe(true);
        expect(metadataForPosition(1).subtitle).toMatch(/PSA 10/i);
    });

    it('includes the currently recorded third position metadata', () => {
        const metadata = metadataForPosition(3);

        expect(metadata.title).toMatch(/Umbreon EX/i);
        expect(metadata.subtitle).toMatch(/PSA 10 GEM MINT/i);
        expect(metadata.courtyardUrl).toContain('90f85586da4ba09bcf5c81b9560c094cfc2d9d3690eed7c9f4b4832056f765d9');
    });

    it('includes the currently recorded second position metadata', () => {
        const metadata = metadataForPosition(2);

        expect(metadata.title).toMatch(/Magikarp - Art Rare/i);
        expect(metadata.subtitle).toMatch(/PSA 10 GEM MINT/i);
        expect(metadata.courtyardUrl).toContain('3593e6341cbcbc1765b92f4ebe46eb29a63dcb9a861886d2332d4ddce9658286');
    });

    it('lets live ERC-721 metadata override stale curated fallbacks', () => {
        const metadata = metadataForPosition(2, {
            title: 'Live tokenURI Magikarp',
            subtitle: 'Live PSA 10',
            imageSrc: 'https://example.com/live-card.png',
            imageAlt: 'Live Magikarp',
            note: 'Loaded from tokenURI',
        });

        expect(metadata.title).toBe('Live tokenURI Magikarp');
        expect(metadata.subtitle).toBe('Live PSA 10');
        expect(metadata.imageSrc).toBe('https://example.com/live-card.png');
    });

    it('uses live ERC-721 metadata for newly recorded positions without curated fallback', () => {
        const metadata = metadataForPosition(4, {
            title: 'Live tokenURI card',
            subtitle: 'PSA 10',
            imageSrc: 'https://example.com/card.png',
            imageAlt: 'Live card',
            note: 'Loaded from tokenURI',
        });

        expect(metadata.title).toBe('Live tokenURI card');
        expect(metadata.subtitle).toBe('PSA 10');
        expect(metadata.imageSrc).toBe('https://example.com/card.png');
        expect(metadata.note).toBe('Loaded from tokenURI');
    });

    it('falls back only when neither curated nor live metadata exists', () => {
        expect(metadataForPosition(99).title).toBe('Recorded card #99');
        expect(metadataForPosition(99).subtitle).toBe('Metadata pending');
    });
});
