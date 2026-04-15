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
    unrealizedPnlUsdt6: bigint;
    unrealizedSource: 'courtyard' | 'onchain';
};

export function dollarsToUsdt6(value: number) {
    if (!Number.isFinite(value) || value < 0) return undefined;
    return BigInt(Math.round(value * 1_000_000));
}

export function calculatePortfolioValueSummary(
    positions: readonly PortfolioValueInput[],
    platformNav: PlatformNavState,
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

    return {
        ...totals,
        platformNavUsdt6,
        unrealizedPnlUsdt6: activeCurrentMark - totals.costBasisUsdt6,
        unrealizedSource: platformNavUsdt6 !== undefined ? 'courtyard' : 'onchain',
    };
}
