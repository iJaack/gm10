import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, rabbyWallet, safeWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { avalanche } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'GM10 Admin',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalanche],
    wallets: [
        {
            groupName: 'Popular',
            wallets: [safeWallet, metaMaskWallet, rabbyWallet, walletConnectWallet],
        },
    ],
    ssr: false,
});
