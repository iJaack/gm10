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
  it("mints buyer escrow and segment allocations for each settled commit", async function () {
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

    expect(await fund.balanceOf(await fund.getAddress())).to.equal(firstBuyerCatch18);
    expect(await fund.balanceOf(buyer)).to.equal(0n);

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

    expect(await fund.balanceOf(await fund.getAddress())).to.equal(firstBuyerCatch18 + secondBuyerCatch18);
    expect(await fund.balanceOf(secondBuyer)).to.equal(0n);

    for (let segment = 0; segment < 5; segment += 1) {
      const recipient = await controller.segmentRecipient(segment);
      expect(await fund.balanceOf(recipient)).to.equal(firstSegmentCatchEach18 + secondSegmentCatchEach18);
    }
  });
});
