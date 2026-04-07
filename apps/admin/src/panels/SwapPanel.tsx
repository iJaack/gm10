import { useState } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { FUND_V4_ABI, STARGATE_ADAPTER_ABI } from '../abis';
import { FUJI, FUJI_TOKENS } from '../addresses';
import { TxButton, TxResult } from '../components/TxButton';

const NATIVE_AVAX = '0x0000000000000000000000000000000000000000' as const;

const KNOWN_TOKENS = [
    { symbol: 'AVAX (native)', address: NATIVE_AVAX },
    { symbol: 'WAVAX', address: FUJI_TOKENS.WAVAX },
    { symbol: 'USDC', address: FUJI_TOKENS.USDC },
] as const;

export function SwapPanel() {
    const [purchaseKey, setPurchaseKey] = useState('');
    const [tokenIn, setTokenIn] = useState<`0x${string}`>(NATIVE_AVAX);
    const [tokenOut, setTokenOut] = useState<`0x${string}`>(FUJI_TOKENS.USDC);
    const [pathInput, setPathInput] = useState('');      // comma-separated addresses
    const [amountOutRaw, setAmountOutRaw] = useState(''); // human amount e.g. "100"
    const [tokenOutDecimals, setTokenOutDecimals] = useState('6');
    const [maxAmountInRaw, setMaxAmountInRaw] = useState(''); // in AVAX or token units
    const [bridgeAdapter, setBridgeAdapter] = useState(FUJI.stargateAdapter || '');
    const [lzOptions, setLzOptions] = useState('0x');
    const [bridgeFeeEth, setBridgeFeeEth] = useState('0.05'); // AVAX for bridge fee

    const { writeContract, data: txHash, isPending, error } = useWriteContract();

    const path = pathInput ? (pathInput.split(',').map(s => s.trim()) as `0x${string}`[]) : [tokenIn, tokenOut];

    const decimals = parseInt(tokenOutDecimals, 10) || 6;
    const amountOut = amountOutRaw ? parseUnits(amountOutRaw, decimals) : 0n;
    const maxAmountIn = maxAmountInRaw ? parseUnits(maxAmountInRaw, 18) : 0n;
    const bridgeFeeWei = bridgeFeeEth ? parseUnits(bridgeFeeEth, 18) : 0n;
    const totalValue = tokenIn === NATIVE_AVAX ? bridgeFeeWei + maxAmountIn : bridgeFeeWei;

    // Live bridge fee quote from adapter
    const { data: quotedFee } = useReadContract({
        address: bridgeAdapter as `0x${string}`,
        abi: STARGATE_ADAPTER_ABI,
        functionName: 'quoteBridge',
        args: [30109, tokenOut, amountOut, lzOptions as `0x${string}`],
        query: { enabled: !!bridgeAdapter && amountOut > 0n },
    });

    function handleSubmit() {
        if (!purchaseKey || amountOut === 0n || !bridgeAdapter) return;
        writeContract({
            address: FUJI.fundProxy,
            abi: FUND_V4_ABI,
            functionName: 'swapAndBridge',
            args: [
                purchaseKey as `0x${string}`,
                tokenIn,
                tokenOut,
                path,
                amountOut,
                maxAmountIn,
                bridgeAdapter as `0x${string}`,
                lzOptions as `0x${string}`,
            ],
            value: totalValue,
        });
    }

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Swap & Bridge</h2>
            <p className="mb-5 text-xs text-gray-400">
                Swap any token pair via DEX router, then bridge the output to the destination chain Safe.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Purchase key (bytes32)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={purchaseKey}
                        onChange={e => setPurchaseKey(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Token in</span>
                    <select
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        value={tokenIn}
                        onChange={e => setTokenIn(e.target.value as `0x${string}`)}
                    >
                        {KNOWN_TOKENS.map(t => (
                            <option key={t.address} value={t.address}>{t.symbol}</option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Token out (address)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={tokenOut}
                        onChange={e => setTokenOut(e.target.value as `0x${string}`)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Token out decimals</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="6"
                        value={tokenOutDecimals}
                        onChange={e => setTokenOutDecimals(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs text-gray-400">Swap path (comma-separated addresses, auto-filled if empty)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0xWAVAX, 0xUSDC"
                        value={pathInput}
                        onChange={e => setPathInput(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Amount out (human units)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="100"
                        value={amountOutRaw}
                        onChange={e => setAmountOutRaw(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Max amount in (AVAX or token units)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="2"
                        value={maxAmountInRaw}
                        onChange={e => setMaxAmountInRaw(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Bridge adapter address</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={bridgeAdapter}
                        onChange={e => setBridgeAdapter(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Bridge fee (AVAX)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0.05"
                        value={bridgeFeeEth}
                        onChange={e => setBridgeFeeEth(e.target.value)}
                    />
                    {quotedFee !== undefined && (
                        <span className="text-[0.7rem] text-[#4fa8e0]">
                            Live quote: {(Number(quotedFee) / 1e18).toFixed(6)} AVAX
                        </span>
                    )}
                </label>

                <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs text-gray-400">LayerZero options (hex, leave 0x for default)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x"
                        value={lzOptions}
                        onChange={e => setLzOptions(e.target.value)}
                    />
                </label>
            </div>

            <div className="mt-5 flex items-center gap-4">
                <TxButton onClick={handleSubmit} txHash={txHash} isPending={isPending}>
                    Swap & Bridge
                </TxButton>
                <span className="text-xs text-gray-500">
                    Total msg.value: {(Number(totalValue) / 1e18).toFixed(4)} AVAX
                </span>
            </div>
            <TxResult hash={txHash} error={error} />
        </div>
    );
}
