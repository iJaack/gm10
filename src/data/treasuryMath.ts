const AVAX_WEI = 10n ** 18n;
const USDT6 = 1_000_000n;

function avaxUsdToUsdt6(avaxUsd: number) {
    if (!Number.isFinite(avaxUsd) || avaxUsd <= 0) return 0n;
    return BigInt(Math.round(avaxUsd * Number(USDT6)));
}

export function avaxWeiToUsdt6(balanceWei: bigint, avaxUsd: number) {
    return (balanceWei * avaxUsdToUsdt6(avaxUsd)) / AVAX_WEI;
}

export function sumTreasuryWalletBalancesUsdt6(
    walletBalancesWei: readonly (bigint | undefined)[],
    avaxUsd: number,
) {
    if (walletBalancesWei.some((balance) => balance === undefined)) return undefined;

    const totalWei = walletBalancesWei.reduce<bigint>(
        (total, balance) => total + (balance ?? 0n),
        0n,
    );

    return avaxWeiToUsdt6(totalWei, avaxUsd);
}

export function resolveLiquidTreasuryUsdt6({
    walletBalancesWei,
    avaxUsd,
    stableAccountingLiquidTreasury,
}: {
    walletBalancesWei: readonly (bigint | undefined)[];
    avaxUsd: number;
    stableAccountingLiquidTreasury?: bigint;
}) {
    return sumTreasuryWalletBalancesUsdt6(walletBalancesWei, avaxUsd)
        ?? stableAccountingLiquidTreasury
        ?? 0n;
}
