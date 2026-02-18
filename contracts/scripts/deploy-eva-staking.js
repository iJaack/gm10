const hre = require("hardhat");
const { ethers, upgrades } = hre;
const fs = require("fs");

/**
 * Deploy EVAStaking as a UUPS proxy and wire it to the GemMintStrategyFund.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-eva-staking.js --network fuji
 *   npx hardhat run scripts/deploy-eva-staking.js --network avalanche
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying EVAStaking with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // ---- Configuration ----
    const EVA_TOKEN = process.env.EVA_TOKEN_ADDRESS || "0x6Ae3b236d5546369db49AFE3AecF7e32c5F27672";

    // Load fund proxy address from deployments.json
    const deploymentsPath = "./deployments.json";
    let fundProxy = process.env.FUND_PROXY_ADDRESS || "";

    if (!fundProxy && fs.existsSync(deploymentsPath)) {
        const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
        const networkName = hre.network.name;
        if (deployments[networkName]?.proxy) {
            fundProxy = deployments[networkName].proxy;
        }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("EVA Token:", EVA_TOKEN);
    console.log("Fund Proxy:", fundProxy || "(not set — will skip wiring)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // ---- Deploy EVAStaking proxy ----
    console.log("Deploying EVAStaking as UUPS proxy...");

    const EVAStaking = await ethers.getContractFactory("EVAStaking");
    const proxy = await upgrades.deployProxy(
        EVAStaking,
        [EVA_TOKEN, deployer.address],
        {
            kind: "uups",
            initializer: "initialize",
        }
    );

    await proxy.waitForDeployment();

    const proxyAddress = await proxy.getAddress();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    console.log("\n✅ EVAStaking deployed!");
    console.log("Proxy:", proxyAddress);
    console.log("Implementation:", implementationAddress);

    // ---- Wire to fund contract ----
    if (fundProxy) {
        console.log("\nWiring EVAStaking to GemMintStrategyFund...");
        try {
            const fundABI = [
                {
                    inputs: [{ name: "_evaStaking", type: "address" }],
                    name: "setEVAStakingContract",
                    outputs: [],
                    stateMutability: "nonpayable",
                    type: "function",
                },
            ];
            const fund = new ethers.Contract(fundProxy, fundABI, deployer);
            const tx = await fund.setEVAStakingContract(proxyAddress);
            await tx.wait();
            console.log("✅ Fund contract wired! tx:", tx.hash);
        } catch (err) {
            console.warn("⚠️  Could not wire to fund contract:", err.message);
            console.warn("   You may need to call setEVAStakingContract() manually.");
        }
    } else {
        console.log("\n⚠️  No fund proxy address found. Call setEVAStakingContract() manually after deployment.");
    }

    // ---- Save deployment info ----
    const networkName = hre.network.name;
    const network = await ethers.provider.getNetwork();

    let deployments = {};
    if (fs.existsSync(deploymentsPath)) {
        deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    }

    if (!deployments[networkName]) {
        deployments[networkName] = {};
    }

    deployments[networkName].evaStaking = {
        proxy: proxyAddress,
        implementation: implementationAddress,
        evaToken: EVA_TOKEN,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber(),
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("\n📝 Deployment info saved to deployments.json");

    // ---- Next steps ----
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Next steps:");
    console.log(`1. Add to .env: VITE_EVA_STAKING_ADDRESS=${proxyAddress}`);
    if (!fundProxy) {
        console.log("2. Wire to fund: call fund.setEVAStakingContract(\"" + proxyAddress + "\")");
    }
    console.log("3. Verify on Snowtrace:");
    console.log(`   npx hardhat verify --network ${networkName} ${implementationAddress}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
