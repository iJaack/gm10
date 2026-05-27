const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

async function deployMockV8() {
  const [
    owner,
    coreTeam,
    governanceTreasury,
    communityEcosystem,
    advisors,
    strategicPartnerships,
  ] = await ethers.getSigners();

  const Controller = await ethers.getContractFactory("Gm10TokenomicsV7Controller");
  const controller = await Controller.deploy(
    owner.address,
    coreTeam.address,
    governanceTreasury.address,
    communityEcosystem.address,
    advisors.address,
    strategicPartnerships.address
  );
  await controller.waitForDeployment();

  const Fund = await ethers.getContractFactory("MockGemMintStrategyFundV8");
  const fund = await Fund.deploy(await controller.getAddress());
  await fund.waitForDeployment();
  await fund.initializeV8();

  return {
    fund,
    owner,
    controller,
    coreTeam,
    governanceTreasury,
    communityEcosystem,
    advisors,
    strategicPartnerships,
  };
}

describe("GemMintStrategyFundV8 continuous mint", function () {
  it("mints buyer and segment allocations for each settled commit", async function () {
    const { fund, owner, controller } = await deployMockV8();
    await fund.mintForTest(owner.address, ethers.parseEther("100"));
    await fund.setStableAccountingForTest(100_000_000n, 0n, 0n, 0n, 0n, 0n);
    await fund.syncStableNavForTest();
    await fund.grantGovernanceForTest(owner.address);
    await fund.setContinuousAccrualControls(false, true, true, -500);
    await fund.grantManagerForTest(owner.address);

    const commitId = ethers.id("settled-route-1");
    const buyer = ethers.Wallet.createRandom().address;

    const [firstBuyerCatch18, firstSegmentCatchEach18] = await fund.previewContinuousMint(101_000_000n);
    await fund.settleContinuousMint(commitId, buyer, 101_000_000n);

    expect(await fund.balanceOf(await fund.getAddress())).to.equal(0n);
    expect(await fund.balanceOf(buyer)).to.equal(firstBuyerCatch18);

    for (let segment = 0; segment < 5; segment += 1) {
      const recipient = await controller.segmentRecipient(segment);
      expect(await fund.balanceOf(recipient)).to.equal(firstSegmentCatchEach18);
    }

    await expect(fund.settleContinuousMint(commitId, buyer, 101_000_000n))
      .to.be.revertedWithCustomError(fund, "InvalidParameters");

    const secondCommitId = ethers.id("settled-route-2");
    const secondBuyer = ethers.Wallet.createRandom().address;

    const [secondBuyerCatch18, secondSegmentCatchEach18] = await fund.previewContinuousMint(202_000_000n);
    await fund.settleContinuousMint(secondCommitId, secondBuyer, 202_000_000n);

    expect(await fund.balanceOf(await fund.getAddress())).to.equal(0n);
    expect(await fund.balanceOf(secondBuyer)).to.equal(secondBuyerCatch18);

    for (let segment = 0; segment < 5; segment += 1) {
      const recipient = await controller.segmentRecipient(segment);
      expect(await fund.balanceOf(recipient)).to.equal(firstSegmentCatchEach18 + secondSegmentCatchEach18);
    }
  });

  it("settles native AVAX that has landed in the fund proxy", async function () {
    const { fund, owner } = await deployMockV8();
    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    const avaxUsdFeed = await MockAggregator.deploy(8, 9_12000000n);
    await avaxUsdFeed.waitForDeployment();

    await fund.mintForTest(owner.address, ethers.parseEther("100"));
    await fund.setStableAccountingForTest(100_000_000n, 0n, 0n, 0n, 0n, 0n);
    await fund.syncStableNavForTest();
    await fund.setAvaxPricingForTest(await avaxUsdFeed.getAddress(), 86_400n);
    await fund.grantGovernanceForTest(owner.address);
    await fund.setContinuousAccrualControls(false, true, true, -500);
    await fund.grantManagerForTest(owner.address);

    const commitId = ethers.id("native-avax-route-1");
    const buyer = ethers.Wallet.createRandom().address;
    const avaxAmount = ethers.parseEther("1");
    const settlementAmountUsdt6 = 9_120000n;
    const [buyerCatch18] = await fund.previewContinuousMint(settlementAmountUsdt6);

    await expect(fund.settleContinuousMintFromAvax(commitId, buyer, avaxAmount))
      .to.be.revertedWithCustomError(fund, "InsufficientSettlementBalance");

    await owner.sendTransaction({ to: await fund.getAddress(), value: avaxAmount });

    await expect(fund.settleContinuousMintFromAvax(commitId, buyer, avaxAmount))
      .to.emit(fund, "ContinuousMintAvaxSettled")
      .withArgs(commitId, buyer, avaxAmount, settlementAmountUsdt6);

    expect(await fund.accountedFundAvaxSettlementWei()).to.equal(avaxAmount);
    expect(await fund.balanceOf(buyer)).to.equal(buyerCatch18);

    await expect(fund.settleContinuousMintFromAvax(ethers.id("native-avax-route-2"), buyer, avaxAmount))
      .to.be.revertedWithCustomError(fund, "InsufficientSettlementBalance");
  });
});
