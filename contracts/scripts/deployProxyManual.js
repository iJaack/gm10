const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Manual UUPS Proxy Deployment (Ledger-compatible)
 * Bypasses OpenZeppelin upgrades plugin's lock file mechanism
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Configuration
    const TREASURY_ADDRESS = deployer.address; // Replace with actual multisig for mainnet
    const MANAGEMENT_FEE = 100;  // 1% (100 basis points)
    const PERFORMANCE_FEE = 1000; // 10% (1000 basis points)

    console.log("\n=== Step 1: Deploy Implementation Contract ===");

    // Deploy implementation
    const GemMintStrategyFundV1 = await ethers.getContractFactory("GemMintStrategyFundV1");
    console.log("Deploying GemMintStrategyFundV1 implementation...");

    const implementation = await GemMintStrategyFundV1.deploy();
    await implementation.waitForDeployment();

    const implementationAddress = await implementation.getAddress();
    console.log("✅  Implementation deployed at:", implementationAddress);

    console.log("\n=== Step 2: Encode Initialize Data ===");

    // Encode initialize function call
    const initializeData = implementation.interface.encodeFunctionData(
        "initialize",
        [TREASURY_ADDRESS, MANAGEMENT_FEE, PERFORMANCE_FEE]
    );
    console.log("✅  Initialize data encoded");

    console.log("\n=== Step 3: Deploy ERC1967Proxy ===");

    // Get GemMintProxy contract factory (wrapper for ERC1967Proxy)
    const GemMintProxy = await ethers.getContractFactory("GemMintProxy");

    console.log("Deploying ERC1967Proxy...");
    const proxy = await GemMintProxy.deploy(implementationAddress, initializeData);
    await proxy.waitForDeployment();

    const proxyAddress = await proxy.getAddress();
    console.log("✅  Proxy deployed at:", proxyAddress);

    console.log("\n=== Deployment Summary ===");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅  DEPLOYMENT SUCCESSFUL!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Proxy Address:        ", proxyAddress);
    console.log("Implementation:       ", implementationAddress);
    console.log("Treasury:             ", TREASURY_ADDRESS);
    console.log("Management Fee:       ", MANAGEMENT_FEE, "bp (", MANAGEMENT_FEE / 100, "%)");
    console.log("Performance Fee:      ", PERFORMANCE_FEE, "bp (", PERFORMANCE_FEE / 100, "%)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Verify implementation points to proxy
    const proxyContract = await ethers.getContractAt("GemMintStrategyFundV1", proxyAddress);
    const name = await proxyContract.name();
    const symbol = await proxyContract.symbol();
    console.log("Verification:");
    console.log("  Token Name:   ", name);
    console.log("  Token Symbol: ", symbol);
    console.log("  ✅  Proxy correctly points to implementation\n");

    // Save deployment info
    const deployment = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
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

    // Next steps
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("NEXT STEPS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. Configure DEX integration:");
    console.log("   npx hardhat run scripts/configureDex.js --network fuji");
    console.log("");
    console.log("2. Verify contracts on Snowtrace:");
    console.log("   npx hardhat verify --network fuji", implementationAddress);
    console.log("   npx hardhat verify --network fuji", proxyAddress, implementationAddress, initializeData);
    console.log("");
    console.log("3. Update frontend with proxy address:", proxyAddress);
    console.log("");
    console.log("4. For mainnet:");
    console.log("   - Transfer roles to multisig wallet");
    console.log("   - Test all contract functions thoroughly");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
