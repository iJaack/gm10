import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAdminRole } from '../hooks/useAdminRole';

export function RoleGate({ children }: { children: React.ReactNode }) {
    const { isConnected, isAuthorized, isLoading } = useAdminRole();

    if (!isConnected) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0b0a14] text-white">
                <p className="text-lg font-semibold text-[#4fa8e0]">GM10 Admin</p>
                <p className="text-sm text-gray-400">Connect a wallet with OPERATOR_ROLE or DEFAULT_ADMIN_ROLE to continue.</p>
                <ConnectButton />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b0a14] text-gray-400">
                Checking role…
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0a14] text-white">
                <p className="text-lg font-semibold text-red-400">Not authorized</p>
                <p className="text-sm text-gray-400">
                    This wallet does not hold OPERATOR_ROLE or DEFAULT_ADMIN_ROLE on the fund contract.
                </p>
                <ConnectButton />
            </div>
        );
    }

    return <>{children}</>;
}
