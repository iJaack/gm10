const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_BATCH_SIZE = 40;
const BROWSER_HEADERS = {
    Accept: 'application/json,text/plain,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0',
};
const CHAIN_RPCS = {
    30109: [
        process.env.POLYGON_RPC_URL,
        process.env.GM10_POLYGON_RPC_URL,
        process.env.VITE_GM10_POLYGON_RPC_URL,
        'https://polygon.drpc.org',
        'https://1rpc.io/matic',
    ],
    30106: [
        process.env.AVALANCHE_RPC_URL,
        process.env.GM10_AVALANCHE_RPC_URL,
        process.env.VITE_GM10_AVALANCHE_RPC_URL,
        'https://api.avax.network/ext/bc/C/rpc',
    ],
};

function parseBody(request) {
    if (!request.body) return {};
    if (typeof request.body === 'string') return JSON.parse(request.body || '{}');
    return request.body;
}

function normalizeUri(uri) {
    const value = String(uri ?? '').trim();
    if (!value) return '';
    if (value.startsWith('ipfs://ipfs/')) return `https://ipfs.io/ipfs/${value.slice('ipfs://ipfs/'.length)}`;
    if (value.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${value.slice('ipfs://'.length)}`;
    if (value.startsWith('ar://')) return `https://arweave.net/${value.slice('ar://'.length)}`;
    return value;
}

function tokenUriCalldata(tokenId) {
    return `0xc87b56dd${BigInt(tokenId).toString(16).padStart(64, '0')}`;
}

function decodeAbiString(result) {
    if (!result || result === '0x') return '';
    const hex = result.slice(2);
    const offset = Number(BigInt(`0x${hex.slice(0, 64)}`));
    const lengthOffset = offset * 2;
    const length = Number(BigInt(`0x${hex.slice(lengthOffset, lengthOffset + 64)}`));
    const data = hex.slice(lengthOffset + 64, lengthOffset + 64 + length * 2);
    return Buffer.from(data, 'hex').toString('utf8');
}

async function rpcCall(chainEid, collection, tokenId) {
    const urls = (CHAIN_RPCS[Number(chainEid)] ?? []).filter(Boolean);
    let lastError = 'No RPC configured for chain';

    for (const url of urls) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_call',
                    params: [{ to: collection, data: tokenUriCalldata(tokenId) }, 'latest'],
                }),
            });
            const payload = await response.json();
            if (payload.error) {
                lastError = payload.error.message || 'RPC call failed';
                continue;
            }
            const tokenUri = decodeAbiString(payload.result);
            if (tokenUri) return tokenUri;
        } catch (error) {
            lastError = error instanceof Error ? error.message : 'RPC request failed';
        }
    }

    throw new Error(lastError);
}

async function fetchMetadata(tokenUri) {
    if (tokenUri.startsWith('data:application/json;base64,')) {
        return JSON.parse(Buffer.from(tokenUri.slice('data:application/json;base64,'.length), 'base64').toString('utf8'));
    }
    if (tokenUri.startsWith('data:application/json,')) {
        return JSON.parse(decodeURIComponent(tokenUri.slice('data:application/json,'.length)));
    }

    const response = await fetch(normalizeUri(tokenUri), {
        headers: BROWSER_HEADERS,
    });
    if (!response.ok) throw new Error(`Metadata returned ${response.status}`);
    return response.json();
}

function getAttribute(payload, names) {
    const attributes = Array.isArray(payload?.attributes) ? payload.attributes : [];
    const wanted = new Set(names.map((name) => name.toLowerCase()));
    return attributes.find((attribute) => wanted.has(String(attribute.trait_type ?? attribute.type ?? '').toLowerCase()))?.value;
}

function normalizePayload(position, tokenUri, payload) {
    const title = payload.name || payload.title || `Position #${position.positionId}`;
    const grade = getAttribute(payload, ['grade', 'certification', 'grading']);
    const set = getAttribute(payload, ['set', 'series', 'collection']);
    const subtitle = [set, grade].filter(Boolean).join(', ') || payload.description || undefined;
    const image = normalizeUri(payload.image || payload.image_url || payload.imageUrl || payload.animation_url);
    const externalUrl = payload.external_url || payload.externalUrl || payload.url || '';

    return {
        positionId: position.positionId,
        title,
        subtitle,
        imageSrc: image || '/brand/cover-pokeball-night.webp',
        imageAlt: `${title} — GM10 position #${position.positionId}`,
        courtyardUrl: String(externalUrl).includes('courtyard.io') ? externalUrl : undefined,
        proofUrl: normalizeUri(tokenUri),
        note: 'Metadata loaded from the live ERC-721 tokenURI for this registry position.',
    };
}

async function resolvePosition(position) {
    if (!Number.isInteger(Number(position.positionId))) throw new Error('Invalid position id');
    if (!ADDRESS_RE.test(String(position.collection ?? ''))) throw new Error('Invalid collection address');
    if (!/^\d+$/.test(String(position.tokenId ?? ''))) throw new Error('Invalid token id');

    const tokenUri = await rpcCall(position.chainEid, position.collection, position.tokenId);
    const payload = await fetchMetadata(tokenUri);
    return normalizePayload(position, tokenUri, payload);
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');

    if (request.method !== 'POST') {
        response.status(405).json({ error: 'POST required' });
        return;
    }

    try {
        const body = parseBody(request);
        const positions = Array.isArray(body.positions) ? body.positions.slice(0, MAX_BATCH_SIZE) : [];
        const results = await Promise.all(positions.map(async (position) => {
            try {
                return { ok: true, metadata: await resolvePosition(position) };
            } catch (error) {
                return {
                    ok: false,
                    positionId: position.positionId,
                    error: error instanceof Error ? error.message : 'Unable to resolve metadata',
                };
            }
        }));

        response.status(200).json({ positions: results });
    } catch (error) {
        response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to resolve NFT metadata' });
    }
}
