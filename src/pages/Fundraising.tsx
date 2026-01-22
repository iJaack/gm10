import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const FUND_ADDRESS = "0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C"; // Upgradeable Proxy - Avalanche Fuji Testnet
const INVEST_ABI = [
    {
        inputs: [],
        name: "invest",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    }
] as const;

// Fundraising Round Info (these would come from smart contract in production)
const ROUND_TARGET = 10000; // AVAX
const ROUND_RAISED = 0; // AVAX (placeholder - would read from contract)
const CURRENT_NAV = 0.0025; // AVAX per $CATCH (400 CATCH per 1 AVAX)
const MIN_INVESTMENT = 0.1; // AVAX
const MAX_INVESTMENT = 200; // AVAX per wallet

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

    const progressPercentage = (ROUND_RAISED / ROUND_TARGET) * 100;
    const catchReceived = amount ? (parseFloat(amount) / CURRENT_NAV).toFixed(2) : '0';

    return (
        <div className="min-h-screen pt-32 px-4 pb-20 bg-[#0a0f1c]">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        Round 1 <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Fundraising</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
                        Invest in the first fundraising round. Your $CATCH tokens represent fractional ownership of museum-quality graded Pokemon cards.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
                            🔒 Avalanche Fuji Testnet
                        </span>
                        <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                            ✅ Active
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Left Column: Stats Cards */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Round Progress */}
                        <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Round Progress</h2>
                                <span className="text-sm text-gray-400">Target: {ROUND_TARGET.toLocaleString()} AVAX</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
                                <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-[#0a0f1c]/50 rounded-xl p-4">
                                    <div className="text-sm text-gray-400 mb-1">Raised</div>
                                    <div className="text-2xl font-bold text-white">{ROUND_RAISED.toLocaleString()} AVAX</div>
                                    <div className="text-xs text-gray-500 mt-1">{progressPercentage.toFixed(1)}% of target</div>
                                </div>
                                <div className="bg-[#0a0f1c]/50 rounded-xl p-4">
                                    <div className="text-sm text-gray-400 mb-1">Remaining</div>
                                    <div className="text-2xl font-bold text-white">{(ROUND_TARGET - ROUND_RAISED).toLocaleString()} AVAX</div>
                                    <div className="text-xs text-gray-500 mt-1">Until target reached</div>
                                </div>
                            </div>
                        </div>

                        {/* Key Information */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                                <div className="text-sm text-gray-400 mb-2">Current NAV</div>
                                <div className="text-3xl font-bold text-white mb-1">{CURRENT_NAV} AVAX</div>
                                <div className="text-xs text-green-400">per $CATCH</div>
                            </div>
                            <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                                <div className="text-sm text-gray-400 mb-2">Min. Investment</div>
                                <div className="text-3xl font-bold text-white mb-1">{MIN_INVESTMENT} AVAX</div>
                                <div className="text-xs text-gray-400">~${(MIN_INVESTMENT * 25).toFixed(0)} USD</div>
                            </div>
                            <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                                <div className="text-sm text-gray-400 mb-2">Max Investment</div>
                                <div className="text-3xl font-bold text-white mb-1">{MAX_INVESTMENT} AVAX</div>
                                <div className="text-xs text-gray-400">per wallet</div>
                            </div>
                        </div>

                        {/* How It Works */}
                        <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-white mb-6">How It Works</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 border border-blue-500/40 rounded-full flex items-center justify-center text-blue-400 font-bold">1</div>
                                    <div>
                                        <div className="font-semibold text-white mb-1">Invest AVAX</div>
                                        <div className="text-sm text-gray-400">Send AVAX to receive $CATCH tokens at current NAV (1:1 ratio during Round 1)</div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 border border-blue-500/40 rounded-full flex items-center justify-center text-blue-400 font-bold">2</div>
                                    <div>
                                        <div className="font-semibold text-white mb-1">Cards Acquired</div>
                                        <div className="text-sm text-gray-400">85% of funds used to acquire PSA/BGS 10 graded Pokemon cards</div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 border border-blue-500/40 rounded-full flex items-center justify-center text-blue-400 font-bold">3</div>
                                    <div>
                                        <div className="font-semibold text-white mb-1">Gain Exposure</div>
                                        <div className="text-sm text-gray-400">Your $CATCH value adjusts with card market performance + governance rights</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Investment Form */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(56,189,248,0.15)]">
                            <h3 className="text-2xl font-bold text-white mb-6">Invest Now</h3>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Amount (AVAX)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.0"
                                        min={MIN_INVESTMENT}
                                        max={MAX_INVESTMENT}
                                        step="0.1"
                                        className="w-full bg-[#0a0f1c] border border-gray-700 rounded-xl px-4 py-4 text-white text-xl font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">AVAX</span>
                                </div>
                                {amount && parseFloat(amount) < MIN_INVESTMENT && (
                                    <p className="text-xs text-red-400 mt-2">Minimum investment is {MIN_INVESTMENT} AVAX</p>
                                )}
                                {amount && parseFloat(amount) > MAX_INVESTMENT && (
                                    <p className="text-xs text-red-400 mt-2">Maximum investment is {MAX_INVESTMENT} AVAX per wallet</p>
                                )}
                            </div>

                            {/* You Receive */}
                            <div className="bg-[#0a0f1c]/70 rounded-xl p-4 mb-6 border border-gray-700">
                                <div className="text-sm text-gray-400 mb-1">You Receive</div>
                                <div className="text-2xl font-bold text-white">
                                    {catchReceived} <span className="text-cyan-400">$CATCH</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    @ {CURRENT_NAV} AVAX per token
                                </div>
                            </div>

                            {isConnected ? (
                                <button
                                    onClick={handleInvest}
                                    disabled={isPending || isConfirming || !amount || parseFloat(amount) < MIN_INVESTMENT || parseFloat(amount) > MAX_INVESTMENT}
                                    className={`w-full py-4 rounded-xl font-bold text-white transition-all ${isPending || !amount || parseFloat(amount) < MIN_INVESTMENT || parseFloat(amount) > MAX_INVESTMENT
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-blue-500/25'
                                        }`}
                                >
                                    {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Invest in Round 1'}
                                </button>
                            ) : (
                                <ConnectButton.Custom>
                                    {({ openConnectModal }) => (
                                        <button
                                            onClick={openConnectModal}
                                            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/25"
                                        >
                                            Connect Wallet to Invest
                                        </button>
                                    )}
                                </ConnectButton.Custom>
                            )}

                            {hash && (
                                <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                    <p className="text-xs text-gray-400 break-all mb-2">Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}</p>
                                    {isConfirming && <div className="text-sm text-yellow-400">⏳ Confirming...</div>}
                                    {isConfirmed && <div className="text-sm text-green-400 font-bold">✅ Success! You're now a $CATCH holder!</div>}
                                </div>
                            )}

                            {/* Disclaimer */}
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    ⚠️ <span className="font-semibold">Testnet Only:</span> This is Fuji testnet. Use test AVAX only. Not for production use.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Info Section */}
                <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-3xl p-12 text-center">
                    <h3 className="text-3xl font-bold mb-4">🔥 Early Investor Benefits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-8">
                        <div>
                            <div className="text-4xl mb-3">🎯</div>
                            <div className="font-bold text-white mb-2">Ground Floor Entry</div>
                            <div className="text-sm text-gray-400">Invest at 1:1 NAV before card acquisitions</div>
                        </div>
                        <div>
                            <div className="text-4xl mb-3">🗳️</div>
                            <div className="font-bold text-white mb-2">Governance Power</div>
                            <div className="text-sm text-gray-400">Vote on which cards to acquire & sell</div>
                        </div>
                        <div>
                            <div className="text-4xl mb-3">💎</div>
                            <div className="font-bold text-white mb-2">Permanent Liquidity</div>
                            <div className="text-sm text-gray-400">LP tokens burned—trade $CATCH on DEX 24/7</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
