const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GemMintStrategyFundV7 dynamic tokenomics", function () {
  async function deployV6Fixture() {
    const [
      owner,
      ops,
      governance,
      failsafe,
      investor,
      receiver,
      coreTeam,
      governanceTreasury,
      communityEcosystem,
      advisors,
      strategicPartnerships,
    ] = await ethers.getSigners();

    const FundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");
    const fundV2 = await upgrades.deployProxy(
      FundV2,
      [owner.address, 100n, 1000n],
      { kind: "uups", initializer: "initialize" }
    );
    await fundV2.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20.deploy("Mock USDT", "USDT");
    await usdt.waitForDeployment();

    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    const feed = await MockAggregator.deploy(8, 25n * 10n ** 8n);
    await feed.waitForDeployment();

    const PortfolioRegistryV2 = await ethers.getContractFactory("Gm10PortfolioRegistryV2");
    const portfolioRegistry = await PortfolioRegistryV2.deploy(await fundV2.getAddress());
    await portfolioRegistry.waitForDeployment();

    const InvestorAccounting = await ethers.getContractFactory("Gm10InvestorAccounting");
    const investorAccounting = await InvestorAccounting.deploy(await fundV2.getAddress());
    await investorAccounting.waitForDeployment();

    const FundV3 = await ethers.getContractFactory("GemMintStrategyFundV3");
    let fund = await upgrades.upgradeProxy(await fundV2.getAddress(), FundV3, {
      kind: "uups",
      call: {
        fn: "initializeV3",
        args: [
          await usdt.getAddress(),
          await feed.getAddress(),
          ops.address,
          governance.address,
          failsafe.address,
          await portfolioRegistry.getAddress(),
          await investorAccounting.getAddress(),
        ],
      },
    });
    await fund.waitForDeployment();

    const MockERC20V4 = await ethers.getContractFactory("MockERC20");
    const wavax = await MockERC20V4.deploy("Mock WAVAX", "WAVAX");
    await wavax.waitForDeployment();
    const MockSwapRouterV4 = await ethers.getContractFactory("MockSwapRouterV4");
    const swapRouter = await MockSwapRouterV4.deploy(await wavax.getAddress());
    await swapRouter.waitForDeployment();

    const FundV4 = await ethers.getContractFactory("GemMintStrategyFundV4", governance);
    fund = await upgrades.upgradeProxy(await fund.getAddress(), FundV4, {
      kind: "uups",
      call: { fn: "initializeV4", args: [await swapRouter.getAddress()] },
    });
    await fund.waitForDeployment();

    const FundV5 = await ethers.getContractFactory("GemMintStrategyFundV5", governance);
    fund = await upgrades.upgradeProxy(await fund.getAddress(), FundV5, {
      kind: "uups",
      call: { fn: "initializeV5", args: [await portfolioRegistry.getAddress(), 24 * 60 * 60] },
    });
    await fund.waitForDeployment();

    const FundV6 = await ethers.getContractFactory("GemMintStrategyFundV6", governance);
    fund = await upgrades.upgradeProxy(await fund.getAddress(), FundV6, {
      kind: "uups",
      call: {
        fn: "initializeV6",
        args: [await usdt.getAddress(), await feed.getAddress(), await investorAccounting.getAddress()],
      },
    });
    await fund.waitForDeployment();

    return {
      fund,
      usdt,
      feed,
      portfolioRegistry,
      investorAccounting,
      owner,
      ops,
      governance,
      failsafe,
      investor,
      receiver,
      coreTeam,
      governanceTreasury,
      communityEcosystem,
      advisors,
      strategicPartnerships,
    };
  }

  async function upgradeToV7(ctx, overrides = {}) {
    const segmentRecipients = [
      overrides.coreTeam ?? ctx.coreTeam.address,
      overrides.governanceTreasury ?? ctx.governanceTreasury.address,
      overrides.communityEcosystem ?? ctx.communityEcosystem.address,
      overrides.advisors ?? ctx.advisors.address,
      overrides.strategicPartnerships ?? ctx.strategicPartnerships.address,
    ];

    const Controller = await ethers.getContractFactory("Gm10TokenomicsV7Controller");
    const controller = await Controller.deploy(await ctx.fund.getAddress(), ...segmentRecipients);
    await controller.waitForDeployment();

    const unsafeAllow = ["constructor", "state-variable-immutable"];
    const FundV7 = await ethers.getContractFactory("GemMintStrategyFundV7", ctx.governance);
    await upgrades.validateUpgrade(await ctx.fund.getAddress(), FundV7, {
      kind: "uups",
      unsafeAllow,
      constructorArgs: [await controller.getAddress()],
    });

    const fund = await upgrades.upgradeProxy(await ctx.fund.getAddress(), FundV7, {
      kind: "uups",
      unsafeAllow,
      constructorArgs: [await controller.getAddress()],
      call: { fn: "initializeV7", args: [] },
    });
    await fund.waitForDeployment();
    return { ...ctx, fund, controller };
  }

  async function createRound(fund, ops, targetAvax) {
    const now = await time.latest();
    await fund.connect(ops).createFundraisingRound(
      ethers.parseEther(targetAvax),
      ethers.parseEther("1"),
      0n,
      ethers.parseEther("1000"),
      now,
      now + 3600
    );
    return fund.currentRoundId();
  }

  function segmentAddresses(ctx) {
    return [
      ctx.coreTeam.address,
      ctx.governanceTreasury.address,
      ctx.communityEcosystem.address,
      ctx.advisors.address,
      ctx.strategicPartnerships.address,
    ];
  }

  it("validates the V6 to V7 upgrade and rejects zero segment wallets", async function () {
    const ctx = await loadFixture(deployV6Fixture);
    const validRecipients = segmentAddresses(ctx);
    const Controller = await ethers.getContractFactory("Gm10TokenomicsV7Controller");
    const validController = await Controller.deploy(await ctx.fund.getAddress(), ...validRecipients);
    await validController.waitForDeployment();

    const FundV7 = await ethers.getContractFactory("GemMintStrategyFundV7", ctx.governance);
    await upgrades.validateUpgrade(await ctx.fund.getAddress(), FundV7, {
      kind: "uups",
      unsafeAllow: ["constructor", "state-variable-immutable"],
      constructorArgs: [await validController.getAddress()],
    });

    await expect(
      Controller.deploy(
        await ctx.fund.getAddress(),
        ethers.ZeroAddress,
        ctx.governanceTreasury.address,
        ctx.communityEcosystem.address,
        ctx.advisors.address,
        ctx.strategicPartnerships.address
      )
    ).to.be.revertedWithCustomError(validController, "ZeroAddress");
  });

  it("mints one percent per segment when a partial round is finalized", async function () {
    const ctx = await upgradeToV7(await loadFixture(deployV6Fixture));
    const roundId = await createRound(ctx.fund, ctx.ops, "100");

    await ctx.fund.connect(ctx.investor).invest(roundId, { value: ethers.parseEther("10") });
    const round = await ctx.fund.getRound(roundId);
    await time.increaseTo(round.endTime + 1n);

    const investorTokens = ethers.parseEther("10");
    const segmentTokens = ethers.parseEther("0.1");

    await ctx.fund.connect(ctx.ops).finalizeRound(roundId);

    for (const account of segmentAddresses(ctx)) {
      expect(await ctx.fund.balanceOf(account)).to.equal(segmentTokens);
      expect(await ctx.controller.excludedFromProfitShare(account)).to.equal(true);
    }

    expect(await ctx.fund.balanceOf(ctx.investor.address)).to.equal(investorTokens);
    expect(await ctx.fund.totalSupply()).to.equal(investorTokens + (segmentTokens * 5n));
    expect(await ctx.controller.profitEligibleSupply18()).to.equal(investorTokens);
  });

  it("records cap-closing investor attribution before segment allocations mint", async function () {
    const ctx = await upgradeToV7(await loadFixture(deployV6Fixture));
    await ctx.controller.connect(ctx.ops).setSegmentRecipient(0, ctx.investor.address);

    const roundId = await createRound(ctx.fund, ctx.ops, "10");
    await ctx.fund.connect(ctx.investor).invest(roundId, { value: ethers.parseEther("10") });

    const investorTokens = ethers.parseEther("10");
    const segmentTokens = ethers.parseEther("0.1");
    const round = await ctx.fund.getRound(roundId);
    const accounting = await ctx.investorAccounting.getInvestorAccounting(ctx.investor.address);

    expect(round.isFinalized).to.equal(true);
    expect(await ctx.fund.balanceOf(ctx.investor.address)).to.equal(investorTokens + segmentTokens);
    expect(accounting.directMintedTokens18).to.equal(investorTokens);
    expect(accounting.attributableTokens18).to.equal(investorTokens);
  });

  it("keeps segment tokens transferable and vote-capable without investor attribution", async function () {
    const ctx = await upgradeToV7(await loadFixture(deployV6Fixture));
    const roundId = await createRound(ctx.fund, ctx.ops, "10");

    await ctx.fund.connect(ctx.investor).invest(roundId, { value: ethers.parseEther("10") });

    const segmentTokens = ethers.parseEther("0.1");
    await ctx.fund.connect(ctx.coreTeam).delegate(ctx.coreTeam.address);
    expect(await ctx.fund.getVotes(ctx.coreTeam.address)).to.equal(segmentTokens);

    const transferred = segmentTokens / 2n;
    await ctx.fund.connect(ctx.coreTeam).transfer(ctx.receiver.address, transferred);
    expect(await ctx.fund.balanceOf(ctx.receiver.address)).to.equal(transferred);

    const coreAccounting = await ctx.investorAccounting.getInvestorAccounting(ctx.coreTeam.address);
    const receiverAccounting = await ctx.investorAccounting.getInvestorAccounting(ctx.receiver.address);
    expect(coreAccounting.attributableTokens18).to.equal(0n);
    expect(receiverAccounting.attributableTokens18).to.equal(0n);
  });

  it("rejects redemption of segment-origin and transferred non-attributable tokens", async function () {
    const ctx = await upgradeToV7(await loadFixture(deployV6Fixture));
    const roundId = await createRound(ctx.fund, ctx.ops, "10");

    await ctx.fund.connect(ctx.investor).invest(roundId, { value: ethers.parseEther("10") });
    await ctx.fund.connect(ctx.governance).setRedemptionsEnabled(true);

    const segmentTransfer = ethers.parseEther("0.05");
    await ctx.fund.connect(ctx.coreTeam).transfer(ctx.receiver.address, segmentTransfer);
    await expect(ctx.fund.connect(ctx.receiver).redeem(segmentTransfer))
      .to.be.revertedWithCustomError(ctx.fund, "InvalidParameters");

    const investorTransfer = ethers.parseEther("1");
    await ctx.fund.connect(ctx.investor).transfer(ctx.receiver.address, investorTransfer);
    await expect(ctx.fund.connect(ctx.receiver).redeem(investorTransfer))
      .to.be.revertedWithCustomError(ctx.fund, "InvalidParameters");
  });

  it("lets admins manage wallet-based profit exclusion explicitly", async function () {
    const ctx = await upgradeToV7(await loadFixture(deployV6Fixture));
    const roundId = await createRound(ctx.fund, ctx.ops, "10");

    await ctx.fund.connect(ctx.investor).invest(roundId, { value: ethers.parseEther("10") });
    const eligibleBefore = await ctx.controller.profitEligibleSupply18();

    await ctx.controller.connect(ctx.ops).setProfitShareExclusion(ctx.investor.address, true);
    expect(await ctx.controller.excludedFromProfitShare(ctx.investor.address)).to.equal(true);
    expect(await ctx.controller.profitEligibleSupply18()).to.equal(0n);

    await ctx.controller.connect(ctx.ops).setProfitShareExclusion(ctx.investor.address, false);
    expect(await ctx.controller.excludedFromProfitShare(ctx.investor.address)).to.equal(false);
    expect(await ctx.controller.profitEligibleSupply18()).to.equal(eligibleBefore);
  });
});
