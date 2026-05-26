import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AVALANCHE_CHAIN_ID,
  NATIVE_TOKEN,
} from '../server/lib/lifi.js';
import {
  assertContinuousCommitEligible,
  buildCommitHash,
  normalizeContinuousCommitQuote,
  normalizeContinuousCommitStatus,
  previewContinuousCommitMint,
} from '../server/lib/continuous-commit.js';

const NOW = 1_777_000_000_000;

function commitInput(overrides = {}) {
  return {
    provider: 'lifi',
    providerRouteId: 'route-1',
    fromChainId: 8453,
    fromToken: '0x1111111111111111111111111111111111111111',
    fromAmountRaw: '100000000',
    fromTokenDecimals: 6,
    buyer: '0x2222222222222222222222222222222222222222',
    receiverAddress: '0x3333333333333333333333333333333333333333',
    settlementToken: NATIVE_TOKEN,
    settlementAmountRaw: '99000000',
    minSettlementAmountRaw: '98000000',
    recipientChainId: 8453,
    recipientAddress: '0x2222222222222222222222222222222222222222',
    expiresAt: Math.floor(NOW / 1000) + 600,
    ...overrides,
  };
}

test('normalizes a LI.FI continuous commit route into Avalanche settlement state', () => {
  const quote = normalizeContinuousCommitQuote(commitInput(), NOW);

  assert.equal(quote.provider, 'lifi');
  assert.equal(quote.fromChainId, 8453);
  assert.equal(quote.toChainId, AVALANCHE_CHAIN_ID);
  assert.equal(quote.fromAmountLabel, '100');
  assert.equal(quote.settlementAmountRaw, '99000000');
  assert.equal(quote.minSettlementAmountRaw, '98000000');
  assert.equal(quote.eligible, true);
  assert.match(quote.commitId, /^0x[a-f0-9]{64}$/);
  assert.equal(buildCommitHash(quote), quote.commitId);
});

test('accepts Mobula-supported route metadata through the same commit model', () => {
  const quote = normalizeContinuousCommitQuote(commitInput({
    provider: 'mobula',
    providerRouteId: 'mobula-route-42',
    fromChainId: 42161,
    fromToken: '0x4444444444444444444444444444444444444444',
  }), NOW);

  assert.equal(quote.provider, 'mobula');
  assert.equal(quote.fromChainId, 42161);
  assert.equal(quote.toChainId, AVALANCHE_CHAIN_ID);
});

test('rejects expired, under-settled, or malformed continuous commits', () => {
  const expired = normalizeContinuousCommitQuote(commitInput({ expiresAt: Math.floor(NOW / 1000) - 1 }), NOW);
  assert.equal(expired.eligible, false);
  assert.throws(() => assertContinuousCommitEligible(expired, NOW), /expired/i);

  assert.throws(() => normalizeContinuousCommitQuote(commitInput({
    settlementAmountRaw: '97000000',
    minSettlementAmountRaw: '98000000',
  }), NOW), /Minimum settlement exceeds quoted settlement/);

  assert.throws(() => normalizeContinuousCommitQuote(commitInput({ provider: 'unknown' }), NOW), /Unsupported/);
  assert.throws(() => normalizeContinuousCommitQuote(commitInput({ buyer: '0x1' }), NOW), /buyer/);
});

test('previews buyer and segment mint amounts for each commit', () => {
  const preview = previewContinuousCommitMint({
    settlementAmountUsdt6: '101000000',
    navPerTokenUsdt6: '1000000',
    mintSpreadBps: -500,
  });

  assert.equal(preview.mintPriceUsdt6, '950000');
  assert.equal(preview.buyerCatch18, '106315789473684210526');
  assert.equal(preview.segmentCatchEach18, '1063157894736842105');
  assert.equal(preview.effectiveSupplyExpansion18, '111631578947368421051');
});

test('normalizes retry and claim state for OFT delivery fallback', () => {
  const status = normalizeContinuousCommitStatus({
    txHash: '0xabc',
    sourceStatus: 'done',
    settled: true,
    minted: true,
    delivered: false,
    quote: commitInput(),
  }, NOW);

  assert.equal(status.canSettle, false);
  assert.equal(status.canRetryOft, true);
  assert.equal(status.canClaimAvalancheCatch, true);
});
