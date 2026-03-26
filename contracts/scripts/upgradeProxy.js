const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");
const EIP170_LIMIT = 24576;

async function assertDeployableSize(contractName) {
    const artifact = await hre.artifacts.readArtifact(contractName);
    const deployedBytecode = artifact.deployedBytecode || "0x";
    const size = Math.max(0, (deployedBytecode.length - 2) / 2);
    if (size > EIP170_LIMIT) {
        throw new Error(`${contractName} deployed bytecode is ${size} bytes, above EIP-170 limit ${EIP170_LIMIT}`);
    }
    console.log(`${contractName} deployed bytecode: ${size} bytes`);
}

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

    console.log("Deploying companion modules for the upgraded workflow...");
    const PortfolioRegistry = await ethers.getContractFactory("Gm10PortfolioRegistry");
    const portfolioRegistry = await PortfolioRegistry.deploy(proxyAddress);
    await portfolioRegistry.waitForDeployment();

    const InvestorAccounting = await ethers.getContractFactory("Gm10InvestorAccounting");
    const investorAccounting = await InvestorAccounting.deploy(proxyAddress);
    await investorAccounting.waitForDeployment();

    const GemMintStrategyFundV3 = await ethers.getContractFactory("GemMintStrategyFundV3");
    await assertDeployableSize("GemMintStrategyFundV3");

    const legacyProxy = await ethers.getContractAt(
        [{ inputs: [], name: "totalRefundLiabilities", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
        proxyAddress
    );
    const refundLiabilities = await legacyProxy.totalRefundLiabilities();
    if (refundLiabilities > 0n) {
        throw new Error(`Slim V3 upgrade blocked: totalRefundLiabilities=${refundLiabilities}`);
    }

    console.log("\nValidating upgrade...");
    await upgrades.validateUpgrade(proxyAddress, GemMintStrategyFundV3, {
        kind: "uups"
    });

    console.log("✅ Upgrade validation passed\n");
    console.log("Upgrading...");

    const requiredEnv = (name) => {
        const value = process.env[name];
        if (!value) throw new Error(`Missing required env var: ${name}`);
        return value;
    };

    const upgradeOpts = {
        kind: "uups",
        call: {
            fn: "initializeV3",
            args: [
                requiredEnv("CANONICAL_USDT"),
                requiredEnv("AVAX_USD_FEED"),
                requiredEnv("OPS_MULTISIG"),
                requiredEnv("GOVERNANCE_AUTHORITY"),
                requiredEnv("FAILSAFE_ADDRESS"),
                await portfolioRegistry.getAddress(),
                await investorAccounting.getAddress(),
            ],
        },
    };
    console.log("Calling initializeV3 during upgrade");

    const upgraded = await upgrades.upgradeProxy(proxyAddress, GemMintStrategyFundV3, upgradeOpts);

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
    deployments[network].portfolioRegistry = await portfolioRegistry.getAddress();
    deployments[network].investorAccounting = await investorAccounting.getAddress();
    deployments[network].lastUpgrade = {
        from: oldImplementation,
        to: newImplementation,
        timestamp: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber(),
        portfolioRegistry: deployments[network].portfolioRegistry,
        investorAccounting: deployments[network].investorAccounting,
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
