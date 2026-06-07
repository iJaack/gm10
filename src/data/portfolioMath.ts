export type PortfolioValueInput = {
    acquisitionPriceUsdt6: bigint;
    currentValueUsdt6: bigint;
};

export type PlatformNavState = {
    netWorthUsd?: number;
    status: 'available' | 'unavailable';
};

export type PortfolioValueSummary = {
    costBasisUsdt6: bigint;
    onchainCurrentMarkUsdt6: bigint;
    platformNavUsdt6?: bigint;
    strategyCurrentValueUsdt6: bigint;
    unrealizedPnlUsdt6: bigint;
    unrealizedPnlPercent: number;
    unrealizedPnlDirection: 'up' | 'down' | 'flat';
    unrealizedSource: 'courtyard' | 'onchain';
};

export function dollarsToUsdt6(value: number) {
    if (!Number.isFinite(value) || value < 0) return undefined;
    return BigInt(Math.round(value * 1_000_000));
}

export function calculatePortfolioValueSummary(
    positions: readonly PortfolioValueInput[],
    platformNav: PlatformNavState,
    options: { liquidTreasuryUsdt6?: bigint } = {},
): PortfolioValueSummary {
    const totals = positions.reduce(
        (acc, position) => ({
            costBasisUsdt6: acc.costBasisUsdt6 + position.acquisitionPriceUsdt6,
            onchainCurrentMarkUsdt6: acc.onchainCurrentMarkUsdt6 + position.currentValueUsdt6,
        }),
        { costBasisUsdt6: 0n, onchainCurrentMarkUsdt6: 0n },
    );

    const platformNavUsdt6 = platformNav.status === 'available' && platformNav.netWorthUsd !== undefined
        ? dollarsToUsdt6(platformNav.netWorthUsd)
        : undefined;
    const activeCurrentMark = platformNavUsdt6 ?? totals.onchainCurrentMarkUsdt6;
    const strategyCurrentValueUsdt6 = activeCurrentMark + (options.liquidTreasuryUsdt6 ?? 0n);
    const unrealizedPnlUsdt6 = strategyCurrentValueUsdt6 - totals.costBasisUsdt6;
    const unrealizedPnlPercent = totals.costBasisUsdt6 === 0n
        ? 0
        : (Number(unrealizedPnlUsdt6) / Number(totals.costBasisUsdt6)) * 100;
    const unrealizedPnlDirection = unrealizedPnlUsdt6 > 0n
        ? 'up'
        : unrealizedPnlUsdt6 < 0n
            ? 'down'
            : 'flat';

    return {
        ...totals,
        platformNavUsdt6,
        strategyCurrentValueUsdt6,
        unrealizedPnlUsdt6,
        unrealizedPnlPercent,
        unrealizedPnlDirection,
        unrealizedSource: platformNavUsdt6 !== undefined ? 'courtyard' : 'onchain',
    };
}
