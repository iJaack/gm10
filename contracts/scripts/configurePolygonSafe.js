/**
 * Configure the fund for Courtyard.io purchases on Polygon.
 *
 * This script:
 *   1. Registers the Polygon chain safe in the portfolio registry
 *   2. Approves the "courtyard.io" marketplace in the registry
 *   3. Registers the Stargate pool for USDC on the bridge adapter
 *   4. Approves the StargateBridgeAdapter in the fund
 *   5. Grants OPERATOR_ROLE to the operator wallet
 *
 * Usage:
 *   npx hardhat run scripts/configurePolygonSafe.js --network fuji
 *
 * Env vars required:
 *   FUND_PROXY_ADDRESS          - GemMintStrategyFundV4 proxy
 *   PORTFOLIO_REGISTRY_ADDRESS  - Gm10PortfolioRegistry address
 *   ADAPTER_ADDRESS             - StargateBridgeAdapter address
 *   POLYGON_SAFE_ADDRESS        - EVM Safe address on Polygon
 *   USDC_ADDRESS                - USDC ERC-20 on this chain (Fuji: bridged USDC)
 *   STARGATE_USDC_POOL_ADDRESS  - Stargate pool for USDC on this chain
 *   OPERATOR_ADDRESS            - Wallet to grant OPERATOR_ROLE to
 */
const hre = require("hardhat");
const { ethers } = hre;

// LayerZero endpoint IDs
const POLYGON_MAINNET_EID = 30109;
const POLYGON_AMOY_EID    = 40267; // testnet

async function main() {
  const [deployer] = await ethers.getSigners();

  const fundProxy      = process.env.FUND_PROXY_ADDRESS;
  const registryAddr   = process.env.PORTFOLIO_REGISTRY_ADDRESS;
  const adapterAddr    = process.env.ADAPTER_ADDRESS;
  const polygonSafe    = process.env.POLYGON_SAFE_ADDRESS;
  const usdcAddr       = process.env.USDC_ADDRESS;
  const stargatePool   = process.env.STARGATE_USDC_POOL_ADDRESS;
  const operatorAddr   = process.env.OPERATOR_ADDRESS || deployer.address;

  for (const [name, val] of Object.entries({
    FUND_PROXY_ADDRESS: fundProxy,
    PORTFOLIO_REGISTRY_ADDRESS: registryAddr,
    ADAPTER_ADDRESS: adapterAddr,
    POLYGON_SAFE_ADDRESS: polygonSafe,
    USDC_ADDRESS: usdcAddr,
    STARGATE_USDC_POOL_ADDRESS: stargatePool,
  })) {
    if (!val) throw new Error(`${name} env var is required`);
  }

  const isTestnet = hre.network.name === "fuji" || hre.network.name === "amoy";
  const polygonEid = isTestnet ? POLYGON_AMOY_EID : POLYGON_MAINNET_EID;

  console.log(`Configuring for ${isTestnet ? "testnet (Fuji → Amoy)" : "mainnet (Avalanche → Polygon)"}...`);
  console.log("  Fund proxy  :", fundProxy);
  console.log("  Registry    :", registryAddr);
  console.log("  Adapter     :", adapterAddr);
  console.log("  Polygon Safe:", polygonSafe);
  console.log("  EID         :", polygonEid);

  const fund     = await ethers.getContractAt("GemMintStrategyFundV4", fundProxy);
  const registry = await ethers.getContractAt("Gm10PortfolioRegistry", registryAddr);
  const adapter  = await ethers.getContractAt("StargateBridgeAdapter", adapterAddr);

  // 1. Register Polygon chain safe in registry
  console.log("\n1. Registering Polygon chain safe in registry...");
  const tx1 = await registry.setChainSafe(
    polygonEid,
    polygonSafe,
    ethers.ZeroHash,           // nonEvmSafe (not used for EVM chain)
    ethers.id("POLYGON_SAFE"), // label
    true
  );
  await tx1.wait();
  console.log("   ✓ Chain safe registered");

  // 2. Approve courtyard.io marketplace
  console.log("2. Approving courtyard.io marketplace...");
  const tx2 = await registry.setMarketplaceApproval(ethers.id("courtyard.io"), true);
  await tx2.wait();
  console.log("   ✓ Marketplace approved");

  // 3. Register Stargate USDC pool on the adapter
  console.log("3. Setting Stargate USDC pool on adapter...");
  const tx3 = await adapter.setPool(usdcAddr, stargatePool);
  await tx3.wait();
  console.log("   ✓ Pool set");

  // 4. Approve the adapter in the fund
  console.log("4. Approving StargateBridgeAdapter in fund...");
  const tx4 = await fund.setApprovedBridgeAdapter(adapterAddr, true);
  await tx4.wait();
  console.log("   ✓ Adapter approved");

  // 5. Grant OPERATOR_ROLE
  const OPERATOR_ROLE = await fund.OPERATOR_ROLE();
  console.log("5. Granting OPERATOR_ROLE to", operatorAddr, "...");
  const tx5 = await fund.grantRole(OPERATOR_ROLE, operatorAddr);
  await tx5.wait();
  console.log("   ✓ OPERATOR_ROLE granted");

  console.log("\nConfiguration complete. Ready to call swapAndBridge.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
