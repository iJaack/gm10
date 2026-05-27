import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { coreWallet, metaMaskWallet, rabbyWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { arbitrum, avalanche, base, bsc, fantom, mainnet, optimism, polygon } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'Gem Mint Strategy',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalanche, base, mainnet, arbitrum, optimism, polygon, bsc, fantom],
    wallets: [
        {
            groupName: 'Popular',
            wallets: [coreWallet, metaMaskWallet, rabbyWallet, walletConnectWallet],
        },
    ],
    ssr: false,
});
