import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { FUND_V4_ABI } from '../abis';
import { FUJI } from '../addresses';
import { TxButton, TxResult } from '../components/TxButton';

export function AdaptersPanel() {
    const [adapterAddr, setAdapterAddr] = useState('');
    const [approve, setApprove] = useState(true);

    const { writeContract, data: txHash, isPending, error } = useWriteContract();

    function handleSubmit() {
        if (!adapterAddr) return;
        writeContract({
            address: FUJI.fundProxy,
            abi: FUND_V4_ABI,
            functionName: 'setApprovedBridgeAdapter',
            args: [adapterAddr as `0x${string}`, approve],
        });
    }

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Bridge Adapters</h2>
            <p className="mb-5 text-xs text-gray-400">
                Add or remove bridge adapter contracts from the fund's allowlist. Only DEFAULT_ADMIN_ROLE can call this.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs text-gray-400">Adapter address</span>
                    <input
                        className="rounded bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                        placeholder="0x…"
                        value={adapterAddr}
                        onChange={e => setAdapterAddr(e.target.value)}
                    />
                </label>

                <label className="flex items-center gap-2 text-sm text-white">
                    <input
                        type="checkbox"
                        checked={approve}
                        onChange={e => setApprove(e.target.checked)}
                        className="h-4 w-4 accent-[#4fa8e0]"
                    />
                    Approve (uncheck to revoke)
                </label>
            </div>

            <div className="mt-5">
                <TxButton onClick={handleSubmit} txHash={txHash} isPending={isPending}>
                    {approve ? 'Approve Adapter' : 'Revoke Adapter'}
                </TxButton>
            </div>
            <TxResult hash={txHash} error={error} />
        </div>
    );
}
