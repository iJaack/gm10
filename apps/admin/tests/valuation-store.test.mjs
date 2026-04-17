import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createValuationPackStore } from '../api/lib/valuation-store.js';

test('local valuation pack store writes immutable pack and latest index', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-'));
  try {
    const store = createValuationPackStore({ localDir: dir, forceLocal: true });
    const pack = { packId: 'valuation-2026-W16-v1', generatedAt: '2026-04-17T09:00:00.000Z', cards: [] };

    await store.savePack(pack);
    const latest = await store.getLatestPack();
    const loaded = await store.getPack(pack.packId);

    assert.equal(latest.packId, pack.packId);
    assert.equal(loaded.packId, pack.packId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
