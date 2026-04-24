import { useState } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { FUND_V4_ABI, STARGATE_ADAPTER_ABI } from '../abis';
import { FUJI, FUJI_TOKENS, LZ_EID, KNOWN_CHAIN_NAMES } from '../addresses';
import { TxButton, TxResult } from '../components/TxButton';

// Direct bridge — no swap, assumes the fund already holds tokenOut
export function BridgePanel() {
    const [purchaseKey, setPurchaseKey] = useState('');
    const [tokenOut, setTokenOut] = useState(FUJI_TOKENS.USDC);
    const [amountRaw, setAmountRaw] = useState('');
    const [decimals, setDecimals] = useState('6');
    const [bridgeAdapter, setBridgeAdapter] = useState(FUJI.stargateAdapter || '');
    const [lzOptions, setLzOptions] = useState('0x');
    const [bridgeFeeEth, setBridgeFeeEth] = useState('0.05');
    const [dstEid, setDstEid] = useState<number>(LZ_EID.POLYGON_AMOY);
    const [dstSafe, setDstSafe] = useState('');

    const { writeContract, data: txHash, isPending, error } = useWriteContract();

    const amountOut = amountRaw ? parseUnits(amountRaw, parseInt(decimals, 10) || 6) : 0n;
    const bridgeFeeWei = bridgeFeeEth ? parseUnits(bridgeFeeEth, 18) : 0n;

    // Live fee quote
    const { data: quotedFee } = useReadContract({
        address: bridgeAdapter as `0x${string}`,
        abi: STARGATE_ADAPTER_ABI,
        functionName: 'quoteBridge',
        args: [dstEid, tokenOut as `0x${string}`, amountOut, lzOptions as `0x${string}`],
        query: { enabled: !!bridgeAdapter && amountOut > 0n },
    });

    function handleSubmit() {
        if (!purchaseKey || amountOut === 0n || !bridgeAdapter || !dstSafe) return;
        // Bridge-only: set tokenIn = tokenOut (no swap needed — fund holds it already)
        // We still call swapAndBridge with identical tokenIn/tokenOut and amountOut=maxAmountIn
        // so the contract skips swapping (path is a single-element array).
        writeContract({
            address: FUJI.fundProxy,
            abi: FUND_V4_ABI,
            functionName: 'swapAndBridge',
            args: [
                purchaseKey as `0x${string}`,
                tokenOut as `0x${string}`,    // tokenIn == tokenOut → DEX swap is a no-op
                tokenOut as `0x${string}`,
                [tokenOut as `0x${string}`],  // single-hop path
                amountOut,
                amountOut,                    // maxAmountIn = amountOut (no swap tolerance needed)
                bridgeAdapter as `0x${string}`,
                dstEid,
                dstSafe as `0x${string}`,
                lzOptions as `0x${string}`,
            ],
            value: bridgeFeeWei,
        });
    }

    const KNOWN_EIDS = Object.entries(LZ_EID)
        .filter(([, eid]) => eid !== LZ_EID.SOLANA_MAINNET && eid !== LZ_EID.SOLANA_DEVNET)
        .map(([name, eid]) => ({ name, eid }));

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Bridge Funds (no swap)</h2>
            <p className="mb-5 text-xs text-gray-400">
                Bridge a token the fund already holds to a destination chain Safe, without swapping first.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs text-gray-400">Purchase key (bytes32)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={purchaseKey}
                        onChange={e => setPurchaseKey(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Token to bridge</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={tokenOut}
                        onChange={e => setTokenOut(e.target.value as `0x${string}`)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Token decimals</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="6"
                        value={decimals}
                        onChange={e => setDecimals(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Amount (human units)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="500"
                        value={amountRaw}
                        onChange={e => setAmountRaw(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Destination chain</span>
                    <select
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        value={dstEid}
                        onChange={e => setDstEid(Number(e.target.value))}
                    >
                        {KNOWN_EIDS.map(({ name, eid }) => (
                            <option key={eid} value={eid}>
                                {KNOWN_CHAIN_NAMES[eid] ?? name} ({eid})
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Bridge adapter</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={bridgeAdapter}
                        onChange={e => setBridgeAdapter(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Destination Safe address</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={dstSafe}
                        onChange={e => setDstSafe(e.target.value)}
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

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">LZ options (hex)</span>
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
                    Bridge
                </TxButton>
                <span className="text-xs text-gray-500">
                    msg.value: {bridgeFeeEth || '0'} AVAX
                </span>
            </div>
            <TxResult hash={txHash} error={error} />
        </div>
    );
}
