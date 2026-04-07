/**
 * Deploy MockStargate for Fuji testnet (Stargate V2 not available on Fuji).
 *
 * Usage:
 *   npx hardhat run scripts/deployMockStargate.js --network fuji
 */
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockStargate...");
  console.log("  Deployer:", deployer.address);

  const MockStargate = await ethers.getContractFactory("MockStargate");
  const mock = await MockStargate.deploy();
  await mock.waitForDeployment();

  console.log("\nMockStargate deployed to:", await mock.getAddress());
}

main().catch((err) => { console.error(err); process.exit(1); });
