import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, rabbyWallet, safeWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { http } from 'wagmi';
import { avalanche, polygon } from 'wagmi/chains';

const DEFAULT_AVALANCHE_RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';
const DEFAULT_POLYGON_RPC_URL = 'https://polygon-bor-rpc.publicnode.com';

export const config = getDefaultConfig({
    appName: 'GM10 Admin',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [avalanche, polygon],
    transports: {
        [avalanche.id]: http(import.meta.env.VITE_GM10_ADMIN_AVALANCHE_RPC_URL ?? DEFAULT_AVALANCHE_RPC_URL),
        [polygon.id]: http(import.meta.env.VITE_GM10_ADMIN_POLYGON_RPC_URL ?? DEFAULT_POLYGON_RPC_URL),
    },
    wallets: [
        {
            groupName: 'Popular',
            wallets: [safeWallet, metaMaskWallet, rabbyWallet, walletConnectWallet],
        },
    ],
    ssr: false,
});
