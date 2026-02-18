import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { EVA_TOKEN_ADDRESS, EVA_STAKING_ADDRESS } from '../hooks/useEVAAccess';

const ERC20_ABI = [
    {
        inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const STAKING_ABI = [
    {
        inputs: [{ name: 'amount', type: 'uint256' }],
        name: 'stake',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'amount', type: 'uint256' }],
        name: 'addStake',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'unstake',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'getStakeInfo',
        outputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'unlocksAt', type: 'uint256' },
            { name: 'locked', type: 'bool' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

function formatCountdown(unlocksAt: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = unlocksAt - now;
    if (diff <= 0) return 'Unlocked';
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export default function EVAStakingPanel() {
    const { address } = useAccount();
    const [stakeInput, setStakeInput] = useState('10000000');
    const [step, setStep] = useState<'idle' | 'approving' | 'staking' | 'unstaking'>('idle');
    const [countdown, setCountdown] = useState('');

    // Read stake info
    const { data: stakeInfoResult, refetch: refetchStake } = useReadContract({
        address: EVA_STAKING_ADDRESS as `0x${string}`,
        abi: STAKING_ABI,
        functionName: 'getStakeInfo',
        args: address ? [address] : undefined,
        query: { enabled: !!address && !!EVA_STAKING_ADDRESS },
    });

    const stakeAmount = stakeInfoResult ? stakeInfoResult[0] : BigInt(0);
    const unlocksAt = stakeInfoResult ? Number(stakeInfoResult[1]) : 0;
    const stakeLocked = stakeInfoResult ? stakeInfoResult[2] : false;
    const hasStake = stakeAmount > BigInt(0);

    // Read allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: EVA_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && EVA_STAKING_ADDRESS ? [address, EVA_STAKING_ADDRESS as `0x${string}`] : undefined,
        query: { enabled: !!address && !!EVA_STAKING_ADDRESS },
    });

    // Write contracts
    const { data: approveHash, writeContract: writeApprove, isPending: approvePending, reset: resetApprove } = useWriteContract();
    const { data: stakeHash, writeContract: writeStake, isPending: stakePending, reset: resetStake } = useWriteContract();
    const { data: unstakeHash, writeContract: writeUnstake, isPending: unstakePending, reset: resetUnstake } = useWriteContract();

    const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
    const { isSuccess: stakeConfirmed } = useWaitForTransactionReceipt({ hash: stakeHash });
    const { isSuccess: unstakeConfirmed } = useWaitForTransactionReceipt({ hash: unstakeHash });

    // After approve, proceed to stake
    useEffect(() => {
        if (approveConfirmed && step === 'approving') {
            refetchAllowance();
            setStep('staking');
            const amount = parseUnits(stakeInput, 18);
            if (hasStake) {
                writeStake({
                    address: EVA_STAKING_ADDRESS as `0x${string}`,
                    abi: STAKING_ABI,
                    functionName: 'addStake',
                    args: [amount],
                });
            } else {
                writeStake({
                    address: EVA_STAKING_ADDRESS as `0x${string}`,
                    abi: STAKING_ABI,
                    functionName: 'stake',
                    args: [amount],
                });
            }
        }
    }, [approveConfirmed]);

    // After stake/unstake, refresh data
    useEffect(() => {
        if (stakeConfirmed || unstakeConfirmed) {
            setStep('idle');
            refetchStake();
            refetchAllowance();
            resetApprove();
            resetStake();
            resetUnstake();
        }
    }, [stakeConfirmed, unstakeConfirmed]);

    // Countdown timer
    useEffect(() => {
        if (!stakeLocked || unlocksAt === 0) {
            setCountdown('');
            return;
        }
        const update = () => setCountdown(formatCountdown(unlocksAt));
        update();
        const interval = setInterval(update, 60_000);
        return () => clearInterval(interval);
    }, [stakeLocked, unlocksAt]);

    const handleStake = () => {
        if (!stakeInput || !address) return;
        const amount = parseUnits(stakeInput, 18);
        const currentAllowance = allowance ?? BigInt(0);

        if (currentAllowance < amount) {
            setStep('approving');
            writeApprove({
                address: EVA_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [EVA_STAKING_ADDRESS as `0x${string}`, amount],
            });
        } else {
            setStep('staking');
            if (hasStake) {
                writeStake({
                    address: EVA_STAKING_ADDRESS as `0x${string}`,
                    abi: STAKING_ABI,
                    functionName: 'addStake',
                    args: [amount],
                });
            } else {
                writeStake({
                    address: EVA_STAKING_ADDRESS as `0x${string}`,
                    abi: STAKING_ABI,
                    functionName: 'stake',
                    args: [amount],
                });
            }
        }
    };

    const handleUnstake = () => {
        setStep('unstaking');
        writeUnstake({
            address: EVA_STAKING_ADDRESS as `0x${string}`,
            abi: STAKING_ABI,
            functionName: 'unstake',
        });
    };

    const isProcessing = approvePending || stakePending || unstakePending || step !== 'idle';

    return (
        <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6 mt-6">
            <h3 className="text-xl font-bold text-white mb-4">
                {hasStake ? '🔒 $EVA Stake' : '🔓 Stake $EVA to Unlock Investing'}
            </h3>

            {hasStake ? (
                <div className="space-y-4">
                    {/* Staked info */}
                    <div className="flex items-center justify-between bg-[#0a0f1c]/50 rounded-xl p-4 border border-green-500/20">
                        <div>
                            <div className="text-sm text-gray-400">Staked</div>
                            <div className="text-2xl font-bold text-green-400">
                                ✓ {Number(formatUnits(stakeAmount, 18)).toLocaleString()} $EVA
                            </div>
                        </div>
                        <div className="text-right">
                            {stakeLocked ? (
                                <>
                                    <div className="text-sm text-gray-400">Unlocks in</div>
                                    <div className="text-lg font-bold text-yellow-400">{countdown}</div>
                                </>
                            ) : (
                                <div className="text-sm text-green-400 font-semibold">Unlocked ✓</div>
                            )}
                        </div>
                    </div>

                    {/* Unstake button (only when unlocked) */}
                    {!stakeLocked && (
                        <button
                            onClick={handleUnstake}
                            disabled={isProcessing}
                            className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                                isProcessing
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90'
                            }`}
                        >
                            {unstakePending ? '⏳ Confirming...' : 'Unstake $EVA'}
                        </button>
                    )}

                    {/* Add more stake */}
                    <div className="pt-4 border-t border-white/10">
                        <div className="text-sm text-gray-400 mb-2">Add more $EVA (resets 30-day lock)</div>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={stakeInput}
                                onChange={(e) => setStakeInput(e.target.value)}
                                placeholder="Amount"
                                className="flex-1 bg-[#0a0f1c] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                            <button
                                onClick={handleStake}
                                disabled={isProcessing || !stakeInput}
                                className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
                                    isProcessing || !stakeInput
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90'
                                }`}
                            >
                                {step === 'approving' ? '⏳ Approve...' : step === 'staking' ? '⏳ Staking...' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-gray-400">
                        Stake at least <span className="text-white font-semibold">10,000,000 $EVA</span> to unlock investing.
                        Tokens are locked for <span className="text-white font-semibold">30 days</span>.
                    </p>

                    {/* Stake input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Amount ($EVA)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={stakeInput}
                                onChange={(e) => setStakeInput(e.target.value)}
                                placeholder="10000000"
                                className="w-full bg-[#0a0f1c] border border-gray-700 rounded-xl px-4 py-4 text-white text-xl font-semibold focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$EVA</span>
                        </div>
                        {stakeInput && Number(stakeInput) < 10_000_000 && (
                            <p className="text-xs text-red-400 mt-2">Minimum stake is 10,000,000 $EVA</p>
                        )}
                    </div>

                    {/* Approve + Stake button */}
                    <button
                        onClick={handleStake}
                        disabled={isProcessing || !stakeInput || Number(stakeInput) < 10_000_000}
                        className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                            isProcessing || !stakeInput || Number(stakeInput) < 10_000_000
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-cyan-500/25'
                        }`}
                    >
                        {step === 'approving'
                            ? '⏳ Step 1/2: Approving $EVA...'
                            : step === 'staking'
                            ? '⏳ Step 2/2: Staking...'
                            : 'Approve & Stake $EVA'}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                        Two transactions: ERC-20 approval, then stake. 30-day lock period.
                    </p>
                </div>
            )}
        </div>
    );
}
