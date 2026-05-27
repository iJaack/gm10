export const CONTINUOUS_COMMIT_RAILS = [
    {
        label: 'Any supported source token',
        detail: 'The commit flow can quote LI.FI or Mobula-supported routes from the user’s current chain and token.',
    },
    {
        label: 'Avalanche settlement',
        detail: 'Routes settle native AVAX into the fund proxy before any CATCH is minted.',
    },
    {
        label: 'Per-commit allocation',
        detail: 'Buyer CATCH and the five 1% segment allocations mint for each successful commit, because the round has no terminal close.',
    },
    {
        label: 'OFT delivery',
        detail: 'LayerZero OFT delivery returns buyer CATCH to the source chain when supported, with Avalanche claim fallback.',
    },
] as const;

export const SALE_PROFIT_ROUTE_STATES = [
    {
        label: 'Premium',
        detail: 'Favor inventory reinvestment and liquid buying power while market demand is strong.',
    },
    {
        label: 'Neutral',
        detail: 'Keep buying power dominant and route a bounded share into LP support.',
    },
    {
        label: 'Discount',
        detail: 'Shift incremental sale profit into buyback-burn reserve before LP support grows.',
    },
] as const;
