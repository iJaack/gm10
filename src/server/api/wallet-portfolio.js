const MOBULA_NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const CHAIN_NAMES = {
    1: 'Ethereum',
    10: 'Optimism',
    56: 'BNB Chain',
    137: 'Polygon',
    250: 'Fantom',
    8453: 'Base',
    42161: 'Arbitrum',
    43114: 'Avalanche',
};

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toEvmChainId(chainId) {
    const raw = String(chainId ?? '');
    const match = raw.match(/(?:evm:)?(\d+)/i);
    if (!match) return undefined;
    const parsed = Number(match[1]);
    return Number.isInteger(parsed) ? parsed : undefined;
}

function chainLabel(balance, asset, chainId) {
    const rawChainId = String(balance?.chainId ?? '');
    if (rawChainId.toLowerCase().startsWith('solana')) return 'Solana';
    if (chainId && CHAIN_NAMES[chainId]) return CHAIN_NAMES[chainId];
    const blockchain = Array.isArray(asset?.asset?.blockchains) ? asset.asset.blockchains[0] : undefined;
    if (typeof blockchain === 'string' && blockchain.trim()) {
        return blockchain
            .split(/[-_\s]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
    return rawChainId || 'Unknown chain';
}

function firstNumber(values) {
    for (const value of values) {
        const parsed = toNumber(value);
        if (parsed !== undefined) return parsed;
    }
    return undefined;
}

function normalizePortfolioTokens(payload) {
    const assets = Array.isArray(payload?.data?.assets) ? payload.data.assets : [];
    const tokens = [];

    for (const asset of assets) {
        const symbol = String(asset?.asset?.symbol ?? '').trim();
        if (!symbol) continue;

        const priceUsdc = toNumber(asset?.price);
        if (priceUsdc === undefined || priceUsdc <= 0) continue;

        const balances = Array.isArray(asset?.contracts_balances) && asset.contracts_balances.length > 0
            ? asset.contracts_balances
            : [{
                address: Array.isArray(asset?.asset?.contracts) ? asset.asset.contracts[0] : undefined,
                balance: asset?.token_balance,
                decimals: Array.isArray(asset?.asset?.decimals) ? asset.asset.decimals[0] : undefined,
                chainId: Array.isArray(asset?.asset?.blockchains) ? asset.asset.blockchains[0] : undefined,
            }];

        for (const balanceRow of balances) {
            const balance = toNumber(balanceRow?.balance);
            if (balance === undefined || balance <= 0) continue;

            const balanceUsd = firstNumber([
                balanceRow?.estimated_balance,
                balanceRow?.estimatedBalance,
                balance * priceUsdc,
            ]);
            if (balanceUsd === undefined || balanceUsd <= 0) continue;

            const rawAddress = String(balanceRow?.address ?? '').toLowerCase();
            const chainId = toEvmChainId(balanceRow?.chainId);
            const isNative = rawAddress === MOBULA_NATIVE_ADDRESS || !rawAddress;
            const tokenAddress = !isNative && /^0x[a-f0-9]{40}$/i.test(rawAddress) ? rawAddress : undefined;
            const decimals = firstNumber([
                balanceRow?.decimals,
                Array.isArray(asset?.asset?.decimals) ? asset.asset.decimals[0] : undefined,
                18,
            ]) ?? 18;
            const chain = chainLabel(balanceRow, asset, chainId);

            tokens.push({
                id: `${chainId ?? String(balanceRow?.chainId ?? chain)}:${tokenAddress ?? 'native'}:${symbol}`,
                chain,
                chainId,
                symbol,
                name: String(asset?.asset?.name ?? symbol),
                decimals,
                tokenAddress,
                isNative,
                balance,
                balanceUsd,
                priceUsdc,
            });
        }
    }

    return tokens
        .sort((left, right) => right.balanceUsd - left.balanceUsd)
        .slice(0, 5);
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=120');

    if (request.method === 'OPTIONS') {
        response.status(204).json({});
        return;
    }

    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET, OPTIONS');
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const wallet = String(request.query?.wallet ?? '').trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        response.status(400).json({ error: 'Missing EVM wallet address' });
        return;
    }

    const apiKey = process.env.MOBULA_API_KEY;
    const baseUrl = apiKey ? 'https://api.mobula.io/api/1/wallet/portfolio' : 'https://demo-api.mobula.io/api/1/wallet/portfolio';
    const url = new URL(baseUrl);
    url.searchParams.set('wallet', wallet);
    url.searchParams.set('fetchAllChains', 'true');
    url.searchParams.set('cache', 'true');
    url.searchParams.set('stale', '120');
    url.searchParams.set('filterSpam', 'true');
    url.searchParams.set('unlistedAssets', 'false');
    url.searchParams.set('accuracy', 'maximum');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
        const mobulaResponse = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                ...(apiKey ? { Authorization: apiKey } : {}),
            },
        });
        const payload = await mobulaResponse.json().catch(() => ({}));

        if (!mobulaResponse.ok) {
            response.status(502).json({
                error: payload?.message || payload?.error || `Mobula returned ${mobulaResponse.status}`,
            });
            return;
        }

        response.status(200).json({
            status: 'available',
            source: apiKey ? 'mobula' : 'mobula-demo',
            fetchedAt: new Date().toISOString(),
            totalWalletBalanceUsd: toNumber(payload?.data?.total_wallet_balance),
            tokens: normalizePortfolioTokens(payload),
        });
    } catch (error) {
        response.status(502).json({
            error: error instanceof Error ? error.message : 'Mobula wallet portfolio request failed',
        });
    } finally {
        clearTimeout(timeout);
    }
}

export { normalizePortfolioTokens };
