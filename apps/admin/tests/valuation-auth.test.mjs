import assert from 'node:assert/strict';
import test from 'node:test';
import { privateKeyToAccount } from 'viem/accounts';
import {
  authorizeValuationPackWrite,
  DEFAULT_ADMIN_ROLE,
} from '../server/lib/valuation-auth.js';

const nowIso = '2026-04-20T13:45:00.000Z';
const now = Date.parse(nowIso);
const message = `GM10 valuation pack generate:${nowIso}`;
const safeAddress = '0x39971795266a794a8156271729A07994952a6FAD';
const signerAddress = '0x5cA0A679025B6c7dA08a70be3b244399fF0D7813';
const safeMagicValue = '0x1626ba7e';

function request({ address = safeAddress, signature, signedMessage = message }) {
  return {
    headers: {
      'x-gm10-admin-address': address,
      'x-gm10-admin-message': signedMessage,
      'x-gm10-admin-signature': signature,
    },
  };
}

test('valuation auth accepts EOA signatures with an authorized role', async () => {
  const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f094538e7dae00f4796e4d02a3de79cf11af3b8c');
  const signature = await account.signMessage({ message });
  const roleChecks = [];
  const client = {
    async readContract({ functionName, args }) {
      assert.equal(functionName, 'hasRole');
      roleChecks.push(args);
      return args[0] === DEFAULT_ADMIN_ROLE && args[1] === account.address;
    },
  };

  const result = await authorizeValuationPackWrite(request({
    address: account.address,
    signature,
  }), { client, now });

  assert.equal(result.ok, true);
  assert.equal(result.address, account.address);
  assert.equal(roleChecks.some(([, checkedAccount]) => checkedAccount === account.address), true);
});

test('valuation auth accepts update messages for write authorization', async () => {
  const updateMessage = `GM10 valuation pack update:${nowIso}`;
  const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f094538e7dae00f4796e4d02a3de79cf11af3b8c');
  const signature = await account.signMessage({ message: updateMessage });
  const client = {
    async readContract({ functionName, args }) {
      assert.equal(functionName, 'hasRole');
      return args[0] === DEFAULT_ADMIN_ROLE && args[1] === account.address;
    },
  };

  const result = await authorizeValuationPackWrite(request({
    address: account.address,
    signature,
    signedMessage: updateMessage,
  }), { action: 'update', client, now });

  assert.equal(result.ok, true);
  assert.equal(result.address, account.address);
});

test('valuation auth accepts Safe EIP-1271 signatures and checks roles on the Safe address', async () => {
  const calls = [];
  const client = {
    async readContract({ address, functionName, args }) {
      calls.push({ address, functionName, args });
      if (functionName === 'isValidSignature') {
        assert.equal(address, safeAddress);
        return safeMagicValue;
      }
      if (functionName === 'hasRole') {
        return args[0] === DEFAULT_ADMIN_ROLE && args[1] === safeAddress;
      }
      throw new Error(`Unexpected function ${functionName}`);
    },
  };

  const result = await authorizeValuationPackWrite(request({
    address: safeAddress,
    signature: '0xdeadbeef',
  }), { client, now });

  assert.equal(result.ok, true);
  assert.equal(result.address, safeAddress);
  assert.equal(calls.some((call) => call.functionName === 'isValidSignature'), true);
  assert.equal(calls.some((call) => call.functionName === 'hasRole' && call.args[1] === safeAddress), true);
  assert.equal(calls.some((call) => call.functionName === 'hasRole' && call.args[1] === signerAddress), false);
});

test('valuation auth accepts an EOA owner signature for an authorized Safe', async () => {
  const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f094538e7dae00f4796e4d02a3de79cf11af3b8c');
  const signature = await account.signMessage({ message });
  const calls = [];
  const client = {
    async readContract({ address, functionName, args }) {
      calls.push({ address, functionName, args });
      if (functionName === 'isValidSignature') {
        return '0xffffffff';
      }
      if (functionName === 'isOwner') {
        assert.equal(address, safeAddress);
        assert.equal(args[0], account.address);
        return true;
      }
      if (functionName === 'hasRole') {
        return args[0] === DEFAULT_ADMIN_ROLE && args[1] === safeAddress;
      }
      throw new Error(`Unexpected function ${functionName}`);
    },
  };

  const result = await authorizeValuationPackWrite(request({
    address: safeAddress,
    signature,
  }), { client, now });

  assert.equal(result.ok, true);
  assert.equal(result.address, safeAddress);
  assert.equal(calls.some((call) => call.functionName === 'isOwner' && call.args[0] === account.address), true);
  assert.equal(calls.some((call) => call.functionName === 'hasRole' && call.args[1] === safeAddress), true);
});

test('valuation auth rejects an EOA non-owner signature for a Safe before role authorization', async () => {
  const account = privateKeyToAccount('0x8b3a350cf5c34c9194ca3a545d3777b2d8bb6f7dc0f7d5331eb05b4ad3938f08');
  const signature = await account.signMessage({ message });
  let roleChecks = 0;
  const client = {
    async readContract({ functionName }) {
      if (functionName === 'isValidSignature') {
        return '0xffffffff';
      }
      if (functionName === 'isOwner') {
        return false;
      }
      if (functionName === 'hasRole') {
        roleChecks += 1;
        return true;
      }
      throw new Error(`Unexpected function ${functionName}`);
    },
  };

  const result = await authorizeValuationPackWrite(request({
    address: safeAddress,
    signature,
  }), { client, now });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 401);
  assert.equal(roleChecks, 0);
});

test('valuation auth rejects invalid Safe signatures before role authorization', async () => {
  let roleChecks = 0;
  const client = {
    async readContract({ functionName }) {
      if (functionName === 'isValidSignature') {
        return '0xffffffff';
      }
      if (functionName === 'hasRole') {
        roleChecks += 1;
        return true;
      }
      throw new Error(`Unexpected function ${functionName}`);
    },
  };

  const result = await authorizeValuationPackWrite(request({
    address: safeAddress,
    signature: '0xdeadbeef',
  }), { client, now });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 401);
  assert.equal(roleChecks, 0);
});
