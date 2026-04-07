import { useState } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { stringToHex, padHex } from 'viem';
import { REGISTRY_ABI } from '../abis';
import { FUJI, LZ_EID, KNOWN_CHAIN_NAMES } from '../addresses';
import { TxButton, TxResult } from '../components/TxButton';

const KNOWN_EIDS = Object.entries(LZ_EID).map(([name, eid]) => ({ name, eid }));

export function ChainSafesPanel() {
    const [chainEid, setChainEid] = useState<number>(LZ_EID.POLYGON_AMOY);
    const [evmSafe, setEvmSafe] = useState('');
    const [label, setLabel] = useState('POLYGON_SAFE');
    const [enabled, setEnabled] = useState(true);

    const { writeContract, data: txHash, isPending, error } = useWriteContract();

    // Read current config for selected chain
    const { data: currentConfig } = useReadContract({
        address: FUJI.portfolioRegistry,
        abi: REGISTRY_ABI,
        functionName: 'getChainSafe',
        args: [chainEid],
        query: { enabled: chainEid > 0 },
    });

    function handleSubmit() {
        if (!evmSafe || !chainEid) return;
        const labelBytes = padHex(stringToHex(label.slice(0, 31)), { size: 32, dir: 'right' });
        writeContract({
            address: FUJI.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'setChainSafe',
            args: [
                chainEid,
                evmSafe as `0x${string}`,
                '0x0000000000000000000000000000000000000000000000000000000000000000',
                labelBytes,
                enabled,
            ],
        });
    }

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Chain Safe Config</h2>
            <p className="mb-5 text-xs text-gray-400">
                Register or update the Safe address for a destination chain in the portfolio registry.
            </p>

            {currentConfig && (
                <div className="mb-5 rounded bg-black/30 p-3 text-xs">
                    <p className="text-gray-400">Current config for EID {chainEid}:</p>
                    <p className="mt-1 font-mono text-white">
                        Safe: {currentConfig.evmSafe}
                    </p>
                    <p className="mt-0.5 text-gray-400">
                        Enabled: {currentConfig.enabled ? 'yes' : 'no'}
                    </p>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Chain (LayerZero EID)</span>
                    <select
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        value={chainEid}
                        onChange={e => setChainEid(Number(e.target.value))}
                    >
                        {KNOWN_EIDS.map(({ name, eid }) => (
                            <option key={eid} value={eid}>
                                {KNOWN_CHAIN_NAMES[eid] ?? name} ({eid})
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">EVM Safe address</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={evmSafe}
                        onChange={e => setEvmSafe(e.target.value)}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Label (short name, ≤31 chars)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="POLYGON_SAFE"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                    />
                </label>

                <label className="flex items-center gap-2 text-sm text-white">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={e => setEnabled(e.target.checked)}
                        className="h-4 w-4 accent-[#4fa8e0]"
                    />
                    Enabled
                </label>
            </div>

            <div className="mt-5">
                <TxButton onClick={handleSubmit} txHash={txHash} isPending={isPending}>
                    Save Chain Safe
                </TxButton>
            </div>
            <TxResult hash={txHash} error={error} />
        </div>
    );
}
