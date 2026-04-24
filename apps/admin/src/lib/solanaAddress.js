const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_LOOKUP = new Map([...BASE58_ALPHABET].map((char, index) => [char, index]));
const BYTES32_RE = /^0x[a-fA-F0-9]{64}$/;

function bytesToHex(bytes) {
    return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
    const clean = hex.replace(/^0x/i, '');
    return Uint8Array.from(clean.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? []);
}

export function decodeBase58(value) {
    const input = value.trim();
    if (!input) throw new Error('Missing Solana address');

    let decoded = 0n;
    for (const char of input) {
        const digit = BASE58_LOOKUP.get(char);
        if (digit === undefined) throw new Error('Invalid Solana base58 address');
        decoded = decoded * 58n + BigInt(digit);
    }

    const bytes = [];
    while (decoded > 0n) {
        bytes.unshift(Number(decoded & 0xffn));
        decoded >>= 8n;
    }

    let leadingZeros = 0;
    for (const char of input) {
        if (char !== '1') break;
        leadingZeros++;
    }

    return Uint8Array.from([...Array(leadingZeros).fill(0), ...bytes]);
}

export function encodeBase58(bytes) {
    let value = 0n;
    for (const byte of bytes) {
        value = (value << 8n) + BigInt(byte);
    }

    let encoded = '';
    while (value > 0n) {
        const remainder = Number(value % 58n);
        encoded = BASE58_ALPHABET[remainder] + encoded;
        value /= 58n;
    }

    for (const byte of bytes) {
        if (byte !== 0) break;
        encoded = `1${encoded}`;
    }

    return encoded || '1';
}

export function solanaAddressToBytes32(value) {
    const bytes = decodeBase58(value);
    if (bytes.length !== 32) throw new Error('Solana address must decode to 32 bytes');
    return `0x${bytesToHex(bytes)}`;
}

export function bytes32ToSolanaAddress(value) {
    if (!BYTES32_RE.test(value)) throw new Error('Expected bytes32 hex value');
    return encodeBase58(hexToBytes(value));
}

export function nonEvmSafeInputToBytes32(value) {
    const trimmed = value.trim();
    if (!trimmed) return '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (BYTES32_RE.test(trimmed)) return trimmed;
    return solanaAddressToBytes32(trimmed);
}
