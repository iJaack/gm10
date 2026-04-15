import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { config } from './wagmi';
import { RoleGate } from './components/RoleGate';
import { OperationsPanel } from './panels/OperationsPanel';
import { CourtyardWizardPanel } from './panels/CourtyardWizardPanel';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAdminRole } from './hooks/useAdminRole';
import { SafeAppBootstrap } from './components/SafeAppBootstrap';

const queryClient = new QueryClient();

const TABS = ['Operations', 'Courtyard Wizard'] as const;
type Tab = typeof TABS[number];

function AdminApp() {
    const [tab, setTab] = useState<Tab>('Operations');
    const { address, isAdmin, isManager } = useAdminRole();

    return (
        <div className="min-h-screen bg-[#0b0a14] text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-[#0d0c1a]">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                    <div>
                        <span className="text-sm font-bold tracking-widest text-[#4fa8e0]">GM10</span>
                        <span className="ml-2 text-xs text-gray-500">Admin</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {address && (
                            <span className="hidden rounded-full bg-white/5 px-3 py-1 font-mono text-[0.7rem] text-gray-400 sm:block">
                                {address.slice(0, 6)}…{address.slice(-4)}
                                {isAdmin && <span className="ml-2 text-[#f0c030]">admin</span>}
                                {!isAdmin && isManager && <span className="ml-2 text-[#4fa8e0]">manager</span>}
                            </span>
                        )}
                        <ConnectButton showBalance={false} chainStatus="none" />
                    </div>
                </div>
            </header>

            {/* Nav tabs */}
            <div className="border-b border-white/10">
                <div className="mx-auto flex max-w-5xl gap-1 px-6">
                    {TABS.map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`px-4 py-3 text-sm transition-colors ${
                                tab === t
                                    ? 'border-b-2 border-[#4fa8e0] text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <main className="mx-auto max-w-5xl px-6 py-8">
                {tab === 'Operations' && <OperationsPanel />}
                {tab === 'Courtyard Wizard' && <CourtyardWizardPanel />}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme({ accentColor: '#4fa8e0' })}>
                    <SafeAppBootstrap />
                    <RoleGate>
                        <AdminApp />
                    </RoleGate>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
