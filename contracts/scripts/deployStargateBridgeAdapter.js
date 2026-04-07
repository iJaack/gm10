/**
 * Deploy StargateBridgeAdapter for a given fund proxy.
 *
 * Usage:
 *   npx hardhat run scripts/deployStargateBridgeAdapter.js --network fuji
 *
 * Env vars required:
 *   FUND_PROXY_ADDRESS   - The GemMintStrategyFundV4 proxy address
 *   ADMIN_ADDRESS        - Owner of the adapter (typically the ops multisig)
 *
 * After deployment, record the adapter address and run configurePolygonSafe.js.
 */
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  const fundProxy  = process.env.FUND_PROXY_ADDRESS;
  const adminAddr  = process.env.ADMIN_ADDRESS || deployer.address;

  if (!fundProxy) {
    throw new Error("FUND_PROXY_ADDRESS env var is required");
  }

  console.log("Deploying StargateBridgeAdapter...");
  console.log("  Fund proxy :", fundProxy);
  console.log("  Adapter owner:", adminAddr);
  console.log("  Deployer    :", deployer.address);

  const StargateBridgeAdapter = await ethers.getContractFactory("StargateBridgeAdapter");
  const adapter = await StargateBridgeAdapter.deploy(fundProxy, adminAddr);
  await adapter.waitForDeployment();

  const adapterAddress = await adapter.getAddress();
  console.log("\nStargateBridgeAdapter deployed to:", adapterAddress);
  console.log("\nNext steps:");
  console.log("  1. Run upgradeToV4.js to upgrade the fund proxy to V4");
  console.log("  2. Run configurePolygonSafe.js to wire the adapter and registry");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
