import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { coreWallet, metaMaskWallet, rabbyWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { avalanche, polygon } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'Gem Mint Strategy',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalanche, polygon],
    wallets: [
        {
            groupName: 'Popular',
            wallets: [coreWallet, metaMaskWallet, rabbyWallet, walletConnectWallet],
        },
    ],
    ssr: false,
});
