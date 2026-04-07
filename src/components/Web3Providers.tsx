import type { ReactNode } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import FujiGuard from './FujiGuard';
import { config } from '../wagmi';

const queryClient = new QueryClient();

type Web3ProvidersProps = {
    children: ReactNode;
};

export function Web3Providers({ children }: Web3ProvidersProps) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme({ accentColor: '#3b82f6', accentColorForeground: 'white', borderRadius: 'medium' })}>
                    <FujiGuard>{children}</FujiGuard>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
