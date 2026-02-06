const hre = require("hardhat");
const { ethers } = hre;
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
    const currentDeployment = deployments[networkName] || deployments;
    const tokenAddress = currentDeployment.proxy;

    if (!tokenAddress) {
        throw new Error(`Token proxy address not found for network: ${networkName}`);
    }
    console.log("Token (Proxy) Address:", tokenAddress);

    // ============ Deploy GemMintTimelock ============
    console.log("Deploying GemMintTimelock Implementation...");
    const GemMintTimelock = await ethers.getContractFactory("GemMintTimelock");
    const timelockImpl = await GemMintTimelock.deploy();
    await timelockImpl.waitForDeployment();
    const timelockImplAddress = await timelockImpl.getAddress();
    console.log("Timelock Implementation:", timelockImplAddress);

    console.log("Deploying Timelock Proxy...");
    const GemMintProxy = await ethers.getContractFactory("GemMintProxy");

    // Prepare Initialization Call
    // initialize(minDelay, proposers, executors, admin)
    const minDelay = 120; // 2 minutes
    const initDataTimelock = GemMintTimelock.interface.encodeFunctionData("initialize", [
        minDelay,
        [],
        [],
        deployer.address
    ]);

    const timelockProxy = await GemMintProxy.deploy(timelockImplAddress, initDataTimelock);
    await timelockProxy.waitForDeployment();
    const timelockProxyAddress = await timelockProxy.getAddress();
    console.log("Timelock Proxy:", timelockProxyAddress);

    // Use interface to interact with proxy
    const timelock = GemMintTimelock.attach(timelockProxyAddress);

    // ============ Deploy GemMintGovernor ============
    console.log("Deploying GemMintGovernor Implementation...");
    const GemMintGovernor = await ethers.getContractFactory("GemMintGovernor");
    const governorImpl = await GemMintGovernor.deploy();
    await governorImpl.waitForDeployment();
    const governorImplAddress = await governorImpl.getAddress();
    console.log("Governor Implementation:", governorImplAddress);

    console.log("Deploying Governor Proxy...");
    // initialize(token, timelock)
    const initDataGovernor = GemMintGovernor.interface.encodeFunctionData("initialize", [
        tokenAddress,
        timelockProxyAddress
    ]);

    const governorProxy = await GemMintProxy.deploy(governorImplAddress, initDataGovernor);
    await governorProxy.waitForDeployment();
    const governorProxyAddress = await governorProxy.getAddress();
    console.log("Governor Proxy:", governorProxyAddress);

    // ============ Setup Roles ============
    console.log("Setting up Timelock roles...");

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();

    // Grant Proposer role to Governor
    // Since we are the admin (passed in initialize), we can grant roles
    console.log("Granting PROPOSER_ROLE to Governor...");
    let tx = await timelock.grantRole(PROPOSER_ROLE, governorProxyAddress);
    await tx.wait();
    console.log("Granted PROPOSER_ROLE");

    // Grant Executor role to everyone
    console.log("Granting EXECUTOR_ROLE to everyone...");
    tx = await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
    await tx.wait();
    console.log("Granted EXECUTOR_ROLE");

    // Save deployment info
    if (!deployments[networkName]) deployments[networkName] = {};
    deployments[networkName].timelock = timelockProxyAddress;
    deployments[networkName].timelockImpl = timelockImplAddress;
    deployments[networkName].governor = governorProxyAddress;
    deployments[networkName].governorImpl = governorImplAddress;

    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment complete! Info saved to deployments.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
