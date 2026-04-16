export const BPS_DENOMINATOR = 10_000n;
export const ROUND2_ID = 2n;
export const ROUND2_TARGET_AVAX = '5000';
export const ROUND2_PRICE_AVAX = '0.0035';
export const ROUND2_MIN_AVAX = '0.1';
export const ROUND2_MAX_AVAX = '500';
export const ROUND2_START_AT = 1_776_351_600n;
export const ROUND2_END_AT = 1_778_943_600n;
export const ROUND2_SLIPPAGE_BPS = 300n;
export const ROUND2_DEADLINE_SECONDS = 20 * 60;
export const ROUND2_MAX_SPOT_DRIFT_BPS = 1_000;
export const PHARAOH_FEE_1_PERCENT = 10_000;
export const PHARAOH_TICK_SPACING_1_PERCENT = 100;
export const PHARAOH_WIDE_RANGE_TICK_OFFSET = 13_864;

export function mulBps(value, bps) {
    return (BigInt(value) * BigInt(bps)) / BPS_DENOMINATOR;
}

export function applySlippage(value, slippageBps = ROUND2_SLIPPAGE_BPS) {
    return mulBps(value, BPS_DENOMINATOR - BigInt(slippageBps));
}

export function calculateRoundRouting(raisedWei) {
    const raised = BigInt(raisedWei ?? 0n);
    const team = mulBps(raised, 500n);
    const lpTotal = mulBps(raised, 1000n);
    const lfj = lpTotal / 2n;
    const pharaoh = lpTotal - lfj;
    const routingBucket = team + lpTotal;
    return {
        raised,
        strategyTreasury: raised - routingBucket,
        routingBucket,
        lpTotal,
        lfj,
        pharaoh,
        team,
    };
}

export function getRoundRemaining(round) {
    if (!round) return 0n;
    const target = BigInt(round.targetAmount ?? 0n);
    const raised = BigInt(round.raisedAmount ?? 0n);
    return raised >= target ? 0n : target - raised;
}

export function getExactDustCloseAmount(round) {
    if (!round) return undefined;
    const remaining = getRoundRemaining(round);
    const minInvestment = BigInt(round.minInvestment ?? 0n);
    return remaining > 0n && remaining < minInvestment ? remaining : undefined;
}

export function isRoundAutoFinalized(round) {
    if (!round) return false;
    const target = BigInt(round.targetAmount ?? 0n);
    return Boolean(round.isFinalized) || (target > 0n && BigInt(round.raisedAmount ?? 0n) >= target);
}

export function getRoundStatus(round, nowSeconds = Math.floor(Date.now() / 1000)) {
    if (!round) return 'Unavailable';
    if (isRoundAutoFinalized(round)) return 'Finalized';
    if (nowSeconds < Number(round.startTime)) return 'Upcoming';
    if (nowSeconds > Number(round.endTime)) return 'Ended, ready to finalize';
    if (round.isActive) return 'Open';
    return 'Inactive';
}

export function getDeadline(nowSeconds = Math.floor(Date.now() / 1000), ttlSeconds = ROUND2_DEADLINE_SECONDS) {
    return BigInt(nowSeconds + ttlSeconds);
}

export function splitIntoTranches(totalWei, maxTrancheWei) {
    const total = BigInt(totalWei ?? 0n);
    const max = BigInt(maxTrancheWei ?? 0n);
    if (total <= 0n) return [];
    if (max <= 0n || total <= max) return [total];

    const tranches = [];
    let remaining = total;
    while (remaining > 0n) {
        const tranche = remaining > max ? max : remaining;
        tranches.push(tranche);
        remaining -= tranche;
    }
    return tranches;
}

export function alignTickDown(tick, spacing = PHARAOH_TICK_SPACING_1_PERCENT) {
    return Math.floor(Number(tick) / spacing) * spacing;
}

export function alignTickUp(tick, spacing = PHARAOH_TICK_SPACING_1_PERCENT) {
    return Math.ceil(Number(tick) / spacing) * spacing;
}

export function getPharaohWideTicks(currentTick) {
    const tick = Number(currentTick ?? 0);
    return {
        lower: alignTickDown(tick - PHARAOH_WIDE_RANGE_TICK_OFFSET),
        upper: alignTickUp(tick + PHARAOH_WIDE_RANGE_TICK_OFFSET),
    };
}

export function sortTokenAmounts(tokenA, amountA, tokenB, amountB) {
    if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
        return {
            token0: tokenA,
            token1: tokenB,
            amount0: BigInt(amountA),
            amount1: BigInt(amountB),
        };
    }
    return {
        token0: tokenB,
        token1: tokenA,
        amount0: BigInt(amountB),
        amount1: BigInt(amountA),
    };
}

export function getTickSpotDriftBps(referenceTick, currentTick) {
    if (referenceTick === undefined || referenceTick === null) return 0;
    const reference = Number(referenceTick);
    const current = Number(currentTick ?? 0);
    if (!Number.isFinite(reference) || !Number.isFinite(current)) return 0;

    const ratio = Math.pow(1.0001, current - reference);
    return Math.round(Math.abs(ratio - 1) * 10_000);
}

export function isSpotDriftPaused(referenceTick, currentTick, maxDriftBps = ROUND2_MAX_SPOT_DRIFT_BPS) {
    return getTickSpotDriftBps(referenceTick, currentTick) > Number(maxDriftBps);
}
