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
  if (!address) return null;

  try {
    await hre.run("verify:verify", {
      address,
      contract,
      constructorArguments,
      noCompile: true,
    });
    console.log(`verified ${contract} at ${address}`);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("already verified")) {
      console.log(`already verified ${contract} at ${address}`);
      return null;
    }
    console.error(`failed ${contract} at ${address}: ${message}`);
    return { address, contract, message };
  }
}

function addUnique(entries, seen, entry) {
  if (!entry.address || !entry.contract) return;
  const key = `${entry.address.toLowerCase()}|${entry.contract}`;
  if (seen.has(key)) return;
  seen.add(key);
  entries.push(entry);
}

function buildVerificationEntries(deployment, networkName) {
  const entries = [];
  const seen = new Set();

  addUnique(entries, seen, {
    address: deployment.implementationV3,
    contract: "contracts/GemMintStrategyFundV3.sol:GemMintStrategyFundV3",
  });
  addUnique(entries, seen, {
    address: deployment.implementationV5,
    contract: "contracts/GemMintStrategyFundV5.sol:GemMintStrategyFundV5",
  });
  addUnique(entries, seen, {
    address: deployment.implementationV6 || deployment.lastConfigUpgrade?.to,
    contract: "contracts/GemMintStrategyFundV6.sol:GemMintStrategyFundV6",
  });
  addUnique(entries, seen, {
    address: deployment.implementationV7 || deployment.lastTokenomicsUpgrade?.to,
    contract: "contracts/GemMintStrategyFundV7.sol:GemMintStrategyFundV7",
    constructorArguments: deployment.tokenomicsController ? [deployment.tokenomicsController] : [],
  });
  addUnique(entries, seen, {
    address: deployment.lastContinuousAccrualUpgrade?.initialImplementation,
    contract: "contracts/GemMintStrategyFundV8.sol:GemMintStrategyFundV8",
    constructorArguments: deployment.tokenomicsController ? [deployment.tokenomicsController] : [],
  });
  addUnique(entries, seen, {
    address: deployment.implementationV8 || deployment.lastContinuousAccrualUpgrade?.to,
    contract: "contracts/GemMintStrategyFundV8.sol:GemMintStrategyFundV8",
    constructorArguments: deployment.tokenomicsController ? [deployment.tokenomicsController] : [],
  });
  addUnique(entries, seen, {
    address: deployment.tokenomicsController,
    contract: "contracts/Gm10TokenomicsV7Controller.sol:Gm10TokenomicsV7Controller",
    constructorArguments: deployment.lastTokenomicsUpgrade?.segmentWallets
      ? [deployment.proxy, ...deployment.lastTokenomicsUpgrade.segmentWallets]
      : [],
  });
  addUnique(entries, seen, {
    address: deployment.portfolioRegistryV1,
    contract: "contracts/Gm10PortfolioRegistry.sol:Gm10PortfolioRegistry",
    constructorArguments: [deployment.proxy],
  });
  addUnique(entries, seen, {
    address: deployment.portfolioRegistryV2Migrated,
    contract: "contracts/Gm10MigratedPortfolioRegistryV2.sol:Gm10MigratedPortfolioRegistryV2",
    constructorArguments: deployment.lastPortfolioRegistryMigration
      ? [
          deployment.proxy,
          deployment.lastPortfolioRegistryMigration.sourceRegistry,
          deployment.lastPortfolioRegistryMigration.positionCount,
        ]
      : [],
  });
  if (!deployment.portfolioRegistryV2Migrated) {
    addUnique(entries, seen, {
      address: deployment.portfolioRegistry,
      contract: "contracts/Gm10PortfolioRegistry.sol:Gm10PortfolioRegistry",
      constructorArguments: [deployment.proxy],
    });
  }
  addUnique(entries, seen, {
    address: deployment.investorAccounting,
    contract: "contracts/Gm10InvestorAccounting.sol:Gm10InvestorAccounting",
    constructorArguments: [deployment.proxy],
  });
  addUnique(entries, seen, {
    address: deployment.lastPortfolioRegistryMigration?.pointerImplementation,
    contract: "contracts/Gm10RegistryPointerUpgrade.sol:Gm10RegistryPointerUpgrade",
  });
  addUnique(entries, seen, {
    address: deployment.lastLegacyStorageRepair?.repairImplementation,
    contract: "contracts/Gm10LegacyStorageRepairUpgrade.sol:Gm10LegacyStorageRepairUpgrade",
  });
  addUnique(entries, seen, {
    address: deployment.liquidTreasuryReconciliation?.reconciliationUpgrade,
    contract: "contracts/Gm10LiquidTreasuryReconciliationUpgrade.sol:Gm10LiquidTreasuryReconciliationUpgrade",
  });

  if (networkName === "fuji" && deployment.implementation && !deployment.implementationV3) {
    addUnique(entries, seen, {
      address: deployment.implementation,
      contract: "contracts/GemMintStrategyFundV3.sol:GemMintStrategyFundV3",
    });
  }

  return entries;
}

async function main() {
  const deploymentKey = process.env.DEPLOYMENT_KEY || network.name;
  const deployment = deployments[deploymentKey];
  if (!deployment) {
    throw new Error(`No deployment found for key ${deploymentKey}`);
  }

  console.log(`Verifying deployment key: ${deploymentKey}`);

  const provider = ethers.provider;

  const failures = [];
  for (const entry of buildVerificationEntries(deployment, network.name)) {
    const failure = await verifyContract(entry);
    if (failure) failures.push(failure);
  }

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

  if (failures.length > 0) {
    console.error(`Verification completed with ${failures.length} failure(s).`);
    for (const failure of failures) {
      console.error(`- ${failure.contract} at ${failure.address}: ${failure.message.split("\n")[0]}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
