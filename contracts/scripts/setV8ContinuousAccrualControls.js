/**
 * Set V8 continuous-accrual controls through the Avalanche treasury Safe.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... DEPLOYMENT_KEY=avalanche \
 *     CONTINUOUS_MINT_PAUSED=false BUYBACK_PAUSED=true LP_SUPPORT_PAUSED=true MINT_SPREAD_BPS=-500 \
 *     npx hardhat run scripts/setV8ContinuousAccrualControls.js --network avalanche
 *
 * Optional:
 *   EXECUTE=false
 */
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

const OPERATION_CALL = 0;
const GOVERNANCE_ROLE = ethers.id("GOVERNANCE_ROLE");
const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)",
];

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function optionalAddress(name) {
  const value = process.env[name];
  if (value === undefined || value === "") return undefined;
  if (!ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function parseBool(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function parseIntEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return BigInt(fallback);
  if (!/^-?\d+$/.test(value)) throw new Error(`${name} must be an integer`);
  return BigInt(value);
}

function prevalidatedSignature(owner) {
  const r = ethers.zeroPadValue(owner, 32);
  const s = ethers.ZeroHash;
  return `${r}${s.slice(2)}01`;
}

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

function loadDeployments() {
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) return { deploymentsPath, deployments: {} };
  return {
    deploymentsPath,
    deployments: JSON.parse(fs.readFileSync(deploymentsPath, "utf8")),
  };
}

async function readControls(fund) {
  return {
    continuousMintPaused: await fund.continuousMintPaused(),
    buybackPaused: await fund.buybackPaused(),
    lpSupportPaused: await fund.lpSupportPaused(),
    mintSpreadBps: (await fund.mintSpreadBps()).toString(),
    redemptionsPermanentlyDisabled: await fund.redemptionsPermanentlyDisabled(),
  };
}

async function main() {
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const safeAddress = requireAddress("SAFE_ADDRESS");
  const deploymentKey = process.env.DEPLOYMENT_KEY || "avalanche";
  const { deploymentsPath, deployments } = loadDeployments();
  const deployment = deployments[deploymentKey] || {};
  const proxy = optionalAddress("FUND_PROXY_ADDRESS") || ethers.getAddress(deployment.proxy);

  const nextControls = {
    continuousMintPaused: parseBool("CONTINUOUS_MINT_PAUSED", false),
    buybackPaused: parseBool("BUYBACK_PAUSED", true),
    lpSupportPaused: parseBool("LP_SUPPORT_PAUSED", true),
    mintSpreadBps: parseIntEnv("MINT_SPREAD_BPS", -500),
  };
  if (nextControls.mintSpreadBps <= -10_000n) throw new Error("MINT_SPREAD_BPS must be greater than -10000");

  const shouldExecute = process.env.EXECUTE !== "false";
  const fund = await ethers.getContractAt("GemMintStrategyFundV8", proxy, signer);
  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }
  if (!(await fund.hasRole(GOVERNANCE_ROLE, safeAddress))) {
    throw new Error(`Safe ${safeAddress} does not hold GOVERNANCE_ROLE on ${proxy}`);
  }

  const before = await readControls(fund);
  const data = fund.interface.encodeFunctionData("setContinuousAccrualControls", [
    nextControls.continuousMintPaused,
    nextControls.buybackPaused,
    nextControls.lpSupportPaused,
    nextControls.mintSpreadBps,
  ]);
  await ethers.provider.call({ from: safeAddress, to: proxy, data });

  console.log("Setting V8 continuous-accrual controls");
  console.log("  Network        :", hre.network.name);
  console.log("  Proxy          :", proxy);
  console.log("  Safe           :", safeAddress);
  console.log("  Signer         :", signerAddress);
  console.log("  Before         :", JSON.stringify(before));
  console.log("  Next           :", JSON.stringify({
    ...nextControls,
    mintSpreadBps: nextControls.mintSpreadBps.toString(),
  }));

  if (!shouldExecute) {
    console.log("  EXECUTE=false; skipping Safe transaction.");
    return;
  }

  const nonce = await safe.nonce();
  console.log("  Safe nonce     :", nonce.toString());
  const tx = await safe.execTransaction(
    proxy,
    0,
    data,
    OPERATION_CALL,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    prevalidatedSignature(signerAddress),
  );
  console.log("  Tx             :", tx.hash);
  const receipt = await tx.wait();
  const after = await readControls(fund);
  console.log("  Confirmed block:", receipt.blockNumber);
  console.log("  After          :", JSON.stringify(after));

  deployments[deploymentKey] = {
    ...deployment,
    lastContinuousAccrualControlsUpdate: {
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      tx: tx.hash,
      safe: safeAddress,
      controls: after,
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
