/**
 * createRound1.js — Create Round 1 on Fuji testnet
 * 
 * Run with:
 *   cd contracts
 *   PRIVATE_KEY=0x... npx hardhat run scripts/createRound1.js --network fuji
 * 
 * Or with Ledger:
 *   LEDGER_ADDRESS=0x5cA0A679025B6c7dA08a70be3b244399fF0D7813 npx hardhat run scripts/createRound1.js --network fuji
 */

const { ethers } = require("hardhat");
const deployments = require("../deployments.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Creating Round 1 from:", deployer.address);

  const proxyAddress = deployments.fuji.proxy;
  console.log("Contract:", proxyAddress);

  const fund = await ethers.getContractAt("GemMintStrategyFundV2", proxyAddress);

  // Round 1 parameters
  const targetAmount   = ethers.parseEther("10000");  // 10,000 AVAX
  const tokenPrice     = ethers.parseEther("0.0025"); // 0.0025 AVAX per $CATCH
  const minInvestment  = ethers.parseEther("0.1");    // 0.1 AVAX min
  const maxInvestment  = ethers.parseEther("200");    // 200 AVAX max per wallet

  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60;                    // starts in 1 minute
  const endTime   = now + 60 * 60 * 24 * 30;    // ends in 30 days

  console.log("\nRound 1 params:");
  console.log("  Target:  10,000 AVAX");
  console.log("  Price:   0.0025 AVAX per $CATCH");
  console.log("  Min:     0.1 AVAX");
  console.log("  Max:     200 AVAX per wallet");
  console.log("  Start:  ", new Date(startTime * 1000).toISOString());
  console.log("  End:    ", new Date(endTime * 1000).toISOString());

  const tx = await fund.createFundraisingRound(
    targetAmount,
    tokenPrice,
    minInvestment,
    maxInvestment,
    startTime,
    endTime
  );

  console.log("\nTx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Round 1 created! Block:", receipt.blockNumber);

  // Verify
  const roundId = await fund.currentRoundId();
  const round = await fund.getRound(roundId);
  console.log("\nOn-chain round data:");
  console.log("  Round ID:  ", roundId.toString());
  console.log("  Active:    ", round.isActive);
  console.log("  Target:    ", ethers.formatEther(round.targetAmount), "AVAX");
  console.log("  Price:     ", ethers.formatEther(round.tokenPrice), "AVAX per $CATCH");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
