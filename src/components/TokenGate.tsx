import type { ReactNode } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import { useEVAAccess } from '../hooks/useEVAAccess';
import Page from './Page';

type TokenGateProps = {
    children: ReactNode;
};

export default function TokenGate({ children }: TokenGateProps) {
    const {
        isConnected,
        hasViewAccess,
        evaBalance,
        isLoading,
    } = useEVAAccess();

    // --- Not connected ---
    if (!isConnected) {
        return (
            <Page>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-12 max-w-lg">
                        <div className="text-5xl mb-6">🔐</div>
                        <h2 className="text-2xl font-bold text-white mb-4">
                            Connect Your Wallet
                        </h2>
                        <p className="text-gray-400 mb-8">
                            Connect your wallet to access this page. You need to hold $EVA tokens on Avalanche.
                        </p>
                        <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                                <button
                                    onClick={openConnectModal}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-bold text-white hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/25"
                                >
                                    Connect Wallet
                                </button>
                            )}
                        </ConnectButton.Custom>
                    </div>
                </div>
            </Page>
        );
    }

    // --- Loading ---
    if (isLoading) {
        return (
            <Page>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div className="text-4xl mb-4 animate-pulse">⏳</div>
                    <p className="text-gray-400">Checking $EVA balance…</p>
                </div>
            </Page>
        );
    }

    // --- Insufficient $EVA balance ---
    if (!hasViewAccess) {
        const formattedBalance = Number(formatUnits(evaBalance, 18)).toLocaleString(undefined, {
            maximumFractionDigits: 0,
        });

        return (
            <Page>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-orange-500/20 rounded-3xl p-12 max-w-lg">
                        <div className="text-5xl mb-6">🪙</div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            $EVA Required
                        </h2>
                        <p className="text-gray-400 mb-6">
                            You need to hold <span className="text-white font-semibold">10,000,000 $EVA</span> on Avalanche to access this page.
                        </p>

                        <div className="bg-[#0a0f1c]/50 rounded-xl p-4 mb-6 border border-gray-700">
                            <div className="text-sm text-gray-400 mb-1">Your Balance (Avalanche Mainnet)</div>
                            <div className="text-2xl font-bold text-orange-400">
                                {formattedBalance} <span className="text-gray-500">$EVA</span>
                            </div>
                        </div>

                        <a
                            href="https://arenatrade.ai/token/0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-bold text-white hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/25"
                        >
                            Buy $EVA on ArenaTrade →
                        </a>

                        <p className="text-xs text-gray-500 mt-4">
                            Available on{' '}
                            <a
                                href="https://www.paraswap.io/#/?network=avalanche&buy=0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:underline"
                            >
                                ParaSwap
                            </a>{' '}
                            and other Avalanche DEXs
                        </p>
                    </div>
                </div>
            </Page>
        );
    }

    // --- Access granted ---
    return <>{children}</>;
}
