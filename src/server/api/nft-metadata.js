import http2 from 'node:http2';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_BATCH_SIZE = 40;
const COURTYARD_COLLECTION = '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD';
const COURTYARD_CUSTODY_ADDRESSES = [
    process.env.GM10_POLYGON_COURTYARD_SAFE_ADDRESS || '0x39971795266a794a8156271729A07994952a6FAD',
    process.env.GM10_POLYGON_COURTYARD_HOT_WALLET_ADDRESS || '0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50',
].map((address) => address.toLowerCase());
const COURTYARD_API_ORIGIN = 'https://api.courtyard.io';
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
    return attributes.find((attribute) => wanted.has(String(attribute.trait_type ?? attribute.type ?? attribute.name ?? '').toLowerCase()))?.value;
}

export function normalizeCourtyardPosition(position, asset, fetchedAt = new Date().toISOString()) {
    const tokenId = BigInt(position.tokenId);
    const assetId = tokenId.toString(16).padStart(64, '0');
    const priceUsdc6 = Math.round(Number(asset?.fmv_estimate_usd) * 1_000_000);
    if (
        String(asset?.chain).toLowerCase() !== 'polygon'
        || String(asset?.contract).toLowerCase() !== String(position.collection).toLowerCase()
        || String(asset?.proof_of_integrity).toLowerCase() !== assetId
        || String(asset?.token_id) !== tokenId.toString()
        || !COURTYARD_CUSTODY_ADDRESSES.includes(String(asset?.owner?.address).toLowerCase())
        || !Number.isSafeInteger(priceUsdc6)
        || priceUsdc6 <= 0
    ) {
        throw new Error('Courtyard asset identity, custody, or FMV did not verify');
    }

    const title = String(asset.title || `Position #${position.positionId}`);
    const subtitle = [getAttribute(asset, ['set']), getAttribute(asset, ['grade'])].filter(Boolean).join(', ') || undefined;
    const sourceUrl = `https://courtyard.io/asset/${assetId}`;
    return {
        metadata: {
            positionId: position.positionId,
            title,
            subtitle,
            imageSrc: String(asset.image || asset.cropped_image || '/brand/cover-pokeball-night.webp'),
            imageAlt: `${title} — GM10 position #${position.positionId}`,
            courtyardUrl: sourceUrl,
            proofUrl: sourceUrl,
            note: 'Card identity and estimated FMV fetched from Courtyard and matched to the registry token.',
        },
        mark: {
            positionId: position.positionId,
            valueUsdc6: String(priceUsdc6),
            fetchedAt,
            sourceUrl,
        },
    };
}

async function fetchCourtyardPosition(position) {
    const tokenId = BigInt(position.tokenId);
    if (tokenId < 0n || tokenId >= 2n ** 256n) throw new Error('Invalid Courtyard token id');
    const assetId = tokenId.toString(16).padStart(64, '0');
    const asset = await new Promise((resolve, reject) => {
        const session = http2.connect(COURTYARD_API_ORIGIN);
        const request = session.request({
            ':method': 'GET',
            ':path': `/index/asset/${assetId}`,
            accept: 'application/json',
            referer: 'https://courtyard.io/',
            'user-agent': 'GM10ValuationBot/1.0 (+https://gm10.xyz)',
        });
        let status = 0;
        let body = '';
        let finished = false;
        const timer = setTimeout(() => request.destroy(new Error('Courtyard asset timed out')), 8_000);
        const finish = (error, value) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            session.destroy();
            if (error) reject(error);
            else resolve(value);
        };
        session.on('error', finish);
        request.on('error', finish);
        request.on('response', (headers) => { status = Number(headers[':status']); });
        request.setEncoding('utf8');
        request.on('data', (chunk) => {
            body += chunk;
            if (body.length > 2_000_000) request.destroy(new Error('Courtyard asset response too large'));
        });
        request.on('end', () => {
            if (status !== 200) return finish(new Error(`Courtyard asset returned ${status}`));
            try {
                finish(null, JSON.parse(body));
            } catch {
                finish(new Error('Courtyard asset returned invalid JSON'));
            }
        });
        request.end();
    });
    return normalizeCourtyardPosition(position, asset);
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
    if (!Number.isSafeInteger(Number(position.positionId)) || Number(position.positionId) <= 0) throw new Error('Invalid position id');
    if (!ADDRESS_RE.test(String(position.collection ?? ''))) throw new Error('Invalid collection address');
    if (!/^\d+$/.test(String(position.tokenId ?? ''))) throw new Error('Invalid token id');

    if (Number(position.chainEid) === 30109 && String(position.collection).toLowerCase() === COURTYARD_COLLECTION.toLowerCase()) {
        try {
            return await fetchCourtyardPosition(position);
        } catch {
            // Keep tokenURI metadata available if Courtyard cannot provide a verified FMV.
        }
    }

    const tokenUri = await rpcCall(position.chainEid, position.collection, position.tokenId);
    const payload = await fetchMetadata(tokenUri);
    return { metadata: normalizePayload(position, tokenUri, payload) };
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
                return { ok: true, ...await resolvePosition(position) };
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
