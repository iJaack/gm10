import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySlippage,
  calculateRoundRouting,
  getExactDustCloseAmount,
  getPharaohWideTicks,
  getRoundStatus,
  getTickSpotDriftBps,
  isSpotDriftPaused,
  splitIntoTranches,
} from '../src/lib/rounds.js';

const AVAX = 10n ** 18n;

function round(overrides = {}) {
  return {
    targetAmount: 5_000n * AVAX,
    raisedAmount: 0n,
    minInvestment: AVAX / 10n,
    startTime: 1_000n,
    endTime: 2_000n,
    isActive: true,
    isFinalized: false,
    ...overrides,
  };
}

test('calculates full-cap Round 2 routing allocation', () => {
  const allocation = calculateRoundRouting(5_000n * AVAX);
  assert.equal(allocation.strategyTreasury, 4_250n * AVAX);
  assert.equal(allocation.routingBucket, 750n * AVAX);
  assert.equal(allocation.lpTotal, 500n * AVAX);
  assert.equal(allocation.lfj, 250n * AVAX);
  assert.equal(allocation.pharaoh, 250n * AVAX);
  assert.equal(allocation.team, 250n * AVAX);
});

test('calculates partial-raise Round 2 routing allocation from actual raised AVAX', () => {
  const allocation = calculateRoundRouting(1_234n * AVAX);
  assert.equal(allocation.strategyTreasury, 1_048_900000000000000000n);
  assert.equal(allocation.routingBucket, 185_100000000000000000n);
  assert.equal(allocation.lpTotal, 123_400000000000000000n);
  assert.equal(allocation.lfj, 61_700000000000000000n);
  assert.equal(allocation.pharaoh, 61_700000000000000000n);
  assert.equal(allocation.team, 61_700000000000000000n);
});

test('detects exact dust close amount below minInvestment', () => {
  const dust = 400000000000000n;
  assert.equal(
    getExactDustCloseAmount(round({ raisedAmount: 5_000n * AVAX - dust })),
    dust,
  );
  assert.equal(
    getExactDustCloseAmount(round({ raisedAmount: 4_999n * AVAX })),
    undefined,
  );
});

test('treats cap-filled rounds as finalized for admin status', () => {
  assert.equal(getRoundStatus(round({ raisedAmount: 5_000n * AVAX }), 1_500), 'Finalized');
  assert.equal(getRoundStatus(round({ raisedAmount: 4_000n * AVAX }), 1_500), 'Open');
  assert.equal(getRoundStatus(round({ raisedAmount: 4_000n * AVAX }), 2_500), 'Ended, ready to finalize');
});

test('splits routing amounts into bounded tranches', () => {
  assert.deepEqual(splitIntoTranches(5n, 2n), [2n, 2n, 1n]);
  assert.deepEqual(splitIntoTranches(5n, 0n), [5n]);
});

test('applies 3 percent slippage and wide Pharaoh ticks', () => {
  assert.equal(applySlippage(1_000_000n), 970_000n);
  assert.deepEqual(getPharaohWideTicks(0), { lower: -13900, upper: 13900 });
  assert.deepEqual(getPharaohWideTicks(250), { lower: -13700, upper: 14200 });
});

test('pauses routing when Pharaoh spot drift exceeds 10 percent', () => {
  assert.equal(getTickSpotDriftBps(0, 500), 513);
  assert.equal(isSpotDriftPaused(0, 500), false);
  assert.equal(isSpotDriftPaused(0, 1_200), true);
});
