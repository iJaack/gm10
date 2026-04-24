import {
  createPublicClient,
  getAddress,
  hashMessage,
  http,
  isAddress,
  keccak256,
  recoverMessageAddress,
  toHex,
  verifyMessage,
} from 'viem';
import { avalanche } from 'viem/chains';

const DEFAULT_FUND_PROXY_ADDRESS = '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f';
const DEFAULT_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
const MESSAGE_PREFIXES = {
  generate: 'GM10 valuation pack generate:',
  read: 'GM10 valuation pack read:',
  update: 'GM10 valuation pack update:',
};
const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000;
const MAX_MESSAGE_FUTURE_MS = 60 * 1000;

export const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const MANAGER_ROLE = keccak256(toHex('MANAGER_ROLE'));
export const OPERATOR_ROLE = keccak256(toHex('OPERATOR_ROLE'));

const HAS_ROLE_ABI = [
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];
const EIP1271_BYTES32_ABI = [
  {
    inputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'isValidSignature',
    outputs: [{ name: 'magicValue', type: 'bytes4' }],
    stateMutability: 'view',
    type: 'function',
  },
];
const EIP1271_BYTES_ABI = [
  {
    inputs: [
      { name: 'data', type: 'bytes' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'isValidSignature',
    outputs: [{ name: 'magicValue', type: 'bytes4' }],
    stateMutability: 'view',
    type: 'function',
  },
];
const SAFE_IS_OWNER_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'isOwner',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];
const EIP1271_BYTES32_MAGIC_VALUE = '0x1626ba7e';
const EIP1271_BYTES_MAGIC_VALUE = '0x20c13b0b';

function getHeader(headers, name) {
  if (!headers) {
    return '';
  }

  if (typeof headers.get === 'function') {
    return headers.get(name) || '';
  }

  const lowerName = name.toLowerCase();
  const value = headers[name] ?? headers[lowerName];
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

function parseAddress(value, fallback) {
  return value && isAddress(value) ? getAddress(value) : fallback;
}

function getFundProxyAddress() {
  return parseAddress(
    process.env.GM10_ADMIN_FUND_PROXY_ADDRESS
      ?? process.env.VITE_GM10_ADMIN_FUND_PROXY_ADDRESS
      ?? process.env.VITE_GM10_FUND_PROXY_ADDRESS,
    DEFAULT_FUND_PROXY_ADDRESS,
  );
}

function getRpcUrl() {
  return process.env.AVALANCHE_RPC_URL
    ?? process.env.GM10_AVALANCHE_RPC_URL
    ?? DEFAULT_RPC_URL;
}

function parseMessageTimestamp(message, action = 'generate') {
  const prefix = MESSAGE_PREFIXES[action];
  if (!prefix || !message.startsWith(prefix)) {
    return null;
  }

  const timestampText = message.slice(prefix.length);
  const timestamp = new Date(timestampText);
  if (!timestampText || Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== timestampText) {
    return null;
  }

  return timestamp;
}

function validateMessageWindow(message, now = Date.now(), action = 'generate') {
  const timestamp = parseMessageTimestamp(message, action);
  if (!timestamp) {
    return false;
  }

  const signedAt = timestamp.getTime();
  return signedAt >= now - MAX_MESSAGE_AGE_MS && signedAt <= now + MAX_MESSAGE_FUTURE_MS;
}

async function hasAuthorizedRole(address, { client, fundProxyAddress } = {}) {
  const publicClient = client ?? createPublicClient({
    chain: avalanche,
    transport: http(getRpcUrl()),
  });
  const targetFundProxyAddress = fundProxyAddress ?? getFundProxyAddress();
  const roles = [DEFAULT_ADMIN_ROLE, MANAGER_ROLE, OPERATOR_ROLE];
  const results = await Promise.all(roles.map((role) => publicClient.readContract({
    address: targetFundProxyAddress,
    abi: HAS_ROLE_ABI,
    functionName: 'hasRole',
    args: [role, address],
  })));

  return results.some(Boolean);
}

async function isValidEoaSignature({ address, message, signature }) {
  try {
    const isValidSignature = await verifyMessage({
      address,
      message,
      signature,
    });
    const recoveredAddress = getAddress(await recoverMessageAddress({ message, signature }));
    return isValidSignature && recoveredAddress === address;
  } catch {
    return false;
  }
}

async function recoverEoaSigner({ message, signature }) {
  try {
    return getAddress(await recoverMessageAddress({ message, signature }));
  } catch {
    return null;
  }
}

async function isValidContractSignature({ address, message, signature, client }) {
  const publicClient = client ?? createPublicClient({
    chain: avalanche,
    transport: http(getRpcUrl()),
  });

  try {
    const magicValue = await publicClient.readContract({
      address,
      abi: EIP1271_BYTES32_ABI,
      functionName: 'isValidSignature',
      args: [hashMessage(message), signature],
    });
    if (String(magicValue).toLowerCase() === EIP1271_BYTES32_MAGIC_VALUE) {
      return true;
    }
  } catch {
    // Some Safe handlers expose only the bytes overload.
  }

  try {
    const magicValue = await publicClient.readContract({
      address,
      abi: EIP1271_BYTES_ABI,
      functionName: 'isValidSignature',
      args: [toHex(message), signature],
    });
    return [EIP1271_BYTES32_MAGIC_VALUE, EIP1271_BYTES_MAGIC_VALUE].includes(String(magicValue).toLowerCase());
  } catch {
    return false;
  }
}

async function isValidSafeOwnerSignature({ safeAddress, message, signature, client }) {
  const recoveredSigner = await recoverEoaSigner({ message, signature });
  if (!recoveredSigner) {
    return false;
  }

  const publicClient = client ?? createPublicClient({
    chain: avalanche,
    transport: http(getRpcUrl()),
  });

  try {
    return await publicClient.readContract({
      address: safeAddress,
      abi: SAFE_IS_OWNER_ABI,
      functionName: 'isOwner',
      args: [recoveredSigner],
    });
  } catch {
    return false;
  }
}

export async function authorizeValuationPackRequest(request, { action = 'generate', client, now } = {}) {
  const allowsUnauthenticated = process.env.GM10_VALUATION_ALLOW_UNAUTHENTICATED_WRITES === 'true'
    || (action === 'read' && process.env.GM10_VALUATION_ALLOW_UNAUTHENTICATED_READS === 'true');
  if (request?.internal === true || allowsUnauthenticated) {
    return { ok: true, address: null };
  }

  const addressHeader = getHeader(request?.headers, 'x-gm10-admin-address');
  const message = getHeader(request?.headers, 'x-gm10-admin-message');
  const signature = getHeader(request?.headers, 'x-gm10-admin-signature');
  if (!addressHeader || !message || !signature || !isAddress(addressHeader) || !validateMessageWindow(message, now, action)) {
    return { ok: false, statusCode: 401, message: 'Unauthorized valuation pack request' };
  }

  const signedAddress = getAddress(addressHeader);
  const isAuthorizedSignature = await isValidEoaSignature({
    address: signedAddress,
    message,
    signature,
  }) || await isValidContractSignature({
    address: signedAddress,
    message,
    signature,
    client,
  }) || await isValidSafeOwnerSignature({
    safeAddress: signedAddress,
    message,
    signature,
    client,
  });

  if (!isAuthorizedSignature) {
    return { ok: false, statusCode: 401, message: 'Unauthorized valuation pack request' };
  }

  try {
    const isAuthorized = await hasAuthorizedRole(signedAddress, { client });
    if (!isAuthorized) {
      return { ok: false, statusCode: 401, message: 'Unauthorized valuation pack request' };
    }
  } catch {
    return { ok: false, statusCode: 500, message: 'Unable to verify valuation pack authorization' };
  }

  return { ok: true, address: signedAddress };
}

export function authorizeValuationPackWrite(request, options = {}) {
  return authorizeValuationPackRequest(request, { ...options, action: options.action ?? 'generate' });
}

export function authorizeValuationPackRead(request, options = {}) {
  return authorizeValuationPackRequest(request, { ...options, action: 'read' });
}
