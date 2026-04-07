// Avalanche Fuji testnet — fujiPurchaseTest proxy (deployer has GOVERNANCE_ROLE)
export const FUJI = {
    fundProxy:         '0x0C0A8D5bb3f8BD3002cad720a149c2b99e6ed1C9' as const,
    portfolioRegistry: '0x79678b78f7c2b8099bBd18d6754891774632F8F4' as const,
    stargateAdapter:   '0xc85c4eE751D1B8A0838785579eaB570Fc6e9f75D' as const,
    mockStargate:      '0xad6386961844053e86B7EC880320dDc0A11007c2' as const,
} as const;

// Token addresses on Fuji
export const FUJI_TOKENS = {
    WAVAX: '0xd00ae08403b9bbb9124bb305c09058e32c39a48f' as const,
    USDC:  '0x5425890298aed601595a70AB815c96711a31Bc65' as const,
} as const;

// LayerZero endpoint IDs
export const LZ_EID = {
    AVALANCHE_MAINNET: 30106,
    AVALANCHE_FUJI:    43113,
    POLYGON_MAINNET:   30109,
    POLYGON_AMOY:      40267,
} as const;

export const KNOWN_CHAIN_NAMES: Record<number, string> = {
    [LZ_EID.AVALANCHE_MAINNET]: 'Avalanche',
    [LZ_EID.AVALANCHE_FUJI]:    'Fuji (testnet)',
    [LZ_EID.POLYGON_MAINNET]:   'Polygon',
    [LZ_EID.POLYGON_AMOY]:      'Amoy (testnet)',
};
