import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const FUND_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Placeholder
const INVEST_ABI = [
    {
        inputs: [],
        name: "invest",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    }
] as const;



export default function Fundraising() {
    const { isConnected } = useAccount();
    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });
    const [amount, setAmount] = useState('');

    const handleInvest = () => {
        if (!isConnected || !amount) return;
        writeContract({
            address: FUND_ADDRESS,
            abi: INVEST_ABI,
            functionName: 'invest',
            value: parseEther(amount),
        });
    };

    return (
        <div className="min-h-screen pt-32 px-4 pb-20">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        Buy <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">$CATCH</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
                        Buying the $CATCH token gives exposure to the graded card market growth.
                    </p>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto flex items-center justify-center gap-2">
                        <span className="text-xl">🗳️</span>
                        Token holders gain access to governance decisions about buys and sells.
                    </p>
                </div>

                <div className="max-w-md mx-auto relative bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(56,189,248,0.1)]">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Amount to Buy (AVAX)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.0"
                                className="w-full bg-[#0a0f1c] border border-gray-700 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">AVAX</span>
                        </div>
                    </div>

                    {isConnected ? (
                        <button
                            onClick={handleInvest}
                            disabled={isPending || isConfirming || !amount}
                            className={`w-full py-4 rounded-xl font-bold text-white transition-all ${isPending || !amount
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-500/25'
                                }`}
                        >
                            {isPending ? 'Confirming...' : 'Buy $CATCH'}
                        </button>
                    ) : (
                        <div className="w-full">
                            <ConnectButton.Custom>
                                {({ openConnectModal }) => (
                                    <button
                                        onClick={openConnectModal}
                                        className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25"
                                    >
                                        Connect Wallet
                                    </button>
                                )}
                            </ConnectButton.Custom>
                        </div>
                    )}
                </div>

                {hash && (
                    <div className="mt-8 max-w-md mx-auto p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
                        <p className="text-sm text-gray-400 break-all mb-2">Tx Hash: {hash}</p>
                        {isConfirming && <div className="text-yellow-400">Waiting for confirmation...</div>}
                        {isConfirmed && <div className="text-green-400 font-bold">Transaction Confirmed! 🎉</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
