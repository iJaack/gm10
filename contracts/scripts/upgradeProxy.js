const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading contract with account:", deployer.address);

    // Load deployment info
    const deploymentsPath = "./deployments.json";
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error("deployments.json not found. Deploy proxy first.");
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    const network = hre.network.name;

    if (!deployments[network]) {
        throw new Error(`No deployment found for network: ${network}`);
    }

    const proxyAddress = deployments[network].proxy;
    const oldImplementation = deployments[network].implementation;

    console.log("\nUpgrading proxy at:", proxyAddress);
    console.log("Current implementation:", oldImplementation);

    // Get new implementation contract
    // Change this to GemMintStrategyFundV2, V3, etc. for future upgrades
    const GemMintStrategyFundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");

    console.log("\nValidating upgrade...");
    await upgrades.validateUpgrade(proxyAddress, GemMintStrategyFundV2, {
        kind: "uups"
    });

    console.log("✅ Upgrade validation passed\n");
    console.log("Upgrading...");

    const initFn = process.env.INIT_FN;
    const initArgs = process.env.INIT_ARGS ? JSON.parse(process.env.INIT_ARGS) : [];

    const upgradeOpts = { kind: "uups" };
    if (initFn) {
        upgradeOpts.call = { fn: initFn, args: initArgs };
        console.log(`Calling initializer during upgrade: ${initFn}(${initArgs.map(() => "?").join(", ")})`);
    }

    const upgraded = await upgrades.upgradeProxy(proxyAddress, GemMintStrategyFundV2, upgradeOpts);

    await upgraded.waitForDeployment();

    const newImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    console.log("\n✅ Upgrade successful!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Proxy Address:", proxyAddress, "(unchanged)");
    console.log("Old Implementation:", oldImplementation);
    console.log("New Implementation:", newImplementation);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Update deployment info
    deployments[network].implementation = newImplementation;
    deployments[network].lastUpgrade = {
        from: oldImplementation,
        to: newImplementation,
        timestamp: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber()
    };

    fs.writeFileSync(
        deploymentsPath,
        JSON.stringify(deployments, null, 2)
    );

    console.log("📝 Deployment info updated\n");
    console.log("Verify new implementation on Snowtrace\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
