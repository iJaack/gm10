import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji } from 'wagmi/chains';

// ⚠️ TESTNET ONLY — Fuji is hardcoded. No mainnet until contract is audited and ready.
// Do NOT add avalanche mainnet here — users would lose real money.
export const config = getDefaultConfig({
    appName: 'Gem Mint Strategy',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalancheFuji],
    ssr: false,
});
