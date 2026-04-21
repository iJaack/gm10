import assert from 'node:assert/strict';
import test from 'node:test';

import {
    bytes32ToSolanaAddress,
    nonEvmSafeInputToBytes32,
    solanaAddressToBytes32,
} from '../src/lib/solanaAddress.js';

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

test('converts Solana base58 pubkeys to bytes32 without hashing', () => {
    assert.equal(
        solanaAddressToBytes32('11111111111111111111111111111111'),
        ZERO_BYTES32,
    );

    const phygitalsAsset = '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP';
    const bytes32 = solanaAddressToBytes32(phygitalsAsset);

    assert.match(bytes32, /^0x[0-9a-f]{64}$/);
    assert.equal(bytes32ToSolanaAddress(bytes32), phygitalsAsset);
});

test('normalizes non-EVM safe input and preserves explicit bytes32 values', () => {
    const explicitBytes32 = '0x1111111111111111111111111111111111111111111111111111111111111111';

    assert.equal(nonEvmSafeInputToBytes32(''), ZERO_BYTES32);
    assert.equal(nonEvmSafeInputToBytes32(explicitBytes32), explicitBytes32);
});

test('rejects malformed Solana pubkeys before registry writes', () => {
    assert.throws(
        () => solanaAddressToBytes32('0x39971795266a794a8156271729A07994952a6FAD'),
        /Invalid Solana base58 address|Solana address must decode to 32 bytes/,
    );
    assert.throws(
        () => solanaAddressToBytes32('not-a-solana-address'),
        /Invalid Solana base58 address/,
    );
});
