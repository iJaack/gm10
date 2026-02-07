import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { encodeFunctionData, formatEther, isAddress, parseEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Page from '../components/Page';

// Complete Governor Bravo ABI
const GOVERNANCE_ABI = [
    {
        inputs: [
            { name: "targets", type: "address[]" },
            { name: "values", type: "uint256[]" },
            { name: "calldatas", type: "bytes[]" },
            { name: "description", type: "string" }
        ],
        name: "propose",
        outputs: [{ name: "proposalId", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            { name: "proposalId", type: "uint256" },
            { name: "support", type: "uint8" }
        ],
        name: "castVote",
        outputs: [{ name: "weight", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "state",
        outputs: [{ name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "queue",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "execute",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "cancel",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "votingDelay",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "votingPeriod",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "proposalThreshold",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "quorumNumerator",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "quorumDenominator",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "getActions",
        outputs: [
            { name: "targets", type: "address[]" },
            { name: "values", type: "uint256[]" },
            { name: "signatures", type: "string[]" },
            { name: "calldatas", type: "bytes[]" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "proposalSnapshot",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "proposalDeadline",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "proposalEta",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "proposalId", type: "uint256" }],
        name: "proposalProposer",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            { name: "proposalId", type: "uint256" },
            { name: "account", type: "address" }
        ],
        name: "hasVoted",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

const TOKEN_ABI = [
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

const FUND_ABI = [
    {
        inputs: [
            { name: "_asset", type: "address" },
            { name: "_amount", type: "uint256" }
        ],
        name: "approveBudget",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
] as const;

const GOVERNOR_ADDRESS = '0x9Bb3cd919f3738d7fAFffCFaA1F78c526B804adf' as `0x${string}`;
const TOKEN_ADDRESS = '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C' as `0x${string}`;
const MIN_PROPOSAL_THRESHOLD = 10000; // 10,000 $CATCH required to propose
const DEFAULT_BUDGET_ASSET = '0x0000000000000000000000000000000000000000';

export default function Governance() {
    const { address, isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<'active' | 'create' | 'history'>('active');
    const [proposalDescription, setProposalDescription] = useState('');
    const [budgetAsset, setBudgetAsset] = useState(DEFAULT_BUDGET_ASSET);
    const [budgetAmount, setBudgetAmount] = useState('500');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Read user's $CATCH balance from TOKEN contract
    const { data: userBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Read governance parameters
    const { data: votingPeriod } = useReadContract({
        address: GOVERNOR_ADDRESS,
        abi: GOVERNANCE_ABI,
        functionName: 'votingPeriod',
    });

    const { data: proposalThreshold } = useReadContract({
        address: GOVERNOR_ADDRESS,
        abi: GOVERNANCE_ABI,
        functionName: 'proposalThreshold',
    });

    // Write contract functions with error handling
    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Clear messages when hash changes
    useEffect(() => {
        if (hash) {
            setError(null);
            setSuccess('Transaction submitted! Waiting for confirmation...');
        }
    }, [hash]);

    // Show write errors
    useEffect(() => {
        if (writeError) {
            const errorMessage = writeError.message || 'Transaction failed';
            // Extract revert reason if available
            const revertMatch = errorMessage.match(/reverted with reason string '(.+?)'/);
            const revertReason = revertMatch ? revertMatch[1] : errorMessage;
            setError(revertReason);
            setSuccess(null);
        }
    }, [writeError]);

    // Show success confirmation
    useEffect(() => {
        if (isSuccess) {
            setSuccess('Transaction confirmed successfully!');
            setError(null);
            // Clear description after successful proposal
            if (activeTab === 'create') {
                setProposalDescription('');
            }
        }
    }, [isSuccess, activeTab]);

    const handleCreateProposal = () => {
        setError(null);
        setSuccess(null);

        if (!proposalDescription.trim()) {
            setError('Please enter a proposal description');
            return;
        }

        if (!address) {
            setError('Wallet not connected');
            return;
        }

        if (!isAddress(budgetAsset)) {
            setError('Invalid budget asset address');
            return;
        }

        let budgetAmountWei: bigint;
        try {
            budgetAmountWei = parseEther(budgetAmount || '0');
        } catch {
            setError('Invalid budget amount');
            return;
        }

        try {
            const calldata = encodeFunctionData({
                abi: FUND_ABI,
                functionName: 'approveBudget',
                args: [budgetAsset, budgetAmountWei],
            });

            // Standard Governor Propose parameters
            writeContract({
                address: GOVERNOR_ADDRESS,
                abi: GOVERNANCE_ABI,
                functionName: 'propose',
                args: [
                    [TOKEN_ADDRESS], // target (Fund proxy)
                    [BigInt(0)], // value
                    [calldata], // calldata
                    proposalDescription
                ]
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create proposal');
        }
    };

    const handleVote = (proposalId: number, support: number) => {
        setError(null);
        setSuccess(null);

        if (!address) {
            setError('Wallet not connected');
            return;
        }

        try {
            writeContract({
                address: GOVERNOR_ADDRESS,
                abi: GOVERNANCE_ABI,
                functionName: 'castVote',
                args: [BigInt(proposalId), support] // support: 0=Against, 1=For, 2=Abstain
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cast vote');
        }
    };

    const userBalanceFormatted = userBalance ? Number(formatEther(userBalance as bigint)) : 0;
    const actualThreshold = proposalThreshold ? Number(formatEther(proposalThreshold as bigint)) : MIN_PROPOSAL_THRESHOLD;
    const votingPeriodBlocks = votingPeriod ? Number(votingPeriod as bigint) : null;
    const actualVotingPeriod = votingPeriodBlocks ? votingPeriodBlocks / 43200 : 3; // ~2s blocks (Avalanche)
    const canPropose = userBalanceFormatted >= actualThreshold;

    // Mock proposals for UI demonstration (replace with actual contract reads)
    const proposalsAreMock = true;
    const mockProposals = [
        {
            id: 1,
            title: "Acquire PSA 10 Base Set Charizard",
            description: "Proposal to allocate 15,000 AVAX from treasury to acquire a PSA 10 1st Edition Base Set Charizard. Market value estimated at $50,000 USD.",
            proposer: "0x742d...4892",
            forVotes: 1250000,
            againstVotes: 350000,
            abstainVotes: 100000,
            quorum: 30,
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
            status: 'active',
            category: 'Acquisition'
        },
        {
            id: 2,
            title: "Reduce Management Fee to 0.75%",
            description: "Proposal to reduce the annual management fee from 1% to 0.75% to increase competitiveness and benefit holders.",
            proposer: "0x8a3c...1f42",
            forVotes: 890000,
            againstVotes: 1200000,
            abstainVotes: 50000,
            quorum: 30,
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
            status: 'active',
            category: 'Fee Adjustment'
        }
    ];

    return (
        <Page containerClassName="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        <span className="gradient-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Governance</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                        Shape the future of Gem Mint Strategy. Propose and vote on card acquisitions, fee changes, and strategic decisions.
                    </p>
                </div>

                {/* Voting Power Card */}
                {isConnected && (
                    <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-3xl p-8 mb-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <div className="text-sm text-gray-400 mb-2">Your Balance</div>
                                <div className="text-3xl font-bold text-white">
                                    {userBalanceFormatted.toLocaleString()} $CATCH
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-2">Voting Power</div>
                                <div className="text-3xl font-bold text-cyan-400">
                                    {userBalanceFormatted.toLocaleString()} votes
                                </div>
                                <div className="text-xs text-gray-500 mt-1">1 $CATCH = 1 vote</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-2">Proposal Status</div>
                                {canPropose ? (
                                    <div className="text-2xl font-bold text-green-400">✓ Can Propose</div>
                                ) : (
                                    <div>
                                        <div className="text-2xl font-bold text-orange-400">✗ Cannot Propose</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Need {actualThreshold.toLocaleString(undefined, { maximumFractionDigits: 0 })} $CATCH
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                        <div className="text-red-400 font-semibold">⚠️ {error}</div>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                        <div className="text-green-400 font-semibold">✓ {success}</div>
                        {hash && (
                            <div className="text-xs text-gray-400 mt-1">
                                Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-3 font-semibold transition-all ${activeTab === 'active'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Active Proposals ({mockProposals.filter(p => p.status === 'active').length})
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-6 py-3 font-semibold transition-all ${activeTab === 'create'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Create Proposal
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-3 font-semibold transition-all ${activeTab === 'history'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        History
                    </button>
                </div>

                {/* Active Proposals */}
                {activeTab === 'active' && (
                    <div className="space-y-6">
                        {proposalsAreMock && (
                            <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl">
                                <div className="text-orange-300 font-semibold">
                                    Example proposals are mocked for UI preview. Onchain proposal feeds and voting will be wired next.
                                </div>
                            </div>
                        )}
                        {mockProposals.filter(p => p.status === 'active').map((proposal) => {
                            const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
                            const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
                            const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
                            const quorumProgress = totalVotes > 0 ? (totalVotes / 2400000) * 100 : 0; // 10% of 24M supply
                            const timeRemaining = Math.ceil((proposal.deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

                            return (
                                <div key={proposal.id} className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/40 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-semibold rounded-full">
                                                    {proposal.category}
                                                </span>
                                                {proposalsAreMock && (
                                                    <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-sm font-semibold rounded-full">
                                                        Example
                                                    </span>
                                                )}
                                                <span className="text-sm text-gray-400">
                                                    Proposed by {proposal.proposer}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-3">{proposal.title}</h3>
                                            <p className="text-gray-400 leading-relaxed">{proposal.description}</p>
                                        </div>
                                        <div className="text-right ml-6">
                                            <div className="text-sm text-gray-400 mb-1">Ends in</div>
                                            <div className="text-2xl font-bold text-white">{timeRemaining}d</div>
                                        </div>
                                    </div>

                                    {/* Voting Results */}
                                    <div className="mb-6">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-400">Voting Progress</span>
                                            <span className="text-gray-400">{totalVotes.toLocaleString()} votes ({quorumProgress.toFixed(1)}% quorum)</span>
                                        </div>
                                        <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
                                            <div
                                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-600"
                                                style={{ width: `${forPercentage}%` }}
                                            />
                                            <div
                                                className="absolute inset-y-0 bg-gradient-to-r from-red-500 to-red-600"
                                                style={{ left: `${forPercentage}%`, width: `${againstPercentage}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-green-400 font-semibold">For: {forPercentage.toFixed(1)}%</span>
                                                <span className="text-gray-500 ml-2">({proposal.forVotes.toLocaleString()} votes)</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-red-400 font-semibold">Against: {againstPercentage.toFixed(1)}%</span>
                                                <span className="text-gray-500 ml-2">({proposal.againstVotes.toLocaleString()} votes)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Voting Buttons */}
                                    {proposalsAreMock ? (
                                        <div className="flex gap-4">
                                            <button
                                                disabled
                                                className="flex-1 py-3 bg-white/10 border border-white/10 rounded-xl font-bold text-white/50 cursor-not-allowed"
                                            >
                                                Voting Disabled
                                            </button>
                                            <button
                                                disabled
                                                className="flex-1 py-3 bg-white/10 border border-white/10 rounded-xl font-bold text-white/50 cursor-not-allowed"
                                            >
                                                Voting Disabled
                                            </button>
                                        </div>
                                    ) : isConnected ? (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => handleVote(proposal.id, 1)}
                                                disabled={isPending || isConfirming}
                                                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                                            >
                                                Vote For
                                            </button>
                                            <button
                                                onClick={() => handleVote(proposal.id, 0)}
                                                disabled={isPending || isConfirming}
                                                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                                            >
                                                Vote Against
                                            </button>
                                        </div>
                                    ) : (
                                        <ConnectButton.Custom>
                                            {({ openConnectModal }) => (
                                                <button
                                                    onClick={openConnectModal}
                                                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl font-bold text-white hover:opacity-90 transition-all"
                                                >
                                                    Connect Wallet to Vote
                                                </button>
                                            )}
                                        </ConnectButton.Custom>
                                    )}
                                </div>
                            );
                        })}

                        {mockProposals.filter(p => p.status === 'active').length === 0 && (
                            <div className="text-center py-16 bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl">
                                <div className="text-5xl mb-4">🗳️</div>
                                <div className="text-xl font-bold text-white mb-2">No Active Proposals</div>
                                <div className="text-gray-400">Be the first to create one!</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Create Proposal */}
                {activeTab === 'create' && (
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8">
                        {!isConnected ? (
                            <div className="text-center py-12">
                                <div className="text-5xl mb-4">🔐</div>
                                <div className="text-xl font-bold text-white mb-4">Connect Wallet</div>
                                <div className="text-gray-400 mb-6">Connect your wallet to create proposals</div>
                                <ConnectButton />
                            </div>
                        ) : !canPropose ? (
                            <div className="text-center py-12">
                                <div className="text-5xl mb-4">⚠️</div>
                                <div className="text-xl font-bold text-white mb-4">Insufficient Balance</div>
                            <div className="text-gray-400 mb-2">
                                    You need at least {actualThreshold.toLocaleString(undefined, { maximumFractionDigits: 0 })} $CATCH to create proposals
                                </div>
                                <div className="text-cyan-400 font-semibold">
                                    Your balance: {userBalanceFormatted.toLocaleString()} $CATCH
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-6">Create New Proposal</h3>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                                Budget Asset
                                            </label>
                                            <input
                                                value={budgetAsset}
                                                onChange={(e) => setBudgetAsset(e.target.value)}
                                                placeholder={DEFAULT_BUDGET_ASSET}
                                                className="w-full px-4 py-3 bg-[#0a0f1c] border border-blue-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-2">
                                                Use the zero address for a generic budget category.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                                Budget Amount (AVAX)
                                            </label>
                                            <input
                                                type="number"
                                                value={budgetAmount}
                                                onChange={(e) => setBudgetAmount(e.target.value)}
                                                min={0}
                                                step="0.01"
                                                className="w-full px-4 py-3 bg-[#0a0f1c] border border-blue-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-2">
                                                This proposal calls `approveBudget(asset, amount)` on the fund.
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                                            Proposal Description
                                        </label>
                                        <textarea
                                            value={proposalDescription}
                                            onChange={(e) => setProposalDescription(e.target.value)}
                                            placeholder="Describe your proposal in detail. Include rationale, expected outcomes, and any relevant data."
                                            className="w-full h-40 px-4 py-3 bg-[#0a0f1c] border border-blue-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                                            Voting Period
                                        </label>
                                        <div className="w-full px-4 py-3 bg-[#0a0f1c]/50 border border-blue-500/10 rounded-xl text-gray-500">
                                            Fixed: {actualVotingPeriod} days (Protocol Standard)
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                                        <div className="text-sm text-gray-300">
                                            <strong>Proposal Requirements:</strong>
                                            <ul className="mt-2 space-y-1 ml-4 list-disc">
                                                <li>Minimum {actualThreshold.toLocaleString()} $CATCH to submit</li>
                                                <li>10% quorum required to pass (2.4M votes)</li>
                                                <li>Simple majority (&gt;50% for) to approve</li>
                                                <li>Fixed voting period: {actualVotingPeriod} days</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleCreateProposal}
                                        disabled={isPending || isConfirming || !proposalDescription.trim()}
                                        className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isPending || isConfirming ? 'Creating Proposal...' : 'Submit Proposal'}
                                    </button>

                                    {isSuccess && (
                                        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                                            <div className="text-green-400 font-semibold">✓ Proposal created successfully!</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* History */}
                {activeTab === 'history' && (
                    <div className="text-center py-16 bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl">
                        <div className="text-5xl mb-4">📜</div>
                        <div className="text-xl font-bold text-white mb-2">No Historical Proposals</div>
                        <div className="text-gray-400">Completed and canceled proposals will appear here</div>
                    </div>
                )}

                {/* Info Cards */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                        <div className="text-3xl mb-3">📊</div>
                        <div className="font-bold text-white mb-2">Proposal Types</div>
                        <div className="text-sm text-gray-400">
                            Card acquisitions, fee changes, strategy updates, treasury spending, and protocol upgrades
                        </div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                        <div className="text-3xl mb-3">⏱️</div>
                        <div className="font-bold text-white mb-2">Voting Period</div>
                        <div className="text-sm text-gray-400">
                            3-day standard period allows for quick decision making while ensuring community participation
                        </div>
                    </div>
                    <div className="bg-[#1a1f3c]/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                        <div className="text-3xl mb-3">✅</div>
                        <div className="font-bold text-white mb-2">Execution</div>
                        <div className="text-sm text-gray-400">
                            Passed proposals are queued in the Timelock and executed automatically after 24 hours
                        </div>
                    </div>
                </div>
        </Page>
    );
}
