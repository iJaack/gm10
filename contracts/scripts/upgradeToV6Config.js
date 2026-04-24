/**
 * Deploy GemMintStrategyFundV6 and execute a 1/1 Safe upgradeToAndCall that
 * initializes canonical pricing and investor accounting config.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... FUND_PROXY_ADDRESS=0x... CANONICAL_USDT_ADDRESS=0x... \
 *   AVAX_USD_FEED_ADDRESS=0x... INVESTOR_ACCOUNTING_ADDRESS=0x... \
 *     npx hardhat run scripts/upgradeToV6Config.js --network avalanche
 *
 * Optional:
 *   IMPLEMENTATION_V6_ADDRESS=0x...  Reuse an already deployed implementation after an interrupted run.
 *   DEPLOYMENT_KEY=avalanche         deployments.json key to update.
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
  const canonicalUsdt = requireAddress("CANONICAL_USDT_ADDRESS");
  const avaxUsdFeed = requireAddress("AVAX_USD_FEED_ADDRESS");
  const investorAccounting = requireAddress("INVESTOR_ACCOUNTING_ADDRESS");
  if (!proxy || !ethers.isAddress(proxy)) {
    throw new Error("FUND_PROXY_ADDRESS env var or deployments.json proxy is required");
  }

  console.log("Upgrading to GemMintStrategyFundV6 config finalizer");
  console.log("  Network            :", network);
  console.log("  Proxy              :", proxy);
  console.log("  Safe               :", safeAddress);
  console.log("  Signer             :", signerAddress);
  console.log("  Canonical USDT     :", canonicalUsdt);
  console.log("  AVAX/USD feed      :", avaxUsdFeed);
  console.log("  Investor accounting:", investorAccounting);

  await assertDeployableSize("GemMintStrategyFundV6");

  const FundV6 = await ethers.getContractFactory("GemMintStrategyFundV6");
  let implementationV6 = process.env.IMPLEMENTATION_V6_ADDRESS || "";
  if (!implementationV6) {
    const implementation = await FundV6.deploy();
    await implementation.waitForDeployment();
    implementationV6 = await implementation.getAddress();
  }
  implementationV6 = ethers.getAddress(implementationV6);
  console.log("  Implementation V6  :", implementationV6);

  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }

  const upgradeInterface = new ethers.Interface([
    "function upgradeToAndCall(address newImplementation, bytes data)",
  ]);
  const fundV6Interface = new ethers.Interface([
    "function initializeV6(address _canonicalUsdt,address _avaxUsdFeed,address _investorAccounting)",
  ]);
  const initData = fundV6Interface.encodeFunctionData("initializeV6", [
    canonicalUsdt,
    avaxUsdFeed,
    investorAccounting,
  ]);
  const upgradeData = upgradeInterface.encodeFunctionData("upgradeToAndCall", [implementationV6, initData]);

  const nonce = await safe.nonce();
  console.log("  Safe nonce         :", nonce.toString());
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
  console.log("  Upgrade tx         :", tx.hash);
  const receipt = await tx.wait();
  console.log("  Confirmed block    :", receipt.blockNumber);

  const fund = await ethers.getContractAt("GemMintStrategyFundV6", proxy, signer);
  const implementation = await upgrades.erc1967.getImplementationAddress(proxy);
  console.log("  Live implementation:", implementation);
  console.log("  Investor accounting:", await fund.investorAccounting());

  deployments[deploymentKey] = {
    ...deployment,
    implementation: implementation,
    implementationV6: implementationV6,
    canonicalUsdt,
    avaxUsdFeed,
    investorAccounting,
    lastConfigUpgrade: {
      to: implementationV6,
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      canonicalUsdt,
      avaxUsdFeed,
      investorAccounting,
      tx: tx.hash,
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
