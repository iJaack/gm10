/**
 * Execute a one-shot liquid treasury accounting reconciliation through the
 * governance Safe. The proxy upgrades into a tiny repair implementation, writes
 * the reconciled stable accounting bucket, and immediately returns to the
 * current fund implementation.
 *
 * Required env:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... FUND_PROXY_ADDRESS=0x...
 *   TARGET_LIQUID_TREASURY_USDT6=<actual spendable liquid treasury, not the purchase max spend>
 *   RECONCILIATION_REF="treasury-safe-polygon-hot-wallet-snapshot"
 *   RECONCILIATION_PROOF="safe-and-hot-wallet-balance-proof"
 *
 * Optional env:
 *   FINAL_IMPLEMENTATION_ADDRESS=0x...
 *   RECONCILIATION_UPGRADE_ADDRESS=0x...
 *   DEPLOYMENT_KEY=avalanche
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
const FUND_STABLE_ACCOUNTING_ABI = [
  "function stableAccounting() view returns (uint256 canonicalPortfolioValue,uint256 lastStableNavUpdateTimestamp,uint256 liquidTreasury,uint256 outstandingPurchaseReleases,uint256 liquidityCatchBuyAccrued,uint256 liquidityAvaxPairingAccrued,uint256 holderDistributionAccrued,uint256 weeklyNavCap)",
];

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
  if (!ethers.isAddress(value)) {
    throw new Error(`${name} must be a valid address`);
  }
  return ethers.getAddress(value);
}

function requireUint(name) {
  const value = process.env[name];
  if (!value || !/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer string`);
  }
  return BigInt(value);
}

function bytes32FromEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  if (/^0x[0-9a-fA-F]{64}$/.test(value)) return value;
  return ethers.id(value);
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

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS or PRIVATE_KEY.");

  const signerAddress = await signer.getAddress();
  const network = hre.network.name;
  const deploymentKey = process.env.DEPLOYMENT_KEY || network;
  const { deploymentsPath, deployments } = loadDeployments();
  const deployment = deployments[deploymentKey] || deployments[network] || {};

  const safeAddress = requireAddress("SAFE_ADDRESS");
  const proxy = process.env.FUND_PROXY_ADDRESS || deployment.proxy;
  if (!proxy || !ethers.isAddress(proxy)) {
    throw new Error("FUND_PROXY_ADDRESS env var or deployments.json proxy is required");
  }

  const targetLiquidTreasuryUsdt6 = requireUint("TARGET_LIQUID_TREASURY_USDT6");
  const reconciliationRef = bytes32FromEnv("RECONCILIATION_REF");
  const reconciliationProof = bytes32FromEnv("RECONCILIATION_PROOF");
  const finalImplementation =
    optionalAddress("FINAL_IMPLEMENTATION_ADDRESS") || await upgrades.erc1967.getImplementationAddress(proxy);

  console.log("Reconciling GM10 liquid treasury accounting");
  console.log("  Network      :", network);
  console.log("  Proxy        :", proxy);
  console.log("  Safe         :", safeAddress);
  console.log("  Signer       :", signerAddress);
  console.log("  Final impl   :", finalImplementation);
  console.log("  Target liquid:", ethers.formatUnits(targetLiquidTreasuryUsdt6, 6), "USDT6");
  console.log("  Ref hash     :", reconciliationRef);
  console.log("  Proof hash   :", reconciliationProof);

  await assertDeployableSize("Gm10LiquidTreasuryReconciliationUpgrade");

  const ReconciliationUpgrade = await ethers.getContractFactory(
    "Gm10LiquidTreasuryReconciliationUpgrade",
    signer
  );
  let reconciliationUpgradeAddress = optionalAddress("RECONCILIATION_UPGRADE_ADDRESS");
  if (reconciliationUpgradeAddress) {
    console.log("  Reconcile impl:", reconciliationUpgradeAddress, "(reused)");
  } else {
    const reconciliationUpgrade = await ReconciliationUpgrade.deploy();
    await reconciliationUpgrade.waitForDeployment();
    reconciliationUpgradeAddress = await reconciliationUpgrade.getAddress();
    console.log("  Reconcile impl:", reconciliationUpgradeAddress);
  }

  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }

  const reconciliationCall = ReconciliationUpgrade.interface.encodeFunctionData(
    "reconcileLiquidTreasuryAndReturn",
    [
      finalImplementation,
      targetLiquidTreasuryUsdt6,
      reconciliationRef,
      reconciliationProof,
    ]
  );
  const upgradeInterface = new ethers.Interface([
    "function upgradeToAndCall(address newImplementation, bytes data)",
  ]);
  const upgradeData = upgradeInterface.encodeFunctionData(
    "upgradeToAndCall",
    [reconciliationUpgradeAddress, reconciliationCall]
  );

  const nonce = await safe.nonce();
  console.log("  Safe nonce   :", nonce.toString());
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
  console.log("  Reconcile tx :", tx.hash);
  const receipt = await tx.wait();
  console.log("  Confirmed block:", receipt.blockNumber);

  const implementationAfter = await upgrades.erc1967.getImplementationAddress(proxy);
  if (!sameAddress(implementationAfter, finalImplementation)) {
    throw new Error(`Proxy implementation is ${implementationAfter}, expected ${finalImplementation}`);
  }

  const fund = new ethers.Contract(proxy, FUND_STABLE_ACCOUNTING_ABI, signer);
  const stableAccounting = await fund.stableAccounting();
  console.log("  Stored liquid:", ethers.formatUnits(stableAccounting.liquidTreasury, 6), "USDT6");

  deployments[deploymentKey] = {
    ...deployment,
    implementation: finalImplementation,
    liquidTreasuryReconciliation: {
      targetLiquidTreasuryUsdt6: targetLiquidTreasuryUsdt6.toString(),
      reconciliationRef,
      reconciliationProof,
      reconciliationUpgrade: reconciliationUpgradeAddress,
      finalImplementation,
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      tx: tx.hash,
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
