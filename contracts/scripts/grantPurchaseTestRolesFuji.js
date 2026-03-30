const hre = require("hardhat");
const { ethers } = hre;
const deployments = require("../deployments.json");

const OPS_EOA = "0x39971795266a794a8156271729A07994952a6FAD";
const DEPLOYER_EOA = "0x5cA0A679025B6c7dA08a70be3b244399fF0D7813";
const MANAGER_ROLE = ethers.id("MANAGER_ROLE");
const GOVERNANCE_ROLE = ethers.id("GOVERNANCE_ROLE");

const FUND_ABI = [
  "function hasRole(bytes32,address) view returns (bool)",
  "function grantRole(bytes32,address)",
];

async function logRoleState(fund, account, label) {
  const [manager, governance] = await Promise.all([
    fund.hasRole(MANAGER_ROLE, account),
    fund.hasRole(GOVERNANCE_ROLE, account),
  ]);

  console.log(`${label} ${account}`);
  console.log(`  MANAGER_ROLE: ${manager}`);
  console.log(`  GOVERNANCE_ROLE: ${governance}`);
}

async function main() {
  if (hre.network.name !== "fuji") {
    throw new Error("This script is only intended for Fuji");
  }

  const deployment = deployments.fuji;
  if (!deployment?.proxy) {
    throw new Error("Fuji deployment metadata is incomplete");
  }

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  if (signerAddress.toLowerCase() !== OPS_EOA.toLowerCase()) {
    throw new Error(`Signer must be the Fuji ops EOA ${OPS_EOA}, received ${signerAddress}`);
  }

  const fund = new ethers.Contract(deployment.proxy, FUND_ABI, signer);

  console.log(`Using signer: ${signerAddress}`);
  console.log(`Target fund: ${deployment.proxy}`);
  await logRoleState(fund, DEPLOYER_EOA, "Before:");

  for (const [label, role] of [
    ["MANAGER_ROLE", MANAGER_ROLE],
    ["GOVERNANCE_ROLE", GOVERNANCE_ROLE],
  ]) {
    const alreadyGranted = await fund.hasRole(role, DEPLOYER_EOA);
    if (alreadyGranted) {
      console.log(`Skipping ${label}, already granted to deployer`);
      continue;
    }

    console.log(`Granting ${label} to ${DEPLOYER_EOA}...`);
    const tx = await fund.grantRole(role, DEPLOYER_EOA);
    await tx.wait();
  }

  await logRoleState(fund, DEPLOYER_EOA, "After:");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
