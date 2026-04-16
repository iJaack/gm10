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
        imageSrc: 'https://static.courtyard.io/graded-cards-renders/PSA%20140897946/nft_image.jpg',
        imageAlt: 'Gengar VMAX PSA 10 — GM10 position #1',
        courtyardUrl: 'https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008',
        note: 'Recorded from Courtyard purchase execution and held as a Polygon collectible position.',
    },
    2: {
        title: '2023 Pokemon Sv1a-Triplet Beat #080 Magikarp - Art Rare',
        subtitle: 'PSA 10 GEM MINT',
        imageSrc: 'https://static.courtyard.io/graded-cards-renders/PSA%20102324513/nft_image.jpg',
        imageAlt: 'Magikarp Art Rare PSA 10 — GM10 position #2',
        courtyardUrl: 'https://courtyard.io/asset/3593e6341cbcbc1765b92f4ebe46eb29a63dcb9a861886d2332d4ddce9658286',
        note: 'Recorded from Courtyard purchase execution and held as a Polygon collectible position.',
    },
    3: {
        title: '2024 Pokemon Sv8a-Terastal Fest EX Umbreon EX',
        subtitle: '#217 Holo Special Art Rare, PSA 10 GEM MINT',
        imageSrc: 'https://static.courtyard.io/graded-cards-renders/PSA%20102200180/nft_image.jpg',
        imageAlt: 'Umbreon EX Special Art Rare PSA 10 — GM10 position #3',
        courtyardUrl: 'https://courtyard.io/asset/90f85586da4ba09bcf5c81b9560c094cfc2d9d3690eed7c9f4b4832056f765d9',
        note: 'Recorded from Courtyard purchase execution and held as a Polygon collectible position.',
    },
};

export function hasCuratedMetadataForPosition(positionId: number) {
    return Boolean(CARD_METADATA_BY_POSITION_ID[positionId]);
}

export function metadataForPosition(positionId: number, liveMetadata?: CardMetadata): CardMetadata {
    const curated = CARD_METADATA_BY_POSITION_ID[positionId];
    if (liveMetadata) return liveMetadata;
    if (curated) return curated;

    return {
        title: `Recorded card #${positionId}`,
        subtitle: 'Metadata pending',
        imageSrc: CARD_IMAGE_FALLBACK.imageSrc,
        imageAlt: CARD_IMAGE_FALLBACK.imageAlt,
        note: 'The registry position is live onchain. Human-readable card metadata has not been curated yet.',
    };
}
