const hre = require("hardhat");
const { ethers } = hre;
const deployments = require("../deployments.json");

async function main() {
  if (hre.network.name !== "fuji") {
    throw new Error("This script is only intended for Fuji");
  }

  const deploymentKey = process.env.DEPLOYMENT_KEY || "fujiPurchaseTest";
  const deployment = deployments[deploymentKey];
  if (!deployment?.proxy) {
    throw new Error(`Fuji deployment metadata is incomplete for key ${deploymentKey}`);
  }

  const [signer] = await ethers.getSigners();
  const fund = await ethers.getContractAt("GemMintStrategyFundV3", deployment.proxy, signer);

  const targetAmount = ethers.parseEther(process.env.TEST_ROUND_TARGET_AVAX || "10");
  const tokenPrice = ethers.parseEther(process.env.TEST_ROUND_PRICE_AVAX || "0.0025");
  const minInvestment = ethers.parseEther(process.env.TEST_ROUND_MIN_AVAX || "0.1");
  const maxInvestment = ethers.parseEther(process.env.TEST_ROUND_MAX_AVAX || "10");

  const now = Math.floor(Date.now() / 1000);
  const startOffset = Number(process.env.TEST_ROUND_START_OFFSET_SECONDS || "-60");
  const endOffset = Number(process.env.TEST_ROUND_END_OFFSET_SECONDS || "86400");
  const startTime = now + startOffset;
  const endTime = now + endOffset;

  if (endTime <= startTime) {
    throw new Error("Round endTime must be after startTime");
  }

  console.log(`Using deployment key: ${deploymentKey}`);
  console.log(`Using signer: ${await signer.getAddress()}`);
  console.log(`Creating active test round on ${deployment.proxy}`);

  const tx = await fund.createFundraisingRound(
    targetAmount,
    tokenPrice,
    minInvestment,
    maxInvestment,
    BigInt(startTime),
    BigInt(endTime)
  );
  console.log("TX_HASH=" + tx.hash);
  await tx.wait();

  const roundId = await fund.currentRoundId();
  const round = await fund.getRound(roundId);

  console.log("ROUND_ID=" + roundId.toString());
  console.log("ROUND_ACTIVE=" + round.isActive);
  console.log("ROUND_START=" + round.startTime.toString());
  console.log("ROUND_END=" + round.endTime.toString());
  console.log("ROUND_TARGET_AVAX=" + ethers.formatEther(round.targetAmount));
  console.log("ROUND_PRICE_AVAX=" + ethers.formatEther(round.tokenPrice));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
