import { useMemo, useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { useBalance, useReadContract, useSendTransaction, useWriteContract } from 'wagmi';
import {
    ERC20_ABI,
    FUND_ADMIN_ABI,
    LEGACY_JOE_ROUTER_ABI,
    PHARAOH_POOL_ABI,
    PHARAOH_POSITION_MANAGER_ABI,
    PHARAOH_SWAP_ROUTER_ABI,
    WAVAX_ABI,
} from '../abis';
import { LIQUIDITY_VENUES, MAINNET, MAINNET_TOKENS } from '../addresses';
import { ActionReadinessPanel, MetricCard, PageHeader, StatusStrip } from '../components/AdminPrimitives';
import { TxButton, TxResult } from '../components/TxButton';
import { READ_STATUS } from '../lib/adminMetrics.js';
import {
    PHARAOH_FEE_1_PERCENT,
    ROUND2_DEADLINE_SECONDS,
    ROUND2_END_AT,
    ROUND2_ID,
    ROUND2_MAX_AVAX,
    ROUND2_MAX_SPOT_DRIFT_BPS,
    ROUND2_MIN_AVAX,
    ROUND2_PRICE_AVAX,
    ROUND2_SLIPPAGE_BPS,
    ROUND2_START_AT,
    ROUND2_TARGET_AVAX,
    applySlippage,
    calculateRoundRouting,
    getDeadline,
    getExactDustCloseAmount,
    getPharaohWideTicks,
    getRoundRemaining,
    getRoundStatus,
    getTickSpotDriftBps,
    isRoundAutoFinalized,
    isSpotDriftPaused,
    sortTokenAmounts,
    splitIntoTranches,
} from '../lib/rounds.js';

const CATCH_ADDRESS = MAINNET.fundProxy;
const ROUND2_START_ISO = '2026-04-16T15:00:00Z';
const ROUND2_END_ISO = '2026-05-16T15:00:00Z';

type RoundData = {
    roundId: bigint;
    targetAmount: bigint;
    raisedAmount: bigint;
    tokenPrice: bigint;
    minInvestment: bigint;
    maxInvestment: bigint;
    startTime: bigint;
    endTime: bigint;
    isActive: boolean;
    isFinalized: boolean;
};

function parseTimestamp(value: string) {
    return BigInt(Math.floor(Date.parse(value) / 1000));
}

function formatAvax(value?: bigint) {
    if (value === undefined) return 'Unavailable';
    const amount = Number(formatEther(value));
    return `${amount.toLocaleString('en-US', { maximumFractionDigits: amount < 1 ? 6 : 4 })} AVAX`;
}

function formatTimestamp(value?: bigint) {
    if (value === undefined || value === 0n) return 'Unavailable';
    return new Date(Number(value) * 1000).toISOString();
}

function RoundCard({ title, round }: { title: string; round?: RoundData }) {
    const status = getRoundStatus(round);
    const remaining = round ? getRoundRemaining(round) : undefined;
    const dustClose = round ? getExactDustCloseAmount(round) : undefined;

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <span className="rounded-full bg-black/30 px-3 py-1 text-xs text-[#4fa8e0]">{status}</span>
            </div>
            <div className="grid gap-2 text-xs text-gray-400">
                <div>Round ID: {round ? round.roundId.toString() : 'Unavailable'}</div>
                <div>Target: {formatAvax(round?.targetAmount)}</div>
                <div>Raised: {formatAvax(round?.raisedAmount)}</div>
                <div>Remaining: {formatAvax(remaining)}</div>
                <div>Price: {round ? `${formatEther(round.tokenPrice)} AVAX/CATCH` : 'Unavailable'}</div>
                <div>Min / max: {round ? `${formatEther(round.minInvestment)} / ${formatEther(round.maxInvestment)} AVAX` : 'Unavailable'}</div>
                <div>Start: {formatTimestamp(round?.startTime)}</div>
                <div>End: {formatTimestamp(round?.endTime)}</div>
                <div>Active: {round ? String(round.isActive) : 'Unavailable'}</div>
                <div>Finalized: {round ? String(isRoundAutoFinalized(round)) : 'Unavailable'}</div>
            </div>
            {dustClose !== undefined ? (
                <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                    Exact close required: only {formatAvax(dustClose)} remains, so the final buy can be below the normal minimum.
                    A normal minimum buy would exceed the cap and revert.
                </div>
            ) : null}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
            <div className="grid gap-4">{children}</div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">{label}</span>
            <input
                className="rounded bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#4fa8e0]"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                type={type}
            />
        </label>
    );
}

export function RoundsPanel() {
    const [targetAvax, setTargetAvax] = useState(ROUND2_TARGET_AVAX);
    const [priceAvax, setPriceAvax] = useState(ROUND2_PRICE_AVAX);
    const [minAvax, setMinAvax] = useState(ROUND2_MIN_AVAX);
    const [maxAvax, setMaxAvax] = useState(ROUND2_MAX_AVAX);
    const [startIso, setStartIso] = useState(ROUND2_START_ISO);
    const [endIso, setEndIso] = useState(ROUND2_END_ISO);
    const [maxTrancheAvax, setMaxTrancheAvax] = useState('1');
    const [lfjTrancheIndex, setLfjTrancheIndex] = useState(0);
    const [pharaohTrancheIndex, setPharaohTrancheIndex] = useState(0);
    const [lfjCatchAmount, setLfjCatchAmount] = useState('');
    const [pharaohCatchAmount, setPharaohCatchAmount] = useState('');
    const [pharaohWavaxAmount, setPharaohWavaxAmount] = useState('');
    const [pharaohReferenceTick, setPharaohReferenceTick] = useState('');

    const contractTx = useWriteContract();
    const teamTransfer = useSendTransaction();

    const { data: currentRoundId } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'currentRoundId',
    });

    const { data: round1 } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'getRound',
        args: [1n],
    });

    const { data: round2 } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'getRound',
        args: [ROUND2_ID],
    });

    const { data: treasuryAddress } = useReadContract({
        address: MAINNET.fundProxy,
        abi: FUND_ADMIN_ABI,
        functionName: 'treasury',
    });
    const effectiveTreasuryAddress = (treasuryAddress ?? MAINNET.treasurySafe) as `0x${string}`;

    const { data: fundBalance } = useBalance({ address: MAINNET.fundProxy });
    const { data: treasuryBalance } = useBalance({ address: effectiveTreasuryAddress });

    const { data: catchBalance } = useReadContract({
        address: CATCH_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [effectiveTreasuryAddress],
    });

    const { data: wavaxBalance } = useReadContract({
        address: MAINNET_TOKENS.WAVAX,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [effectiveTreasuryAddress],
    });

    const round2Finalized = isRoundAutoFinalized(round2);
    const routing = useMemo(
        () => calculateRoundRouting(round2?.raisedAmount ?? 0n),
        [round2?.raisedAmount],
    );
    const maxTrancheWei = useMemo(() => {
        try {
            return parseEther(maxTrancheAvax || '0');
        } catch {
            return 0n;
        }
    }, [maxTrancheAvax]);
    const lfjTranches = useMemo(() => splitIntoTranches(routing.lfj, maxTrancheWei), [maxTrancheWei, routing.lfj]);
    const pharaohTranches = useMemo(() => splitIntoTranches(routing.pharaoh, maxTrancheWei), [maxTrancheWei, routing.pharaoh]);
    const lfjTranche = lfjTranches[Math.min(lfjTrancheIndex, Math.max(0, lfjTranches.length - 1))] ?? 0n;
    const pharaohTranche = pharaohTranches[Math.min(pharaohTrancheIndex, Math.max(0, pharaohTranches.length - 1))] ?? 0n;
    const lfjSwapAvax = lfjTranche / 2n;
    const lfjPairAvax = lfjTranche - lfjSwapAvax;
    const pharaohSwapWavax = pharaohTranche / 2n;

    const lfjPath = useMemo(() => [MAINNET_TOKENS.WAVAX, CATCH_ADDRESS] as const, []);
    const { data: lfjQuote } = useReadContract({
        address: LIQUIDITY_VENUES.legacyJoeRouter,
        abi: LEGACY_JOE_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [lfjSwapAvax, lfjPath],
        query: { enabled: lfjSwapAvax > 0n },
    });
    const lfjQuotedCatch = lfjQuote?.[1] ?? 0n;
    const lfjCatchDesired = lfjCatchAmount.trim() ? parseEther(lfjCatchAmount.trim()) : lfjQuotedCatch;
    const lfjDeadline = getDeadline();

    const { data: pharaohSlot0 } = useReadContract({
        address: LIQUIDITY_VENUES.pharaohPool,
        abi: PHARAOH_POOL_ABI,
        functionName: 'slot0',
    });
    const pharaohTick = Array.isArray(pharaohSlot0) ? Number(pharaohSlot0[1]) : 0;
    const pharaohReferenceTickNumber = pharaohReferenceTick.trim() ? Number(pharaohReferenceTick.trim()) : pharaohTick;
    const pharaohSpotDriftBps = getTickSpotDriftBps(pharaohReferenceTickNumber, pharaohTick);
    const pharaohRoutingPaused = isSpotDriftPaused(pharaohReferenceTickNumber, pharaohTick);
    const pharaohTicks = getPharaohWideTicks(pharaohTick);
    const pharaohCatchDesired = pharaohCatchAmount.trim() ? parseEther(pharaohCatchAmount.trim()) : 0n;
    const pharaohWavaxDesired = pharaohWavaxAmount.trim() ? parseEther(pharaohWavaxAmount.trim()) : 0n;
    const pharaohSorted = sortTokenAmounts(CATCH_ADDRESS, pharaohCatchDesired, MAINNET_TOKENS.WAVAX, pharaohWavaxDesired);

    function submitCreateRound() {
        contractTx.reset();
        contractTx.writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'createFundraisingRound',
            args: [
                parseEther(targetAvax.trim()),
                parseEther(priceAvax.trim()),
                parseEther(minAvax.trim()),
                parseEther(maxAvax.trim()),
                parseTimestamp(startIso),
                parseTimestamp(endIso),
            ],
        });
    }

    function submitFinalizeRound2() {
        contractTx.reset();
        contractTx.writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'finalizeRound',
            args: [ROUND2_ID],
        });
    }

    function submitRoutingWithdrawal() {
        contractTx.reset();
        contractTx.writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'withdrawFromTreasury',
            args: [effectiveTreasuryAddress, routing.routingBucket, 'Round 2 post-raise routing bucket'],
        });
    }

    function submitLfjSwap() {
        contractTx.reset();
        contractTx.writeContract({
            address: LIQUIDITY_VENUES.legacyJoeRouter,
            abi: LEGACY_JOE_ROUTER_ABI,
            functionName: 'swapExactAVAXForTokens',
            args: [applySlippage(lfjQuotedCatch), lfjPath, effectiveTreasuryAddress, lfjDeadline],
            value: lfjSwapAvax,
        });
    }

    function submitApproveJoeCatch() {
        contractTx.reset();
        contractTx.writeContract({
            address: CATCH_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [LIQUIDITY_VENUES.legacyJoeRouter, lfjCatchDesired],
        });
    }

    function submitLfjAddLiquidity() {
        contractTx.reset();
        contractTx.writeContract({
            address: LIQUIDITY_VENUES.legacyJoeRouter,
            abi: LEGACY_JOE_ROUTER_ABI,
            functionName: 'addLiquidityAVAX',
            args: [
                CATCH_ADDRESS,
                lfjCatchDesired,
                applySlippage(lfjCatchDesired),
                applySlippage(lfjPairAvax),
                LIQUIDITY_VENUES.deadAddress,
                lfjDeadline,
            ],
            value: lfjPairAvax,
        });
    }

    function submitWrapPharaohTranche() {
        contractTx.reset();
        contractTx.writeContract({
            address: MAINNET_TOKENS.WAVAX,
            abi: WAVAX_ABI,
            functionName: 'deposit',
            value: pharaohTranche,
        });
    }

    function submitApprovePharaohSwap() {
        contractTx.reset();
        contractTx.writeContract({
            address: MAINNET_TOKENS.WAVAX,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [LIQUIDITY_VENUES.pharaohSwapRouter, pharaohSwapWavax],
        });
    }

    function submitPharaohSwap() {
        contractTx.reset();
        contractTx.writeContract({
            address: LIQUIDITY_VENUES.pharaohSwapRouter,
            abi: PHARAOH_SWAP_ROUTER_ABI,
            functionName: 'exactInputSingle',
            args: [{
                tokenIn: MAINNET_TOKENS.WAVAX,
                tokenOut: CATCH_ADDRESS,
                fee: PHARAOH_FEE_1_PERCENT,
                recipient: effectiveTreasuryAddress,
                deadline: getDeadline(),
                amountIn: pharaohSwapWavax,
                amountOutMinimum: applySlippage(pharaohCatchDesired),
                sqrtPriceLimitX96: 0n,
            }],
        });
    }

    function submitApprovePharaohPosition(token: `0x${string}`, amount: bigint) {
        contractTx.reset();
        contractTx.writeContract({
            address: token,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [LIQUIDITY_VENUES.pharaohPositionManager, amount],
        });
    }

    function submitPharaohMint() {
        contractTx.reset();
        contractTx.writeContract({
            address: LIQUIDITY_VENUES.pharaohPositionManager,
            abi: PHARAOH_POSITION_MANAGER_ABI,
            functionName: 'mint',
            args: [{
                token0: pharaohSorted.token0,
                token1: pharaohSorted.token1,
                fee: PHARAOH_FEE_1_PERCENT,
                tickLower: pharaohTicks.lower,
                tickUpper: pharaohTicks.upper,
                amount0Desired: pharaohSorted.amount0,
                amount1Desired: pharaohSorted.amount1,
                amount0Min: applySlippage(pharaohSorted.amount0),
                amount1Min: applySlippage(pharaohSorted.amount1),
                recipient: effectiveTreasuryAddress,
                deadline: getDeadline(),
            }],
        });
    }

    function submitTeamTransfer() {
        teamTransfer.reset();
        teamTransfer.sendTransaction({
            to: MAINNET.teamWallet,
            value: routing.team,
        });
    }

    const canCreateRound2 = !currentRoundId || currentRoundId < ROUND2_ID;
    const canFinalizeRound2 = Boolean(round2 && !round2Finalized && (round2.raisedAmount >= round2.targetAmount || BigInt(Math.floor(Date.now() / 1000)) > round2.endTime));
    const quoteFreshness = lfjQuote && pharaohSlot0 ? READ_STATUS.live : lfjQuote || pharaohSlot0 ? READ_STATUS.partial : READ_STATUS.unavailable;

    return (
        <div className="grid gap-6">
            <PageHeader
                eyebrow="Round operations"
                title="Rounds"
                description="Create, close, and route fundraising rounds with explicit finalization and quote-readiness gates."
            />
            <StatusStrip
                items={[
                    { label: `Current round ${currentRoundId?.toString() ?? 'unavailable'}`, status: currentRoundId !== undefined ? READ_STATUS.live : READ_STATUS.unavailable },
                    { label: getRoundStatus(round2), status: round2 ? READ_STATUS.live : READ_STATUS.unavailable },
                    { label: round2Finalized ? 'routing unlocked' : 'finalization required', status: round2Finalized ? READ_STATUS.live : READ_STATUS.fallback },
                    { label: quoteFreshness === READ_STATUS.live ? 'quotes live' : 'quote reads pending', status: quoteFreshness },
                ]}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Fund balance" value={formatAvax(fundBalance?.value)} status={fundBalance ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel={fundBalance ? 'live balance' : 'unavailable'} />
                <MetricCard label="Treasury Safe" value={formatAvax(treasuryBalance?.value)} status={READ_STATUS.configured} sourceLabel="configured Safe" detail={<span className="break-all font-mono">{effectiveTreasuryAddress}</span>} />
                <MetricCard label="Raised" value={formatAvax(round2?.raisedAmount)} status={round2 ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel="Round 2" accent="blue" />
                <MetricCard label="Routing bucket" value={formatAvax(routing.routingBucket)} status={round2 ? READ_STATUS.live : READ_STATUS.unavailable} sourceLabel={round2Finalized ? 'withdrawable' : 'planned'} accent="yellow" />
            </div>

            <ActionReadinessPanel
                title="Routing readiness"
                rows={[
                    { label: 'Round 2 finalization', status: round2Finalized ? READ_STATUS.live : READ_STATUS.fallback, detail: round2Finalized ? 'Routing withdrawals are enabled.' : 'Finalize Round 2 before withdrawing routing buckets.' },
                    { label: 'LFJ quote', status: lfjQuote ? READ_STATUS.live : READ_STATUS.unavailable, detail: lfjQuote ? 'Legacy Joe quote returned for the selected tranche.' : 'Enter or select a tranche before relying on LFJ output.' },
                    { label: 'Pharaoh pool read', status: pharaohSlot0 ? READ_STATUS.live : READ_STATUS.unavailable, detail: pharaohSlot0 ? `Current tick ${pharaohTick}.` : 'Pool tick unavailable; Pharaoh routing is not decision-ready.' },
                    { label: 'Pharaoh drift guard', status: pharaohRoutingPaused ? READ_STATUS.error : READ_STATUS.live, detail: pharaohRoutingPaused ? 'Spot drift exceeded the configured guard.' : 'Spot drift is within the 10% guard.' },
                ]}
            />

            <div className="grid gap-4 lg:grid-cols-2">
                <RoundCard title="Round 1 complete" round={round1 as RoundData | undefined} />
                <RoundCard title="Round 2" round={round2 as RoundData | undefined} />
            </div>

            <Section title="Start new round">
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Target AVAX" value={targetAvax} onChange={setTargetAvax} type="number" />
                    <Field label="Token price AVAX/CATCH" value={priceAvax} onChange={setPriceAvax} type="number" />
                    <Field label="Minimum buy AVAX" value={minAvax} onChange={setMinAvax} type="number" />
                    <Field label="Max wallet cap AVAX" value={maxAvax} onChange={setMaxAvax} type="number" />
                    <Field label="Start timestamp" value={startIso} onChange={setStartIso} />
                    <Field label="End timestamp" value={endIso} onChange={setEndIso} />
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-gray-400">
                    Prefill: Round 2 opens at {ROUND2_START_AT.toString()} and closes at {ROUND2_END_AT.toString()}.
                    Expected full-cap mint is about 1,428,571.4286 CATCH.
                </div>
                <TxButton onClick={submitCreateRound} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!canCreateRound2}>
                    Create Round 2
                </TxButton>
            </Section>

            <Section title="Round 2 routing">
                <div className="grid gap-2 text-xs text-gray-400">
                    <div>Routing unlock: {round2Finalized ? 'Round 2 finalized' : 'Waiting for Round 2 finalization'}</div>
                    <div>Raised: {formatAvax(routing.raised)}</div>
                    <div>Strategy/card acquisition treasury: {formatAvax(routing.strategyTreasury)}</div>
                    <div>Routing withdrawal bucket: {formatAvax(routing.routingBucket)}</div>
                    <div>LFJ LP budget: {formatAvax(routing.lfj)}</div>
                    <div>Pharaoh LP budget: {formatAvax(routing.pharaoh)}</div>
                    <div>Team wallet: {formatAvax(routing.team)} to {MAINNET.teamWallet}</div>
                    <div>Treasury CATCH balance: {catchBalance !== undefined ? `${Number(formatEther(catchBalance)).toLocaleString('en-US', { maximumFractionDigits: 4 })} CATCH` : 'Unavailable'}</div>
                    <div>Treasury WAVAX balance: {wavaxBalance !== undefined ? `${Number(formatEther(wavaxBalance)).toLocaleString('en-US', { maximumFractionDigits: 4 })} WAVAX` : 'Unavailable'}</div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <TxButton onClick={submitFinalizeRound2} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!canFinalizeRound2}>
                        Finalize Round 2 if ended
                    </TxButton>
                    <TxButton onClick={submitRoutingWithdrawal} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || routing.routingBucket <= 0n}>
                        Withdraw 15% routing bucket
                    </TxButton>
                    <TxButton onClick={submitTeamTransfer} txHash={teamTransfer.data} isPending={teamTransfer.isPending} disabled={!round2Finalized || routing.team <= 0n}>
                        Send 5% team allocation
                    </TxButton>
                </div>
            </Section>

            <Section title="LFJ Legacy Joe tranche">
                <Field label="Max tranche AVAX" value={maxTrancheAvax} onChange={setMaxTrancheAvax} type="number" />
                <div className="grid gap-2 text-xs text-gray-400">
                    <div>Router: {LIQUIDITY_VENUES.legacyJoeRouter}</div>
                    <div>Tranche: {lfjTranches.length ? `${lfjTrancheIndex + 1} of ${lfjTranches.length}` : 'Unavailable'}</div>
                    <div>Tranche budget: {formatAvax(lfjTranche)}</div>
                    <div>Swap half to CATCH: {formatAvax(lfjSwapAvax)}</div>
                    <div>Pair AVAX: {formatAvax(lfjPairAvax)}</div>
                    <div>Quoted CATCH: {lfjQuotedCatch ? `${formatEther(lfjQuotedCatch)} CATCH` : 'Unavailable'}</div>
                    <div>LP token recipient: {LIQUIDITY_VENUES.deadAddress}</div>
                </div>
                <Field label="CATCH amount to pair" value={lfjCatchAmount} onChange={setLfjCatchAmount} type="number" />
                <div className="flex flex-wrap gap-3">
                    <button type="button" className="rounded-lg bg-black/30 px-4 py-2 text-sm text-gray-200" onClick={() => setLfjTrancheIndex((value) => Math.max(0, value - 1))}>Previous tranche</button>
                    <button type="button" className="rounded-lg bg-black/30 px-4 py-2 text-sm text-gray-200" onClick={() => setLfjTrancheIndex((value) => Math.min(lfjTranches.length - 1, value + 1))}>Next tranche</button>
                    <TxButton onClick={submitLfjSwap} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || lfjSwapAvax <= 0n || lfjQuotedCatch <= 0n}>
                        Swap LFJ tranche half
                    </TxButton>
                    <TxButton onClick={submitApproveJoeCatch} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || lfjCatchDesired <= 0n}>
                        Approve CATCH for Joe
                    </TxButton>
                    <TxButton onClick={submitLfjAddLiquidity} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || lfjCatchDesired <= 0n || lfjPairAvax <= 0n}>
                        Add LFJ liquidity and burn LP
                    </TxButton>
                </div>
            </Section>

            <Section title="Pharaoh 1% CL tranche">
                <div className="grid gap-2 text-xs text-gray-400">
                    <div>Swap router: {LIQUIDITY_VENUES.pharaohSwapRouter}</div>
                    <div>Position manager: {LIQUIDITY_VENUES.pharaohPositionManager}</div>
                    <div>Pool: {LIQUIDITY_VENUES.pharaohPool}</div>
                    <div>Tranche: {pharaohTranches.length ? `${pharaohTrancheIndex + 1} of ${pharaohTranches.length}` : 'Unavailable'}</div>
                    <div>Tranche budget to wrap: {formatAvax(pharaohTranche)}</div>
                    <div>Swap half WAVAX to CATCH: {formatAvax(pharaohSwapWavax)}</div>
                    <div>Current tick: {pharaohTick}</div>
                    <div>Reference tick: {pharaohReferenceTick.trim() || pharaohTick}</div>
                    <div>Spot drift guard: {pharaohSpotDriftBps} bps / max {ROUND2_MAX_SPOT_DRIFT_BPS} bps</div>
                    <div>Mint range: {pharaohTicks.lower} to {pharaohTicks.upper}</div>
                    <div>Recipient: {effectiveTreasuryAddress}</div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Reference tick before routing" value={pharaohReferenceTick} onChange={setPharaohReferenceTick} type="number" />
                    <Field label="CATCH amount to mint" value={pharaohCatchAmount} onChange={setPharaohCatchAmount} type="number" />
                    <Field label="WAVAX amount to mint" value={pharaohWavaxAmount} onChange={setPharaohWavaxAmount} type="number" />
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" className="rounded-lg bg-black/30 px-4 py-2 text-sm text-gray-200" onClick={() => setPharaohTrancheIndex((value) => Math.max(0, value - 1))}>Previous tranche</button>
                    <button type="button" className="rounded-lg bg-black/30 px-4 py-2 text-sm text-gray-200" onClick={() => setPharaohTrancheIndex((value) => Math.min(pharaohTranches.length - 1, value + 1))}>Next tranche</button>
                    <TxButton onClick={submitWrapPharaohTranche} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || pharaohTranche <= 0n}>
                        Wrap Pharaoh tranche AVAX
                    </TxButton>
                    <TxButton onClick={submitApprovePharaohSwap} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || pharaohSwapWavax <= 0n}>
                        Approve WAVAX for Pharaoh swap
                    </TxButton>
                    <TxButton onClick={submitPharaohSwap} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || pharaohRoutingPaused || pharaohSwapWavax <= 0n || pharaohCatchDesired <= 0n}>
                        Swap Pharaoh half to CATCH
                    </TxButton>
                    <TxButton onClick={() => submitApprovePharaohPosition(CATCH_ADDRESS, pharaohCatchDesired)} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || pharaohCatchDesired <= 0n}>
                        Approve CATCH for position
                    </TxButton>
                    <TxButton onClick={() => submitApprovePharaohPosition(MAINNET_TOKENS.WAVAX, pharaohWavaxDesired)} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || pharaohWavaxDesired <= 0n}>
                        Approve WAVAX for position
                    </TxButton>
                    <TxButton onClick={submitPharaohMint} txHash={contractTx.data} isPending={contractTx.isPending} disabled={!round2Finalized || pharaohRoutingPaused || pharaohCatchDesired <= 0n || pharaohWavaxDesired <= 0n}>
                        Mint Pharaoh CL position
                    </TxButton>
                </div>
                {pharaohRoutingPaused ? (
                    <div className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
                        Pharaoh routing is paused because spot drift exceeded 10% from the reference tick. Refresh quotes and restart routing from the current spot.
                    </div>
                ) : null}
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                    Pharaoh minting uses a 1% fee tier, a 0.25x to 4x range around current spot, 3% minimums,
                    and sends the position NFT to the Treasury Safe.
                </div>
            </Section>

            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs text-gray-400">
                    Default safety: {ROUND2_SLIPPAGE_BPS.toString()} bps slippage, {ROUND2_DEADLINE_SECONDS / 60} minute deadline.
                    Use small tranches and re-check quotes after each transaction.
                </div>
                <TxResult hash={contractTx.data ?? teamTransfer.data} error={contractTx.error ?? teamTransfer.error} />
            </div>
        </div>
    );
}
