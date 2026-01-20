import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalanche, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'Ash Strategy',
    projectId: 'YOUR_PROJECT_ID', // User needs to provide this
    chains: [avalanche, mainnet],
    ssr: false, // Important for Vite/SPA
});
