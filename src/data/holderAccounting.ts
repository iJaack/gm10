export type HolderAccountingInputs = {
    totalSupply?: bigint;
    profitEligibleSupply?: bigint;
    excludedBalances?: readonly (bigint | undefined)[];
    referenceNav?: bigint;
    navPerToken?: bigint;
    totalProfitDeposited?: bigint;
    hasProfitDistributor?: boolean;
};

export type HolderAccounting = {
    profitEligibleSupply?: bigint;
    excludedSupply?: bigint;
    referenceNav?: bigint;
    totalProfitDeposited?: bigint;
};

function sumDefined(values: readonly (bigint | undefined)[] = []) {
    return values.reduce<bigint>((sum, value) => sum + (value ?? 0n), 0n);
}

function clampSupply(value: bigint) {
    return value > 0n ? value : 0n;
}

export function resolveHolderAccounting(inputs: HolderAccountingInputs): HolderAccounting {
    const excludedSupply = sumDefined(inputs.excludedBalances);
    const derivedEligibleSupply = inputs.totalSupply === undefined
        ? undefined
        : clampSupply(inputs.totalSupply - excludedSupply);

    return {
        profitEligibleSupply: inputs.profitEligibleSupply ?? derivedEligibleSupply,
        excludedSupply,
        referenceNav: inputs.referenceNav ?? inputs.navPerToken,
        totalProfitDeposited: inputs.totalProfitDeposited ?? (inputs.hasProfitDistributor ? undefined : 0n),
    };
}
