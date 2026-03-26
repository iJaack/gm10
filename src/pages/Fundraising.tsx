import { useMemo, useState } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther, parseEther } from 'viem';
import Page from '../components/Page';
import { BUY_PAGE_DEFAULTS } from '../data/protocol';

const FUND_ADDRESS = '0xd3E57C774BD9a08DfE3bb26e71C019c4fa74F86C';

const FUND_ABI = [
    {
        inputs: [{ name: '_roundId', type: 'uint256' }],
        name: 'invest',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'currentRoundId',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: '_roundId', type: 'uint256' }],
        name: 'getRound',
        outputs: [{
            components: [
                { name: 'roundId', type: 'uint256' },
                { name: 'targetAmount', type: 'uint256' },
                { name: 'raisedAmount', type: 'uint256' },
                { name: 'tokenPrice', type: 'uint256' },
                { name: 'minInvestment', type: 'uint256' },
                { name: 'maxInvestment', type: 'uint256' },
                { name: 'startTime', type: 'uint256' },
                { name: 'endTime', type: 'uint256' },
                { name: 'isActive', type: 'bool' },
                { name: 'isFinalized', type: 'bool' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const AVAX_USD_ESTIMATE = 25;

export default function Fundraising() {
    const { isConnected } = useAccount();
    const { data: hash, error: writeError, isPending, reset, writeContract } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
    const [amount, setAmount] = useState('');
    const [txError, setTxError] = useState<string | null>(null);

    const { data: currentRoundIdRaw } = useReadContract({
        address: FUND_ADDRESS,
        abi: FUND_ABI,
        functionName: 'currentRoundId',
    });

    const activeRoundId = currentRoundIdRaw ? Number(currentRoundIdRaw) : 1;

    const { data: roundData } = useReadContract({
        address: FUND_ADDRESS,
        abi: FUND_ABI,
        functionName: 'getRound',
        args: [BigInt(activeRoundId)],
    });

    const roundTarget = roundData ? Number(formatEther(roundData.targetAmount)) : BUY_PAGE_DEFAULTS.targetAvax;
    const roundRaised = roundData ? Number(formatEther(roundData.raisedAmount)) : 0;
    const tokenPrice = roundData ? Number(formatEther(roundData.tokenPrice)) : BUY_PAGE_DEFAULTS.priceAvax;
    const minInvestment = roundData ? Number(formatEther(roundData.minInvestment)) : BUY_PAGE_DEFAULTS.minAvax;
    const maxInvestment = roundData ? Number(formatEther(roundData.maxInvestment)) : BUY_PAGE_DEFAULTS.maxAvax;
    const isRoundActive = roundData ? roundData.isActive : false;

    const progress = roundTarget > 0 ? Math.min((roundRaised / roundTarget) * 100, 100) : 0;
    const estimatedTokens = amount ? (Number(amount) / tokenPrice).toFixed(2) : '0.00';

    const displayError = useMemo(() => {
        if (txError) return txError;
        if (!writeError) return null;
        const message = writeError.message;
        if (message.includes('RoundNotActive')) return 'This round is not currently active on Fuji.';
        if (message.includes('InvestmentBelowMinimum')) return `Minimum buy is ${minInvestment} AVAX.`;
        if (message.includes('InvestmentAboveMaximum')) return `Maximum buy is ${maxInvestment} AVAX per wallet.`;
        if (message.includes('TargetReached')) return 'The current round has already filled.';
        return message;
    }, [txError, writeError, minInvestment, maxInvestment]);

    function handleInvest() {
        if (!amount) return;
        setTxError(null);
        reset();
        try {
            writeContract({
                address: FUND_ADDRESS,
                abi: FUND_ABI,
                functionName: 'invest',
                args: [BigInt(activeRoundId)],
                value: parseEther(amount),
            });
        } catch (error) {
            setTxError(error instanceof Error ? error.message : 'Transaction failed');
        }
    }

    return (
        <Page containerClassName="mx-auto max-w-6xl">
            <div className="text-center">
                <div className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Buy</div>
                <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">Fuji testnet access</h1>
                <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/55">
                    This page is intentionally wired to the live Fuji proxy. Use test AVAX only. The public mainnet launch terms will show up later, when they are actually ready to be public.
                </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs uppercase tracking-[0.3em] text-white/35">Live round progress</div>
                            <h2 className="mt-2 text-3xl font-bold text-white">{roundRaised.toLocaleString()} / {roundTarget.toLocaleString()} AVAX</h2>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isRoundActive ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                            {isRoundActive ? 'Fuji round active' : 'Waiting for activation'}
                        </span>
                    </div>
                    <div className="mt-6 h-4 overflow-hidden rounded-full border border-white/10 bg-[#09101c]">
                        <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[
                            ['Token price', `${tokenPrice} AVAX`],
                            ['Min / max', `${minInvestment} to ${maxInvestment} AVAX`],
                            ['Live network', BUY_PAGE_DEFAULTS.networkLabel],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-white/10 bg-[#0b1322] p-4">
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</div>
                                <div className="mt-2 text-2xl font-black text-white">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-[#0b1322] p-8">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/35">Buy action</div>
                    <h2 className="mt-2 text-2xl font-bold text-white">Charge up your wallet</h2>
                    <p className="mt-3 text-sm leading-7 text-white/55">
                        This is the live public test flow. It lets you interact with the Fuji deployment today without pretending the public mainnet round is already here.
                    </p>

                    <div className="mt-6">
                        <label className="text-sm font-medium text-white/65">Amount</label>
                        <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/20 px-4">
                            <input
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                placeholder="1.0"
                                className="w-full bg-transparent py-4 text-lg text-white outline-none"
                            />
                            <span className="text-sm font-semibold text-white/45">AVAX</span>
                        </div>
                        <div className="mt-3 text-sm text-white/45">
                            Estimated output: <span className="font-semibold text-white">{estimatedTokens} CATCH</span>
                        </div>
                        <div className="text-xs text-white/35">
                            Approx. value: ${(Number(amount || 0) * AVAX_USD_ESTIMATE).toFixed(2)} USD
                        </div>
                    </div>

                    <div className="mt-6">
                        {!isConnected ? (
                            <ConnectButton />
                        ) : (
                            <button
                                type="button"
                                onClick={handleInvest}
                                disabled={!amount || isPending || isConfirming}
                                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 px-5 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isPending || isConfirming ? 'Submitting…' : 'Buy with test AVAX'}
                            </button>
                        )}
                    </div>

                    {displayError ? (
                        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                            {displayError}
                        </div>
                    ) : null}
                    {isConfirmed ? (
                        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                            Buy confirmed onchain.
                        </div>
                    ) : null}
                </div>
            </div>

            <section className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
                <div className="text-xs uppercase tracking-[0.3em] text-white/35">What happens next</div>
                <h2 className="mt-2 text-3xl font-bold text-white">The live page is testnet, the card story is still real</h2>
                <div className="mt-6 space-y-4">
                    {[
                        'The public page stays on Fuji until the real launch is ready to be announced properly.',
                        'CATCH still maps to the broader card chase: buys, exits, proceeds, and the wallet scoreboard.',
                        'Future governance mechanics can be documented ahead of time without pretending they are already live.',
                    ].map((item, index) => (
                        <div key={item} className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-sm font-semibold text-sky-200">
                                {index + 1}
                            </div>
                            <p className="text-sm leading-7 text-white/60">{item}</p>
                        </div>
                    ))}
                </div>
            </section>
        </Page>
    );
}
