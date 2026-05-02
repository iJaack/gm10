import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ADDRESSES_SOURCE = new URL('../src/addresses.ts', import.meta.url);
const VALUATION_CHAIN_SOURCE = new URL('../server/lib/valuation-chain.js', import.meta.url);

test('mainnet portfolio registry default matches the migrated V2 registry', async () => {
  const source = await readFile(ADDRESSES_SOURCE, 'utf8');

  assert.match(
    source,
    /portfolioRegistry:[\s\S]*?0x0fCbce2341E3682AB92f1cAabDF976E17D91436A/,
  );
});

test('valuation chain default reads from the migrated V2 registry', async () => {
  const source = await readFile(VALUATION_CHAIN_SOURCE, 'utf8');

  assert.match(
    source,
    /DEFAULT_REGISTRY_ADDRESS = '0x0fCbce2341E3682AB92f1cAabDF976E17D91436A'/,
  );
});
