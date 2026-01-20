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

const TIERS = [
    {
        name: "Trainer",
        minEth: "0.1",
        benefits: ["Basic Portfolio Access", "Monthly Reports"],
        color: "from-blue-400 to-blue-600"
    },
    {
        name: "Gym Leader",
        minEth: "1.0",
        benefits: ["Priority Allocations", "Governance Rights", "Quarterly Calls"],
        color: "from-purple-400 to-purple-600",
        featured: true
    },
    {
        name: "Champion",
        minEth: "5.0",
        benefits: ["Direct Redemption", "Advisory Board Seat", "Private Discord"],
        color: "from-yellow-400 to-orange-500"
    }
];

export default function Fundraising() {
    const { isConnected } = useAccount();
    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const handleInvest = (tier: typeof TIERS[0]) => {
        if (!isConnected) return;
        writeContract({
            address: FUND_ADDRESS,
            abi: INVEST_ABI,
            functionName: 'invest',
            value: parseEther(tier.minEth),
        });
    };

    return (
        <div className="min-h-screen pt-32 px-4 pb-20">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        Join the <span className="gradient-text bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Fund</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Choose your entry level. All tiers grant exposure to the underlying card portfolio.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {TIERS.map((tier) => (
                        <div
                            key={tier.name}
                            className={`relative bg-[#1a1f3c]/50 backdrop-blur-sm border ${tier.featured ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]' : 'border-white/10'} rounded-2xl p-8 hover:transform hover:-translate-y-2 transition-all duration-300`}
                        >
                            {tier.featured && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                                    Most Popular
                                </div>
                            )}

                            <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold">{tier.minEth}</span>
                                <span className="text-gray-400">AVAX</span>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {tier.benefits.map((benefit, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <span className="text-green-400">✓</span>
                                        {benefit}
                                    </li>
                                ))}
                            </ul>

                            {isConnected ? (
                                <button
                                    onClick={() => handleInvest(tier)}
                                    disabled={isPending || isConfirming}
                                    className={`w-full py-4 rounded-xl font-bold text-white transition-all ${isPending
                                            ? 'bg-gray-600 cursor-not-allowed'
                                            : `bg-gradient-to-r ${tier.color} hover:opacity-90`
                                        }`}
                                >
                                    {isPending ? 'Confirming...' : 'Invest Now'}
                                </button>
                            ) : (
                                <div className="w-full">
                                    <ConnectButton.Custom>
                                        {({ openConnectModal }) => (
                                            <button
                                                onClick={openConnectModal}
                                                className="w-full py-4 rounded-xl font-bold text-white bg-gray-700 hover:bg-gray-600 transition-all"
                                            >
                                                Connect Wallet
                                            </button>
                                        )}
                                    </ConnectButton.Custom>
                                </div>
                            )}
                        </div>
                    ))}
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
