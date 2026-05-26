import { formatEther, formatUnits } from 'viem';

export const AVAX_WEI = 10n ** 18n;
export const USDT6 = 1_000_000n;

export const READ_STATUS = {
  live: 'live',
  configured: 'configured',
  fallback: 'fallback',
  partial: 'partial',
  unavailable: 'unavailable',
  error: 'error',
  stale: 'stale',
};

export function formatAvax(value, options = {}) {
  if (value === undefined || value === null) return 'Unavailable';
  const maximumFractionDigits = options.maximumFractionDigits ?? 4;
  return `${Number(formatEther(value)).toLocaleString('en-US', { maximumFractionDigits })} AVAX`;
}

export function formatUsdt6(value) {
  if (value === undefined || value === null) return 'Unavailable';
  return Number(formatUnits(value, 6)).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatToken6(value, suffix = 'USDT') {
  if (value === undefined || value === null) return 'Unavailable';
  return `${Number(formatUnits(value, 6)).toLocaleString('en-US', {
    maximumFractionDigits: 6,
  })} ${suffix}`;
}

export function avaxUsdToUsdt6(avaxUsd) {
  if (!Number.isFinite(avaxUsd) || avaxUsd <= 0) return 0n;
  return BigInt(Math.round(avaxUsd * Number(USDT6)));
}

export function avaxWeiToUsdt6(balanceWei, avaxUsd) {
  return (BigInt(balanceWei) * avaxUsdToUsdt6(avaxUsd)) / AVAX_WEI;
}

export function sumWalletBalancesUsdt6(walletBalancesWei, avaxUsd) {
  if (!Number.isFinite(avaxUsd) || avaxUsd <= 0) {
    return { value: undefined, status: READ_STATUS.unavailable, sourceLabel: 'price unavailable' };
  }

  if (walletBalancesWei.some((balance) => balance === undefined || balance === null)) {
    return { value: undefined, status: READ_STATUS.partial, sourceLabel: 'partial wallet reads' };
  }

  const totalWei = walletBalancesWei.reduce((total, balance) => total + BigInt(balance), 0n);
  return { value: avaxWeiToUsdt6(totalWei, avaxUsd), status: READ_STATUS.live, sourceLabel: 'live wallets' };
}

export function resolveCardBuyingBudgetMetric({ fundBalanceWei, avaxUsd }) {
  if (fundBalanceWei === undefined || fundBalanceWei === null) {
    return {
      balanceWei: undefined,
      usdValue: undefined,
      status: READ_STATUS.unavailable,
      sourceLabel: 'fund unavailable',
    };
  }

  const balanceWei = BigInt(fundBalanceWei);
  if (!Number.isFinite(avaxUsd) || avaxUsd <= 0) {
    return {
      balanceWei,
      usdValue: undefined,
      status: READ_STATUS.partial,
      sourceLabel: 'fund contract',
      warning: 'price unavailable',
    };
  }

  return {
    balanceWei,
    usdValue: avaxWeiToUsdt6(balanceWei, avaxUsd),
    status: READ_STATUS.live,
    sourceLabel: 'fund contract',
  };
}

export function resolveTrackedWalletAggregateMetric({ walletBalancesWei, avaxUsd, stableAccountingLiquidTreasury }) {
  const live = sumWalletBalancesUsdt6(walletBalancesWei, avaxUsd);
  if (live.value !== undefined) {
    return { ...live, sourceLabel: 'tracked wallets' };
  }

  if (stableAccountingLiquidTreasury !== undefined && stableAccountingLiquidTreasury !== null) {
    return {
      value: stableAccountingLiquidTreasury,
      status: READ_STATUS.fallback,
      sourceLabel: 'stored accounting fallback',
      warning: live.sourceLabel,
    };
  }

  return live;
}

export function resolveLiquidTreasuryMetric({ walletBalancesWei, avaxUsd, stableAccountingLiquidTreasury }) {
  const live = sumWalletBalancesUsdt6(walletBalancesWei, avaxUsd);
  if (live.value !== undefined) return live;

  if (stableAccountingLiquidTreasury !== undefined && stableAccountingLiquidTreasury !== null) {
    return {
      value: stableAccountingLiquidTreasury,
      status: READ_STATUS.fallback,
      sourceLabel: 'stored accounting fallback',
      warning: live.sourceLabel,
    };
  }

  return live;
}

export function aggregateLpDeployment(traderJoeAvaxWei, pharaohAvaxWei) {
  const hasTraderJoe = traderJoeAvaxWei !== undefined && traderJoeAvaxWei !== null;
  const hasPharaoh = pharaohAvaxWei !== undefined && pharaohAvaxWei !== null;

  if (!hasTraderJoe && !hasPharaoh) {
    return { total: undefined, status: READ_STATUS.unavailable, sourceLabel: 'LP reads unavailable' };
  }

  if (!hasTraderJoe || !hasPharaoh) {
    return {
      total: undefined,
      traderJoe: hasTraderJoe ? traderJoeAvaxWei : undefined,
      pharaoh: hasPharaoh ? pharaohAvaxWei : undefined,
      status: READ_STATUS.partial,
      sourceLabel: 'partial LP reads',
    };
  }

  return {
    total: traderJoeAvaxWei + pharaohAvaxWei,
    traderJoe: traderJoeAvaxWei,
    pharaoh: pharaohAvaxWei,
    status: READ_STATUS.live,
    sourceLabel: 'live coordinator',
  };
}

export function configuredAddressMetric(address, label = 'configured address') {
  if (!address) return { value: 'Unavailable', status: READ_STATUS.unavailable, sourceLabel: 'missing config' };
  return { value: address, status: READ_STATUS.configured, sourceLabel: label };
}

export function chainlinkPriceStatus(roundData, nowSeconds = Math.floor(Date.now() / 1000), staleAfterSeconds = 60 * 60 * 6) {
  if (!roundData || roundData[1] <= 0n || roundData[3] === 0n) {
    return { avaxUsd: undefined, status: READ_STATUS.unavailable, sourceLabel: 'price feed unavailable' };
  }

  const updatedAtSeconds = Number(roundData[3]);
  const status = nowSeconds - updatedAtSeconds > staleAfterSeconds ? READ_STATUS.stale : READ_STATUS.live;
  return {
    avaxUsd: Number(formatUnits(roundData[1], 8)),
    status,
    sourceLabel: status === READ_STATUS.stale ? 'stale Chainlink' : 'live Chainlink',
    updatedAt: new Date(updatedAtSeconds * 1000).toISOString(),
  };
}

export function accountingBucketRows(stableAccounting) {
  return [
    { label: 'Stored liquid treasury', value: stableAccounting?.[2], source: 'stableAccounting[2]' },
    { label: 'Outstanding purchase releases', value: stableAccounting?.[3], source: 'stableAccounting[3]' },
    { label: 'LP CATCH market-buy', value: stableAccounting?.[4], source: 'stableAccounting[4]' },
    { label: 'LP AVAX pairing', value: stableAccounting?.[5], source: 'stableAccounting[5]' },
    { label: 'Legacy holder bucket', value: stableAccounting?.[6], source: 'stableAccounting[6]' },
  ];
}
