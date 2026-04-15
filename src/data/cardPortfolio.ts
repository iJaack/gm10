export type CardMetadata = {
    title: string;
    subtitle?: string;
    imageSrc: string;
    imageAlt: string;
    courtyardUrl?: string;
    proofUrl?: string;
    note?: string;
};

export const CARD_IMAGE_FALLBACK = {
    imageSrc: '/brand/cover-pokeball-night.webp',
    imageAlt: 'GM10 card custody artwork',
} as const;

export const CARD_METADATA_BY_POSITION_ID: Record<number, CardMetadata> = {
    1: {
        title: '2021 Pokemon Sword & Shield Gengar VMAX',
        subtitle: 'High-Class Deck #002, PSA 10 GEM MINT',
        imageSrc: '/brand/cover-pokeball-night.webp',
        imageAlt: 'GM10 Gengar VMAX holding',
        courtyardUrl: 'https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008',
        note: 'Recorded from Courtyard purchase execution and held as a Polygon collectible position.',
    },
};

export function metadataForPosition(positionId: number): CardMetadata {
    return CARD_METADATA_BY_POSITION_ID[positionId] ?? {
        title: `Recorded card #${positionId}`,
        subtitle: 'Metadata pending',
        imageSrc: CARD_IMAGE_FALLBACK.imageSrc,
        imageAlt: CARD_IMAGE_FALLBACK.imageAlt,
        note: 'The registry position is live onchain. Human-readable card metadata has not been curated yet.',
    };
}
