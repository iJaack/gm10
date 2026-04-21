function parseAddress(value: string | undefined): `0x${string}` | undefined {
    if (!value) return undefined;
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return undefined;
    return value as `0x${string}`;
}

function buildExplorerUrl(baseUrl: string, address?: `0x${string}`) {
    return address ? `${baseUrl}/${address}` : baseUrl;
}

export const GM10_CHAIN_ID = Number(import.meta.env.VITE_GM10_CHAIN_ID || 43114);
export const GM10_CHAIN_NAME = import.meta.env.VITE_GM10_CHAIN_NAME || 'Avalanche';
export const GM10_NETWORK_LABEL = import.meta.env.VITE_GM10_NETWORK_LABEL || 'Avalanche Mainnet';
export const GM10_EXPLORER_BASE_URL = import.meta.env.VITE_GM10_EXPLORER_BASE_URL || 'https://snowtrace.io/address';
export const GM10_EXPLORER_TX_BASE_URL = import.meta.env.VITE_GM10_EXPLORER_TX_BASE_URL || 'https://snowtrace.io/tx';
export const POLYGONSCAN_BASE_URL = 'https://polygonscan.com';

// LayerZero endpoint IDs
export const LZ_EID_AVALANCHE = 30106;
export const LZ_EID_POLYGON = 30109;

/**
 * Resolves a chain-appropriate explorer URL for an NFT collection position.
 * Polygon positions link to the specific token instance on polygonscan.
 * Avalanche positions (and fallback) link to the address on snowtrace.
 */
export function collectionExplorerUrl(
    chainEid: number | undefined,
    address: `0x${string}` | undefined,
    tokenId?: string | bigint,
): string {
    if (!address) return GM10_EXPLORER_BASE_URL;
    if (chainEid === LZ_EID_POLYGON) {
        const tokenParam = tokenId !== undefined ? `?a=${tokenId.toString()}` : '';
        return `${POLYGONSCAN_BASE_URL}/token/${address}${tokenParam}`;
    }
    return `${GM10_EXPLORER_BASE_URL}/${address}`;
}

export const ROUND_1_START_AT = Math.floor(new Date('2026-04-13T20:00:00Z').getTime() / 1000);
export const ROUND_1_END_AT = Math.floor(new Date('2026-04-24T20:00:00Z').getTime() / 1000);
export const ROUND_2_START_AT = Math.floor(new Date('2026-04-16T15:00:00Z').getTime() / 1000);
export const ROUND_2_END_AT = Math.floor(new Date('2026-05-16T15:00:00Z').getTime() / 1000);

const fundProxyAddress = parseAddress(
    import.meta.env.VITE_GM10_FUND_PROXY_ADDRESS || '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f',
);
const portfolioRegistryAddress = parseAddress(
    import.meta.env.VITE_GM10_PORTFOLIO_REGISTRY_ADDRESS || '0x02962F73AdFAA792636c62d3D2a76d922c6B052c',
);
const investorAccountingAddress = parseAddress(
    import.meta.env.VITE_GM10_INVESTOR_ACCOUNTING_ADDRESS || '0xFf6195A167e5afa21F98C204ab0B1A3CF0Eb8963',
);
const catchTokenAddress = parseAddress(
    import.meta.env.VITE_GM10_CATCH_TOKEN_ADDRESS || fundProxyAddress,
);
const liquidityCoordinatorAddress = parseAddress(
    import.meta.env.VITE_GM10_LIQUIDITY_COORDINATOR_ADDRESS || '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
);
const lfjPairAddress = parseAddress(import.meta.env.VITE_GM10_LFJ_PAIR_ADDRESS);
const pharaohPoolAddress = parseAddress(import.meta.env.VITE_GM10_PHARAOH_POOL_ADDRESS);

export const GM10_PRIMARY_DEPLOYMENT = {
    proxy: {
        label: 'Fund proxy / $CATCH',
        address: fundProxyAddress,
        snowtraceUrl: buildExplorerUrl(GM10_EXPLORER_BASE_URL, fundProxyAddress),
    },
    portfolioRegistry: {
        label: 'Portfolio registry',
        address: portfolioRegistryAddress,
        snowtraceUrl: buildExplorerUrl(GM10_EXPLORER_BASE_URL, portfolioRegistryAddress),
    },
    investorAccounting: {
        label: 'Investor accounting',
        address: investorAccountingAddress,
        snowtraceUrl: buildExplorerUrl(GM10_EXPLORER_BASE_URL, investorAccountingAddress),
    },
} as const;

export type Gm10ContractLink = {
    label: string;
    address?: `0x${string}`;
    snowtraceUrl: string;
};

export const GM10_POSITION_IDS = [1, 2] as const;

export const GM10_MARKET_CONFIG = {
    catchTokenAddress,
    liquidityCoordinatorAddress,
    lfjPairAddress,
    pharaohPoolAddress,
    dexscreenerTokenUrl: catchTokenAddress
        ? `https://api.dexscreener.com/latest/dex/tokens/${catchTokenAddress}`
        : undefined,
} as const;
