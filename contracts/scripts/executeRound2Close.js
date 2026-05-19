/**
 * Execute Round 2 close operations through the 1/1 Avalanche treasury Safe.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... OP=finalize npm --prefix contracts exec hardhat -- run scripts/executeRound2Close.js --network avalanche
 *   LEDGER_ADDRESS=0x... OP=withdraw npm --prefix contracts exec hardhat -- run scripts/executeRound2Close.js --network avalanche
 *   LEDGER_ADDRESS=0x... OP=team npm --prefix contracts exec hardhat -- run scripts/executeRound2Close.js --network avalanche
 *
 * Read-only preview:
 *   OP=status npm --prefix contracts exec hardhat -- run scripts/executeRound2Close.js --network avalanche
 */
const hre = require("hardhat");
const { ethers } = hre;

const OPERATION_CALL = 0;
const OPERATION_DELEGATECALL = 1;
const ROUND2_ID = 2n;
const BPS_DENOMINATOR = 10_000n;
const ROUTING_BPS = 1_500n;
const TEAM_BPS = 500n;

const DEFAULT_FUND_PROXY = "0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f";
const DEFAULT_SAFE = "0x39971795266a794a8156271729A07994952a6FAD";
const DEFAULT_TEAM = "0x5cA0A679025B6c7dA08a70be3b244399fF0D7813";
const ROUND2_WITHDRAWAL_REASON = "Round 2 post-raise routing bucket";
const CATCH_ADDRESS = DEFAULT_FUND_PROXY;
const WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const LEGACY_JOE_ROUTER = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const PHARAOH_SWAP_ROUTER = "0xc8B8fCbDb5C019D7802fFb0b39603395D7d3915c";
const PHARAOH_POSITION_MANAGER = "0x0B4478e810D48B5882D4019D435A2f864Bab4F39";
const PHARAOH_POOL = "0x1D4Cf678129cdDF63fBc31ca58cB24048955651f";
const PHARAOH_WIDE_RANGE_TICK_OFFSET = 13_864;
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const SAFE_MULTISEND_CALL_ONLY = "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D";
const DEFAULT_SLIPPAGE_BPS = 300n;
const DEFAULT_ADD_LIQUIDITY_SLIPPAGE_BPS = 1_000n;

const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)",
];

const FUND_ABI = [
  "function getRound(uint256) view returns ((uint256 roundId,uint256 targetAmount,uint256 raisedAmount,uint256 tokenPrice,uint256 minInvestment,uint256 maxInvestment,uint256 startTime,uint256 endTime,bool isActive,bool isFinalized))",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function finalizeRound(uint256 roundId)",
  "function withdrawFromTreasury(address to,uint256 amount,string reason)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];

const WAVAX_ABI = [
  ...ERC20_ABI,
  "function deposit() payable",
];

const LEGACY_JOE_ROUTER_ABI = [
  "function getAmountsOut(uint256 amountIn,address[] path) view returns (uint256[] amounts)",
  "function swapExactAVAXForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable returns (uint256[] amounts)",
  "function addLiquidityAVAX(address token,uint256 amountTokenDesired,uint256 amountTokenMin,uint256 amountAVAXMin,address to,uint256 deadline) payable returns (uint256 amountToken,uint256 amountAVAX,uint256 liquidity)",
];

const MULTISEND_ABI = [
  "function multiSend(bytes transactions)",
];

const PHARAOH_POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)",
  "function fee() view returns (uint24)",
  "function tickSpacing() view returns (int24)",
];

const PHARAOH_SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,int24 tickSpacing,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
];

const PHARAOH_POSITION_MANAGER_ABI = [
  "function mint((address token0,address token1,int24 tickSpacing,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline) params) payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)",
];

function optionalAddress(name, fallback) {
  const value = process.env[name] || fallback;
  if (!ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

function formatAvax(value) {
  return `${ethers.formatEther(value)} AVAX`;
}

function bps(value, basisPoints) {
  return (value * basisPoints) / BPS_DENOMINATOR;
}

function applySlippage(value, slippageBps) {
  return bps(value, BPS_DENOMINATOR - slippageBps);
}

function parseAvaxEnv(name, fallback) {
  return ethers.parseEther(process.env[name] || fallback);
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

function spotTokenOutFromTick(amountWavax, tick, slippageBps) {
  const amount = Number(ethers.formatEther(amountWavax));
  const wavaxPerCatch = Math.pow(1.0001, Number(tick));
  if (!Number.isFinite(amount) || !Number.isFinite(wavaxPerCatch) || wavaxPerCatch <= 0) {
    throw new Error("Invalid Pharaoh spot estimate");
  }
  const catchOut = amount / wavaxPerCatch;
  const scaled = catchOut * Number(BPS_DENOMINATOR - slippageBps) / Number(BPS_DENOMINATOR);
  return ethers.parseEther(scaled.toFixed(18));
}

function sortTokenAmounts(tokenA, amountA, tokenB, amountB) {
  if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
    return { token0: tokenA, token1: tokenB, amount0: amountA, amount1: amountB };
  }
  return { token0: tokenB, token1: tokenA, amount0: amountB, amount1: amountA };
}

function prevalidatedSignature(owner) {
  const r = ethers.zeroPadValue(owner, 32);
  const s = ethers.ZeroHash;
  return `${r}${s.slice(2)}01`;
}

async function loadSignerIfNeeded(op) {
  if (op === "status") return undefined;
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS.");
  return signer;
}

async function assertSafeOwner({ safe, signerAddress }) {
  const [owners, threshold] = await Promise.all([safe.getOwners(), safe.getThreshold()]);
  console.log("Safe          :", await safe.getAddress());
  console.log("Safe owners   :", owners.join(", "));
  console.log("Safe threshold:", threshold.toString());
  console.log("Signer        :", signerAddress);

  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }
}

function encodeMultiSendTx({ operation = OPERATION_CALL, to, value = 0n, data = "0x" }) {
  return ethers.solidityPacked(
    ["uint8", "address", "uint256", "uint256", "bytes"],
    [operation, to, value, BigInt((data.length - 2) / 2), data]
  );
}

async function executeSafeCall({ safe, signerAddress, to, value = 0n, data = "0x", operation = OPERATION_CALL, label }) {
  const nonce = await safe.nonce();
  console.log(`${label}: Safe nonce ${nonce.toString()}`);

  const args = [
    to,
    value,
    data,
    operation,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    prevalidatedSignature(signerAddress),
  ];

  await safe.execTransaction.staticCall(...args);
  const tx = await safe.execTransaction(...args);
  console.log(`${label}: submitted ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`${label}: confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

async function main() {
  const op = (process.env.OP || "status").toLowerCase();
  if (!["status", "finalize", "withdraw", "team", "lfj-swap", "lfj-approve", "lfj-add", "lfj-batch", "pharaoh-swap-batch", "pharaoh-mint", "pharaoh-batch"].includes(op)) {
    throw new Error("OP must be one of: status, finalize, withdraw, team, lfj-swap, lfj-approve, lfj-add, lfj-batch, pharaoh-swap-batch, pharaoh-mint, pharaoh-batch");
  }

  const fundAddress = optionalAddress("FUND_PROXY_ADDRESS", DEFAULT_FUND_PROXY);
  const safeAddress = optionalAddress("SAFE_ADDRESS", DEFAULT_SAFE);
  const teamAddress = optionalAddress("TEAM_WALLET_ADDRESS", DEFAULT_TEAM);

  const signer = await loadSignerIfNeeded(op);
  const runner = signer || ethers.provider;
  const signerAddress = signer ? await signer.getAddress() : undefined;
  const safe = new ethers.Contract(safeAddress, SAFE_ABI, runner);
  const fund = new ethers.Contract(fundAddress, FUND_ABI, runner);
  const catchToken = new ethers.Contract(CATCH_ADDRESS, ERC20_ABI, runner);
  const wavaxToken = new ethers.Contract(WAVAX_ADDRESS, ERC20_ABI, runner);
  const joeRouter = new ethers.Contract(LEGACY_JOE_ROUTER, LEGACY_JOE_ROUTER_ABI, runner);
  const pharaohPool = new ethers.Contract(PHARAOH_POOL, PHARAOH_POOL_ABI, runner);
  const iface = new ethers.Interface(FUND_ABI);
  const erc20Interface = new ethers.Interface(ERC20_ABI);
  const wavaxInterface = new ethers.Interface(WAVAX_ABI);
  const joeInterface = new ethers.Interface(LEGACY_JOE_ROUTER_ABI);
  const multiSendInterface = new ethers.Interface(MULTISEND_ABI);
  const pharaohSwapInterface = new ethers.Interface(PHARAOH_SWAP_ROUTER_ABI);
  const pharaohPositionInterface = new ethers.Interface(PHARAOH_POSITION_MANAGER_ABI);

  const [round, fundBalance, safeBalance, teamBalance] = await Promise.all([
    fund.getRound(ROUND2_ID),
    ethers.provider.getBalance(fundAddress),
    ethers.provider.getBalance(safeAddress),
    ethers.provider.getBalance(teamAddress),
  ]);
  const [safeCatchBalance, safeWavaxBalance, joeCatchAllowance, pharaohSlot0, pharaohFee, pharaohTickSpacing] = await Promise.all([
    catchToken.balanceOf(safeAddress),
    wavaxToken.balanceOf(safeAddress),
    catchToken.allowance(safeAddress, LEGACY_JOE_ROUTER),
    pharaohPool.slot0(),
    pharaohPool.fee(),
    pharaohPool.tickSpacing(),
  ]);

  const routingBucket = bps(round.raisedAmount, ROUTING_BPS);
  const teamAllocation = bps(round.raisedAmount, TEAM_BPS);
  const lfjBudget = bps(round.raisedAmount, 500n);
  const pharaohBudget = bps(round.raisedAmount, 500n);
  const lfjTranche = parseAvaxEnv("TRANCHE_AVAX", "1");
  const lfjSwapAmount = lfjTranche / 2n;
  const lfjPairAvax = lfjTranche - lfjSwapAmount;
  const lfjQuote = lfjSwapAmount > 0n
    ? await joeRouter.getAmountsOut(lfjSwapAmount, [WAVAX_ADDRESS, CATCH_ADDRESS]).catch(() => undefined)
    : undefined;
  const pharaohTranche = parseAvaxEnv("PHARAOH_TRANCHE_AVAX", process.env.TRANCHE_AVAX || "1");
  const pharaohSwapWavax = pharaohTranche / 2n;
  const pharaohPairWavax = pharaohTranche - pharaohSwapWavax;
  const pharaohSwapSlippageBps = BigInt(process.env.PHARAOH_SWAP_SLIPPAGE_BPS || "1500");
  const pharaohCatchDesired = spotTokenOutFromTick(pharaohSwapWavax, pharaohSlot0.tick, pharaohSwapSlippageBps);
  const pharaohTicks = getPharaohWideTicks(pharaohSlot0.tick, Number(pharaohTickSpacing));

  console.log("Network       :", hre.network.name);
  console.log("Fund          :", fundAddress);
  console.log("Safe          :", safeAddress);
  console.log("Team wallet   :", teamAddress);
  console.log("Round 2 raised:", formatAvax(round.raisedAmount));
  console.log("Round 2 end   :", new Date(Number(round.endTime) * 1000).toISOString());
  console.log("Round active  :", round.isActive);
  console.log("Round finalized:", round.isFinalized);
  console.log("Fund balance  :", formatAvax(fundBalance));
  console.log("Safe balance  :", formatAvax(safeBalance));
  console.log("Team balance  :", formatAvax(teamBalance));
  console.log("Routing bucket:", formatAvax(routingBucket));
  console.log("Team allocation:", formatAvax(teamAllocation));
  console.log("LFJ budget    :", formatAvax(lfjBudget));
  console.log("Pharaoh budget:", formatAvax(pharaohBudget));
  console.log("LFJ tranche   :", formatAvax(lfjTranche));
  console.log("Pharaoh tranche:", formatAvax(pharaohTranche));
  console.log("Safe CATCH    :", ethers.formatEther(safeCatchBalance));
  console.log("Safe WAVAX    :", ethers.formatEther(safeWavaxBalance));
  console.log("Joe allowance :", ethers.formatEther(joeCatchAllowance));
  if (lfjQuote) {
    console.log("LFJ quote     :", `${formatAvax(lfjSwapAmount)} -> ${ethers.formatEther(lfjQuote[1])} CATCH`);
  }
  console.log("Pharaoh tick  :", pharaohSlot0.tick.toString());
  console.log("Pharaoh fee   :", pharaohFee.toString());
  console.log("Pharaoh spacing:", pharaohTickSpacing.toString());
  console.log("Pharaoh min   :", `${formatAvax(pharaohSwapWavax)} -> ${ethers.formatEther(pharaohCatchDesired)} CATCH`);

  if (op === "status") return;

  await assertSafeOwner({ safe, signerAddress });

  const managerRole = ethers.id("MANAGER_ROLE");
  const safeIsManager = await fund.hasRole(managerRole, safeAddress);
  if (!safeIsManager) throw new Error("Safe does not hold MANAGER_ROLE on the fund.");

  if (op === "finalize") {
    if (round.isFinalized) {
      console.log("Round 2 is already finalized; skipping.");
      return;
    }
    const data = iface.encodeFunctionData("finalizeRound", [ROUND2_ID]);
    await executeSafeCall({ safe, signerAddress, to: fundAddress, data, label: "Finalize Round 2" });
    return;
  }

  if (op === "withdraw") {
    if (!round.isFinalized) throw new Error("Round 2 is not finalized yet; run OP=finalize first.");
    if (fundBalance < routingBucket) {
      throw new Error(`Fund balance ${formatAvax(fundBalance)} is below routing bucket ${formatAvax(routingBucket)}.`);
    }
    const data = iface.encodeFunctionData("withdrawFromTreasury", [
      safeAddress,
      routingBucket,
      ROUND2_WITHDRAWAL_REASON,
    ]);
    await executeSafeCall({ safe, signerAddress, to: fundAddress, data, label: "Withdraw Round 2 routing bucket" });
    return;
  }

  if (op === "team") {
    if (!round.isFinalized) throw new Error("Round 2 is not finalized yet; run OP=finalize first.");
    if (safeBalance < teamAllocation) {
      throw new Error(`Safe balance ${formatAvax(safeBalance)} is below team allocation ${formatAvax(teamAllocation)}.`);
    }
    await executeSafeCall({
      safe,
      signerAddress,
      to: teamAddress,
      value: teamAllocation,
      label: "Send Round 2 team allocation",
    });
    return;
  }

  if (op === "lfj-swap") {
    if (!round.isFinalized) throw new Error("Round 2 is not finalized yet.");
    if (lfjTranche <= 0n || lfjTranche > lfjBudget) throw new Error("Invalid LFJ tranche amount.");
    if (!lfjQuote) throw new Error("LFJ quote is unavailable.");

    const slippageBps = BigInt(process.env.SLIPPAGE_BPS || DEFAULT_SLIPPAGE_BPS.toString());
    const amountOutMin = applySlippage(lfjQuote[1], slippageBps);
    const data = joeInterface.encodeFunctionData("swapExactAVAXForTokens", [
      amountOutMin,
      [WAVAX_ADDRESS, CATCH_ADDRESS],
      safeAddress,
      deadline(),
    ]);
    console.log("LFJ swap min  :", ethers.formatEther(amountOutMin), "CATCH");
    await executeSafeCall({
      safe,
      signerAddress,
      to: LEGACY_JOE_ROUTER,
      value: lfjSwapAmount,
      data,
      label: "LFJ swap tranche half",
    });
    return;
  }

  if (op === "lfj-approve") {
    const amount = process.env.CATCH_AMOUNT ? ethers.parseEther(process.env.CATCH_AMOUNT) : safeCatchBalance;
    if (amount <= 0n) throw new Error("No CATCH amount available to approve.");
    const data = erc20Interface.encodeFunctionData("approve", [LEGACY_JOE_ROUTER, amount]);
    await executeSafeCall({
      safe,
      signerAddress,
      to: CATCH_ADDRESS,
      data,
      label: "Approve CATCH for LFJ",
    });
    return;
  }

  if (op === "lfj-add") {
    const amountTokenDesired = process.env.CATCH_AMOUNT ? ethers.parseEther(process.env.CATCH_AMOUNT) : safeCatchBalance;
    if (amountTokenDesired <= 0n) throw new Error("No CATCH available for LFJ liquidity.");
    if (joeCatchAllowance < amountTokenDesired) throw new Error("Approve CATCH for LFJ before adding liquidity.");

    const addSlippageBps = BigInt(process.env.ADD_SLIPPAGE_BPS || DEFAULT_ADD_LIQUIDITY_SLIPPAGE_BPS.toString());
    const data = joeInterface.encodeFunctionData("addLiquidityAVAX", [
      CATCH_ADDRESS,
      amountTokenDesired,
      applySlippage(amountTokenDesired, addSlippageBps),
      applySlippage(lfjPairAvax, addSlippageBps),
      DEAD_ADDRESS,
      deadline(),
    ]);
    console.log("LFJ add token :", ethers.formatEther(amountTokenDesired), "CATCH");
    console.log("LFJ add AVAX  :", formatAvax(lfjPairAvax));
    await executeSafeCall({
      safe,
      signerAddress,
      to: LEGACY_JOE_ROUTER,
      value: lfjPairAvax,
      data,
      label: "Add LFJ liquidity and burn LP",
    });
    return;
  }

  if (op === "lfj-batch") {
    if (!round.isFinalized) throw new Error("Round 2 is not finalized yet.");
    if (lfjTranche <= 0n || lfjTranche > lfjBudget) throw new Error("Invalid LFJ tranche amount.");
    if (!lfjQuote) throw new Error("LFJ quote is unavailable.");

    const slippageBps = BigInt(process.env.SLIPPAGE_BPS || DEFAULT_SLIPPAGE_BPS.toString());
    const addSlippageBps = BigInt(process.env.ADD_SLIPPAGE_BPS || DEFAULT_ADD_LIQUIDITY_SLIPPAGE_BPS.toString());
    const amountOutMin = applySlippage(lfjQuote[1], slippageBps);
    const amountTokenDesired = process.env.CATCH_AMOUNT ? ethers.parseEther(process.env.CATCH_AMOUNT) : amountOutMin;

    const approveData = erc20Interface.encodeFunctionData("approve", [LEGACY_JOE_ROUTER, amountTokenDesired]);
    const swapData = joeInterface.encodeFunctionData("swapExactAVAXForTokens", [
      amountOutMin,
      [WAVAX_ADDRESS, CATCH_ADDRESS],
      safeAddress,
      deadline(),
    ]);
    const addData = joeInterface.encodeFunctionData("addLiquidityAVAX", [
      CATCH_ADDRESS,
      amountTokenDesired,
      applySlippage(amountTokenDesired, addSlippageBps),
      applySlippage(lfjPairAvax, addSlippageBps),
      DEAD_ADDRESS,
      deadline(),
    ]);
    const transactions = ethers.concat([
      encodeMultiSendTx({ to: CATCH_ADDRESS, data: approveData }),
      encodeMultiSendTx({ to: LEGACY_JOE_ROUTER, value: lfjSwapAmount, data: swapData }),
      encodeMultiSendTx({ to: LEGACY_JOE_ROUTER, value: lfjPairAvax, data: addData }),
    ]);
    const data = multiSendInterface.encodeFunctionData("multiSend", [transactions]);

    console.log("LFJ batch min :", ethers.formatEther(amountOutMin), "CATCH");
    console.log("LFJ batch add :", ethers.formatEther(amountTokenDesired), "CATCH");
    console.log("LFJ batch AVAX:", formatAvax(lfjTranche));
    await executeSafeCall({
      safe,
      signerAddress,
      to: SAFE_MULTISEND_CALL_ONLY,
      operation: OPERATION_DELEGATECALL,
      data,
      label: "LFJ batch swap/add/burn",
    });
    return;
  }

  if (op === "pharaoh-batch") {
    if (!round.isFinalized) throw new Error("Round 2 is not finalized yet.");
    if (pharaohTranche <= 0n || pharaohTranche > pharaohBudget) throw new Error("Invalid Pharaoh tranche amount.");
    const mintSlippageBps = BigInt(process.env.PHARAOH_MINT_SLIPPAGE_BPS || "3000");
    const catchDesired = process.env.PHARAOH_CATCH_AMOUNT
      ? ethers.parseEther(process.env.PHARAOH_CATCH_AMOUNT)
      : safeCatchBalance + pharaohCatchDesired;
    const sortedDesired = sortTokenAmounts(CATCH_ADDRESS, catchDesired, WAVAX_ADDRESS, pharaohPairWavax);
    const sortedMinimum = sortTokenAmounts(CATCH_ADDRESS, pharaohCatchDesired, WAVAX_ADDRESS, pharaohPairWavax);

    const wrapData = wavaxInterface.encodeFunctionData("deposit", []);
    const approveSwapData = erc20Interface.encodeFunctionData("approve", [PHARAOH_SWAP_ROUTER, pharaohSwapWavax]);
    const swapData = pharaohSwapInterface.encodeFunctionData("exactInputSingle", [{
      tokenIn: WAVAX_ADDRESS,
      tokenOut: CATCH_ADDRESS,
      tickSpacing: Number(pharaohTickSpacing),
      recipient: safeAddress,
      deadline: deadline(),
      amountIn: pharaohSwapWavax,
      amountOutMinimum: pharaohCatchDesired,
      sqrtPriceLimitX96: 0n,
    }]);
    const approveCatchData = erc20Interface.encodeFunctionData("approve", [PHARAOH_POSITION_MANAGER, catchDesired]);
    const approveWavaxData = erc20Interface.encodeFunctionData("approve", [PHARAOH_POSITION_MANAGER, pharaohPairWavax]);
    const mintData = pharaohPositionInterface.encodeFunctionData("mint", [{
      token0: sortedDesired.token0,
      token1: sortedDesired.token1,
      tickSpacing: Number(pharaohTickSpacing),
      tickLower: pharaohTicks.lower,
      tickUpper: pharaohTicks.upper,
      amount0Desired: sortedDesired.amount0,
      amount1Desired: sortedDesired.amount1,
      amount0Min: applySlippage(sortedMinimum.amount0, mintSlippageBps),
      amount1Min: applySlippage(sortedMinimum.amount1, mintSlippageBps),
      recipient: safeAddress,
      deadline: deadline(),
    }]);
    const transactions = ethers.concat([
      encodeMultiSendTx({ to: WAVAX_ADDRESS, value: pharaohTranche, data: wrapData }),
      encodeMultiSendTx({ to: WAVAX_ADDRESS, data: approveSwapData }),
      encodeMultiSendTx({ to: PHARAOH_SWAP_ROUTER, data: swapData }),
      encodeMultiSendTx({ to: CATCH_ADDRESS, data: approveCatchData }),
      encodeMultiSendTx({ to: WAVAX_ADDRESS, data: approveWavaxData }),
      encodeMultiSendTx({ to: PHARAOH_POSITION_MANAGER, data: mintData }),
    ]);
    const data = multiSendInterface.encodeFunctionData("multiSend", [transactions]);

    console.log("Pharaoh range :", pharaohTicks.lower, "to", pharaohTicks.upper);
    console.log("Pharaoh CATCH :", ethers.formatEther(catchDesired));
    console.log("Pharaoh min   :", ethers.formatEther(pharaohCatchDesired), "CATCH");
    console.log("Pharaoh WAVAX :", ethers.formatEther(pharaohPairWavax));
    await executeSafeCall({
      safe,
      signerAddress,
      to: SAFE_MULTISEND_CALL_ONLY,
      operation: OPERATION_DELEGATECALL,
      data,
      label: "Pharaoh batch wrap/swap/mint",
    });
    return;
  }

  if (op === "pharaoh-swap-batch") {
    if (!round.isFinalized) throw new Error("Round 2 is not finalized yet.");
    if (pharaohTranche <= 0n || pharaohTranche > pharaohBudget) throw new Error("Invalid Pharaoh tranche amount.");

    const wrapData = wavaxInterface.encodeFunctionData("deposit", []);
    const approveSwapData = erc20Interface.encodeFunctionData("approve", [PHARAOH_SWAP_ROUTER, pharaohSwapWavax]);
    const swapData = pharaohSwapInterface.encodeFunctionData("exactInputSingle", [{
      tokenIn: WAVAX_ADDRESS,
      tokenOut: CATCH_ADDRESS,
      tickSpacing: Number(pharaohTickSpacing),
      recipient: safeAddress,
      deadline: deadline(),
      amountIn: pharaohSwapWavax,
      amountOutMinimum: pharaohCatchDesired,
      sqrtPriceLimitX96: 0n,
    }]);
    const transactions = ethers.concat([
      encodeMultiSendTx({ to: WAVAX_ADDRESS, value: pharaohTranche, data: wrapData }),
      encodeMultiSendTx({ to: WAVAX_ADDRESS, data: approveSwapData }),
      encodeMultiSendTx({ to: PHARAOH_SWAP_ROUTER, data: swapData }),
    ]);
    const data = multiSendInterface.encodeFunctionData("multiSend", [transactions]);

    console.log("Pharaoh swap only CATCH min:", ethers.formatEther(pharaohCatchDesired));
    await executeSafeCall({
      safe,
      signerAddress,
      to: SAFE_MULTISEND_CALL_ONLY,
      operation: OPERATION_DELEGATECALL,
      data,
      label: "Pharaoh batch wrap/swap",
    });
    return;
  }

  if (op === "pharaoh-mint") {
    if (!round.isFinalized) throw new Error("Round 2 is not finalized yet.");
    const mintSlippageBps = BigInt(process.env.PHARAOH_MINT_SLIPPAGE_BPS || "3000");
    const catchAmount = process.env.PHARAOH_CATCH_AMOUNT ? ethers.parseEther(process.env.PHARAOH_CATCH_AMOUNT) : pharaohCatchDesired;
    const wavaxAmount = process.env.PHARAOH_WAVAX_AMOUNT ? ethers.parseEther(process.env.PHARAOH_WAVAX_AMOUNT) : pharaohPairWavax;
    if (safeCatchBalance < catchAmount) throw new Error("Safe CATCH balance is below Pharaoh mint amount.");
    if (safeWavaxBalance < wavaxAmount) throw new Error("Safe WAVAX balance is below Pharaoh mint amount.");
    const sorted = sortTokenAmounts(CATCH_ADDRESS, catchAmount, WAVAX_ADDRESS, wavaxAmount);

    const approveCatchData = erc20Interface.encodeFunctionData("approve", [PHARAOH_POSITION_MANAGER, catchAmount]);
    const approveWavaxData = erc20Interface.encodeFunctionData("approve", [PHARAOH_POSITION_MANAGER, wavaxAmount]);
    const mintData = pharaohPositionInterface.encodeFunctionData("mint", [{
      token0: sorted.token0,
      token1: sorted.token1,
      tickSpacing: Number(pharaohTickSpacing),
      tickLower: pharaohTicks.lower,
      tickUpper: pharaohTicks.upper,
      amount0Desired: sorted.amount0,
      amount1Desired: sorted.amount1,
      amount0Min: applySlippage(sorted.amount0, mintSlippageBps),
      amount1Min: applySlippage(sorted.amount1, mintSlippageBps),
      recipient: safeAddress,
      deadline: deadline(),
    }]);
    const transactions = ethers.concat([
      encodeMultiSendTx({ to: CATCH_ADDRESS, data: approveCatchData }),
      encodeMultiSendTx({ to: WAVAX_ADDRESS, data: approveWavaxData }),
      encodeMultiSendTx({ to: PHARAOH_POSITION_MANAGER, data: mintData }),
    ]);
    const data = multiSendInterface.encodeFunctionData("multiSend", [transactions]);

    console.log("Pharaoh mint range:", pharaohTicks.lower, "to", pharaohTicks.upper);
    console.log("Pharaoh mint CATCH:", ethers.formatEther(catchAmount));
    console.log("Pharaoh mint WAVAX:", ethers.formatEther(wavaxAmount));
    await executeSafeCall({
      safe,
      signerAddress,
      to: SAFE_MULTISEND_CALL_ONLY,
      operation: OPERATION_DELEGATECALL,
      data,
      label: "Pharaoh mint CL position",
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
