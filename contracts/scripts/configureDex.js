const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

async function main() {
    console.log("Configuring DEX integration...\n");

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

    // Network-specific addresses
    const CONFIG = {
        fuji: {
            dexRouter: "0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901", // Trader Joe V2.1 Router (Fuji)
            usdcToken: "0x5425890298aed601595a70AB815c96711a31Bc65"  // USDC (Fuji)
        },
        avalanche: {
            dexRouter: "0x18556DA13313f3532c54711497A8FedAC273220E", // Trader Joe V2.1 Router (Mainnet)
            usdcToken: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"  // USDC (Mainnet)
        }
    };

    const config = CONFIG[network] || CONFIG.fuji;

    console.log("Network:", network);
    console.log("Proxy Address:", proxyAddress);
    console.log("DEX Router:", config.dexRouter);
    console.log("USDC Token:", config.usdcToken);
    console.log("\n");

    // Get contract
    const contract = await ethers.getContractAt("GemMintStrategyFundV1", proxyAddress);

    // Update configuration
    console.log("Calling updateDexConfig()...");
    const tx = await contract.updateDexConfig(config.dexRouter, config.usdcToken);
    console.log("Transaction hash:", tx.hash);

    console.log("Waiting for confirmation...");
    await tx.wait();

    console.log("\n✅ DEX configuration updated successfully!\n");

    // Verify configuration
    const dexRouter = await contract.dexRouter();
    const usdcToken = await contract.usdcToken();
    const buybackPercentage = await contract.buybackPercentage();
    const lpAllocation = await contract.lpAllocation();

    console.log("Current Configuration:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("DEX Router:", dexRouter);
    console.log("USDC Token:", usdcToken);
    console.log("Buyback Percentage:", buybackPercentage.toString(), "basis points (", buybackPercentage / 100, "%)");
    console.log("LP Allocation:", lpAllocation.toString(), "basis points (", lpAllocation / 100, "%)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
