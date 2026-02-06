const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying governance with account:", deployer.address);

    const networkName = hre.network.name;
    let deployments = {};
    try {
        deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    } catch (e) {
        console.log("No deployments.json found");
    }

    // Handle nested structure or flat structure
    const currentDeployment = deployments[networkName] || deployments;
    const tokenAddress = currentDeployment.proxy;

    if (!tokenAddress) {
        throw new Error(`Token proxy address not found for network: ${networkName}`);
    }
    console.log("Token (Proxy) Address:", tokenAddress);

    // 1. Deploy GemMintTimelock (TimelockControllerUpgradeable)
    // We use Transparent Proxy for Timelock as it doesn't support UUPS natively without extension
    console.log("Deploying GemMintTimelock...");
    const GemMintTimelock = await ethers.getContractFactory("GemMintTimelock");
    const minDelay = 120; // 2 minutes for testing on Fuji
    // Proposers: [], Executors: [] (will be set later)
    // Admin: deployer
    const timelock = await upgrades.deployProxy(GemMintTimelock, [
        minDelay,
        [],
        [],
        deployer.address
    ]);
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();
    console.log("GemMintTimelock deployed to:", timelockAddress);

    // 2. Deploy Governor
    console.log("Deploying GemMintGovernor...");
    const GemMintGovernor = await ethers.getContractFactory("GemMintGovernor");
    const governor = await upgrades.deployProxy(GemMintGovernor, [
        tokenAddress,
        timelockAddress
    ], {
        kind: "uups",
        unsafeAllow: ["constructor"]
    });
    await governor.waitForDeployment();
    const governorAddress = await governor.getAddress();
    console.log("GemMintGovernor deployed to:", governorAddress);

    // 3. Setup Roles
    console.log("Setting up Timelock roles...");

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    // const TIMELOCK_ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE(); // depends on version

    // Grant Proposer role to Governor
    await (await timelock.grantRole(PROPOSER_ROLE, governorAddress)).wait();
    console.log("Granted PROPOSER_ROLE to Governor");

    // Grant Executor role to everyone (address(0)) so anyone can execute after delay
    await (await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress)).wait();
    console.log("Granted EXECUTOR_ROLE to everyone");

    // (Optional) Revoke admin role from deployer so only governance controls timelock
    // await block.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address); 
    // keeping it for now for safety during testnet phase

    // Save deployment info
    if (!deployments[networkName]) deployments[networkName] = {};
    deployments[networkName].timelock = timelockAddress;
    deployments[networkName].governor = governorAddress;

    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment complete! Info saved to deployments.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
