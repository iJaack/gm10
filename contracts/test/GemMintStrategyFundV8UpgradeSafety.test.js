const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployDirectV8({ initializeBase = false } = {}) {
  const [
    owner,
    coreTeam,
    governanceTreasury,
    communityEcosystem,
    advisors,
    strategicPartnerships,
  ] = await hre.ethers.getSigners();

  const Controller = await hre.ethers.getContractFactory("Gm10TokenomicsV7Controller");
  const controller = await Controller.deploy(
    owner.address,
    coreTeam.address,
    governanceTreasury.address,
    communityEcosystem.address,
    advisors.address,
    strategicPartnerships.address
  );
  await controller.waitForDeployment();

  const FundV8 = await hre.ethers.getContractFactory("GemMintStrategyFundV8");
  const fund = await FundV8.deploy(await controller.getAddress());
  await fund.waitForDeployment();

  if (initializeBase) {
    await fund.initialize(owner.address, 100n, 1000n);
  }
  await fund.initializeV8();

  return { fund, owner, controller };
}

async function deployV7ProxyFixture() {
  const [
    owner,
    ops,
    governance,
    failsafe,
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

  const Controller = await ethers.getContractFactory("Gm10TokenomicsV7Controller");
  const controller = await Controller.deploy(
    await fund.getAddress(),
    coreTeam.address,
    governanceTreasury.address,
    communityEcosystem.address,
    advisors.address,
    strategicPartnerships.address
  );
  await controller.waitForDeployment();

  const unsafeAllow = ["constructor", "state-variable-immutable"];
  const FundV7 = await ethers.getContractFactory("GemMintStrategyFundV7", governance);
  fund = await upgrades.upgradeProxy(await fund.getAddress(), FundV7, {
    kind: "uups",
    unsafeAllow,
    constructorArgs: [await controller.getAddress()],
    call: { fn: "initializeV7", args: [] },
  });
  await fund.waitForDeployment();

  return { fund, controller, owner, ops, governance, failsafe, usdt, feed, portfolioRegistry, investorAccounting };
}

describe("GemMintStrategyFundV8 interfaces", function () {
  it("compiles the continuous accrual interfaces", async function () {
    const artifactNames = [
      "IGm10ContinuousMintReceiver",
      "IGm10ContinuousSaleRouter",
    ];

    for (const name of artifactNames) {
      const artifact = await hre.artifacts.readArtifact(name);
      expect(artifact.abi.length).to.be.greaterThan(0);
    }
  });
});

describe("GemMintStrategyFundV8 upgrade", function () {
  it("initializes continuous-accrual controls in a paused state", async function () {
    const { fund } = await deployDirectV8();

    expect(await fund.redemptionsPermanentlyDisabled()).to.equal(true);
    expect(await fund.continuousMintPaused()).to.equal(true);
    expect(await fund.buybackPaused()).to.equal(true);
    expect(await fund.lpSupportPaused()).to.equal(true);
    expect(await fund.mintSpreadBps()).to.equal(-500n);
  });

  it("permanently rejects redemption controls", async function () {
    const { fund, owner } = await deployDirectV8();

    await expect(fund.connect(owner).setRedemptionsEnabled(true))
      .to.be.revertedWithCustomError(fund, "InvalidParameters");
    await expect(fund.connect(owner).redeem(1n))
      .to.be.revertedWithCustomError(fund, "RedemptionsDisabled");
  });

  it("validates and initializes the V7 proxy upgrade path", async function () {
    const ctx = await loadFixture(deployV7ProxyFixture);
    const proxyAddress = await ctx.fund.getAddress();
    const preUpgradeImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    const GOVERNANCE_ROLE = ethers.id("GOVERNANCE_ROLE");
    const MANAGER_ROLE = ethers.id("MANAGER_ROLE");

    const unsafeAllow = ["constructor", "state-variable-immutable"];
    const FundV8 = await ethers.getContractFactory("GemMintStrategyFundV8", ctx.governance);
    await upgrades.validateUpgrade(proxyAddress, FundV8, {
      kind: "uups",
      unsafeAllow,
      constructorArgs: [await ctx.controller.getAddress()],
    });

    const fund = await upgrades.upgradeProxy(proxyAddress, FundV8, {
      kind: "uups",
      unsafeAllow,
      constructorArgs: [await ctx.controller.getAddress()],
      call: { fn: "initializeV8", args: [] },
    });
    await fund.waitForDeployment();

    expect(await upgrades.erc1967.getImplementationAddress(proxyAddress)).to.not.equal(preUpgradeImplementation);
    expect(await fund.hasRole(DEFAULT_ADMIN_ROLE, ctx.ops.address)).to.equal(true);
    expect(await fund.hasRole(GOVERNANCE_ROLE, ctx.governance.address)).to.equal(true);
    expect(await fund.hasRole(MANAGER_ROLE, ctx.ops.address)).to.equal(true);
    expect(await fund.redemptionsPermanentlyDisabled()).to.equal(true);
    expect(await fund.continuousMintPaused()).to.equal(true);
    expect(await fund.buybackPaused()).to.equal(true);
    expect(await fund.lpSupportPaused()).to.equal(true);
    expect(await fund.mintSpreadBps()).to.equal(-500n);
  });
});
