const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");
const EIP170_LIMIT = 24576;

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}

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
    console.log("Deploying contracts with account:", deployer.address);

    const OPS_MULTISIG = requiredEnv("OPS_MULTISIG");
    const GOVERNANCE_AUTHORITY = requiredEnv("GOVERNANCE_AUTHORITY");
    const FAILSAFE_ADDRESS = requiredEnv("FAILSAFE_ADDRESS");
    const CANONICAL_USDT = requiredEnv("CANONICAL_USDT");
    const AVAX_USD_FEED = requiredEnv("AVAX_USD_FEED");

    const MANAGEMENT_FEE = BigInt(process.env.MANAGEMENT_FEE_BPS || "100");
    const PERFORMANCE_FEE = BigInt(process.env.PERFORMANCE_FEE_BPS || "1000");

    const FundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");
    const proxy = await upgrades.deployProxy(
        FundV2,
        [OPS_MULTISIG, MANAGEMENT_FEE, PERFORMANCE_FEE],
        { kind: "uups", initializer: "initialize" }
    );
    await proxy.waitForDeployment();

    const proxyAddress = await proxy.getAddress();

    console.log("Proxy deployed at:", proxyAddress);
    console.log("Deploying companion modules...");

    const PortfolioRegistry = await ethers.getContractFactory("Gm10PortfolioRegistry");
    const portfolioRegistry = await PortfolioRegistry.deploy(proxyAddress);
    await portfolioRegistry.waitForDeployment();

    const InvestorAccounting = await ethers.getContractFactory("Gm10InvestorAccounting");
    const investorAccounting = await InvestorAccounting.deploy(proxyAddress);
    await investorAccounting.waitForDeployment();

    console.log("Upgrading proxy to V3 and wiring modules...");
    const FundV3 = await ethers.getContractFactory("GemMintStrategyFundV3");
    await assertDeployableSize("GemMintStrategyFundV3");
    await upgrades.validateUpgrade(proxyAddress, FundV3, { kind: "uups" });

    const legacyProxy = await ethers.getContractAt(
        [{ inputs: [], name: "totalRefundLiabilities", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
        proxyAddress
    );
    const refundLiabilities = await legacyProxy.totalRefundLiabilities();
    if (refundLiabilities > 0n) {
        throw new Error(`Slim V3 upgrade blocked: totalRefundLiabilities=${refundLiabilities}`);
    }

    const upgraded = await upgrades.upgradeProxy(proxyAddress, FundV3, {
        kind: "uups",
        call: {
            fn: "initializeV3",
            args: [
                CANONICAL_USDT,
                AVAX_USD_FEED,
                OPS_MULTISIG,
                GOVERNANCE_AUTHORITY,
                FAILSAFE_ADDRESS,
                await portfolioRegistry.getAddress(),
                await investorAccounting.getAddress(),
            ],
        },
    });
    await upgraded.waitForDeployment();

    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    const deployment = {
        network: hre.network.name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        proxy: proxyAddress,
        implementation: implementationAddress,
        portfolioRegistry: await portfolioRegistry.getAddress(),
        investorAccounting: await investorAccounting.getAddress(),
        treasury: OPS_MULTISIG,
        canonicalUsdt: CANONICAL_USDT,
        avaxUsdFeed: AVAX_USD_FEED,
        governanceAuthority: GOVERNANCE_AUTHORITY,
        failsafe: FAILSAFE_ADDRESS,
        managementFee: MANAGEMENT_FEE.toString(),
        performanceFee: PERFORMANCE_FEE.toString(),
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber()
    };

    const deploymentsPath = "./deployments.json";
    const deployments = fs.existsSync(deploymentsPath)
        ? JSON.parse(fs.readFileSync(deploymentsPath, "utf8"))
        : {};

    deployments[deployment.network] = deployment;
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

    console.log("\nDeployment complete");
    console.log("Proxy:", proxyAddress);
    console.log("Implementation:", implementationAddress);
    console.log("Portfolio registry:", deployment.portfolioRegistry);
    console.log("Investor accounting:", deployment.investorAccounting);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
