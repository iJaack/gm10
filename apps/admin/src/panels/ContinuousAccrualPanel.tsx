import { useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useReadContract, useWriteContract } from 'wagmi';
import { FUND_ADMIN_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { AdminField as Field, AdminPage, MetricCard, MetricGrid, SectionPanel as Section } from '../components/AdminPrimitives';
import { TxButton, TxResult } from '../components/TxButton';
import { READ_STATUS } from '../lib/adminMetrics.js';

const DEFAULT_PREVIEW_USDC = '100';

function formatUsdc(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return `${Number(formatUnits(value, 6)).toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC`;
}

function formatCatch(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    return `${Number(formatUnits(value, 18)).toLocaleString('en-US', { maximumFractionDigits: 6 })} CATCH`;
}

function statusLabel(paused?: boolean) {
    if (paused === undefined) return 'Unavailable';
    return paused ? 'Paused' : 'Live';
}

export function ContinuousAccrualPanel() {
    const [previewAmount, setPreviewAmount] = useState(DEFAULT_PREVIEW_USDC);
    const tx = useWriteContract();

    const { data: navPerTokenUsdt6 } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'navPerTokenUsdt6',
    });
    const { data: mintSpreadBps } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'mintSpreadBps',
    });
    const { data: continuousMintPaused } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'continuousMintPaused',
    });
    const { data: buybackPaused } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'buybackPaused',
    });
    const { data: lpSupportPaused } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'lpSupportPaused',
    });
    const { data: redemptionsPermanentlyDisabled } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'redemptionsPermanentlyDisabled',
    });

    const previewAmountUsdt6 = useMemo(() => {
        try {
            return parseUnits(previewAmount || '0', 6);
        } catch {
            return 0n;
        }
    }, [previewAmount]);

    const { data: preview } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'previewContinuousMint',
        args: [previewAmountUsdt6],
        query: { enabled: previewAmountUsdt6 > 0n },
    });

    const controlsKnown = continuousMintPaused !== undefined
        && buybackPaused !== undefined
        && lpSupportPaused !== undefined
        && mintSpreadBps !== undefined;
    const activationReady = controlsKnown
        && continuousMintPaused
        && buybackPaused
        && lpSupportPaused
        && mintSpreadBps === -500n;

    function submitActivation() {
        tx.reset();
        tx.writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'setContinuousAccrualControls',
            args: [false, true, true, -500n],
        });
    }

    function submitPause() {
        tx.reset();
        tx.writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'setContinuousAccrualControls',
            args: [true, true, true, -500n],
        });
    }

    return (
        <AdminPage
            eyebrow="Mainnet V8"
            title="Continuous Accrual"
            description="Control the V8 commit gate and verify the live NAV-derived mint preview. Keep buyback and LP support paused until sale-profit execution is separately rehearsed."
            statusItems={[
                { label: `Mint ${statusLabel(continuousMintPaused)}`, status: continuousMintPaused === false ? READ_STATUS.live : continuousMintPaused === true ? READ_STATUS.partial : READ_STATUS.unavailable },
                { label: `Buyback ${statusLabel(buybackPaused)}`, status: buybackPaused === true ? READ_STATUS.partial : buybackPaused === false ? READ_STATUS.live : READ_STATUS.unavailable },
                { label: `LP ${statusLabel(lpSupportPaused)}`, status: lpSupportPaused === true ? READ_STATUS.partial : lpSupportPaused === false ? READ_STATUS.live : READ_STATUS.unavailable },
            ]}
        >
            <MetricGrid>
                <MetricCard label="NAV per CATCH" value={formatUsdc(navPerTokenUsdt6)} status={navPerTokenUsdt6 !== undefined ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel="navPerTokenUsdt6" />
                <MetricCard label="Mint spread" value={mintSpreadBps !== undefined ? `${mintSpreadBps.toString()} bps` : 'Unavailable'} status={mintSpreadBps === -500n ? READ_STATUS.live : READ_STATUS.partial} sourceLabel="V8" detail="Negative spread means a buyer discount to NAV. -500 bps is a 5% discount." />
                <MetricCard label="Preview buyer allocation" value={formatCatch(preview?.[0])} status={preview ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel={`${previewAmount || '0'} USDC`} />
                <MetricCard label="Redemptions" value={redemptionsPermanentlyDisabled ? 'Permanently disabled' : 'Check contract'} status={redemptionsPermanentlyDisabled ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel="V8" />
            </MetricGrid>

            <Section
                title="Commit Preview"
                description="This is a read-only on-chain preview. It does not settle funds or mint CATCH."
            >
                <div className="grid gap-3 md:grid-cols-[minmax(0,20rem)_1fr] md:items-end">
                    <Field label="Settlement amount" value={previewAmount} onChange={setPreviewAmount} placeholder="100" type="number" />
                    <div className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-gray-300">
                        <div>Mint price: {formatUsdc(preview?.[2])}</div>
                        <div>Buyer CATCH: {formatCatch(preview?.[0])}</div>
                        <div>Each segment wallet: {formatCatch(preview?.[1])}</div>
                    </div>
                </div>
            </Section>

            <Section
                title="Activation Control"
                description="Activate only the continuous mint gate. Buybacks and LP support stay paused; redemptions remain permanently disabled."
            >
                <div className="flex flex-wrap gap-2">
                    <TxButton onClick={submitActivation} txHash={tx.data} isPending={tx.isPending} disabled={!activationReady}>
                        Activate continuous mint only
                    </TxButton>
                    <TxButton onClick={submitPause} txHash={tx.data} isPending={tx.isPending} disabled={continuousMintPaused !== false}>
                        Emergency pause mint
                    </TxButton>
                </div>
                <TxResult hash={tx.data} error={tx.error} />
            </Section>
        </AdminPage>
    );
}
