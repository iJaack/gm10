import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji } from 'wagmi/chains';

// TODO: Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env before mainnet
export const config = getDefaultConfig({
    appName: 'Gem Mint Strategy',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalancheFuji],
    ssr: false, // Important for Vite/SPA
});
