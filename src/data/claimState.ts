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
        return { canClaim: false, reason: 'Connect a wallet to inspect CATCH accounting.' };
    }

    if (input.isExcluded) {
        return { canClaim: false, reason: 'This account is excluded from circulating holder supply analytics.' };
    }

    if (input.claimableProfitWei === undefined) {
        return { canClaim: false, reason: 'Public claim accounting is disabled in the continuous model.' };
    }

    if (input.claimableProfitWei <= 0n) {
        return { canClaim: false, reason: 'Routine holder claims are disabled; realized profit accrues through buying power and market support.' };
    }

    if (!input.hasClaimAction) {
        return { canClaim: false, reason: 'Claim action is not configured on the public site.' };
    }

    return { canClaim: true, reason: 'Realized AVAX profit is available to claim.' };
}
