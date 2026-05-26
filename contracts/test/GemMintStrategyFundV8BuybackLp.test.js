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
    lfj,
    pharaoh,
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
  await fund.grantManagerForTest(owner.address);

  return { fund, owner, lfj, pharaoh };
}

describe("GemMintStrategyFundV8 buyback and LP execution", function () {
  it("executes buyback-burn budget with proof and deadline bounds", async function () {
    const { fund, lfj } = await deployMockV8();
    await fund.setMarketSupportAccrualsForTest(12_000_000n, 0n);

    const valid = {
      venue: lfj.address,
      tokenIn: ethers.ZeroAddress,
      amountIn: 5_000_000n,
      minCatchOut: ethers.parseEther("10"),
      deadline: BigInt((await ethers.provider.getBlock("latest")).timestamp + 300),
      proofHash: ethers.id("buyback-proof"),
    };

    await expect(fund.executeBuybackBurn(valid))
      .to.emit(fund, "BuybackBurnExecuted")
      .withArgs(lfj.address, 5_000_000n, ethers.parseEther("10"), ethers.id("buyback-proof"));
    expect(await fund.buybackBurnAccruedUsdt6()).to.equal(7_000_000n);

    await expect(fund.executeBuybackBurn({ ...valid, amountIn: 8_000_000n }))
      .to.be.revertedWithCustomError(fund, "InsufficientFreeBalance");
    await expect(fund.executeBuybackBurn({ ...valid, proofHash: ethers.ZeroHash }))
      .to.be.revertedWithCustomError(fund, "InvalidParameters");
  });

  it("executes LP support only with configured venue custody mode", async function () {
    const { fund, lfj, pharaoh } = await deployMockV8();
    await fund.setMarketSupportAccrualsForTest(0n, 20_000_000n);
    await fund.setLpVenueCustodyMode(lfj.address, 0);
    await fund.setLpVenueCustodyMode(pharaoh.address, 1);

    const valid = {
      venue: lfj.address,
      catchAmount: 5_000_000n,
      pairedAvaxAmount: 5_000_000n,
      custodyMode: 0,
      deadline: BigInt((await ethers.provider.getBlock("latest")).timestamp + 300),
      proofHash: ethers.id("lp-proof"),
    };

    await expect(fund.executeLpSupport(valid))
      .to.emit(fund, "LpSupportExecuted")
      .withArgs(lfj.address, 5_000_000n, 5_000_000n, 0, ethers.id("lp-proof"));
    expect(await fund.lpSupportAccruedUsdt6()).to.equal(10_000_000n);

    await expect(fund.executeLpSupport({ ...valid, venue: pharaoh.address }))
      .to.be.revertedWithCustomError(fund, "InvalidParameters");
    await expect(fund.executeLpSupport({ ...valid, pairedAvaxAmount: 6_000_000n }))
      .to.be.revertedWithCustomError(fund, "InsufficientFreeBalance");
  });
});
