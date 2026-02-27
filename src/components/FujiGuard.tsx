import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import type { ReactNode } from 'react';

// Hard-coded — this app only runs on Fuji testnet (43113).
// Mainnet is intentionally blocked to prevent loss of real funds.
const REQUIRED_CHAIN_ID = avalancheFuji.id; // 43113

type Props = { children: ReactNode };

export default function FujiGuard({ children }: Props) {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    // Not connected — let RainbowKit handle it downstream
    if (!isConnected) return <>{children}</>;

    // Wrong network
    if (chainId !== REQUIRED_CHAIN_ID) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1c]/95 backdrop-blur-sm px-4">
                <div className="bg-[#1a1f3c] border border-orange-500/40 rounded-3xl p-12 max-w-md w-full text-center shadow-2xl">
                    <div className="text-5xl mb-6">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-3">Wrong Network</h2>
                    <p className="text-gray-400 mb-2">
                        This app runs on <span className="text-orange-400 font-semibold">Avalanche Fuji Testnet</span> only.
                    </p>
                    <p className="text-gray-500 text-sm mb-8">
                        Mainnet is intentionally disabled — this is a testnet deployment. Use test AVAX only.
                    </p>
                    <button
                        onClick={() => switchChain({ chainId: REQUIRED_CHAIN_ID })}
                        className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-orange-500/25"
                    >
                        Switch to Fuji Testnet
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
