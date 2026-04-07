import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, rabbyWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { avalancheFuji } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'GM10 Admin',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalancheFuji],
    wallets: [
        {
            groupName: 'Popular',
            wallets: [metaMaskWallet, rabbyWallet, walletConnectWallet],
        },
    ],
    ssr: false,
});
