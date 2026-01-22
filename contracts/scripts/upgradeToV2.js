const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading to V2 with account:", deployer.address);

    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    const proxyAddress = deployments.proxy;

    console.log("Proxy Address:", proxyAddress);

    // Deploy V2 Implementation and Upgrade
    const GemMintStrategyFundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");

    console.log("Upgrading proxy...");
    // Use upgradeProxy with 'call' to trigger initializeV2
    const upgraded = await upgrades.upgradeProxy(proxyAddress, GemMintStrategyFundV2, {
        kind: "uups",
        call: { fn: "initializeV2" }
    });

    await upgraded.waitForDeployment();

    const newImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    console.log("Proxy upgraded to V2 successfully");
    console.log("New Implementation:", newImplementation);

    // Update deployments.json
    deployments.implementationV2 = newImplementation;
    deployments.lastUpgrade = new Date().toISOString();
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
