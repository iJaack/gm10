// V4 fund ABI — only the functions the admin dashboard uses
export const FUND_V4_ABI = [
    // Role management
    {
        inputs: [],
        name: 'OPERATOR_ROLE',
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
        name: 'hasRole',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
        name: 'grantRole',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // Bridge adapter config
    {
        inputs: [{ name: 'adapter', type: 'address' }],
        name: 'approvedBridgeAdapters',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'adapter', type: 'address' }, { name: 'approved', type: 'bool' }],
        name: 'setApprovedBridgeAdapter',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'router', type: 'address' }],
        name: 'setSwapRouterV4',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'swapRouterV4',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Bridge ref lookup
    {
        inputs: [{ name: 'purchaseKey', type: 'bytes32' }],
        name: 'purchaseBridgeRefs',
        outputs: [{
            components: [
                { name: 'dstChainEid', type: 'uint32' },
                { name: 'dstSafe', type: 'address' },
                { name: 'tokenBridged', type: 'address' },
                { name: 'amountBridged', type: 'uint256' },
                { name: 'bridgedAt', type: 'uint256' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
    // swapAndBridge
    {
        inputs: [
            { name: 'purchaseKey', type: 'bytes32' },
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'path', type: 'address[]' },
            { name: 'amountOut', type: 'uint256' },
            { name: 'maxAmountIn', type: 'uint256' },
            { name: 'bridgeAdapter', type: 'address' },
            { name: 'lzOptions', type: 'bytes' },
        ],
        name: 'swapAndBridge',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'purchaseKey', type: 'bytes32' },
            { indexed: true, name: 'dstChainEid', type: 'uint32' },
            { indexed: true, name: 'dstSafe', type: 'address' },
            { indexed: false, name: 'tokenBridged', type: 'address' },
            { indexed: false, name: 'amountBridged', type: 'uint256' },
            { indexed: false, name: 'bridgeFee', type: 'uint256' },
        ],
        name: 'PurchaseFundsBridged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'adapter', type: 'address' },
            { indexed: false, name: 'approved', type: 'bool' },
        ],
        name: 'BridgeAdapterSet',
        type: 'event',
    },
] as const;

// Stargate bridge adapter ABI
export const STARGATE_ADAPTER_ABI = [
    {
        inputs: [{ name: 'token', type: 'address' }],
        name: 'stargatePool',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'token', type: 'address' }, { name: 'pool', type: 'address' }],
        name: 'setPool',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { name: 'dstEid', type: 'uint32' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'options', type: 'bytes' },
        ],
        name: 'quoteBridge',
        outputs: [{ name: 'nativeFee', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'fund',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// Portfolio registry ABI — chain safe config
export const REGISTRY_ABI = [
    {
        inputs: [
            { name: 'chainEid', type: 'uint32' },
            { name: 'evmSafe', type: 'address' },
            { name: 'nonEvmSafe', type: 'bytes32' },
            { name: 'label', type: 'bytes32' },
            { name: 'enabled', type: 'bool' },
        ],
        name: 'setChainSafe',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'chainEid', type: 'uint32' }],
        name: 'getChainSafe',
        outputs: [{
            components: [
                { name: 'enabled', type: 'bool' },
                { name: 'chainEid', type: 'uint32' },
                { name: 'evmSafe', type: 'address' },
                { name: 'nonEvmSafe', type: 'bytes32' },
                { name: 'label', type: 'bytes32' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'marketplaceId', type: 'bytes32' }, { name: 'approved', type: 'bool' }],
        name: 'setMarketplaceApproval',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;
