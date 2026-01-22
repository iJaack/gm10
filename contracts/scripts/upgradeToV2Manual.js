const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading to V2 with account:", deployer.address);

    const networkName = hre.network.name;
    let deployments = {};
    try {
        deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    } catch (e) {
        console.log("No deployments.json found");
    }
    const currentDeployment = deployments[networkName] || deployments;
    const proxyAddress = currentDeployment.proxy;

    if (!proxyAddress) {
        throw new Error(`Token proxy address not found for network: ${networkName}`);
    }
    console.log("Proxy Address:", proxyAddress);

    // 1. Deploy V2 Implementation
    console.log("Deploying GemMintStrategyFundV2 Implementation...");
    const GemMintStrategyFundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");
    const v2Impl = await GemMintStrategyFundV2.deploy();
    await v2Impl.waitForDeployment();
    const v2ImplAddress = await v2Impl.getAddress();
    console.log("V2 Implementation:", v2ImplAddress);

    // 2. Prepare upgrade data (initializeV2)
    const initData = GemMintStrategyFundV2.interface.encodeFunctionData("initializeV2");

    // 3. Execute upgradeToAndCall on the Proxy
    // The proxy delegates to V1, which has UUPSUpgradeable
    console.log("Executing upgradeToAndCall...");
    const proxy = GemMintStrategyFundV2.attach(proxyAddress);

    const tx = await proxy.upgradeToAndCall(v2ImplAddress, initData);
    console.log("Upgrade transaction sent:", tx.hash);
    await tx.wait();
    console.log("Upgrade confirmed!");

    // Update deployments.json
    if (!deployments[networkName]) deployments[networkName] = {};
    deployments[networkName].implementationV2 = v2ImplAddress;
    deployments[networkName].lastUpgrade = new Date().toISOString();

    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Upgrade complete! info saved.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
