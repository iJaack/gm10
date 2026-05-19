import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFundingCapacityIssue,
  getPurchaseFundingConfirmationIssues,
  isNonZeroBytes32Input,
  sameAddress,
} from '../src/lib/purchaseFunding.js';

const polygonSafe = '0x39971795266a794a8156271729A07994952a6FAD';
const polygonUsdc = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const purchase = {
  key: 'courtyard:asset:order',
  releaseAmountUsdt: '80',
  settlementRef: 'courtyard:settlement:asset:order',
  proofRef: 'courtyard:proof:asset:order',
};
const authorization = {
  status: 1,
  chainEid: 30109,
  fundingToken: polygonUsdc,
  maxSpendUsdt6: 100_000_000n,
  destinationSafe: polygonSafe,
};

test('address comparison is case-insensitive', () => {
  assert.equal(sameAddress(polygonSafe.toLowerCase(), polygonSafe), true);
  assert.equal(sameAddress(polygonSafe, polygonUsdc), false);
});

test('non-zero bytes32 input rejects blank and explicit zero hash', () => {
  assert.equal(isNonZeroBytes32Input(''), false);
  assert.equal(isNonZeroBytes32Input(`0x${'0'.repeat(64)}`), false);
  assert.equal(isNonZeroBytes32Input('courtyard:settlement:asset:order'), true);
});

test('purchase funding confirmation passes with matching authorization and refs', () => {
  assert.deepEqual(getPurchaseFundingConfirmationIssues({
    purchase,
    authorization,
    polygonSafe,
    fundingToken: polygonUsdc,
    destinationChainEid: 30109,
    amountUsdt6: 80_000_000n,
    liquidTreasuryUsdt6: 150_000_000n,
    holderDistributionAccruedUsdt6: 10_000_000n,
  }), []);
});

test('purchase funding confirmation blocks the Safe tx when refs are missing', () => {
  const issues = getPurchaseFundingConfirmationIssues({
    purchase: { ...purchase, settlementRef: '', proofRef: `0x${'0'.repeat(64)}` },
    authorization,
    polygonSafe,
    fundingToken: polygonUsdc,
    destinationChainEid: 30109,
    amountUsdt6: 80_000_000n,
    liquidTreasuryUsdt6: 150_000_000n,
    holderDistributionAccruedUsdt6: 10_000_000n,
  });

  assert.match(issues.join(' '), /Settlement ref is required/);
  assert.match(issues.join(' '), /Proof ref is required/);
});

test('purchase funding confirmation waits for stored treasury accounting', () => {
  const issues = getPurchaseFundingConfirmationIssues({
    purchase,
    authorization,
    polygonSafe,
    fundingToken: polygonUsdc,
    destinationChainEid: 30109,
    amountUsdt6: 80_000_000n,
  });

  assert.match(issues.join(' '), /Stored treasury accounting has not loaded yet/);
});

test('funding capacity issue explains insufficient stored liquid treasury', () => {
  assert.equal(getFundingCapacityIssue({
    amountUsdt6: 4_500_000_000n,
    liquidTreasuryUsdt6: 1_813_075_955n,
    holderDistributionAccruedUsdt6: 0n,
  }), 'Stored liquid treasury is below confirmed funding plus the holder claim bucket.');

  assert.equal(getFundingCapacityIssue({
    amountUsdt6: 4_500_000_000n,
    liquidTreasuryUsdt6: 4_500_000_000n,
    holderDistributionAccruedUsdt6: 0n,
  }), '');
});

test('purchase funding confirmation blocks mismatched authorization and insufficient accounting', () => {
  const issues = getPurchaseFundingConfirmationIssues({
    purchase,
    authorization: {
      ...authorization,
      status: 3,
      destinationSafe: '0x1111111111111111111111111111111111111111',
      maxSpendUsdt6: 50_000_000n,
    },
    polygonSafe,
    fundingToken: polygonUsdc,
    destinationChainEid: 30109,
    amountUsdt6: 80_000_000n,
    liquidTreasuryUsdt6: 85_000_000n,
    holderDistributionAccruedUsdt6: 10_000_000n,
  });

  assert.match(issues.join(' '), /Approved before funding/);
  assert.match(issues.join(' '), /destination Safe does not match/);
  assert.match(issues.join(' '), /exceeds the authorized max spend/);
  assert.match(issues.join(' '), /Stored liquid treasury is below/);
});
