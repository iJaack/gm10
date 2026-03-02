import { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Page from '../components/Page';

const FUND_ADDRESS = "0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C"; // Upgradeable Proxy - Avalanche Fuji Testnet

const FUND_ABI = [
    {
        inputs: [{ name: "_roundId", type: "uint256" }],
        name: "invest",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [],
        name: "currentRoundId",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "_roundId", type: "uint256" }],
        name: "getRound",
        outputs: [{
            components: [
                { name: "roundId", type: "uint256" },
                { name: "targetAmount", type: "uint256" },
                { name: "raisedAmount", type: "uint256" },
                { name: "tokenPrice", type: "uint256" },
                { name: "minInvestment", type: "uint256" },
                { name: "maxInvestment", type: "uint256" },
                { name: "startTime", type: "uint256" },
                { name: "endTime", type: "uint256" },
                { name: "isActive", type: "bool" },
                { name: "isFinalized", type: "bool" }
            ],
            name: "",
            type: "tuple"
        }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "navPerToken",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

// Fallback values used when contract reads haven't resolved yet
const FALLBACK_TARGET = 10000;      // AVAX
const FALLBACK_TOKEN_PRICE = 0.0025; // AVAX per $CATCH
const FALLBACK_MIN = 0.1;           // AVAX
const FALLBACK_MAX = 200;           // AVAX

// TODO: fetch live AVAX price from oracle (e.g. Chainlink or CoinGecko)
const AVAX_USD_ESTIMATE = 25; // est. $25/AVAX — fallback only

export default function Fundraising() {
    const { isConnected } = useAccount();
    const { data: hash, writeContract, isPending, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const [amount, setAmount] = useState('');
    const [txError, setTxError] = useState<string | null>(null);

    // H3: Fetch current active round dynamically from contract
    const { data: currentRoundIdRaw } = useReadContract({
        address: FUND_ADDRESS,
        abi: FUND_ABI,
        functionName: 'currentRoundId',
    });

    const activeRoundId = currentRoundIdRaw ? Number(currentRoundIdRaw) : 1;

    // H5: Wire fundraising page to actual on-chain reads
    const { data: roundData } = useReadContract({
        address: FUND_ADDRESS,
        abi: FUND_ABI,
        functionName: 'getRound',
        args: [BigInt(activeRoundId)],
    });

    const { data: navPerTokenRaw } = useReadContract({
        address: FUND_ADDRESS,
        abi: FUND_ABI,
        functionName: 'navPerToken',
    });

    // Derive display values from on-chain data, with fallbacks
    const roundTarget = roundData ? Number(formatEther(roundData.targetAmount)) : FALLBACK_TARGET;
    const roundRaised = roundData ? Number(formatEther(roundData.raisedAmount)) : 0;
    const tokenPrice = roundData ? Number(formatEther(roundData.tokenPrice)) : FALLBACK_TOKEN_PRICE;
    const minInvestment = roundData ? Number(formatEther(roundData.minInvestment)) : FALLBACK_MIN;
    const maxInvestment = roundData ? Number(formatEther(roundData.maxInvestment)) : FALLBACK_MAX;
    const isRoundActive = roundData ? roundData.isActive : false;

    // NAV per token from contract (contract initializes to 1 AVAX = 1e18)
    // Note: The contract's initial navPerToken is 1 AVAX per CATCH.
    // The token price during fundraising (0.0025 AVAX) is set independently per round.
    // Display the round's token price for investment calculations.
    // TODO: navDisplay will be used for NAV-per-token UI once the dashboard section is built
    // const navDisplay = navPerTokenRaw ? Number(formatEther(navPerTokenRaw as bigint)) : 1;
    void navPerTokenRaw; // suppress unused-variable lint while keeping the contract read active

    const progressPercentage = roundTarget > 0 ? (roundRaised / roundTarget) * 100 : 0;
    const catchReceived = amount ? (parseFloat(amount) / tokenPrice).toFixed(2) : '0';

    // H4: Extract revert reason from error
    const extractErrorMessage = (err: unknown): string => {
        if (!err) return 'Transaction failed';
        const msg = (err as Error).message || String(err);
        // Try to find a revert reason
        const revertMatch = msg.match(/reverted with reason string ["'](.+?)["']/);
        if (revertMatch) return revertMatch[1];
        const customErrorMatch = msg.match(/reverted with custom error ["'](\w+)\(\)["']/);
        if (customErrorMatch) return customErrorMatch[1];
        // Common known errors
        if (msg.includes('RoundNotActive')) return 'This fundraising round is not currently active';
        if (msg.includes('InvestmentBelowMinimum')) return `Minimum investment is ${minInvestment} AVAX`;
        if (msg.includes('InvestmentAboveMaximum')) return `Maximum investment is ${maxInvestment} AVAX per wallet`;
        if (msg.includes('TargetReached')) return 'Fundraising target has been reached';
        if (msg.includes('user rejected')) return 'Transaction was rejected by user';
        if (msg.includes('insufficient funds')) return 'Insufficient AVAX balance';
        // Truncate if too long
        if (msg.length > 200) return msg.slice(0, 200) + '…';
        return msg;
    };

    // Compute user-visible error
    const displayError = useMemo(() => {
        if (txError) return txError;
        if (writeError) return extractErrorMessage(writeError);
        return null;
    }, [txError, writeError]);

    const handleInvest = () => {
        if (!isConnected || !amount) return;
        setTxError(null);
        resetWrite();

        try {
            writeContract({
                address: FUND_ADDRESS,
                abi: FUND_ABI,
                functionName: 'invest',
                args: [BigInt(activeRoundId)],
                value: parseEther(amount),
            });
        } catch (err) {
            setTxError(extractErrorMessage(err));
        }
    };

    return (
        <Page containerClassName="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                    Round {activeRoundId} <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Fundraising</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
                    Join the current fundraising round. Your $CATCH tokens grant membership in a community collecting museum-quality graded Pokemon cards.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
                        🔒 Avalanche Fuji Testnet
                    </span>
                    <span className={`px-3 py-1 rounded-full ${isRoundActive
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-orange-500/10 border border-orange-500/30'
                    }`}>
                        {isRoundActive ? '✅ Active' : '⏸️ Not Active'}
                    </span>
                    <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400">
                        👥 Max 150 participants
                    </span>
                </div>
            </div>

            {/* Error Banner */}
            {displayError && (
                <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                    <span className="text-red-400 text-lg">⚠️</span>
                    <div className="flex-1">
                        <div className="text-red-400 font-semibold">{displayError}</div>
                    </div>
                    <button onClick={() => { setTxError(null); resetWrite(); }} className="text-gray-500 hover:text-white">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Left Column: Stats Cards */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Round Progress */}
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Round Progress</h2>
                            <span className="text-sm text-gray-400">Target: {roundTarget.toLocaleString()} AVAX</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-[#0a0f1c]/50 rounded-xl p-4">
                                <div className="text-sm text-gray-400 mb-1">Raised</div>
                                <div className="text-2xl font-bold text-white">{roundRaised.toLocaleString()} AVAX</div>
                                <div className="text-xs text-gray-500 mt-1">{progressPercentage.toFixed(1)}% of target</div>
                            </div>
                            <div className="bg-[#0a0f1c]/50 rounded-xl p-4">
                                <div className="text-sm text-gray-400 mb-1">Remaining</div>
                                <div className="text-2xl font-bold text-white">{(roundTarget - roundRaised).toLocaleString()} AVAX</div>
                                <div className="text-xs text-gray-500 mt-1">Until target reached</div>
                            </div>
                        </div>
                    </div>

                    {/* Key Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                            <div className="text-sm text-gray-400 mb-2">Token Price</div>
                            <div className="text-3xl font-bold text-white mb-1">{tokenPrice} AVAX</div>
                            <div className="text-xs text-green-400">per $CATCH</div>
                        </div>
                        <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                            <div className="text-sm text-gray-400 mb-2">Min. Investment</div>
                            <div className="text-3xl font-bold text-white mb-1">{minInvestment} AVAX</div>
                            {/* TODO: fetch live AVAX price from oracle */}
                            <div className="text-xs text-gray-400">~${(minInvestment * AVAX_USD_ESTIMATE).toFixed(0)} USD (est. ${AVAX_USD_ESTIMATE}/AVAX)</div>
                        </div>
                        <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                            <div className="text-sm text-gray-400 mb-2">Max Investment</div>
                            <div className="text-3xl font-bold text-white mb-1">{maxInvestment} AVAX</div>
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
                                    <div className="font-semibold text-white mb-1">Contribute AVAX</div>
                                    <div className="text-sm text-gray-400">Send AVAX to receive $CATCH tokens at the round's token price</div>
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
                                    <div className="font-semibold text-white mb-1">Join Governance</div>
                                    <div className="text-sm text-gray-400">Participate in governance and shape which cards the community acquires</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Investment Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(56,189,248,0.15)]">
                        <h3 className="text-2xl font-bold text-white mb-6">Join Round</h3>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Amount (AVAX)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.0"
                                    min={minInvestment}
                                    max={maxInvestment}
                                    step="0.1"
                                    className="w-full bg-[#0a0f1c] border border-gray-700 rounded-xl px-4 py-4 text-white text-xl font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">AVAX</span>
                            </div>
                            {amount && parseFloat(amount) < minInvestment && (
                                <p className="text-xs text-red-400 mt-2">Minimum investment is {minInvestment} AVAX</p>
                            )}
                            {amount && parseFloat(amount) > maxInvestment && (
                                <p className="text-xs text-red-400 mt-2">Maximum investment is {maxInvestment} AVAX per wallet</p>
                            )}
                        </div>

                        {/* You Receive */}
                        <div className="bg-[#0a0f1c]/70 rounded-xl p-4 mb-6 border border-gray-700">
                            <div className="text-sm text-gray-400 mb-1">You Receive</div>
                            <div className="text-2xl font-bold text-white">
                                {catchReceived} <span className="text-cyan-400">$CATCH</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                @ {tokenPrice} AVAX per token
                            </div>
                        </div>

                        {isConnected ? (
                            <button
                                onClick={handleInvest}
                                disabled={isPending || isConfirming || !amount || parseFloat(amount) < minInvestment || parseFloat(amount) > maxInvestment}
                                className={`w-full py-4 rounded-xl font-bold text-white transition-all ${isPending || isConfirming || !amount || parseFloat(amount) < minInvestment || parseFloat(amount) > maxInvestment
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-blue-500/25'
                                    }`}
                            >
                                {isPending ? '⏳ Waiting for wallet...' : isConfirming ? '⏳ Confirming on-chain...' : `Join Round ${activeRoundId}`}
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
                <h3 className="text-3xl font-bold mb-4">🔥 Founding Member Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-8">
                    <div>
                        <div className="text-4xl mb-3">🎯</div>
                        <div className="font-bold text-white mb-2">Founding Member</div>
                        <div className="text-sm text-gray-400">Join from the start as a founding community member</div>
                    </div>
                    <div>
                        <div className="text-4xl mb-3">🗳️</div>
                        <div className="font-bold text-white mb-2">Governance Power</div>
                        <div className="text-sm text-gray-400">Vote on which cards to acquire & sell</div>
                    </div>
                    <div>
                        <div className="text-4xl mb-3">💎</div>
                        <div className="font-bold text-white mb-2">Permanent Liquidity</div>
                        <div className="text-sm text-gray-400">LP tokens burned for protocol stability</div>
                    </div>
                </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="mt-8 p-6 bg-gray-900/50 border border-gray-700/50 rounded-2xl">
                <p className="text-xs text-gray-500 leading-relaxed text-center">
                    $CATCH is not a financial instrument, investment product, or security. Participation is limited to the collector community. This is not an offer of securities or an investment solicitation. Participation does not guarantee any financial return. Please consult your local regulations before participating.
                </p>
            </div>
        </Page>
    );
}
