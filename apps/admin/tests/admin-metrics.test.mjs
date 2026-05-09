import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateLpDeployment,
  chainlinkPriceStatus,
  READ_STATUS,
  resolveLiquidTreasuryMetric,
} from '../src/lib/adminMetrics.js';

const AVAX = 10n ** 18n;

test('LP deployment does not render missing reads as zero', () => {
  const summary = aggregateLpDeployment(undefined, undefined);

  assert.equal(summary.total, undefined);
  assert.equal(summary.status, READ_STATUS.unavailable);
  assert.equal(summary.sourceLabel, 'LP reads unavailable');
});

test('LP deployment is partial when only one venue read succeeds', () => {
  const summary = aggregateLpDeployment(25n * AVAX, undefined);

  assert.equal(summary.total, undefined);
  assert.equal(summary.traderJoe, 25n * AVAX);
  assert.equal(summary.pharaoh, undefined);
  assert.equal(summary.status, READ_STATUS.partial);
});

test('LP deployment sums live venue reads only when both venues resolve', () => {
  const summary = aggregateLpDeployment(25n * AVAX, 25n * AVAX);

  assert.equal(summary.total, 50n * AVAX);
  assert.equal(summary.status, READ_STATUS.live);
  assert.equal(summary.sourceLabel, 'live coordinator');
});

test('liquid treasury prefers complete live wallet reads', () => {
  const summary = resolveLiquidTreasuryMetric({
    walletBalancesWei: [708n * AVAX, 2n * AVAX, 0n, 0n, AVAX / 5n],
    avaxUsd: 10,
    stableAccountingLiquidTreasury: 1_813_000_000n,
  });

  assert.equal(summary.value, 7_102_000_000n);
  assert.equal(summary.status, READ_STATUS.live);
  assert.equal(summary.sourceLabel, 'live wallets');
});

test('liquid treasury visibly falls back to stable accounting when wallet reads are partial', () => {
  const summary = resolveLiquidTreasuryMetric({
    walletBalancesWei: [708n * AVAX, undefined, 0n, 0n, AVAX / 5n],
    avaxUsd: 10,
    stableAccountingLiquidTreasury: 1_813_000_000n,
  });

  assert.equal(summary.value, 1_813_000_000n);
  assert.equal(summary.status, READ_STATUS.fallback);
  assert.equal(summary.sourceLabel, 'stored accounting fallback');
  assert.equal(summary.warning, 'partial wallet reads');
});

test('Chainlink status marks stale price rounds', () => {
  const summary = chainlinkPriceStatus([1n, 996_359_760n, 0n, 100n, 1n], 60 * 60 * 8, 60 * 60 * 6);

  assert.equal(summary.avaxUsd, 9.9635976);
  assert.equal(summary.status, READ_STATUS.stale);
  assert.equal(summary.sourceLabel, 'stale Chainlink');
});
