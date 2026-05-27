function parseAddress(value: string | undefined): `0x${string}` | undefined {
    if (!value) return undefined;
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return undefined;
    return value as `0x${string}`;
}

function parsePositiveNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
    import.meta.env.VITE_GM10_PORTFOLIO_REGISTRY_ADDRESS || '0x0fCbce2341E3682AB92f1cAabDF976E17D91436A',
);
const investorAccountingAddress = parseAddress(
    import.meta.env.VITE_GM10_INVESTOR_ACCOUNTING_ADDRESS || '0xFf6195A167e5afa21F98C204ab0B1A3CF0Eb8963',
);
const tokenomicsControllerAddress = parseAddress(
    import.meta.env.VITE_GM10_TOKENOMICS_CONTROLLER_ADDRESS || '0x65acE06bbc9e079321451FAfaaD7C58223b20b26',
);
const continuousCommitReceiverAddress = parseAddress(
    import.meta.env.VITE_GM10_CONTINUOUS_COMMIT_RECEIVER_ADDRESS || '0xb6bf4AC2C381308dF57f387f00DD81E5962FC027',
);
const continuousSettlementTokenAddress = parseAddress(
    import.meta.env.VITE_GM10_CONTINUOUS_SETTLEMENT_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
);
const catchTokenAddress = parseAddress(
    import.meta.env.VITE_GM10_CATCH_TOKEN_ADDRESS || fundProxyAddress,
);
const wavaxAddress = parseAddress(
    import.meta.env.VITE_GM10_WAVAX_ADDRESS || '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
);
const liquidityCoordinatorAddress = parseAddress(
    import.meta.env.VITE_GM10_LIQUIDITY_COORDINATOR_ADDRESS || '0xA6e71aB7CFE09D9C0bef4051366169FB2aC698a9',
);
const avaxUsdFeedAddress = parseAddress(
    import.meta.env.VITE_GM10_AVAX_USD_FEED_ADDRESS || '0x0A77230d17318075983913bC2145DB16C7366156',
);
const treasurySafeAddress = parseAddress(
    import.meta.env.VITE_GM10_TREASURY_SAFE_ADDRESS
    || import.meta.env.VITE_GM10_ADMIN_TREASURY_SAFE_ADDRESS
    || '0x39971795266a794a8156271729A07994952a6FAD',
);
const teamWalletAddress = parseAddress(
    import.meta.env.VITE_GM10_TEAM_WALLET_ADDRESS
    || import.meta.env.VITE_GM10_ADMIN_TEAM_WALLET_ADDRESS
    || '0x5cA0A679025B6c7dA08a70be3b244399fF0D7813',
);
const courtyardWorkflowAddress = parseAddress(
    import.meta.env.VITE_GM10_COURTYARD_WORKFLOW_ADDRESS
    || import.meta.env.VITE_GM10_ADMIN_COURTYARD_WORKFLOW_ADDRESS
    || '0x5448884263E8C27c87CCE6279faE8175271D131c',
);
const lfjPairAddress = parseAddress(
    import.meta.env.VITE_GM10_LFJ_PAIR_ADDRESS || '0xDc6523f6275bc91cEA2dE1C8e178B65da1F2ee53',
);
const pharaohPoolAddress = parseAddress(
    import.meta.env.VITE_GM10_PHARAOH_POOL_ADDRESS || '0x1D4Cf678129cdDF63fBc31ca58cB24048955651f',
);

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
    tokenomicsController: {
        label: 'V7 tokenomics controller',
        address: tokenomicsControllerAddress,
        snowtraceUrl: buildExplorerUrl(GM10_EXPLORER_BASE_URL, tokenomicsControllerAddress),
    },
    continuousCommitReceiver: {
        label: 'Continuous commit receiver',
        address: continuousCommitReceiverAddress,
        snowtraceUrl: buildExplorerUrl(GM10_EXPLORER_BASE_URL, continuousCommitReceiverAddress),
    },
    continuousSettlementToken: {
        label: 'Continuous settlement token',
        address: continuousSettlementTokenAddress,
        snowtraceUrl: buildExplorerUrl(GM10_EXPLORER_BASE_URL, continuousSettlementTokenAddress),
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
    wavaxAddress,
    liquidityCoordinatorAddress,
    avaxUsdFeedAddress,
    lfjPairAddress,
    pharaohPoolAddress,
    tokenomicsControllerAddress,
    dexscreenerTokenUrl: catchTokenAddress
        ? `https://api.dexscreener.com/latest/dex/tokens/${catchTokenAddress}`
        : undefined,
    lastKnownSpotPriceUsd: parsePositiveNumber(import.meta.env.VITE_GM10_LAST_KNOWN_CATCH_PRICE_USD),
} as const;

export const GM10_TREASURY_WALLETS = {
    fundProxy: {
        label: 'Fund proxy',
        address: fundProxyAddress,
    },
    treasurySafe: {
        label: 'Avalanche treasury Safe',
        address: treasurySafeAddress,
    },
    liquidityCoordinator: {
        label: 'Liquidity coordinator',
        address: liquidityCoordinatorAddress,
    },
    courtyardWorkflow: {
        label: 'Courtyard workflow',
        address: courtyardWorkflowAddress,
    },
    teamWallet: {
        label: 'Team wallet',
        address: teamWalletAddress,
    },
} as const;
