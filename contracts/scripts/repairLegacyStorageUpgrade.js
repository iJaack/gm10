/**
 * Repair the post-upgrade storage-layout mismatch by temporarily upgrading the
 * fund proxy to Gm10LegacyStorageRepairUpgrade. The repair implementation copies
 * legacy round/stable-accounting slots into the current layout, points the fund
 * at the selected portfolio registry, then atomically returns the proxy to the
 * current/final fund implementation in the same Safe transaction.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... FUND_PROXY_ADDRESS=0x... \
 *   LEGACY_PORTFOLIO_REGISTRY_ADDRESS=0x... \
 *     npx hardhat run scripts/repairLegacyStorageUpgrade.js --network avalanche
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
  const portfolioRegistry =
    optionalAddress("LEGACY_PORTFOLIO_REGISTRY_ADDRESS") ||
    (deployment.portfolioRegistryV1 ? ethers.getAddress(deployment.portfolioRegistryV1) : "");
  if (!portfolioRegistry) {
    throw new Error("LEGACY_PORTFOLIO_REGISTRY_ADDRESS env var or deployments.json portfolioRegistryV1 is required");
  }

  const finalImplementation =
    optionalAddress("FINAL_IMPLEMENTATION_ADDRESS") ||
    ethers.getAddress(await upgrades.erc1967.getImplementationAddress(proxy));

  console.log("Repairing legacy GM10 storage");
  console.log("  Network           :", network);
  console.log("  Deployment key    :", deploymentKey);
  console.log("  Proxy             :", proxy);
  console.log("  Safe              :", safeAddress);
  console.log("  Signer            :", signerAddress);
  console.log("  Final impl        :", finalImplementation);
  console.log("  Portfolio registry:", portfolioRegistry);

  await assertDeployableSize("Gm10LegacyStorageRepairUpgrade");

  let repairImplementation = optionalAddress("REPAIR_IMPLEMENTATION_ADDRESS");
  if (!repairImplementation) {
    const RepairUpgrade = await ethers.getContractFactory("Gm10LegacyStorageRepairUpgrade");
    const repairUpgrade = await RepairUpgrade.deploy();
    await repairUpgrade.waitForDeployment();
    repairImplementation = await repairUpgrade.getAddress();
  }
  repairImplementation = ethers.getAddress(repairImplementation);
  console.log("  Repair impl       :", repairImplementation);

  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }

  const repairInterface = new ethers.Interface([
    "function repairLegacyStorageAndReturn(address _finalImplementation,address _portfolioRegistry)",
  ]);
  const upgradeInterface = new ethers.Interface([
    "function upgradeToAndCall(address newImplementation, bytes data)",
  ]);
  const repairData = repairInterface.encodeFunctionData("repairLegacyStorageAndReturn", [
    finalImplementation,
    portfolioRegistry,
  ]);
  const upgradeData = upgradeInterface.encodeFunctionData("upgradeToAndCall", [repairImplementation, repairData]);

  const nonce = await safe.nonce();
  console.log("  Safe nonce        :", nonce.toString());
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
  console.log("  Repair tx         :", tx.hash);
  const receipt = await tx.wait();
  console.log("  Confirmed block   :", receipt.blockNumber);

  const liveImplementation = await upgrades.erc1967.getImplementationAddress(proxy);
  if (!sameAddress(liveImplementation, finalImplementation)) {
    throw new Error(`Proxy implementation is ${liveImplementation}, expected ${finalImplementation}`);
  }

  const fund = await ethers.getContractAt("GemMintStrategyFundV6", proxy, signer);
  const roundId = await fund.currentRoundId();
  const round = await fund.getRound(roundId);
  const accounting = await fund.stableAccounting();
  console.log("  Live impl         :", liveImplementation);
  console.log("  Current round     :", roundId.toString());
  console.log("  Round target      :", ethers.formatEther(round.targetAmount), "AVAX");
  console.log("  Round raised      :", ethers.formatEther(round.raisedAmount), "AVAX");
  console.log("  Registry pointer  :", await fund.portfolioRegistry());
  console.log("  Liquid treasury   :", accounting.liquidTreasury.toString(), "USDT6");

  deployments[deploymentKey] = {
    ...deployment,
    implementation: liveImplementation,
    portfolioRegistry,
    lastLegacyStorageRepair: {
      repairImplementation,
      finalImplementation,
      portfolioRegistry,
      tx: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString(),
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
