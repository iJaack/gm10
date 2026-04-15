import { useAccount, useReadContract } from 'wagmi';
import { keccak256, toHex } from 'viem';
import { FUND_V4_ABI } from '../abis';
import { MAINNET } from '../addresses';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const OPERATOR_ROLE = keccak256(toHex('OPERATOR_ROLE'));
const MANAGER_ROLE = keccak256(toHex('MANAGER_ROLE'));
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export function useAdminRole() {
    const { address, isConnected } = useAccount();
    const fundProxy = MAINNET.fundProxy ?? ZERO_ADDRESS;

    const { data: isOperator, isLoading: loadingOperator } = useReadContract({
        address: fundProxy,
        abi: FUND_V4_ABI,
        functionName: 'hasRole' as const,
        args: [OPERATOR_ROLE, address ?? ZERO_ADDRESS],
        query: { enabled: isConnected && !!address && Boolean(MAINNET.fundProxy) },
    });

    const { data: isAdmin, isLoading: loadingAdmin } = useReadContract({
        address: fundProxy,
        abi: FUND_V4_ABI,
        functionName: 'hasRole' as const,
        args: [DEFAULT_ADMIN_ROLE, address ?? ZERO_ADDRESS],
        query: { enabled: isConnected && !!address && Boolean(MAINNET.fundProxy) },
    });

    const { data: isManager, isLoading: loadingManager } = useReadContract({
        address: fundProxy,
        abi: FUND_V4_ABI,
        functionName: 'hasRole' as const,
        args: [MANAGER_ROLE, address ?? ZERO_ADDRESS],
        query: { enabled: isConnected && !!address && Boolean(MAINNET.fundProxy) },
    });

    return {
        isConnected,
        address,
        isOperator: !!isOperator,
        isManager: !!isManager,
        isAdmin: !!isAdmin,
        isAuthorized: !!isOperator || !!isManager || !!isAdmin,
        isLoading: loadingOperator || loadingManager || loadingAdmin,
    };
}
