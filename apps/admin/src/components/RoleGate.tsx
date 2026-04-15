import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAdminRole } from '../hooks/useAdminRole';
import { useSafeAppInfo } from '../hooks/useSafeAppInfo';

export function RoleGate({ children }: { children: React.ReactNode }) {
    const { isConnected, isAuthorized, isLoading } = useAdminRole();
    const safeAppInfo = useSafeAppInfo();
    const wrongSafeChain = safeAppInfo.isSafeApp && safeAppInfo.chainId !== 43114;

    if (!isConnected) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0b0a14] text-white">
                <p className="text-lg font-semibold text-[#4fa8e0]">GM10 Admin</p>
                <p className="max-w-md text-center text-sm text-gray-400">
                    Open this app inside the Treasury Safe on app.safe.global, then connect with Safe. Direct Ledger connections
                    are not enough because privileged roles belong to the Safe.
                </p>
                <ConnectButton />
            </div>
        );
    }

    if (isLoading || safeAppInfo.isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b0a14] text-gray-400">
                Checking role…
            </div>
        );
    }

    if (wrongSafeChain) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0a14] px-6 text-center text-white">
                <p className="text-lg font-semibold text-red-400">Wrong Safe network</p>
                <p className="max-w-2xl text-sm leading-6 text-gray-400">
                    Admin accounting transactions must be submitted from the Avalanche Treasury Safe. This Safe app is
                    currently open on chain ID {safeAppInfo.chainId}. Switch Safe to Avalanche and open this app from
                    avax:0x39971795266a794a8156271729A07994952a6FAD.
                </p>
                <a
                    className="rounded-lg bg-[#4fa8e0] px-4 py-2 text-sm font-semibold text-[#0b0a14]"
                    href="https://app.safe.global/apps/open?safe=avax:0x39971795266a794a8156271729A07994952a6FAD&appUrl=https%3A%2F%2Fadmin.gm10.xyz"
                    target="_blank"
                    rel="noreferrer"
                >
                    Open Avalanche Safe app
                </a>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0a14] text-white">
                <p className="text-lg font-semibold text-red-400">Not authorized</p>
                <p className="text-sm text-gray-400">
                    This wallet does not hold MANAGER_ROLE, OPERATOR_ROLE, or DEFAULT_ADMIN_ROLE on the fund contract.
                    Use the Treasury Safe app connection for production operations.
                </p>
                <ConnectButton />
            </div>
        );
    }

    return <>{children}</>;
}
