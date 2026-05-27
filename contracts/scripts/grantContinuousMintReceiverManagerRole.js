/**
 * Grant MANAGER_ROLE to the continuous mint receiver through the treasury Safe.
 *
 * Usage:
 *   LEDGER_ADDRESS=0x... SAFE_ADDRESS=0x... RECEIVER_ADDRESS=0x... DEPLOYMENT_KEY=avalanche \
 *     npx hardhat run scripts/grantContinuousMintReceiverManagerRole.js --network avalanche
 *
 * Optional:
 *   FUND_PROXY_ADDRESS=0x...
 *   EXECUTE=false
 */
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

const OPERATION_CALL = 0;
const MANAGER_ROLE = ethers.id("MANAGER_ROLE");
const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)",
];
const FUND_ABI = [
  "function grantRole(bytes32 role,address account)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
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

async function main() {
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const safeAddress = requireAddress("SAFE_ADDRESS");
  const receiverAddress = requireAddress("RECEIVER_ADDRESS");
  const deploymentKey = process.env.DEPLOYMENT_KEY || (hre.network.name === "fuji" ? "fuji" : "avalanche");
  const { deploymentsPath, deployments } = loadDeployments();
  const deployment = deployments[deploymentKey] || {};
  const fundProxy = optionalAddress("FUND_PROXY_ADDRESS") || ethers.getAddress(deployment.proxy);
  const shouldExecute = process.env.EXECUTE !== "false";

  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const fund = new ethers.Contract(fundProxy, FUND_ABI, signer);
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  if (threshold !== 1n) throw new Error(`Expected a 1/1 Safe, got threshold ${threshold.toString()}`);
  if (!owners.some((owner) => sameAddress(owner, signerAddress))) {
    throw new Error("Connected signer is not a Safe owner; cannot use prevalidated owner signature.");
  }

  const alreadyManager = await fund.hasRole(MANAGER_ROLE, receiverAddress);
  const managerRoleAdmin = await fund.getRoleAdmin(MANAGER_ROLE);
  const safeCanGrant = await fund.hasRole(managerRoleAdmin, safeAddress);
  if (!alreadyManager && !safeCanGrant) {
    throw new Error(`Safe ${safeAddress} does not hold MANAGER_ROLE admin ${managerRoleAdmin} on ${fundProxy}`);
  }

  console.log("Granting continuous mint receiver manager role");
  console.log("  Network        :", hre.network.name);
  console.log("  Fund proxy     :", fundProxy);
  console.log("  Safe           :", safeAddress);
  console.log("  Signer         :", signerAddress);
  console.log("  Receiver       :", receiverAddress);
  console.log("  Manager role   :", alreadyManager);
  console.log("  Role admin     :", managerRoleAdmin);
  console.log("  Safe can grant :", safeCanGrant);

  if (alreadyManager) {
    console.log("  Receiver already has MANAGER_ROLE; no transaction needed.");
    return;
  }

  const data = fund.interface.encodeFunctionData("grantRole", [MANAGER_ROLE, receiverAddress]);
  await ethers.provider.call({ from: safeAddress, to: fundProxy, data });
  console.log("  Static call    : ok");

  if (!shouldExecute) {
    console.log("  EXECUTE=false; skipping Safe transaction.");
    console.log("  Grant calldata :", data);
    return;
  }

  const nonce = await safe.nonce();
  console.log("  Safe nonce     :", nonce.toString());
  const tx = await safe.execTransaction(
    fundProxy,
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
  const hasRoleAfter = await fund.hasRole(MANAGER_ROLE, receiverAddress);
  console.log("  Confirmed block:", receipt.blockNumber);
  console.log("  Manager role   :", hasRoleAfter);
  if (!hasRoleAfter) throw new Error("Receiver still lacks MANAGER_ROLE after grant transaction");

  deployments[deploymentKey] = {
    ...deployment,
    continuousMintReceiver: receiverAddress,
    lastContinuousMintReceiverManagerGrant: {
      timestamp: new Date().toISOString(),
      blockNumber: receipt.blockNumber,
      tx: tx.hash,
      safe: safeAddress,
      receiver: receiverAddress,
    },
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
