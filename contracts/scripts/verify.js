const hre = require("hardhat");
const { ethers, network } = hre;
const deployments = require("../deployments.json");

const ERC20_METADATA_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
];

const AGGREGATOR_METADATA_ABI = [
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
];

async function verifyContract({ address, contract, constructorArguments = [] }) {
  if (!address) return;

  try {
    await hre.run("verify:verify", {
      address,
      contract,
      constructorArguments,
    });
    console.log(`verified ${contract} at ${address}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("already verified")) {
      console.log(`already verified ${contract} at ${address}`);
      return;
    }
    throw error;
  }
}

async function main() {
  if (!process.env.SNOWTRACE_API_KEY) {
    throw new Error("SNOWTRACE_API_KEY is required to verify contracts on Snowtrace");
  }

  const deployment = deployments[network.name];
  if (!deployment) {
    throw new Error(`No deployment found for network ${network.name}`);
  }

  const provider = ethers.provider;

  await verifyContract({
    address: deployment.implementationV3 || deployment.implementation,
    contract: "contracts/GemMintStrategyFundV3.sol:GemMintStrategyFundV3",
  });

  await verifyContract({
    address: deployment.portfolioRegistry,
    contract: "contracts/Gm10PortfolioRegistry.sol:Gm10PortfolioRegistry",
    constructorArguments: [deployment.proxy],
  });

  await verifyContract({
    address: deployment.investorAccounting,
    contract: "contracts/Gm10InvestorAccounting.sol:Gm10InvestorAccounting",
    constructorArguments: [deployment.proxy],
  });

  if (network.name === "fuji" && deployment.canonicalUsdt && deployment.avaxUsdFeed) {
    const mockUsdt = new ethers.Contract(deployment.canonicalUsdt, ERC20_METADATA_ABI, provider);
    const mockFeed = new ethers.Contract(deployment.avaxUsdFeed, AGGREGATOR_METADATA_ABI, provider);

    const [name, symbol, decimals, latestRoundData] = await Promise.all([
      mockUsdt.name(),
      mockUsdt.symbol(),
      mockFeed.decimals(),
      mockFeed.latestRoundData(),
    ]);

    await verifyContract({
      address: deployment.canonicalUsdt,
      contract: "contracts/mocks/MockERC20.sol:MockERC20",
      constructorArguments: [name, symbol],
    });

    await verifyContract({
      address: deployment.avaxUsdFeed,
      contract: "contracts/mocks/MockAggregatorV3.sol:MockAggregatorV3",
      constructorArguments: [decimals, latestRoundData[1]],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
