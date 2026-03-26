const hre = require("hardhat");

/**
 * Script to set up the first fundraising round after deployment
 * Run after deploy.js has completed
 */
async function main() {
  console.log("=".repeat(60));
  console.log("Gem Mint Strategy - Fundraising Round Setup");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(60));

  // Contract address - UPDATE THIS after deployment
  const FUND_ADDRESS = process.env.FUND_ADDRESS;

  if (!FUND_ADDRESS) {
    console.error("Please set FUND_ADDRESS environment variable");
    process.exit(1);
  }

  const [manager] = await hre.ethers.getSigners();
  console.log("\nManager address:", manager.address);

  // Get contract instance
  const fund = await hre.ethers.getContractAt("GemMintStrategyFundV3", FUND_ADDRESS);
  console.log("Fund contract:", FUND_ADDRESS);

  // Fundraising parameters (must match frontend/docs values)
  const TARGET_AMOUNT = hre.ethers.parseEther("500"); // 500 AVAX target
  const TOKEN_PRICE = hre.ethers.parseEther("0.0025"); // 0.0025 AVAX per CATCH
  const MIN_INVESTMENT = hre.ethers.parseEther("0.1"); // 0.1 AVAX minimum
  const MAX_INVESTMENT = hre.ethers.parseEther("200"); // 200 AVAX max per address

  // Round timing - 14 days from now
  const now = Math.floor(Date.now() / 1000);
  const START_TIME = now + 60; // Start in 1 minute
  const END_TIME = now + 14 * 24 * 60 * 60; // End in 14 days

  console.log("\n--- Fundraising Round Parameters ---");
  console.log("Target Amount:", hre.ethers.formatEther(TARGET_AMOUNT), "AVAX");
  console.log("Token Price:", hre.ethers.formatEther(TOKEN_PRICE), "AVAX per CATCH");
  console.log("Min Investment:", hre.ethers.formatEther(MIN_INVESTMENT), "AVAX");
  console.log("Max Investment:", hre.ethers.formatEther(MAX_INVESTMENT), "AVAX");
  console.log("Start Time:", new Date(START_TIME * 1000).toISOString());
  console.log("End Time:", new Date(END_TIME * 1000).toISOString());

  // Create the fundraising round
  console.log("\n--- Creating Fundraising Round ---");

  const tx = await fund.createFundraisingRound(
    TARGET_AMOUNT,
    TOKEN_PRICE,
    MIN_INVESTMENT,
    MAX_INVESTMENT,
    START_TIME,
    END_TIME
  );

  console.log("Transaction submitted:", tx.hash);
  await tx.wait();
  console.log("Transaction confirmed!");

  // Verify the round was created
  const currentRoundId = await fund.currentRoundId();
  const round = await fund.fundraisingRounds(currentRoundId);

  console.log("\n--- Round Created Successfully ---");
  console.log("Round ID:", currentRoundId.toString());
  console.log("Target:", hre.ethers.formatEther(round.targetAmount), "AVAX");
  console.log("Token Price:", hre.ethers.formatEther(round.tokenPrice), "AVAX");
  console.log("Is Active:", round.isActive);

  console.log("\n" + "=".repeat(60));
  console.log("FUNDRAISING ROUND SETUP COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
