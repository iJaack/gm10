const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Configuration
    const TREASURY_ADDRESS = deployer.address; // Replace with actual multisig address for mainnet
    const MANAGEMENT_FEE = 100;  // 1% (100 basis points)
    const PERFORMANCE_FEE = 1000; // 10% (1000 basis points)

    console.log("\nDeploying GemMintStrategyFundV1 with proxy...");

    // Deploy implementation + proxy
    const GemMintStrategyFund = await ethers.getContractFactory("GemMintStrategyFundV1");

    const proxy = await upgrades.deployProxy(
        GemMintStrategyFund,
        [
            TREASURY_ADDRESS,
            MANAGEMENT_FEE,
            PERFORMANCE_FEE
        ],
        {
            kind: "uups",
            initializer: "initialize"
        }
    );

    await proxy.waitForDeployment();

    const proxyAddress = await proxy.getAddress();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    console.log("\n✅ Deployment successful!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Proxy Address:", proxyAddress);
    console.log("Implementation Address:", implementationAddress);
    console.log("Treasury:", TREASURY_ADDRESS);
    console.log("Management Fee:", MANAGEMENT_FEE, "basis points (", MANAGEMENT_FEE / 100, "%)");
    console.log("Performance Fee:", PERFORMANCE_FEE, "basis points (", PERFORMANCE_FEE / 100, "%)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Save deployment info
    const networkName = hre.network.name;
    const network = await ethers.provider.getNetwork();
    const deployment = {
        network: networkName,
        chainId: network.chainId.toString(),
        proxy: proxyAddress,
        implementation: implementationAddress,
        treasury: TREASURY_ADDRESS,
        managementFee: MANAGEMENT_FEE,
        performanceFee: PERFORMANCE_FEE,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber()
    };

    const deploymentsPath = "./deployments.json";
    let deployments = {};

    if (fs.existsSync(deploymentsPath)) {
        deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    }

    deployments[deployment.network] = deployment;

    fs.writeFileSync(
        deploymentsPath,
        JSON.stringify(deployments, null, 2)
    );

    console.log("📝 Deployment info saved to deployments.json\n");

    // Configuration instructions
    console.log("Next steps:");
    console.log("1. Configure DEX integration:");
    console.log("   - Call updateDexConfig() with Trader Joe router and USDC addresses");
    console.log("2. Transfer roles to multisig (for mainnet)");
    console.log("3. Update frontend with proxy address:", proxyAddress);
    console.log("4. Verify contracts on Snowtrace");
    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
