/**
 * Execute Gengar sale LP support on Pharaoh only.
 *
 * OP=status:
 *   Read live accounting, controls, balances, and Joe quotes.
 *
 * OP=release-swap:
 *   Temporarily unpause LP support, release the accrued USDC support budget
 *   to the Avalanche Safe, restore the previous LP pause state, then split
 *   the USDC into WAVAX and CATCH through Trader Joe.
 *
 * OP=mint:
 *   Mint a Pharaoh CL position from the new WAVAX/CATCH balances only. Pass
 *   BASE_CATCH_RAW and BASE_WAVAX_RAW from the pre-release status output.
 */
const hre = require("hardhat");
const { ethers } = hre;

const OPERATION_CALL = 0;
const OPERATION_DELEGATECALL = 1;

const SAFE = "0x39971795266a794a8156271729A07994952a6FAD";
const FUND_PROXY = "0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f";
const AVALANCHE_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const CATCH_ADDRESS = FUND_PROXY;
const WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const LEGACY_JOE_ROUTER = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const PHARAOH_POSITION_MANAGER = "0x0B4478e810D48B5882D4019D435A2f864Bab4F39";
const PHARAOH_POOL = "0x1D4Cf678129cdDF63fBc31ca58cB24048955651f";
const SAFE_MULTISEND_CALL_ONLY = "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D";

const LP_SUPPORT_RAW = 13_500_000n;
const PHARAOH_WIDE_RANGE_TICK_OFFSET = 13_864;
const DEFAULT_SWAP_SLIPPAGE_BPS = 500n;
const DEFAULT_MINT_SLIPPAGE_BPS = 3_000n;
const BPS_DENOMINATOR = 10_000n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)",
];

const FUND_ABI = [
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function continuousMintPaused() view returns (bool)",
  "function buybackPaused() view returns (bool)",
  "function lpSupportPaused() view returns (bool)",
  "function mintSpreadBps() view returns (int256)",
  "function lpSupportAccruedUsdt6() view returns (uint256)",
  "function lpVenueCustodyMode(address venue) view returns (uint8)",
  "function setContinuousAccrualControls(bool continuousMintPaused,bool buybackPaused,bool lpSupportPaused,int256 mintSpreadBps)",
  "function releaseLpSupportToken(address token,address to,uint256 amountUsdt6,uint256 tokenAmount,bytes32 proofHash)",
];

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];

const LEGACY_JOE_ROUTER_ABI = [
  "function getAmountsOut(uint256 amountIn,address[] path) view returns (uint256[] amounts)",
  "function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline) returns (uint256[] amounts)",
];

const PHARAOH_POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)",
  "function tickSpacing() view returns (int24)",
];

const PHARAOH_POSITION_MANAGER_ABI = [
  "function mint((address token0,address token1,int24 tickSpacing,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline) params) payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)",
];

const MULTISEND_ABI = [
  "function multiSend(bytes transactions)",
];

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

function requireUintEnv(name) {
  const value = process.env[name];
  if (!/^\d+$/.test(String(value || ""))) throw new Error(`${name} must be an integer string`);
  return BigInt(value);
}

function uintEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be uint`);
  return BigInt(value);
}

function applySlippage(value, slippageBps) {
  return (value * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
}

function deadline() {
  return BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
}

function alignTickDown(tick, spacing) {
  return Math.floor(Number(tick) / spacing) * spacing;
}

function alignTickUp(tick, spacing) {
  return Math.ceil(Number(tick) / spacing) * spacing;
}

function getPharaohWideTicks(currentTick, spacing) {
  const tick = Number(currentTick);
  return {
    lower: alignTickDown(tick - PHARAOH_WIDE_RANGE_TICK_OFFSET, spacing),
    upper: alignTickUp(tick + PHARAOH_WIDE_RANGE_TICK_OFFSET, spacing),
  };
}

function sortTokenAmounts(tokenA, amountA, tokenB, amountB) {
  if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
    return { token0: tokenA, token1: tokenB, amount0: amountA, amount1: amountB };
  }
  return { token0: tokenB, token1: tokenA, amount0: amountB, amount1: amountA };
}

function encodeMultiSendTx({ operation = OPERATION_CALL, to, value = 0n, data = "0x" }) {
  return ethers.solidityPacked(
    ["uint8", "address", "uint256", "uint256", "bytes"],
    [operation, to, value, BigInt((data.length - 2) / 2), data]
  );
}

function prevalidatedSignature(owner) {
  const r = ethers.zeroPadValue(owner, 32);
  const s = ethers.ZeroHash;
  return `${r}${s.slice(2)}01`;
}

async function assertSafeOwner(safe, signerAddress) {
  const [owners, threshold] = await Promise.all([safe.getOwners(), safe.getThreshold()]);
  console.log("Safe owners    :", owners.join(", "));
  console.log("Threshold      :", threshold.toString());
  console.log("Signer         :", signerAddress);
  if (threshold !== 1n) throw new Error(`Expected 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) throw new Error("Signer is not a Safe owner");
}

async function executeSafeMultiSend({ safe, signerAddress, transactions, label }) {
  const multiSend = new ethers.Interface(MULTISEND_ABI);
  const data = multiSend.encodeFunctionData("multiSend", [ethers.concat(transactions)]);
  const args = [
    SAFE_MULTISEND_CALL_ONLY,
    0n,
    data,
    OPERATION_DELEGATECALL,
    0,
    0,
    0,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    prevalidatedSignature(signerAddress),
  ];

  const nonce = await safe.nonce();
  console.log(`${label}: Safe nonce ${nonce.toString()}`);
  await safe.execTransaction.staticCall(...args);
  console.log(`${label}: simulation ok`);
  const tx = await safe.execTransaction(...args);
  console.log(`${label}: submitted ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`${label}: confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

async function readStatus({ fund, usdc, catchToken, wavax, joe, pool }) {
  const safeAddress = SAFE;
  const controls = {
    continuousMintPaused: await fund.continuousMintPaused(),
    buybackPaused: await fund.buybackPaused(),
    lpSupportPaused: await fund.lpSupportPaused(),
    mintSpreadBps: await fund.mintSpreadBps(),
  };
  const [lpAccrued, custodyMode, safeUsdc, fundUsdc, safeCatch, safeWavax, usdcJoeAllowance, catchPmAllowance, wavaxPmAllowance] = await Promise.all([
    fund.lpSupportAccruedUsdt6(),
    fund.lpVenueCustodyMode(PHARAOH_POOL),
    usdc.balanceOf(safeAddress),
    usdc.balanceOf(FUND_PROXY),
    catchToken.balanceOf(safeAddress),
    wavax.balanceOf(safeAddress),
    usdc.allowance(safeAddress, LEGACY_JOE_ROUTER),
    catchToken.allowance(safeAddress, PHARAOH_POSITION_MANAGER),
    wavax.allowance(safeAddress, PHARAOH_POSITION_MANAGER),
  ]);
  const half = LP_SUPPORT_RAW / 2n;
  const otherHalf = LP_SUPPORT_RAW - half;
  const [wavaxQuote, catchQuote] = await Promise.all([
    joe.getAmountsOut(half, [AVALANCHE_USDC, WAVAX_ADDRESS]),
    joe.getAmountsOut(otherHalf, [AVALANCHE_USDC, WAVAX_ADDRESS, CATCH_ADDRESS]),
  ]);
  const [slot0, tickSpacing] = await Promise.all([pool.slot0(), pool.tickSpacing()]);
  const ticks = getPharaohWideTicks(slot0.tick, Number(tickSpacing));

  console.log("Controls      :", {
    continuousMintPaused: controls.continuousMintPaused,
    buybackPaused: controls.buybackPaused,
    lpSupportPaused: controls.lpSupportPaused,
    mintSpreadBps: controls.mintSpreadBps.toString(),
  });
  console.log("LP accrued    :", ethers.formatUnits(lpAccrued, 6), "USDC");
  console.log("Pharaoh mode  :", custodyMode.toString());
  console.log("Safe USDC     :", ethers.formatUnits(safeUsdc, 6));
  console.log("Fund USDC     :", ethers.formatUnits(fundUsdc, 6));
  console.log("Safe CATCH raw:", safeCatch.toString());
  console.log("Safe CATCH    :", ethers.formatEther(safeCatch));
  console.log("Safe WAVAX raw:", safeWavax.toString());
  console.log("Safe WAVAX    :", ethers.formatEther(safeWavax));
  console.log("USDC->Joe     :", usdcJoeAllowance.toString());
  console.log("CATCH->PM     :", catchPmAllowance.toString());
  console.log("WAVAX->PM     :", wavaxPmAllowance.toString());
  console.log("USDC->WAVAX   :", ethers.formatUnits(half, 6), "->", ethers.formatEther(wavaxQuote[1]));
  console.log("USDC->CATCH   :", ethers.formatUnits(otherHalf, 6), "->", ethers.formatEther(catchQuote[2]));
  console.log("Pharaoh tick  :", slot0.tick.toString());
  console.log("Pharaoh range :", ticks.lower, "to", ticks.upper);

  return { controls, lpAccrued, custodyMode, safeCatch, safeWavax, wavaxQuote, catchQuote, tickSpacing, ticks };
}

async function main() {
  const op = (process.env.OP || "status").toLowerCase();
  if (!["status", "release-swap", "mint"].includes(op)) {
    throw new Error("OP must be status, release-swap, or mint");
  }

  const runner = op === "status" ? ethers.provider : (await ethers.getSigners())[0];
  if (!runner) throw new Error("No signer configured. Set LEDGER_ADDRESS.");
  const signerAddress = op === "status" ? undefined : await runner.getAddress();

  const safe = new ethers.Contract(SAFE, SAFE_ABI, runner);
  const fund = new ethers.Contract(FUND_PROXY, FUND_ABI, runner);
  const usdc = new ethers.Contract(AVALANCHE_USDC, ERC20_ABI, runner);
  const catchToken = new ethers.Contract(CATCH_ADDRESS, ERC20_ABI, runner);
  const wavax = new ethers.Contract(WAVAX_ADDRESS, ERC20_ABI, runner);
  const joe = new ethers.Contract(LEGACY_JOE_ROUTER, LEGACY_JOE_ROUTER_ABI, runner);
  const pool = new ethers.Contract(PHARAOH_POOL, PHARAOH_POOL_ABI, runner);
  const positionManager = new ethers.Interface(PHARAOH_POSITION_MANAGER_ABI);
  const fundIface = new ethers.Interface(FUND_ABI);
  const erc20Iface = new ethers.Interface(ERC20_ABI);
  const joeIface = new ethers.Interface(LEGACY_JOE_ROUTER_ABI);

  console.log("Network       :", hre.network.name);
  console.log("Safe          :", SAFE);
  console.log("Fund          :", FUND_PROXY);
  console.log("Pharaoh pool  :", PHARAOH_POOL);
  const status = await readStatus({ fund, usdc, catchToken, wavax, joe, pool });
  if (op === "status") return;

  await assertSafeOwner(safe, signerAddress);
  const [safeIsManager, safeIsGovernance] = await Promise.all([
    fund.hasRole(ethers.id("MANAGER_ROLE"), SAFE),
    fund.hasRole(ethers.id("GOVERNANCE_ROLE"), SAFE),
  ]);
  if (!safeIsManager) throw new Error("Safe does not have MANAGER_ROLE");
  if (!safeIsGovernance) throw new Error("Safe does not have GOVERNANCE_ROLE");

  if (op === "release-swap") {
    if (status.lpAccrued < LP_SUPPORT_RAW) throw new Error("LP support accrued is below required release amount");
    if (status.custodyMode !== 1n) throw new Error("Pharaoh custody mode is not 1");

    const swapSlippageBps = uintEnv("SWAP_SLIPPAGE_BPS", DEFAULT_SWAP_SLIPPAGE_BPS.toString());
    const wavaxSide = LP_SUPPORT_RAW / 2n;
    const catchSide = LP_SUPPORT_RAW - wavaxSide;
    const wavaxMin = applySlippage(status.wavaxQuote[1], swapSlippageBps);
    const catchMin = applySlippage(status.catchQuote[2], swapSlippageBps);
    const proofHash = ethers.id("gengar-sale-pharaoh-lp-release");
    const restoreLpPaused = status.controls.lpSupportPaused;
    const txDeadline = deadline();

    const transactions = [
      encodeMultiSendTx({
        to: FUND_PROXY,
        data: fundIface.encodeFunctionData("setContinuousAccrualControls", [
          status.controls.continuousMintPaused,
          status.controls.buybackPaused,
          false,
          status.controls.mintSpreadBps,
        ]),
      }),
      encodeMultiSendTx({
        to: FUND_PROXY,
        data: fundIface.encodeFunctionData("releaseLpSupportToken", [
          AVALANCHE_USDC,
          SAFE,
          LP_SUPPORT_RAW,
          LP_SUPPORT_RAW,
          proofHash,
        ]),
      }),
      encodeMultiSendTx({
        to: FUND_PROXY,
        data: fundIface.encodeFunctionData("setContinuousAccrualControls", [
          status.controls.continuousMintPaused,
          status.controls.buybackPaused,
          restoreLpPaused,
          status.controls.mintSpreadBps,
        ]),
      }),
      encodeMultiSendTx({
        to: AVALANCHE_USDC,
        data: erc20Iface.encodeFunctionData("approve", [LEGACY_JOE_ROUTER, LP_SUPPORT_RAW]),
      }),
      encodeMultiSendTx({
        to: LEGACY_JOE_ROUTER,
        data: joeIface.encodeFunctionData("swapExactTokensForTokens", [
          wavaxSide,
          wavaxMin,
          [AVALANCHE_USDC, WAVAX_ADDRESS],
          SAFE,
          txDeadline,
        ]),
      }),
      encodeMultiSendTx({
        to: LEGACY_JOE_ROUTER,
        data: joeIface.encodeFunctionData("swapExactTokensForTokens", [
          catchSide,
          catchMin,
          [AVALANCHE_USDC, WAVAX_ADDRESS, CATCH_ADDRESS],
          SAFE,
          txDeadline,
        ]),
      }),
      encodeMultiSendTx({
        to: AVALANCHE_USDC,
        data: erc20Iface.encodeFunctionData("approve", [LEGACY_JOE_ROUTER, 0n]),
      }),
    ];

    console.log("Release       :", ethers.formatUnits(LP_SUPPORT_RAW, 6), "USDC");
    console.log("Swap half     :", ethers.formatUnits(wavaxSide, 6), "USDC -> min", ethers.formatEther(wavaxMin), "WAVAX");
    console.log("Swap half     :", ethers.formatUnits(catchSide, 6), "USDC -> min", ethers.formatEther(catchMin), "CATCH");
    await executeSafeMultiSend({ safe, signerAddress, transactions, label: "Release and swap Pharaoh LP support" });
    return;
  }

  if (op === "mint") {
    const baseCatch = requireUintEnv("BASE_CATCH_RAW");
    const baseWavax = requireUintEnv("BASE_WAVAX_RAW");
    if (status.safeCatch <= baseCatch) throw new Error("No new CATCH balance above BASE_CATCH_RAW");
    if (status.safeWavax <= baseWavax) throw new Error("No new WAVAX balance above BASE_WAVAX_RAW");

    const catchAmount = status.safeCatch - baseCatch;
    const wavaxAmount = status.safeWavax - baseWavax;
    const mintSlippageBps = uintEnv("MINT_SLIPPAGE_BPS", DEFAULT_MINT_SLIPPAGE_BPS.toString());
    const sorted = sortTokenAmounts(CATCH_ADDRESS, catchAmount, WAVAX_ADDRESS, wavaxAmount);
    const minimum = {
      amount0: applySlippage(sorted.amount0, mintSlippageBps),
      amount1: applySlippage(sorted.amount1, mintSlippageBps),
    };
    const txDeadline = deadline();

    const transactions = [
      encodeMultiSendTx({
        to: CATCH_ADDRESS,
        data: erc20Iface.encodeFunctionData("approve", [PHARAOH_POSITION_MANAGER, catchAmount]),
      }),
      encodeMultiSendTx({
        to: WAVAX_ADDRESS,
        data: erc20Iface.encodeFunctionData("approve", [PHARAOH_POSITION_MANAGER, wavaxAmount]),
      }),
      encodeMultiSendTx({
        to: PHARAOH_POSITION_MANAGER,
        data: positionManager.encodeFunctionData("mint", [{
          token0: sorted.token0,
          token1: sorted.token1,
          tickSpacing: Number(status.tickSpacing),
          tickLower: status.ticks.lower,
          tickUpper: status.ticks.upper,
          amount0Desired: sorted.amount0,
          amount1Desired: sorted.amount1,
          amount0Min: minimum.amount0,
          amount1Min: minimum.amount1,
          recipient: SAFE,
          deadline: txDeadline,
        }]),
      }),
      encodeMultiSendTx({
        to: CATCH_ADDRESS,
        data: erc20Iface.encodeFunctionData("approve", [PHARAOH_POSITION_MANAGER, 0n]),
      }),
      encodeMultiSendTx({
        to: WAVAX_ADDRESS,
        data: erc20Iface.encodeFunctionData("approve", [PHARAOH_POSITION_MANAGER, 0n]),
      }),
    ];

    console.log("Mint CATCH    :", ethers.formatEther(catchAmount));
    console.log("Mint WAVAX    :", ethers.formatEther(wavaxAmount));
    console.log("Mint range    :", status.ticks.lower, "to", status.ticks.upper);
    await executeSafeMultiSend({ safe, signerAddress, transactions, label: "Mint Pharaoh LP support position" });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
