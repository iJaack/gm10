import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSafeAwareAdminAddress } from '../src/lib/safeContext.js';

const treasurySafe = '0x39971795266a794a8156271729A07994952a6FAD';
const signer = '0x5cA0A679025B6c7dA08a70be3b244399fF0D7813';
const otherSigner = '0x1111111111111111111111111111111111111111';
const safeFromSdk = '0x2222222222222222222222222222222222222222';

test('safe context resolver prefers the Safe SDK address when available', () => {
  assert.equal(resolveSafeAwareAdminAddress({
    safeAddress: safeFromSdk,
    connectedAddress: signer,
    safeContextTimedOut: true,
    fallbackSafeAddress: treasurySafe,
    fallbackSignerAddress: signer,
  }), safeFromSdk);
});

test('safe context resolver falls back to treasury Safe for known signer timeout', () => {
  assert.equal(resolveSafeAwareAdminAddress({
    connectedAddress: signer,
    safeContextTimedOut: true,
    fallbackSafeAddress: treasurySafe,
    fallbackSignerAddress: signer,
  }), treasurySafe);
});

test('safe context resolver does not give unknown signers the treasury Safe fallback', () => {
  assert.equal(resolveSafeAwareAdminAddress({
    connectedAddress: otherSigner,
    safeContextTimedOut: true,
    fallbackSafeAddress: treasurySafe,
    fallbackSignerAddress: signer,
  }), otherSigner);
});
