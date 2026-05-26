export const GM10_FUND_ABI = [
    {
        inputs: [{ name: '_roundId', type: 'uint256' }],
        name: 'invest',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'currentRoundId',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: '_roundId', type: 'uint256' }],
        name: 'getRound',
        outputs: [{
            components: [
                { name: 'roundId', type: 'uint256' },
                { name: 'targetAmount', type: 'uint256' },
                { name: 'raisedAmount', type: 'uint256' },
                { name: 'tokenPrice', type: 'uint256' },
                { name: 'minInvestment', type: 'uint256' },
                { name: 'maxInvestment', type: 'uint256' },
                { name: 'startTime', type: 'uint256' },
                { name: 'endTime', type: 'uint256' },
                { name: 'isActive', type: 'bool' },
                { name: 'isFinalized', type: 'bool' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'portfolioRegistry',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'investorAccounting',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'profitDistributor',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'navPerTokenUsdt6',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'referenceNavPerTokenUsdt6',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'profitEligibleSupply18',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'claimableProfit',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'buybackBurnAccruedUsdt6',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'lpSupportAccruedUsdt6',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'continuousMintPaused',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'redemptionsPermanentlyDisabled',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'stableAccounting',
        outputs: [
            { name: 'canonicalPortfolioValue', type: 'uint256' },
            { name: 'lastStableNavUpdateTimestamp', type: 'uint256' },
            { name: 'liquidTreasury', type: 'uint256' },
            { name: 'outstandingPurchaseReleases', type: 'uint256' },
            { name: 'liquidityCatchBuyAccrued', type: 'uint256' },
            { name: 'liquidityAvaxPairingAccrued', type: 'uint256' },
            { name: 'holderDistributionAccrued', type: 'uint256' },
            { name: 'weeklyNavCap', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const GM10_PORTFOLIO_REGISTRY_ABI = [
    {
        inputs: [],
        name: 'collectiblePositionCount',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'positionId', type: 'uint256' }],
        name: 'getCollectiblePosition',
        outputs: [{
            components: [
                { name: 'id', type: 'uint256' },
                { name: 'originPurchaseKey', type: 'bytes32' },
                { name: 'chainEid', type: 'uint32' },
                { name: 'marketplaceId', type: 'bytes32' },
                { name: 'custodyMode', type: 'uint8' },
                { name: 'tokenStandard', type: 'bytes32' },
                { name: 'evmCollection', type: 'address' },
                { name: 'nonEvmCollection', type: 'bytes32' },
                { name: 'tokenId', type: 'uint256' },
                { name: 'nonEvmTokenId', type: 'bytes32' },
                { name: 'externalAssetId', type: 'bytes32' },
                { name: 'categoryId', type: 'bytes32' },
                { name: 'marketplaceProvenanceRef', type: 'bytes32' },
                { name: 'acquisitionPriceUsdt6', type: 'uint256' },
                { name: 'currentValueUsdt6', type: 'uint256' },
                { name: 'lastNavMarkUsdt6', type: 'uint256' },
                { name: 'acquisitionDate', type: 'uint256' },
                { name: 'lastValuationAt', type: 'uint256' },
                { name: 'status', type: 'uint8' },
                { name: 'metadataHash', type: 'bytes32' },
                { name: 'proofHash', type: 'bytes32' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const CHAINLINK_AGGREGATOR_V3_ABI = [
    {
        inputs: [],
        name: 'latestRoundData',
        outputs: [
            { name: 'roundId', type: 'uint80' },
            { name: 'answer', type: 'int256' },
            { name: 'startedAt', type: 'uint256' },
            { name: 'updatedAt', type: 'uint256' },
            { name: 'answeredInRound', type: 'uint80' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const GM10_INVESTOR_ACCOUNTING_ABI = [
    {
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'navPerTokenUsdt6', type: 'uint256' },
        ],
        name: 'getInvestorPnl',
        outputs: [{
            components: [
                { name: 'totalContributedAvax18', type: 'uint256' },
                { name: 'totalCostBasisUsdt6', type: 'uint256' },
                { name: 'remainingCostBasisUsdt6', type: 'uint256' },
                { name: 'directMintedTokens18', type: 'uint256' },
                { name: 'attributableTokens18', type: 'uint256' },
                { name: 'transferredInTokens18', type: 'uint256' },
                { name: 'transferredOutTokens18', type: 'uint256' },
                { name: 'claimedProfitWei', type: 'uint256' },
                { name: 'realizedProtocolYieldUsdt6', type: 'uint256' },
                { name: 'currentReferenceValueUsdt6', type: 'uint256' },
                { name: 'unrealizedReferencePnlUsdt6', type: 'int256' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const GM10_ERC20_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const GM10_TOKENOMICS_CONTROLLER_ABI = [
    {
        inputs: [],
        name: 'profitEligibleSupply18',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'excludedFromProfitShare',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const GM10_PROFIT_DISTRIBUTOR_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'excludedFromProfitShare',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'claimableProfit',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'eligibleSupply',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'cumulativeProfitPerTokenWei18',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'totalProfitDepositedWei',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const GM10_LIQUIDITY_COORDINATOR_ABI = [
    {
        inputs: [],
        name: 'traderJoeLpDeployedAvaxWei',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'pharaohLpDeployedAvaxWei',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'traderJoeLpTokenDeployed18',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'pharaohLpTokenDeployed18',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const GM10_LFJ_PAIR_ABI = [
    {
        inputs: [],
        name: 'token0',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'token1',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getReserves',
        outputs: [
            { name: 'reserve0', type: 'uint112' },
            { name: 'reserve1', type: 'uint112' },
            { name: 'blockTimestampLast', type: 'uint32' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export const GM10_PHARAOH_POOL_ABI = [
    {
        inputs: [],
        name: 'token0',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'token1',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'slot0',
        outputs: [
            { name: 'sqrtPriceX96', type: 'uint160' },
            { name: 'tick', type: 'int24' },
            { name: 'observationIndex', type: 'uint16' },
            { name: 'observationCardinality', type: 'uint16' },
            { name: 'observationCardinalityNext', type: 'uint16' },
            { name: 'feeProtocol', type: 'uint8' },
            { name: 'unlocked', type: 'bool' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;
