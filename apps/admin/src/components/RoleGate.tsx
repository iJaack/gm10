import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAdminRole } from '../hooks/useAdminRole';
import { useSafeAppInfo } from '../hooks/useSafeAppInfo';

function GateShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6">
            <div className="admin-card w-full max-w-lg px-8 py-10 text-center">
                {children}
            </div>
        </div>
    );
}

export function RoleGate({ children }: { children: React.ReactNode }) {
    const {
        address,
        assumedTreasurySafeRoles,
        isConnected,
        isAuthorized,
        isLoading,
        loadingDetail,
        roleCheckError,
        safeContextTimedOut,
    } = useAdminRole();
    const safeAppInfo = useSafeAppInfo();
    const wrongSafeChain = safeAppInfo.isSafeApp && safeAppInfo.chainId !== 43114;

    if (!isConnected) {
        return (
            <GateShell>
                <div className="label-font">GM10 Admin</div>
                <h1 className="mt-4 text-2xl font-extrabold text-[var(--text-primary)]">
                    Treasury control surface
                </h1>
                <p className="mt-4 text-[0.92rem] leading-[1.6] text-[var(--text-secondary)]">
                    Open this app inside the Treasury Safe on{' '}
                    <span className="text-[var(--text-primary)]">app.safe.global</span>,
                    then connect with Safe. Direct Ledger connections are not enough — privileged roles belong to the Safe.
                </p>
                <div className="mt-8 flex justify-center">
                    <ConnectButton />
                </div>
            </GateShell>
        );
    }

    if (isLoading) {
        return (
            <GateShell>
                <div className="label-font">Checking role…</div>
                <p className="mt-4 text-sm text-[var(--text-tertiary)]">
                    {loadingDetail ?? 'Verifying onchain permissions.'}
                </p>
                {safeContextTimedOut && !assumedTreasurySafeRoles && (
                    <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                        Safe context timed out; using the configured Treasury Safe fallback.
                    </p>
                )}
            </GateShell>
        );
    }

    if (roleCheckError) {
        return (
            <GateShell>
                <div className="label-font" style={{ color: 'var(--accent-red)' }}>Role check failed</div>
                <p className="mt-4 text-[0.92rem] leading-[1.6] text-[var(--text-secondary)]">
                    Could not verify onchain permissions for{' '}
                    <code className="font-mono text-[var(--text-primary)]">{address ?? 'the connected wallet'}</code>.
                </p>
                <p className="mt-3 text-sm text-[var(--text-tertiary)]">{roleCheckError}</p>
                <div className="mt-8 flex justify-center">
                    <ConnectButton />
                </div>
            </GateShell>
        );
    }

    if (wrongSafeChain) {
        return (
            <GateShell>
                <div className="label-font" style={{ color: 'var(--accent-red)' }}>Wrong Safe network</div>
                <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
                    Switch to Avalanche
                </h1>
                <p className="mt-4 text-[0.92rem] leading-[1.6] text-[var(--text-secondary)]">
                    Admin transactions must be submitted from the Avalanche Treasury Safe.
                    This Safe app is currently open on chain ID <code className="font-mono text-[var(--text-primary)]">{safeAppInfo.chainId}</code>.
                </p>
                <div className="mt-8">
                    <a
                        className="inline-flex items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#0b0a14] transition-colors hover:bg-[#ffd75b] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                        href="https://app.safe.global/apps/open?safe=avax:0x39971795266a794a8156271729A07994952a6FAD&appUrl=https%3A%2F%2Fadmin.gm10.xyz"
                        target="_blank"
                        rel="noreferrer"
                    >
                        ↗ Open Avalanche Safe app
                    </a>
                </div>
            </GateShell>
        );
    }

    if (!isAuthorized) {
        return (
            <GateShell>
                <div className="label-font" style={{ color: 'var(--accent-red)' }}>Not authorized</div>
                <p className="mt-4 text-[0.92rem] leading-[1.6] text-[var(--text-secondary)]">
                    This wallet does not hold MANAGER_ROLE, OPERATOR_ROLE, or DEFAULT_ADMIN_ROLE on the fund contract.
                    Use the Treasury Safe app connection for production operations.
                </p>
                {assumedTreasurySafeRoles && (
                    <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                        Treasury Safe fallback is active, but the UI did not resolve an authorized role.
                    </p>
                )}
                <div className="mt-8 flex justify-center">
                    <ConnectButton />
                </div>
            </GateShell>
        );
    }

    return <>{children}</>;
}
