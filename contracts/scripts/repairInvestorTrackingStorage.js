/**
 * Repair the live GM10 fund proxy after the legacy storage repair left current
 * investor-tracking slots populated with stale legacy values.
 *
 * The temporary implementation:
 *   - recomputes totalRoundsCompleted from current round flags,
 *   - clears investorList.length,
 *   - clears totalInvestors,
 *   - returns the proxy to the current/final implementation.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... FUND_PROXY_ADDRESS=0x... \
 *     npx hardhat run scripts/repairInvestorTrackingStorage.js --network avalanche
 *
 * Optional:
 *   FINAL_IMPLEMENTATION_ADDRESS=0x...  Defaults to the live proxy implementation.
 *   REPAIR_IMPLEMENTATION_ADDRESS=0x... Reuse an already deployed repair implementation.
 *   DEPLOYMENT_KEY=avalanche            deployments.json key to update.
 */
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

const EIP170_LIMIT = 24576;
const OPERATION_CALL = 0;
const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)",
];

const CURRENT_TOTAL_ROUNDS_COMPLETED_SLOT = 14n;
const CURRENT_INVESTOR_LIST_SLOT = 18n;
const CURRENT_TOTAL_INVESTORS_SLOT = 19n;

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) {
    throw new Error(`${name} must be a valid address`);
  }
  return ethers.getAddress(value);
}

function optionalAddress(name) {
  const value = process.env[name];
  if (!value) return "";
  if (!ethers.isAddress(value)) throw new Error(`${name} must be a valid address`);
  return ethers.getAddress(value);
}

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

function prevalidatedSignature(owner) {
  const r = ethers.zeroPadValue(owner, 32);
  const s = ethers.ZeroHash;
  return `${r}${s.slice(2)}01`;
}

async function assertDeployableSize(contractName) {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const size = Math.max(0, ((artifact.deployedBytecode || "0x").length - 2) / 2);
  if (size > EIP170_LIMIT) {
    throw new Error(`${contractName} deployed bytecode is ${size} bytes, above EIP-170 limit ${EIP170_LIMIT}`);
  }
  console.log(`${contractName} deployed bytecode: ${size} bytes`);
}

function loadDeployments() {
  const deploymentsPath = "./deployments.json";
  if (!fs.existsSync(deploymentsPath)) return { deploymentsPath, deployments: {} };
  return {
    deploymentsPath,
    deployments: JSON.parse(fs.readFileSync(deploymentsPath, "utf8")),
  };
}

function storageWord(slot) {
  return ethers.toBeHex(slot, 32);
}

async function readSlot(address, slot) {
  return ethers.provider.getStorage(address, storageWord(slot));
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS or PRIVATE_KEY.");

  const signerAddress = await signer.getAddress();
  const network = hre.network.name;
  const deploymentKey = process.env.DEPLOYMENT_KEY || network;
  const { deploymentsPath, deployments } = loadDeployments();
  const deployment = deployments[deploymentKey] || deployments[network] || {};

  const safeAddress = requireAddress("SAFE_ADDRESS");
  const proxy = optionalAddress("FUND_PROXY_ADDRESS") || (deployment.proxy ? ethers.getAddress(deployment.proxy) : "");
  if (!proxy) {
    throw new Error("FUND_PROXY_ADDRESS env var or deployments.json proxy is required");
  }

  const finalImplementation =
    optionalAddress("FINAL_IMPLEMENTATION_ADDRESS") ||
    ethers.getAddress(await upgrades.erc1967.getImplementationAddress(proxy));

  console.log("Repairing GM10 investor tracking storage");
  console.log("  Network       :", network);
  console.log("  Deployment key:", deploymentKey);
  console.log("  Proxy         :", proxy);
  console.log("  Safe          :", safeAddress);
  console.log("  Signer        :", signerAddress);
  console.log("  Final impl    :", finalImplementation);
  console.log("  Slot 14 before:", await readSlot(proxy, CURRENT_TOTAL_ROUNDS_COMPLETED_SLOT));
  console.log("  Slot 18 before:", await readSlot(proxy, CURRENT_INVESTOR_LIST_SLOT));
  console.log("  Slot 19 before:", await readSlot(proxy, CURRENT_TOTAL_INVESTORS_SLOT));

  await assertDeployableSize("Gm10InvestorTrackingStorageRepairUpgrade");

  let repairImplementation = optionalAddress("REPAIR_IMPLEMENTATION_ADDRESS");
  if (!repairImplementation) {
    const RepairUpgrade = await ethers.getContractFactory("Gm10InvestorTrackingStorageRepairUpgrade");
    const repairUpgrade = await RepairUpgrade.deploy();
    await repairUpgrade.waitForDeployment();
    repairImplementation = await repairUpgrade.getAddress();
  }
  repairImplementation = ethers.getAddress(repairImplementation);
  console.log("  Repair impl   :", repairImplementation);

  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }

  const repairInterface = new ethers.Interface([
    "function repairInvestorTrackingAndReturn(address _finalImplementation)",
  ]);
  const upgradeInterface = new ethers.Interface([
    "function upgradeToAndCall(address newImplementation, bytes data)",
  ]);
  const repairData = repairInterface.encodeFunctionData("repairInvestorTrackingAndReturn", [
    finalImplementation,
  ]);
  const upgradeData = upgradeInterface.encodeFunctionData("upgradeToAndCall", [repairImplementation, repairData]);

  const nonce = await safe.nonce();
  console.log("  Safe nonce    :", nonce.toString());
  const tx = await safe.execTransaction(
    proxy,
    0,
    upgradeData,
    OPERATION_CALL,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    prevalidatedSignature(signerAddress)
  );
  console.log("  Repair tx     :", tx.hash);
  const receipt = await tx.wait();
  console.log("  Confirmed block:", receipt.blockNumber);

  const liveImplementation = await upgrades.erc1967.getImplementationAddress(proxy);
  if (!sameAddress(liveImplementation, finalImplementation)) {
    throw new Error(`Proxy implementation is ${liveImplementation}, expected ${finalImplementation}`);
  }

  const fund = await ethers.getContractAt("GemMintStrategyFundV6", proxy, signer);
  const roundId = await fund.currentRoundId();
  const round = await fund.getRound(roundId);
  const totalRoundsCompleted = await readSlot(proxy, CURRENT_TOTAL_ROUNDS_COMPLETED_SLOT);
  const investorListLength = await readSlot(proxy, CURRENT_INVESTOR_LIST_SLOT);
  const totalInvestors = await readSlot(proxy, CURRENT_TOTAL_INVESTORS_SLOT);
  console.log("  Live impl       :", liveImplementation);
  console.log("  Current round   :", roundId.toString());
  console.log("  Round target    :", ethers.formatEther(round.targetAmount), "AVAX");
  console.log("  Round raised    :", ethers.formatEther(round.raisedAmount), "AVAX");
  console.log("  Slot 14 after   :", totalRoundsCompleted);
  console.log("  Slot 18 after   :", investorListLength);
  console.log("  Slot 19 after   :", totalInvestors);

  deployments[deploymentKey] = {
    ...deployment,
    implementation: liveImplementation,
    lastInvestorTrackingStorageRepair: {
      repairImplementation,
      finalImplementation,
      tx: tx.hash,
      blockNumber: receipt.blockNumber,
      totalRoundsCompleted,
      investorListLength,
      totalInvestors,
      timestamp: new Date().toISOString(),
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
