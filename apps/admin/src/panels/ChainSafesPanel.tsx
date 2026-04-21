import { useState } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { stringToHex, padHex, zeroAddress, zeroHash } from 'viem';
import { REGISTRY_ABI } from '../abis';
import { FUJI, LZ_EID, KNOWN_CHAIN_NAMES } from '../addresses';
import { TxButton, TxResult } from '../components/TxButton';
import { bytes32ToSolanaAddress, nonEvmSafeInputToBytes32 } from '../lib/solanaAddress.js';

const KNOWN_EIDS = Object.entries(LZ_EID).map(([name, eid]) => ({ name, eid }));
const NON_EVM_EIDS = new Set<number>([LZ_EID.SOLANA_MAINNET, LZ_EID.SOLANA_DEVNET]);

function isNonEvmEid(eid: number) {
    return NON_EVM_EIDS.has(eid);
}

function defaultLabelForEid(eid: number) {
    if (eid === LZ_EID.SOLANA_MAINNET) return 'SOLANA_SAFE';
    if (eid === LZ_EID.SOLANA_DEVNET) return 'SOLANA_DEVNET_SAFE';
    if (eid === LZ_EID.POLYGON_MAINNET || eid === LZ_EID.POLYGON_AMOY) return 'POLYGON_SAFE';
    if (eid === LZ_EID.AVALANCHE_MAINNET || eid === LZ_EID.AVALANCHE_FUJI) return 'AVALANCHE_SAFE';
    return 'CHAIN_SAFE';
}

function formatNonEvmSafe(value: `0x${string}` | undefined) {
    if (!value || value === zeroHash) return 'Not configured';
    try {
        return bytes32ToSolanaAddress(value);
    } catch {
        return value;
    }
}

export function ChainSafesPanel() {
    const [chainEid, setChainEid] = useState<number>(LZ_EID.SOLANA_MAINNET);
    const [evmSafe, setEvmSafe] = useState('');
    const [nonEvmSafe, setNonEvmSafe] = useState('');
    const [label, setLabel] = useState('SOLANA_SAFE');
    const [enabled, setEnabled] = useState(true);
    const [configError, setConfigError] = useState('');

    const { writeContract, data: txHash, isPending, error } = useWriteContract();

    // Read current config for selected chain
    const { data: currentConfig } = useReadContract({
        address: FUJI.portfolioRegistry,
        abi: REGISTRY_ABI,
        functionName: 'getChainSafe',
        args: [chainEid],
        query: { enabled: chainEid > 0 },
    });

    const nonEvmChain = isNonEvmEid(chainEid);

    function handleSubmit() {
        if (!chainEid) return;
        if (nonEvmChain && !nonEvmSafe.trim()) return;
        if (!nonEvmChain && !evmSafe.trim()) return;

        setConfigError('');
        const labelBytes = padHex(stringToHex(label.slice(0, 31)), { size: 32, dir: 'right' });
        const evmSafeAddress = nonEvmChain ? zeroAddress : evmSafe;
        let nonEvmSafeBytes = zeroHash;

        try {
            nonEvmSafeBytes = nonEvmChain ? nonEvmSafeInputToBytes32(nonEvmSafe) : zeroHash;
        } catch (error) {
            setConfigError(error instanceof Error ? error.message : 'Invalid non-EVM safe address');
            return;
        }

        writeContract({
            address: FUJI.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'setChainSafe',
            args: [
                chainEid,
                evmSafeAddress as `0x${string}`,
                nonEvmSafeBytes as `0x${string}`,
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
                        EVM Safe: {currentConfig.evmSafe}
                    </p>
                    <p className="mt-0.5 break-all font-mono text-white">
                        Non-EVM Safe: {formatNonEvmSafe(currentConfig.nonEvmSafe)}
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
                        onChange={e => {
                            const nextEid = Number(e.target.value);
                            setChainEid(nextEid);
                            setLabel(defaultLabelForEid(nextEid));
                            setEvmSafe('');
                            setNonEvmSafe('');
                            setConfigError('');
                        }}
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
                        disabled={nonEvmChain}
                        onChange={e => {
                            setEvmSafe(e.target.value);
                            setConfigError('');
                        }}
                    />
                    {nonEvmChain ? (
                        <span className="text-[0.7rem] text-gray-500">Unused for Solana custody; the registry stores zero address.</span>
                    ) : null}
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Non-EVM Safe / Solana multisig</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="Squads Solana address"
                        value={nonEvmSafe}
                        disabled={!nonEvmChain}
                        onChange={e => {
                            setNonEvmSafe(e.target.value);
                            setConfigError('');
                        }}
                    />
                    {nonEvmChain ? (
                        <span className="text-[0.7rem] text-gray-500">Paste the Squads address; it is stored as the raw 32-byte Solana pubkey.</span>
                    ) : (
                        <span className="text-[0.7rem] text-gray-500">Unused for EVM custody; the registry stores zero bytes.</span>
                    )}
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Label (short name, ≤31 chars)</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder={defaultLabelForEid(chainEid)}
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
                <TxButton
                    onClick={handleSubmit}
                    txHash={txHash}
                    isPending={isPending}
                    disabled={nonEvmChain ? !nonEvmSafe.trim() : !evmSafe.trim()}
                >
                    Save Chain Safe
                </TxButton>
            </div>
            {configError ? (
                <div className="mt-3 rounded border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                    {configError}
                </div>
            ) : null}
            <TxResult hash={txHash} error={error} />
        </div>
    );
}
