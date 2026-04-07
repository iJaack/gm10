// Known contract addresses on Avalanche Fuji testnet.
// Update after V4 deployment.
export const FUJI = {
    fundProxy:         '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C' as const,
    portfolioRegistry: '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9' as const,
    // Fill in after deployStargateBridgeAdapter.js:
    stargateAdapter:   '' as `0x${string}`,
} as const;

// Common token addresses on Fuji
export const FUJI_TOKENS = {
    WAVAX: '0xd00ae08403b9bbb9124bb305c09058e32c39a48f' as const,
    USDC:  '' as `0x${string}`, // bridged USDC on Fuji — fill in after deployment
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
