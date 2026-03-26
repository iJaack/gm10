const hre = require("hardhat");
const { ethers } = hre;

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying OFT adapter with account:", deployer.address);

    const token = requiredEnv("TOKEN_PROXY");
    const endpoint = requiredEnv("LZ_ENDPOINT");
    const delegate = requiredEnv("LZ_DELEGATE");
    const owner = requiredEnv("OFT_OWNER");

    const Adapter = await ethers.getContractFactory("CatchOFTAdapter");
    const adapter = await Adapter.deploy(token, endpoint, delegate, owner);
    await adapter.waitForDeployment();

    console.log("CatchOFTAdapter:", await adapter.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
