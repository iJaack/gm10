function parseAddress(value: string | undefined) {
    if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) return undefined;
    return value as `0x${string}`;
}

export const MAINNET = {
    fundProxy: parseAddress(import.meta.env.VITE_GM10_ADMIN_FUND_PROXY_ADDRESS ?? import.meta.env.VITE_GM10_FUND_PROXY_ADDRESS) ?? '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f',
    portfolioRegistry: parseAddress(import.meta.env.VITE_GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS ?? import.meta.env.VITE_GM10_PORTFOLIO_REGISTRY_ADDRESS) ?? '0x02962F73AdFAA792636c62d3D2a76d922c6B052c',
    liquidityCoordinator: parseAddress(import.meta.env.VITE_GM10_ADMIN_LIQUIDITY_COORDINATOR_ADDRESS) ?? '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
    courtyardWorkflow: parseAddress(import.meta.env.VITE_GM10_ADMIN_COURTYARD_WORKFLOW_ADDRESS) ?? '0x5448884263E8C27c87CCE6279faE8175271D131c',
    polygonCourtyardSafe: parseAddress(import.meta.env.VITE_GM10_ADMIN_POLYGON_COURTYARD_SAFE_ADDRESS) ?? '0x39971795266a794a8156271729A07994952a6FAD',
    stargateAdapter: parseAddress(import.meta.env.VITE_GM10_ADMIN_STARGATE_ADAPTER_ADDRESS),
} as const;

export const MAINNET_TOKENS = {
    WAVAX: parseAddress(import.meta.env.VITE_GM10_ADMIN_WAVAX_ADDRESS) ?? '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    USDC: parseAddress(import.meta.env.VITE_GM10_ADMIN_USDC_ADDRESS) ?? '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
} as const;

export const EXPLORER_TX_BASE_URL = import.meta.env.VITE_GM10_ADMIN_EXPLORER_TX_BASE_URL ?? 'https://snowtrace.io/tx';

export const LZ_EID = {
    AVALANCHE_MAINNET: 30106,
    AVALANCHE_FUJI: 43113,
    POLYGON_MAINNET: 30109,
    POLYGON_AMOY: 40267,
} as const;

export const KNOWN_CHAIN_NAMES: Record<number, string> = {
    [LZ_EID.AVALANCHE_MAINNET]: 'Avalanche',
    [LZ_EID.AVALANCHE_FUJI]: 'Fuji',
    [LZ_EID.POLYGON_MAINNET]: 'Polygon',
    [LZ_EID.POLYGON_AMOY]: 'Amoy',
};
