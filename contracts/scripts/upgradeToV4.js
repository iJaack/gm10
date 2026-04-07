/**
 * Upgrade the GemMintStrategyFund proxy to V4.
 *
 * Usage:
 *   npx hardhat run scripts/upgradeToV4.js --network fuji
 *
 * Env vars required:
 *   FUND_PROXY_ADDRESS   - The proxy address
 *   SWAP_ROUTER_V4       - Trader Joe V2 (or equivalent) router address on this chain
 */
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();

  const proxyAddress   = process.env.FUND_PROXY_ADDRESS;
  const swapRouterV4   = process.env.SWAP_ROUTER_V4;

  if (!proxyAddress) throw new Error("FUND_PROXY_ADDRESS env var is required");
  if (!swapRouterV4)  throw new Error("SWAP_ROUTER_V4 env var is required");

  console.log("Upgrading to GemMintStrategyFundV4...");
  console.log("  Proxy      :", proxyAddress);
  console.log("  SwapRouter :", swapRouterV4);
  console.log("  Deployer   :", deployer.address);

  const FundV4 = await ethers.getContractFactory("GemMintStrategyFundV4");

  const fund = await upgrades.upgradeProxy(proxyAddress, FundV4, {
    kind: "uups",
    call: {
      fn: "initializeV4",
      args: [swapRouterV4],
    },
  });
  await fund.waitForDeployment();

  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("\nUpgrade complete.");
  console.log("  Proxy (unchanged):", proxyAddress);
  console.log("  New implementation:", implAddress);

  // Update deployments.json if it exists
  const deploymentsPath = "./deployments.json";
  if (fs.existsSync(deploymentsPath)) {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    const network = hre.network.name;
    if (deployments[network]) {
      deployments[network].implementationV4 = implAddress;
      deployments[network].swapRouterV4 = swapRouterV4;
      fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
      console.log("  deployments.json updated.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
