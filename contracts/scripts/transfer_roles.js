const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS;
    const FUND_ADDRESS = process.env.FUND_ADDRESS;

    if (!MULTISIG_ADDRESS) {
        throw new Error("MULTISIG_ADDRESS not set in .env");
    }
    if (!FUND_ADDRESS) {
        throw new Error("FUND_ADDRESS not set in .env");
    }

    console.log("Using deployer account:", deployer.address);
    console.log("Target Multisig:", MULTISIG_ADDRESS);
    console.log("Fund Address:", FUND_ADDRESS);

    const fund = await hre.ethers.getContractAt("AshStrategyFund", FUND_ADDRESS);

    // Roles (from contract source)
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MANAGER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MANAGER_ROLE"));
    const ORACLE_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ORACLE_ROLE"));
    const GOVERNANCE_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("GOVERNANCE_ROLE"));

    console.log("\n--- Granting Roles to Multisig ---");

    const roles = [
        { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE },
        { name: "MANAGER_ROLE", hash: MANAGER_ROLE },
        { name: "ORACLE_ROLE", hash: ORACLE_ROLE },
        { name: "GOVERNANCE_ROLE", hash: GOVERNANCE_ROLE },
    ];

    for (const role of roles) {
        const hasRole = await fund.hasRole(role.hash, MULTISIG_ADDRESS);
        if (!hasRole) {
            console.log(`Granting ${role.name}...`);
            const tx = await fund.grantRole(role.hash, MULTISIG_ADDRESS);
            await tx.wait();
            console.log(`✅ ${role.name} granted`);
        } else {
            console.log(`ℹ️ Multisig already has ${role.name}`);
        }
    }

    console.log("\n--- Updating Treasury Address ---");
    const currentTreasury = await fund.treasury();
    if (currentTreasury !== MULTISIG_ADDRESS) {
        console.log(`Setting treasury to Multisig...`);
        // Note: setTreasury is protected by DEFAULT_ADMIN_ROLE
        const tx = await fund.setTreasury(MULTISIG_ADDRESS);
        await tx.wait();
        console.log("✅ Treasury address updated");
    } else {
        console.log("ℹ️ Treasury is already the Multisig address");
    }

    console.log("\n--- Verification ---");
    const adminRoleCheck = await fund.hasRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS);
    console.log(`Multisig has Admin Role: ${adminRoleCheck}`);
    console.log(`Deployer retains Admin Role: ${await fund.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)}`);

    console.log("\nDONE! Multisig setup complete. (Deployer rights retained)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
