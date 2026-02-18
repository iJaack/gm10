import { useAccount, useReadContract } from 'wagmi';

const EVA_TOKEN_ADDRESS = (import.meta.env.VITE_EVA_TOKEN_ADDRESS ||
    '0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672') as `0x${string}`;

const EVA_STAKING_ADDRESS = (import.meta.env.VITE_EVA_STAKING_ADDRESS || '') as `0x${string}`;

const MIN_EVA_HOLD = BigInt(
    (import.meta.env.VITE_MIN_EVA_HOLD || '10000000')
) * BigInt(1e18);

// Minimal ABIs – only the functions we need
const ERC20_BALANCE_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const STAKING_ABI = [
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'canInvest',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'getStakeInfo',
        outputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'unlocksAt', type: 'uint256' },
            { name: 'locked', type: 'bool' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export function useEVAAccess() {
    const { address, isConnected } = useAccount();

    const { data: balance, isLoading: balanceLoading } = useReadContract({
        address: EVA_TOKEN_ADDRESS,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const stakingEnabled = !!EVA_STAKING_ADDRESS && EVA_STAKING_ADDRESS.length === 42;

    const { data: canInvestResult, isLoading: canInvestLoading } = useReadContract({
        address: EVA_STAKING_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'canInvest',
        args: address ? [address] : undefined,
        query: { enabled: !!address && stakingEnabled },
    });

    const { data: stakeInfoResult, isLoading: stakeInfoLoading } = useReadContract({
        address: EVA_STAKING_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getStakeInfo',
        args: address ? [address] : undefined,
        query: { enabled: !!address && stakingEnabled },
    });

    const evaBalance = balance ?? BigInt(0);
    const hasViewAccess = evaBalance >= MIN_EVA_HOLD;
    const hasInvestAccess = stakingEnabled ? (canInvestResult === true) : false;

    const stakeAmount = stakeInfoResult ? stakeInfoResult[0] : BigInt(0);
    const unlocksAt = stakeInfoResult ? Number(stakeInfoResult[1]) : 0;
    const stakeLocked = stakeInfoResult ? stakeInfoResult[2] : false;

    return {
        isConnected,
        hasViewAccess,
        hasInvestAccess,
        evaBalance,
        isLoading: balanceLoading || canInvestLoading || stakeInfoLoading,
        stakeAmount,
        unlocksAt,
        stakeLocked,
        stakingEnabled,
    };
}

export { EVA_TOKEN_ADDRESS, EVA_STAKING_ADDRESS, MIN_EVA_HOLD };
