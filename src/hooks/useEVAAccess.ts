import { useAccount, useReadContract } from 'wagmi';
import { avalanche } from 'wagmi/chains';

const EVA_TOKEN_ADDRESS = (import.meta.env.VITE_EVA_TOKEN_ADDRESS ||
    '0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672') as `0x${string}`;

const MIN_EVA_HOLD = BigInt(
    (import.meta.env.VITE_MIN_EVA_HOLD || '10000000')
) * BigInt(1e18);

// Always read $EVA balance from Avalanche mainnet (43114), regardless of user's connected chain
const EVA_CHAIN_ID = Number(import.meta.env.VITE_EVA_CHAIN_ID || '43114');

// Minimal ABI – only the function we need
const ERC20_BALANCE_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
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
        chainId: EVA_CHAIN_ID as typeof avalanche.id, // Always read from Avalanche mainnet
        query: { enabled: !!address },
    });

    const evaBalance = balance ?? BigInt(0);
    const hasViewAccess = evaBalance >= MIN_EVA_HOLD;

    return {
        isConnected,
        hasViewAccess,
        evaBalance,
        isLoading: balanceLoading,
    };
}

export { EVA_TOKEN_ADDRESS, MIN_EVA_HOLD };
