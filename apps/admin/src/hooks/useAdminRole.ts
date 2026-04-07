import { useAccount, useReadContract } from 'wagmi';
import { keccak256, toHex } from 'viem';
import { FUND_V4_ABI } from '../abis';
import { FUJI } from '../addresses';

const OPERATOR_ROLE = keccak256(toHex('OPERATOR_ROLE'));
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export function useAdminRole() {
    const { address, isConnected } = useAccount();

    const { data: isOperator, isLoading: loadingOperator } = useReadContract({
        address: FUJI.fundProxy,
        abi: FUND_V4_ABI,
        functionName: 'hasRole',
        args: [OPERATOR_ROLE, address ?? '0x0000000000000000000000000000000000000000'],
        query: { enabled: isConnected && !!address },
    });

    const { data: isAdmin, isLoading: loadingAdmin } = useReadContract({
        address: FUJI.fundProxy,
        abi: FUND_V4_ABI,
        functionName: 'hasRole',
        args: [DEFAULT_ADMIN_ROLE, address ?? '0x0000000000000000000000000000000000000000'],
        query: { enabled: isConnected && !!address },
    });

    return {
        isConnected,
        address,
        isOperator: !!isOperator,
        isAdmin: !!isAdmin,
        isAuthorized: !!isOperator || !!isAdmin,
        isLoading: loadingOperator || loadingAdmin,
    };
}
