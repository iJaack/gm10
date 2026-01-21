import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'Gem Mint Strategy',
    projectId: 'YOUR_PROJECT_ID', // User needs to provide this
    chains: [avalancheFuji],
    ssr: false, // Important for Vite/SPA
});
