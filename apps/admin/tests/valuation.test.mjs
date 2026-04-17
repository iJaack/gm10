import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildValuationPack,
  canonicalJson,
  evaluateConsensus,
  hashBytes32,
  parseUsdc6,
  sourceRefForCard,
} from '../api/lib/valuation.js';

const now = '2026-04-17T09:00:00.000Z';

function observation(sourceId, valueUsdc6, observedAt = now, confidence = 0.92) {
  return {
    sourceId,
    sourceName: sourceId,
    cardKey: 'psa:140897946',
    observedAt,
    fetchedAt: now,
    valueUsdc6,
    currency: 'USD',
    confidence,
    rawPayloadRef: `memory://${sourceId}`,
    sourceUrl: `https://example.com/${sourceId}`,
    matchReason: 'cert number exact match',
  };
}

test('parseUsdc6 normalizes decimal strings into USDC 6 raw units', () => {
  assert.equal(parseUsdc6('96'), '96000000');
  assert.equal(parseUsdc6('96.123456'), '96123456');
  assert.equal(parseUsdc6('96.1234567'), '96123456');
  assert.throws(() => parseUsdc6('-1'), /Invalid USDC amount/);
  assert.throws(() => parseUsdc6('abc'), /Invalid USDC amount/);
});

test('evaluateConsensus passes 2 of 3 agreement and uses the median', () => {
  const result = evaluateConsensus({
    observations: [
      observation('primary', '100000000'),
      observation('benchmark', '105000000'),
      observation('evidence', '140000000'),
    ],
    nowIso: now,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.proposedValueUsdc6, '105000000');
  assert.equal(result.validSourceCount, 3);
  assert.equal(result.agreeingSourceIds.join(','), 'primary,benchmark');
});

test('evaluateConsensus uses lower value when exactly two valid sources agree', () => {
  const result = evaluateConsensus({
    observations: [
      observation('primary', '100000000'),
      observation('benchmark', '106000000'),
      observation('evidence', '0'),
    ],
    nowIso: now,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.proposedValueUsdc6, '100000000');
  assert.equal(result.validSourceCount, 2);
});

test('evaluateConsensus excludes stale observations and fails without two valid sources', () => {
  const result = evaluateConsensus({
    observations: [
      observation('primary', '100000000'),
      observation('benchmark', '101000000', '2026-04-01T00:00:00.000Z'),
      observation('evidence', '0'),
    ],
    nowIso: now,
  });

  assert.equal(result.status, 'needs_review');
  assert.equal(result.proposedValueUsdc6, undefined);
  assert.equal(result.validSourceCount, 1);
  assert.match(result.warnings.join(' '), /stale/);
});

test('evaluateConsensus warns when valid sources do not agree within tolerance', () => {
  const result = evaluateConsensus({
    observations: [
      observation('primary', '100000000'),
      observation('benchmark', '125000000'),
      observation('evidence', '140000000'),
    ],
    nowIso: now,
  });

  assert.equal(result.status, 'needs_review');
  assert.equal(result.validSourceCount, 3);
  assert.match(result.warnings.join(' '), /fewer than two sources agree within tolerance/);
});

test('buildValuationPack hashes immutable card evidence refs', () => {
  const pack = buildValuationPack({
    packId: 'valuation-2026-W16-v1',
    generatedAt: now,
    cards: [{
      positionId: 1,
      cardKey: 'psa:140897946',
      title: 'Gengar VMAX PSA 10',
      currentValueUsdc6: '96000000',
      observations: [
        observation('primary', '100000000'),
        observation('benchmark', '105000000'),
        observation('evidence', '140000000'),
      ],
    }],
  });

  assert.equal(pack.cadence, 'weekly-friday');
  assert.equal(pack.unit, 'USDC_6');
  assert.equal(pack.cards[0].consensus.status, 'passed');
  assert.equal(pack.cards[0].decision, 'pending');
  assert.equal(pack.cards[0].submittedTxHash, '');
  assert.match(pack.cards[0].sourceRef, /^0x[a-f0-9]{64}$/);
  assert.match(pack.cards[0].proofHash, /^0x[a-f0-9]{64}$/);
  assert.equal(pack.cards[0].sourceRef, sourceRefForCard(pack.packId, 1));
  assert.equal(hashBytes32(canonicalJson(pack.cards[0].observations)).length, 66);
});
