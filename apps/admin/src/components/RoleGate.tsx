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
    const { isConnected, isAuthorized, isLoading } = useAdminRole();
    const safeAppInfo = useSafeAppInfo();
    const wrongSafeChain = safeAppInfo.isSafeApp && safeAppInfo.chainId !== 43114;

    if (!isConnected) {
        return (
            <GateShell>
                <div className="label-font">GM10 Admin</div>
                <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
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

    if (isLoading || safeAppInfo.isLoading) {
        return (
            <GateShell>
                <div className="label-font">Checking role…</div>
                <p className="mt-4 text-sm text-[var(--text-tertiary)]">Verifying onchain permissions.</p>
            </GateShell>
        );
    }

    if (wrongSafeChain) {
        return (
            <GateShell>
                <div className="label-font" style={{ color: 'var(--accent-red)' }}>Wrong Safe network</div>
                <h1 className="mt-4 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    Switch to Avalanche
                </h1>
                <p className="mt-4 text-[0.92rem] leading-[1.6] text-[var(--text-secondary)]">
                    Admin transactions must be submitted from the Avalanche Treasury Safe.
                    This Safe app is currently open on chain ID <code className="font-mono text-[var(--text-primary)]">{safeAppInfo.chainId}</code>.
                </p>
                <div className="mt-8">
                    <a
                        className="admin-cta"
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
                <div className="mt-8 flex justify-center">
                    <ConnectButton />
                </div>
            </GateShell>
        );
    }

    return <>{children}</>;
}
