export type ClaimEligibilityInput = {
    isConnected: boolean;
    isExcluded?: boolean;
    claimableProfitWei?: bigint;
    hasClaimAction: boolean;
};

export type ClaimEligibilityState = {
    canClaim: boolean;
    reason: string;
};

export function getClaimEligibilityState(input: ClaimEligibilityInput): ClaimEligibilityState {
    if (!input.isConnected) {
        return { canClaim: false, reason: 'Connect a wallet to check realized profit.' };
    }

    if (input.isExcluded) {
        return { canClaim: false, reason: 'This account is excluded from profit share.' };
    }

    if (input.claimableProfitWei === undefined) {
        return { canClaim: false, reason: 'Claimable profit is still loading.' };
    }

    if (input.claimableProfitWei <= 0n) {
        return { canClaim: false, reason: 'No realized sale profit is claimable for this account.' };
    }

    if (!input.hasClaimAction) {
        return { canClaim: false, reason: 'Claim action is not configured on the public site.' };
    }

    return { canClaim: true, reason: 'Realized AVAX profit is available to claim.' };
}
