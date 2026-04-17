import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import type { Config } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { config } from './wagmi';
import { RoleGate } from './components/RoleGate';
import { DashboardPanel } from './panels/DashboardPanel';
import { OperationsPanel } from './panels/OperationsPanel';
import { RoundsPanel } from './panels/RoundsPanel';
import { CourtyardWizardPanel } from './panels/CourtyardWizardPanel';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAdminRole } from './hooks/useAdminRole';
import { SafeAppBootstrap } from './components/SafeAppBootstrap';

const queryClient = new QueryClient();

const TABS = ['Dashboard', 'Rounds', 'Operations', 'Courtyard Wizard'] as const;
type Tab = typeof TABS[number];

function AdminApp() {
    const [tab, setTab] = useState<Tab>('Dashboard');
    const { address, isAdmin, isManager } = useAdminRole();

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-primary)]/85 backdrop-blur-xl">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-base font-extrabold tracking-[-0.01em] text-[var(--accent-blue)]">GM10</span>
                        <span className="label-font text-[0.62rem]" style={{ color: 'var(--text-tertiary)' }}>Admin</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {address && (
                            <span className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-[0.72rem] text-[var(--text-secondary)] sm:inline-flex">
                                <code className="font-mono">{address.slice(0, 6)}…{address.slice(-4)}</code>
                                {isAdmin && <span className="label-font" style={{ fontSize: '0.6rem' }}>admin</span>}
                                {!isAdmin && isManager && <span className="label-font" style={{ fontSize: '0.6rem', color: 'var(--accent-blue)' }}>manager</span>}
                            </span>
                        )}
                        <ConnectButton showBalance={false} chainStatus="none" />
                    </div>
                </div>
            </header>

            {/* Nav tabs */}
            <div className="border-b border-[var(--border)]">
                <div className="mx-auto flex max-w-5xl gap-1 px-6">
                    {TABS.map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`px-4 py-3 text-sm font-medium tracking-[-0.01em] transition-colors ${
                                tab === t
                                    ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]'
                                    : 'border-b-2 border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <main className="mx-auto max-w-5xl px-6 py-10">
                {tab === 'Dashboard' && <DashboardPanel />}
                {tab === 'Rounds' && <RoundsPanel />}
                {tab === 'Operations' && <OperationsPanel />}
                {tab === 'Courtyard Wizard' && <CourtyardWizardPanel />}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <WagmiProvider config={config as Config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme({ accentColor: '#f0c030', accentColorForeground: '#0b0a14', borderRadius: 'large' })}>
                    <SafeAppBootstrap />
                    <RoleGate>
                        <AdminApp />
                    </RoleGate>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
