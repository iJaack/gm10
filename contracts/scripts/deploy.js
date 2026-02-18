const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Ash Strategy Fund - Deployment Script");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "AVAX");

  // Deployment parameters
  const TREASURY_ADDRESS = deployer.address; // Use deployer as treasury initially
  const MANAGEMENT_FEE = 100; // 1% annual management fee (matches Fuji deployment)
  const PERFORMANCE_FEE = 1000; // 10% performance fee

  console.log("\n--- Deployment Parameters ---");
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Management Fee:", MANAGEMENT_FEE / 100, "%");
  console.log("Performance Fee:", PERFORMANCE_FEE / 100, "%");

  // Deploy the contract
  console.log("\n--- Deploying GemMintStrategyFund ---");

  const GemMintStrategyFund = await hre.ethers.getContractFactory("GemMintStrategyFund");
  const fund = await GemMintStrategyFund.deploy(
    TREASURY_ADDRESS,
    MANAGEMENT_FEE,
    PERFORMANCE_FEE
  );

  await fund.waitForDeployment();
  const fundAddress = await fund.getAddress();

  console.log("\nGemMintStrategyFund deployed to:", fundAddress);

  // Wait for confirmations
  console.log("\nWaiting for block confirmations...");
  const deployTx = fund.deploymentTransaction();
  if (deployTx) {
    await deployTx.wait(5); // Wait for 5 confirmations
  }

  // Verify initial state
  console.log("\n--- Verifying Initial State ---");

  const tokenName = await fund.name();
  const tokenSymbol = await fund.symbol();
  const navPerToken = await fund.navPerToken();
  const totalSupply = await fund.totalSupply();

  console.log("Token Name:", tokenName);
  console.log("Token Symbol:", tokenSymbol);
  console.log("Initial NAV per Token:", hre.ethers.formatEther(navPerToken), "AVAX");
  console.log("Total Supply:", hre.ethers.formatEther(totalSupply), "CATCH");

  // Log deployment info for verification
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Address:", fundAddress);
  console.log("Block Explorer URL:");

  if (hre.network.name === "avalanche") {
    console.log(`https://snowtrace.io/address/${fundAddress}`);
  } else if (hre.network.name === "fuji") {
    console.log(`https://testnet.snowtrace.io/address/${fundAddress}`);
  }

  console.log("\n--- Constructor Arguments for Verification ---");
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Management Fee:", MANAGEMENT_FEE);
  console.log("Performance Fee:", PERFORMANCE_FEE);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractAddress: fundAddress,
    deployer: deployer.address,
    treasury: TREASURY_ADDRESS,
    managementFee: MANAGEMENT_FEE,
    performanceFee: PERFORMANCE_FEE,
    deployedAt: new Date().toISOString(),
    transactionHash: deployTx ? deployTx.hash : "N/A",
  };

  console.log("\n--- Deployment Info (JSON) ---");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
