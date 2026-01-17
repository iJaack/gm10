'use client'

import React, { useState } from 'react'
import Navbar from '@/components/Navbar'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

// Minimal ABI for invest function
const INVEST_ABI = [
    {
        "inputs": [],
        "name": "invest",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
] as const

const FUND_ADDRESS = "0xYOUR_CONTRACT_ADDRESS_HERE" // Update this after deployment

const tiers = [
    {
        name: 'STARTER',
        amount: '$100+',
        minEth: '0.1',
        popular: false,
        benefits: ['$CATCH tokens', 'Discord access']
    },
    {
        name: 'TRAINER',
        amount: '$1,000+',
        minEth: '1.0',
        popular: true,
        benefits: ['$CATCH tokens', 'Discord access', 'Quarterly calls']
    },
    {
        name: 'GYM LEADER',
        amount: '$10,000+',
        minEth: '10.0',
        popular: false,
        benefits: ['$CATCH tokens', 'Discord access', 'Quarterly calls', 'Advisory board']
    }
]

export default function FundraisingPage() {
    const { isConnected } = useAccount()
    const { data: hash, writeContract, isPending, error } = useWriteContract()
    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash })

    const handleInvest = (minEth: string) => {
        if (!isConnected) {
            alert("Please connect your wallet first!")
            return
        }
        writeContract({
            address: FUND_ADDRESS,
            abi: INVEST_ABI,
            functionName: 'invest',
            value: parseEther(minEth)
        })
    }

    return (
        <main className="min-h-screen bg-[#0a0f1c]">
            <Navbar />

            <div className="pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto">
                <div className="text-center mb-16">
                    <div className="text-4xl mb-4">💰</div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1d3557] dark:text-cream mb-4">
                        Fundraising <span className="text-red-primary">Round 1</span>
                    </h1>
                    <p className="text-xl text-[#457b9d] dark:text-blue-pale">
                        Your chance to invest in Pokemon card alpha
                    </p>
                </div>

                {/* Status Messages */}
                {hash && (
                    <div className="mb-8 p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg text-center text-blue-200">
                        Transaction Hash: {hash}
                    </div>
                )}
                {isConfirming && (
                    <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg text-center text-yellow-200">
                        Waiting for confirmation...
                    </div>
                )}
                {isConfirmed && (
                    <div className="mb-8 p-4 bg-green-900/20 border border-green-500/50 rounded-lg text-center text-green-200">
                        Transaction confirmed! Welcome to the fund.
                    </div>
                )}
                {error && (
                    <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-center text-red-200">
                        Error: {(error as any).shortMessage || error.message}
                    </div>
                )}

                {/* Tiers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {tiers.map((tier) => (
                        <div
                            key={tier.name}
                            className={`relative bg-white p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${tier.popular
                                    ? 'border-4 border-red-primary shadow-xl scale-105 z-10'
                                    : 'border-2 border-blue-pale hover:border-blue-light'
                                }`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-primary text-white px-4 py-1 rounded-full text-sm font-bold">
                                    ⭐ Popular
                                </div>
                            )}

                            <h3 className="text-2xl font-bold text-[#1d3557] mb-2">{tier.name}</h3>
                            <div className="text-3xl font-extrabold text-[#e63946] mb-6">{tier.amount}</div>

                            <ul className="mb-8 space-y-3">
                                {tier.benefits.map((benefit, i) => (
                                    <li key={i} className="flex items-center gap-2 text-[#1d3557]">
                                        <span className="text-blue-light">▪</span> {benefit}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleInvest(tier.minEth)}
                                disabled={isPending}
                                className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${tier.popular
                                        ? 'bg-red-primary text-white hover:bg-red-dark shadow-lg hover:shadow-red-primary/30'
                                        : 'bg-[#1d3557] text-white hover:bg-blue-light'
                                    } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isPending ? 'Confirming...' : `Invest ${tier.minEth} AVAX`}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}
