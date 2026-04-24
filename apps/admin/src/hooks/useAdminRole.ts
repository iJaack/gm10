import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, keccak256, toHex } from 'viem';
import { avalanche } from 'viem/chains';
import { FUND_V4_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { resolveSafeAwareAdminAddress, sameAddress } from '../lib/safeContext.js';
import { useSafeAppInfo } from './useSafeAppInfo';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const DEFAULT_AVALANCHE_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
const ROLE_CHECK_TIMEOUT_MS = 5_000;

const OPERATOR_ROLE = keccak256(toHex('OPERATOR_ROLE'));
const MANAGER_ROLE = keccak256(toHex('MANAGER_ROLE'));
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
const ROLES = [OPERATOR_ROLE, MANAGER_ROLE, DEFAULT_ADMIN_ROLE] as const;

function timeoutAfter(ms: number) {
    return new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Role check timed out.')), ms);
    });
}

const roleCheckClient = createPublicClient({
    chain: avalanche,
    transport: http(import.meta.env.VITE_GM10_ADMIN_AVALANCHE_RPC_URL ?? DEFAULT_AVALANCHE_RPC_URL),
});

async function readRoles(fundProxy: `0x${string}`, roleAddress: `0x${string}`) {
    const results = await Promise.race([
        Promise.all(ROLES.map((role) => roleCheckClient.readContract({
            address: fundProxy,
            abi: FUND_V4_ABI,
            functionName: 'hasRole',
            args: [role, roleAddress],
        }))),
        timeoutAfter(ROLE_CHECK_TIMEOUT_MS),
    ]);

    return {
        isOperator: Boolean(results[0]),
        isManager: Boolean(results[1]),
        isAdmin: Boolean(results[2]),
    };
}

export function useAdminRole() {
    const { address, isConnected } = useAccount();
    const safeAppInfo = useSafeAppInfo();
    const safeContextTimedOut = !!safeAppInfo.timedOut || safeAppInfo.isLoading;
    const roleAddress = resolveSafeAwareAdminAddress({
        safeAddress: safeAppInfo.safeAddress,
        connectedAddress: address,
        safeContextTimedOut,
        fallbackSafeAddress: MAINNET.treasurySafe,
        fallbackSignerAddress: MAINNET.teamWallet,
    }) as `0x${string}` | undefined;
    const fundProxy = MAINNET.fundProxy ?? ZERO_ADDRESS;
    const waitingForSafeContext = false;
    const assumesTreasurySafeRoles = safeContextTimedOut
        && sameAddress(address, MAINNET.teamWallet)
        && sameAddress(roleAddress, MAINNET.treasurySafe);
    const queryEnabled = !assumesTreasurySafeRoles
        && !waitingForSafeContext
        && isConnected
        && !!roleAddress
        && Boolean(MAINNET.fundProxy);
    const roleQuery = useQuery({
        queryKey: ['admin-role', fundProxy, roleAddress],
        queryFn: () => readRoles(fundProxy, roleAddress as `0x${string}`),
        enabled: queryEnabled,
        retry: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
    });

    const isOperator = assumesTreasurySafeRoles || !!roleQuery.data?.isOperator;
    const isManager = assumesTreasurySafeRoles || !!roleQuery.data?.isManager;
    const isAdmin = assumesTreasurySafeRoles || !!roleQuery.data?.isAdmin;
    const isRoleLoading = queryEnabled && roleQuery.isFetching;
    const isLoading = isRoleLoading;
    const loadingDetail = useMemo(() => {
        if (isRoleLoading && roleAddress) return `Checking roles for ${roleAddress.slice(0, 6)}…${roleAddress.slice(-4)}.`;
        return undefined;
    }, [isRoleLoading, roleAddress]);

    return {
        isConnected,
        address: roleAddress,
        connectedAddress: address,
        safeContextTimedOut,
        assumedTreasurySafeRoles: assumesTreasurySafeRoles,
        roleCheckError: roleQuery.error instanceof Error ? roleQuery.error.message : undefined,
        loadingDetail,
        isOperator,
        isManager,
        isAdmin,
        isAuthorized: isOperator || isManager || isAdmin,
        isLoading,
    };
}
