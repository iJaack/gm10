const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;

function toBigIntOrUndefined(value) {
  if (value === undefined || value === null) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function isAddressLike(value) {
  return ADDRESS_RE.test(String(value ?? ''));
}

export function sameAddress(left, right) {
  return Boolean(left && right && String(left).toLowerCase() === String(right).toLowerCase());
}

export function isNonZeroBytes32Input(value) {
  const trimmed = String(value ?? '').trim();
  return Boolean(trimmed && trimmed.toLowerCase() !== ZERO_BYTES32);
}

export function getPurchaseFundingConfirmationIssues({
  purchase,
  authorization,
  polygonSafe,
  fundingToken,
  destinationChainEid,
  amountUsdt6,
  liquidTreasuryUsdt6,
  holderDistributionAccruedUsdt6,
}) {
  const issues = [];
  const amount = toBigIntOrUndefined(amountUsdt6);

  if (!String(purchase?.key ?? '').trim()) {
    issues.push('Purchase key is required.');
  }
  if (amount === undefined) {
    issues.push('Confirmed funding amount is invalid.');
  } else if (amount <= 0n) {
    issues.push('Confirmed funding amount must be greater than zero.');
  }
  if (!isAddressLike(polygonSafe)) {
    issues.push('Polygon custody Safe must be a valid EVM address.');
  }
  if (!isNonZeroBytes32Input(purchase?.settlementRef)) {
    issues.push('Settlement ref is required.');
  }
  if (!isNonZeroBytes32Input(purchase?.proofRef)) {
    issues.push('Proof ref is required.');
  }

  if (!authorization) {
    issues.push('Purchase authorization has not loaded yet.');
  } else {
    const status = Number(authorization.status ?? 0);
    const chainEid = Number(authorization.chainEid ?? 0);
    const maxSpend = toBigIntOrUndefined(authorization.maxSpendUsdt6);

    if (status !== 1) {
      issues.push(`Purchase authorization must be Approved before funding; current status is ${status}.`);
    }
    if (chainEid !== Number(destinationChainEid)) {
      issues.push(`Purchase authorization is for chain EID ${chainEid}, not ${destinationChainEid}.`);
    }
    if (!sameAddress(authorization.fundingToken, fundingToken)) {
      issues.push('Purchase authorization funding token does not match Polygon USDC.');
    }
    if (!sameAddress(authorization.destinationSafe, polygonSafe)) {
      issues.push('Purchase authorization destination Safe does not match the configured Polygon custody Safe.');
    }
    if (amount !== undefined && maxSpend !== undefined && amount > maxSpend) {
      issues.push('Confirmed funding amount exceeds the authorized max spend.');
    }
  }

  const liquidTreasury = toBigIntOrUndefined(liquidTreasuryUsdt6);
  const holderDistribution = toBigIntOrUndefined(holderDistributionAccruedUsdt6);
  if (amount !== undefined && (liquidTreasury === undefined || holderDistribution === undefined)) {
    issues.push('Stored treasury accounting has not loaded yet.');
  } else if (amount !== undefined && liquidTreasury !== undefined && holderDistribution !== undefined) {
    if (liquidTreasury < amount + holderDistribution) {
      issues.push('Stored liquid treasury is below confirmed funding plus the holder claim bucket.');
    }
  }

  return issues;
}
