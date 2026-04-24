/**
 * Upgrade the GemMintStrategyFund proxy to V5 and deploy the V2 registry.
 *
 * Usage:
 *   FUND_PROXY_ADDRESS=0x... SETTLEMENT_TOKEN_ADDRESS=0x... SETTLEMENT_TOKEN_DECIMALS=6 \
 *     npx hardhat run scripts/upgradeToV5.js --network fuji
 *
 * Optional env vars:
 *   DEPLOYMENT_KEY              - deployments.json key to update; defaults to network name
 *   MAX_PRICE_FEED_STALENESS    - seconds; defaults to 86400
 *   SETTLEMENT_TOKEN_ADDRESS    - USDC/USDT token to approve for sale settlement
 *   SETTLEMENT_TOKEN_DECIMALS   - settlement token decimals; defaults to 6
 */
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

const EIP170_LIMIT = 24576;

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
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  const deploymentKey = process.env.DEPLOYMENT_KEY || network;
  const { deploymentsPath, deployments } = loadDeployments();
  const deployment = deployments[deploymentKey] || deployments[network] || {};
  const proxyAddress = process.env.FUND_PROXY_ADDRESS || deployment.proxy;
  const maxStaleness = BigInt(process.env.MAX_PRICE_FEED_STALENESS || "86400");
  const settlementToken = process.env.SETTLEMENT_TOKEN_ADDRESS || "";
  const settlementTokenDecimals = Number(process.env.SETTLEMENT_TOKEN_DECIMALS || "6");

  if (!proxyAddress) throw new Error("FUND_PROXY_ADDRESS env var or deployments.json proxy is required");

  console.log("Upgrading to GemMintStrategyFundV5");
  console.log("  Network       :", network);
  console.log("  Deployment key:", deploymentKey);
  console.log("  Proxy         :", proxyAddress);
  console.log("  Deployer      :", deployer.address);

  await assertDeployableSize("GemMintStrategyFundV5");

  const RegistryV2 = await ethers.getContractFactory("Gm10PortfolioRegistryV2");
  const registryV2 = await RegistryV2.deploy(proxyAddress);
  await registryV2.waitForDeployment();
  const registryV2Address = await registryV2.getAddress();
  console.log("  Registry V2   :", registryV2Address);

  const FundV5 = await ethers.getContractFactory("GemMintStrategyFundV5");
  await upgrades.validateUpgrade(proxyAddress, FundV5, { kind: "uups" });

  const fund = await upgrades.upgradeProxy(proxyAddress, FundV5, {
    kind: "uups",
    call: {
      fn: "initializeV5",
      args: [registryV2Address, maxStaleness],
    },
  });
  await fund.waitForDeployment();

  const implementationV5 = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("  Implementation V5:", implementationV5);

  if (settlementToken) {
    const tx = await fund.setSaleSettlementToken(settlementToken, true, settlementTokenDecimals);
    await tx.wait();
    console.log("  Settlement token approved:", settlementToken, `(${settlementTokenDecimals} decimals)`);
  } else {
    console.log("  Settlement token approval skipped; set SETTLEMENT_TOKEN_ADDRESS to configure USDC/USDT.");
  }

  deployments[deploymentKey] = {
    ...deployment,
    key: deploymentKey,
    network,
    proxy: proxyAddress,
    implementation: implementationV5,
    implementationV5,
    portfolioRegistryV1: deployment.portfolioRegistry,
    portfolioRegistry: registryV2Address,
    maxPriceFeedStaleness: maxStaleness.toString(),
    settlementToken: settlementToken || deployment.settlementToken,
    settlementTokenDecimals: settlementToken ? settlementTokenDecimals : deployment.settlementTokenDecimals,
    lastUpgrade: {
      from: deployment.implementation,
      to: implementationV5,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      portfolioRegistry: registryV2Address,
      settlementToken: settlementToken || null,
    },
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

  console.log("\nUpgrade complete.");
  console.log("Admin env:");
  console.log(`  VITE_GM10_ADMIN_FUND_PROXY_ADDRESS=${proxyAddress}`);
  console.log(`  VITE_GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS=${registryV2Address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
