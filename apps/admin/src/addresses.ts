function parseAddress(value: string | undefined) {
    if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) return undefined;
    return value as `0x${string}`;
}

export const MAINNET = {
    fundProxy: parseAddress(import.meta.env.VITE_GM10_ADMIN_FUND_PROXY_ADDRESS ?? import.meta.env.VITE_GM10_FUND_PROXY_ADDRESS) ?? '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f',
    portfolioRegistry: parseAddress(import.meta.env.VITE_GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS ?? import.meta.env.VITE_GM10_PORTFOLIO_REGISTRY_ADDRESS) ?? '0x0fCbce2341E3682AB92f1cAabDF976E17D91436A',
    liquidityCoordinator: parseAddress(import.meta.env.VITE_GM10_ADMIN_LIQUIDITY_COORDINATOR_ADDRESS) ?? '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
    courtyardWorkflow: parseAddress(import.meta.env.VITE_GM10_ADMIN_COURTYARD_WORKFLOW_ADDRESS) ?? '0x5448884263E8C27c87CCE6279faE8175271D131c',
    treasurySafe: parseAddress(import.meta.env.VITE_GM10_ADMIN_TREASURY_SAFE_ADDRESS) ?? '0x39971795266a794a8156271729A07994952a6FAD',
    teamWallet: parseAddress(import.meta.env.VITE_GM10_ADMIN_TEAM_WALLET_ADDRESS) ?? '0x5cA0A679025B6c7dA08a70be3b244399fF0D7813',
    polygonCourtyardSafe: parseAddress(import.meta.env.VITE_GM10_ADMIN_POLYGON_COURTYARD_SAFE_ADDRESS) ?? '0x39971795266a794a8156271729A07994952a6FAD',
    polygonCourtyardHotWallet: parseAddress(import.meta.env.VITE_GM10_ADMIN_POLYGON_COURTYARD_HOT_WALLET_ADDRESS) ?? '0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50',
    stargateAdapter: parseAddress(import.meta.env.VITE_GM10_ADMIN_STARGATE_ADAPTER_ADDRESS),
    avaxUsdFeed: parseAddress(import.meta.env.VITE_GM10_ADMIN_AVAX_USD_FEED_ADDRESS ?? import.meta.env.VITE_GM10_AVAX_USD_FEED_ADDRESS) ?? '0x0A77230d17318075983913bC2145DB16C7366156',
} as const;

export const MAINNET_TOKENS = {
    WAVAX: parseAddress(import.meta.env.VITE_GM10_ADMIN_WAVAX_ADDRESS) ?? '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    USDC: parseAddress(import.meta.env.VITE_GM10_ADMIN_USDC_ADDRESS) ?? '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
} as const;

export const FUJI = {
    fundProxy: parseAddress(import.meta.env.VITE_GM10_ADMIN_FUJI_FUND_PROXY_ADDRESS) ?? '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C',
    portfolioRegistry: parseAddress(import.meta.env.VITE_GM10_ADMIN_FUJI_PORTFOLIO_REGISTRY_ADDRESS) ?? '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
    stargateAdapter: parseAddress(import.meta.env.VITE_GM10_ADMIN_FUJI_STARGATE_ADAPTER_ADDRESS ?? import.meta.env.VITE_GM10_ADMIN_STARGATE_ADAPTER_ADDRESS),
} as const;

export const FUJI_TOKENS = {
    WAVAX: parseAddress(import.meta.env.VITE_GM10_ADMIN_FUJI_WAVAX_ADDRESS) ?? '0xd00ae08403B9bbb9124Bbb305C09058E32C39A48c',
    USDC: parseAddress(import.meta.env.VITE_GM10_ADMIN_FUJI_USDC_ADDRESS) ?? '0x5425890298aed601595a70AB815c96711a31Bc65',
} as const;

export const LIQUIDITY_VENUES = {
    deadAddress: '0x000000000000000000000000000000000000dEaD' as const,
    legacyJoeRouter: parseAddress(import.meta.env.VITE_GM10_ADMIN_LEGACY_JOE_ROUTER_ADDRESS) ?? '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    pharaohSwapRouter: parseAddress(import.meta.env.VITE_GM10_ADMIN_PHARAOH_SWAP_ROUTER_ADDRESS) ?? '0xc8B8fCbDb5C019D7802fFb0b39603395D7d3915c',
    pharaohPositionManager: parseAddress(import.meta.env.VITE_GM10_ADMIN_PHARAOH_POSITION_MANAGER_ADDRESS) ?? '0x0B4478e810D48B5882D4019D435A2f864Bab4F39',
    pharaohQuoter: parseAddress(import.meta.env.VITE_GM10_ADMIN_PHARAOH_QUOTER_ADDRESS) ?? '0xB7297301b7CC659BB96D51754643A0Df6eEA2138',
    pharaohPool: parseAddress(import.meta.env.VITE_GM10_ADMIN_PHARAOH_CATCH_WAVAX_POOL_ADDRESS) ?? '0x1D4Cf678129cdDF63fBc31ca58cB24048955651f',
} as const;

export const EXPLORER_TX_BASE_URL = import.meta.env.VITE_GM10_ADMIN_EXPLORER_TX_BASE_URL ?? 'https://snowtrace.io/tx';

export const LZ_EID = {
    AVALANCHE_MAINNET: 30106,
    AVALANCHE_FUJI: 43113,
    POLYGON_MAINNET: 30109,
    POLYGON_AMOY: 40267,
    SOLANA_MAINNET: 30168,
    SOLANA_DEVNET: 40168,
} as const;

export const KNOWN_CHAIN_NAMES: Record<number, string> = {
    [LZ_EID.AVALANCHE_MAINNET]: 'Avalanche',
    [LZ_EID.AVALANCHE_FUJI]: 'Fuji',
    [LZ_EID.POLYGON_MAINNET]: 'Polygon',
    [LZ_EID.POLYGON_AMOY]: 'Amoy',
    [LZ_EID.SOLANA_MAINNET]: 'Solana',
    [LZ_EID.SOLANA_DEVNET]: 'Solana Devnet',
};
