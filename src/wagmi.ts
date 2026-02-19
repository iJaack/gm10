import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalanche, avalancheFuji } from 'wagmi/chains';

// Avalanche mainnet included for cross-chain $EVA balance reads (token gate).
// Fuji remains the primary chain for fund operations during testnet phase.
export const config = getDefaultConfig({
    appName: 'Gem Mint Strategy',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalancheFuji, avalanche],
    ssr: false, // Important for Vite/SPA
});
