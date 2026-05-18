/**
 * Deploy the V7 tokenomics controller and GemMintStrategyFundV7 implementation,
 * then execute a 1/1 Safe upgradeToAndCall that records initializeV7().
 *
 * Required env:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... FUND_PROXY_ADDRESS=0x...
 *   CORE_TEAM_WALLET=0x... GOVERNANCE_TREASURY_WALLET=0x...
 *   COMMUNITY_ECOSYSTEM_WALLET=0x... ADVISORS_WALLET=0x...
 *   STRATEGIC_PARTNERSHIPS_WALLET=0x...
 *
 * Optional resume env:
 *   TOKENOMICS_CONTROLLER_ADDRESS=0x... IMPLEMENTATION_V7_ADDRESS=0x...
 *   CURRENT_CONTRACT_NAME=GemMintStrategyFundV6
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
  if (!ethers.isAddress(value)) {
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
  if (!proxy || !ethers.isAddress(proxy)) {
    throw new Error("FUND_PROXY_ADDRESS env var or deployments.json proxy is required");
  }

  const segmentWallets = [
    requireAddress("CORE_TEAM_WALLET"),
    requireAddress("GOVERNANCE_TREASURY_WALLET"),
    requireAddress("COMMUNITY_ECOSYSTEM_WALLET"),
    requireAddress("ADVISORS_WALLET"),
    requireAddress("STRATEGIC_PARTNERSHIPS_WALLET"),
  ];

  console.log("Upgrading to GemMintStrategyFundV7 dynamic tokenomics");
  console.log("  Network      :", network);
  console.log("  Proxy        :", proxy);
  console.log("  Safe         :", safeAddress);
  console.log("  Signer       :", signerAddress);
  console.log("  Segment wallets:", segmentWallets.join(", "));

  await assertDeployableSize("GemMintStrategyFundV7");
  await assertDeployableSize("Gm10TokenomicsV7Controller");

  let controllerAddress = optionalAddress("TOKENOMICS_CONTROLLER_ADDRESS");
  if (controllerAddress) {
    console.log("  Controller   :", controllerAddress, "(reused)");
  } else {
    const Controller = await ethers.getContractFactory("Gm10TokenomicsV7Controller", signer);
    const controller = await Controller.deploy(proxy, ...segmentWallets);
    await controller.waitForDeployment();
    controllerAddress = await controller.getAddress();
    console.log("  Controller   :", controllerAddress);
  }

  const unsafeAllow = ["constructor", "state-variable-immutable"];
  const FundV7 = await ethers.getContractFactory("GemMintStrategyFundV7", signer);
  const upgradeOptions = {
    kind: "uups",
    unsafeAllow,
    constructorArgs: [controllerAddress],
  };
  try {
    await upgrades.validateUpgrade(proxy, FundV7, upgradeOptions);
  } catch (error) {
    if (!String(error && error.message ? error.message : error).includes("not registered")) {
      throw error;
    }
    console.log("  Existing proxy is not in the local OpenZeppelin manifest; importing it first.");
    const CurrentFund = await ethers.getContractFactory(process.env.CURRENT_CONTRACT_NAME || "GemMintStrategyFundV6", signer);
    await upgrades.forceImport(proxy, CurrentFund, { kind: "uups" });
    await upgrades.validateUpgrade(proxy, FundV7, upgradeOptions);
  }

  let implementationV7 = optionalAddress("IMPLEMENTATION_V7_ADDRESS");
  if (implementationV7) {
    console.log("  Implementation V7:", implementationV7, "(reused)");
  } else {
    const implementation = await FundV7.deploy(controllerAddress);
    await implementation.waitForDeployment();
    implementationV7 = await implementation.getAddress();
    console.log("  Implementation V7:", implementationV7);
  }

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
  const fundV7Interface = new ethers.Interface(["function initializeV7()"]);
  const initData = fundV7Interface.encodeFunctionData("initializeV7", []);
  const upgradeData = upgradeInterface.encodeFunctionData("upgradeToAndCall", [implementationV7, initData]);

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
  console.log("  Upgrade tx   :", tx.hash);
  const receipt = await tx.wait();
  console.log("  Confirmed block:", receipt.blockNumber);

  deployments[deploymentKey] = {
    ...deployment,
    implementation: implementationV7,
    implementationV7,
    tokenomicsController: controllerAddress,
    lastTokenomicsUpgrade: {
      to: implementationV7,
      controller: controllerAddress,
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      tx: tx.hash,
      segmentWallets,
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
