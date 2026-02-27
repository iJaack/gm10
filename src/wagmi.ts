import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalanche, avalancheFuji } from 'wagmi/chains';

// Fuji is the primary chain for fund operations (testnet phase).
// Avalanche mainnet is included solely for cross-chain $EVA balance reads (token gate).
export const config = getDefaultConfig({
    appName: 'Gem Mint Strategy',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalancheFuji, avalanche],
    ssr: false,
});
