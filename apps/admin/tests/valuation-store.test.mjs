import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  blobReadOptions,
  createValuationPackStore,
  selectValuationPackBlobDeletes,
  VALUATION_BLOB_ACCESS,
} from '../server/lib/valuation-store.js';

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

test('local valuation pack store merges mutable review state without rewriting pack artifact', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-'));
  try {
    const store = createValuationPackStore({ localDir: dir, forceLocal: true });
    const pack = {
      packId: 'valuation-2026-W16-v1',
      generatedAt: '2026-04-17T09:00:00.000Z',
      cards: [{
        positionId: 4,
        decision: 'pending',
        submittedTxHash: '',
      }],
    };

    await store.savePack(pack);
    const artifactBefore = await readFile(join(dir, 'valuation-packs', `${pack.packId}.json`), 'utf8');
    const updated = await store.updateCardDecision({
      packId: pack.packId,
      positionId: 4,
      decision: 'approved',
      submittedTxHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      updatedAt: '2026-04-17T10:00:00.000Z',
    });
    const loaded = await store.getPack(pack.packId);
    const latest = await store.getLatestPack();
    const artifactAfter = await readFile(join(dir, 'valuation-packs', `${pack.packId}.json`), 'utf8');

    assert.equal(updated.cards[0].decision, 'approved');
    assert.equal(loaded.cards[0].submittedTxHash, '0x1111111111111111111111111111111111111111111111111111111111111111');
    assert.equal(latest.cards[0].decision, 'approved');
    assert.equal(artifactAfter, artifactBefore);
    assert.equal(JSON.parse(artifactAfter).cards[0].decision, 'pending');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('blob valuation pack store keeps auth-gated artifacts private', () => {
  assert.equal(VALUATION_BLOB_ACCESS, 'private');
});

test('blob valuation pack store bypasses cache for private review reads', () => {
  assert.deepEqual(blobReadOptions('public', false), { access: 'public' });
  assert.deepEqual(blobReadOptions('private', false), { access: 'private', useCache: false });
});

test('blob valuation pack pruning keeps latest packs and removes old reviews', () => {
  const blob = (pathname, uploadedAt) => ({ pathname, uploadedAt: new Date(uploadedAt), size: 1 });
  const deletes = selectValuationPackBlobDeletes([
    blob('valuation-packs/latest.json', '2026-04-22T00:00:00.000Z'),
    blob('valuation-packs/valuation-1.json', '2026-04-19T00:00:00.000Z'),
    blob('valuation-packs/valuation-1.review.json', '2026-04-19T01:00:00.000Z'),
    blob('valuation-packs/valuation-2.json', '2026-04-20T00:00:00.000Z'),
    blob('valuation-packs/valuation-2.review.json', '2026-04-20T01:00:00.000Z'),
    blob('valuation-packs/valuation-3.json', '2026-04-21T00:00:00.000Z'),
    blob('valuation-packs/valuation-3.review.json', '2026-04-21T01:00:00.000Z'),
    blob('valuation-packs/orphan.review.json', '2026-04-22T01:00:00.000Z'),
  ], { keep: 2 });

  assert.deepEqual(deletes, [
    'valuation-packs/orphan.review.json',
    'valuation-packs/valuation-1.json',
    'valuation-packs/valuation-1.review.json',
  ]);
});
