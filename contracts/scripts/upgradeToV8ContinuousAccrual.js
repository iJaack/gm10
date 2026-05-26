/**
 * Deploy GemMintStrategyFundV8 and upgrade the configured fund proxy with
 * initializeV8(). Supports direct governance execution on testnet and 1/1 Safe
 * execution when SAFE_ADDRESS is supplied.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... FUND_PROXY_ADDRESS=0x... \
 *     npx hardhat run scripts/upgradeToV8ContinuousAccrual.js --network fuji
 *
 * Optional:
 *   DEPLOYMENT_KEY=fuji
 *   CURRENT_CONTRACT_NAME=GemMintStrategyFundV3
 *   TOKENOMICS_CONTROLLER_ADDRESS=0x...
 *   IMPLEMENTATION_V8_ADDRESS=0x...
 *   EXECUTION_MODE=direct|safe
 *   EXECUTE=false
 *   SAFE_ADDRESS=0x...
 *   CORE_TEAM_WALLET=0x...
 *   GOVERNANCE_TREASURY_WALLET=0x...
 *   COMMUNITY_ECOSYSTEM_WALLET=0x...
 *   ADVISORS_WALLET=0x...
 *   STRATEGIC_PARTNERSHIPS_WALLET=0x...
 */
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

const EIP170_LIMIT = 24576;
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

function resolveCurrentContractName(deployment) {
  if (process.env.CURRENT_CONTRACT_NAME) return process.env.CURRENT_CONTRACT_NAME;
  if (deployment.implementationV8) return "GemMintStrategyFundV8";
  if (deployment.implementationV7) return "GemMintStrategyFundV7";
  if (deployment.implementationV6) return "GemMintStrategyFundV6";
  if (deployment.implementationV5) return "GemMintStrategyFundV5";
  return "GemMintStrategyFundV3";
}

function resolveSegmentWallets(deployment, signerAddress, network) {
  const envWallets = [
    optionalAddress("CORE_TEAM_WALLET"),
    optionalAddress("GOVERNANCE_TREASURY_WALLET"),
    optionalAddress("COMMUNITY_ECOSYSTEM_WALLET"),
    optionalAddress("ADVISORS_WALLET"),
    optionalAddress("STRATEGIC_PARTNERSHIPS_WALLET"),
  ];
  if (envWallets.every(Boolean)) return envWallets;

  const previous = deployment.lastTokenomicsUpgrade && deployment.lastTokenomicsUpgrade.segmentWallets;
  if (Array.isArray(previous) && previous.length === 5 && previous.every(ethers.isAddress)) {
    return previous.map(ethers.getAddress);
  }

  if (network === "fuji") {
    const fallback = deployment.treasury && ethers.isAddress(deployment.treasury)
      ? ethers.getAddress(deployment.treasury)
      : signerAddress;
    console.warn("  Segment wallets are not fully configured; using Fuji rehearsal fallback:", fallback);
    return [fallback, fallback, fallback, fallback, fallback];
  }

  throw new Error("Set all five segment wallet env vars or TOKENOMICS_CONTROLLER_ADDRESS.");
}

async function validateUpgrade(proxy, FundV8, upgradeOptions, currentContractName) {
  try {
    await upgrades.validateUpgrade(proxy, FundV8, upgradeOptions);
  } catch (error) {
    if (!String(error && error.message ? error.message : error).includes("not registered")) {
      throw error;
    }
    console.log(`  Existing proxy is not in the local manifest; importing as ${currentContractName}.`);
    const CurrentFund = await ethers.getContractFactory(currentContractName);
    await upgrades.forceImport(proxy, CurrentFund, { kind: "uups" });
    await upgrades.validateUpgrade(proxy, FundV8, upgradeOptions);
  }
}

async function executeSafeUpgrade({ safeAddress, signer, signerAddress, proxy, implementationV8, initData }) {
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
  const upgradeData = upgradeInterface.encodeFunctionData("upgradeToAndCall", [implementationV8, initData]);
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
  return tx;
}

async function executeDirectUpgrade({ signer, signerAddress, proxy, implementationV8, initData }) {
  const fund = new ethers.Contract(
    proxy,
    [
      "function hasRole(bytes32 role,address account) view returns (bool)",
      "function upgradeToAndCall(address newImplementation, bytes data) payable",
    ],
    signer
  );
  const hasGovernance = await fund.hasRole(GOVERNANCE_ROLE, signerAddress);
  if (!hasGovernance) {
    throw new Error(`Signer ${signerAddress} does not have GOVERNANCE_ROLE on ${proxy}`);
  }
  await fund.upgradeToAndCall.staticCall(implementationV8, initData);
  return fund.upgradeToAndCall(implementationV8, initData);
}

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("No signer configured. Set LEDGER_ADDRESS or PRIVATE_KEY.");

  const signerAddress = await signer.getAddress();
  const network = hre.network.name;
  const deploymentKey = process.env.DEPLOYMENT_KEY || network;
  const { deploymentsPath, deployments } = loadDeployments();
  const deployment = deployments[deploymentKey] || deployments[network] || {};
  const proxy = optionalAddress("FUND_PROXY_ADDRESS") || (deployment.proxy ? ethers.getAddress(deployment.proxy) : "");
  if (!proxy) throw new Error("FUND_PROXY_ADDRESS env var or deployments.json proxy is required");
  if (network === "avalanche" && process.env.ALLOW_MAINNET_V8_UPGRADE !== "true") {
    throw new Error("Refusing mainnet V8 upgrade without ALLOW_MAINNET_V8_UPGRADE=true");
  }

  console.log("Upgrading to GemMintStrategyFundV8 continuous accrual");
  console.log("  Network            :", network);
  console.log("  Deployment key     :", deploymentKey);
  console.log("  Proxy              :", proxy);
  console.log("  Signer             :", signerAddress);

  await assertDeployableSize("GemMintStrategyFundV8");
  await assertDeployableSize("Gm10TokenomicsV7Controller");

  let controllerAddress = optionalAddress("TOKENOMICS_CONTROLLER_ADDRESS") ||
    (deployment.tokenomicsController ? ethers.getAddress(deployment.tokenomicsController) : "");
  if (controllerAddress) {
    console.log("  Controller         :", controllerAddress, "(reused)");
  } else {
    const segmentWallets = resolveSegmentWallets(deployment, signerAddress, network);
    console.log("  Segment wallets    :", segmentWallets.join(", "));
    const Controller = await ethers.getContractFactory("Gm10TokenomicsV7Controller", signer);
    const controller = await Controller.deploy(proxy, ...segmentWallets);
    await controller.waitForDeployment();
    controllerAddress = await controller.getAddress();
    console.log("  Controller         :", controllerAddress);
  }

  const unsafeAllow = ["constructor", "state-variable-immutable"];
  const FundV8 = await ethers.getContractFactory("GemMintStrategyFundV8", signer);
  const upgradeOptions = {
    kind: "uups",
    unsafeAllow,
    constructorArgs: [controllerAddress],
  };
  const currentContractName = resolveCurrentContractName(deployment);
  console.log("  Current contract   :", currentContractName);
  await validateUpgrade(proxy, FundV8, upgradeOptions, currentContractName);
  console.log("  Upgrade validation : ok");

  let implementationV8 = optionalAddress("IMPLEMENTATION_V8_ADDRESS");
  if (implementationV8) {
    console.log("  Implementation V8  :", implementationV8, "(reused)");
  } else {
    const implementation = await FundV8.deploy(controllerAddress);
    await implementation.waitForDeployment();
    implementationV8 = await implementation.getAddress();
    console.log("  Implementation V8  :", implementationV8);
  }

  const fundV8Interface = new ethers.Interface(["function initializeV8()"]);
  const initData = fundV8Interface.encodeFunctionData("initializeV8", []);
  const executionMode = process.env.EXECUTION_MODE || (process.env.SAFE_ADDRESS ? "safe" : "direct");
  console.log("  Execution mode     :", executionMode);

  if (process.env.EXECUTE === "false") {
    console.log("  EXECUTE=false; skipping upgrade transaction.");
    console.log("  Initialize data    :", initData);
    return;
  }

  const tx = executionMode === "safe"
    ? await executeSafeUpgrade({
        safeAddress: requireAddress("SAFE_ADDRESS"),
        signer,
        signerAddress,
        proxy,
        implementationV8,
        initData,
      })
    : await executeDirectUpgrade({ signer, signerAddress, proxy, implementationV8, initData });

  console.log("  Upgrade tx         :", tx.hash);
  const receipt = await tx.wait();
  console.log("  Confirmed block    :", receipt.blockNumber);

  const liveImplementation = await upgrades.erc1967.getImplementationAddress(proxy);
  const fund = await ethers.getContractAt("GemMintStrategyFundV8", proxy, signer);
  const controls = {
    continuousMintPaused: await fund.continuousMintPaused(),
    buybackPaused: await fund.buybackPaused(),
    lpSupportPaused: await fund.lpSupportPaused(),
    mintSpreadBps: (await fund.mintSpreadBps()).toString(),
    redemptionsPermanentlyDisabled: await fund.redemptionsPermanentlyDisabled(),
  };
  console.log("  Live implementation:", liveImplementation);
  console.log("  Controls           :", JSON.stringify(controls));

  deployments[deploymentKey] = {
    ...deployment,
    implementation: liveImplementation,
    implementationV8,
    tokenomicsController: controllerAddress,
    lastContinuousAccrualUpgrade: {
      to: implementationV8,
      controller: controllerAddress,
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      tx: tx.hash,
      controls,
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
