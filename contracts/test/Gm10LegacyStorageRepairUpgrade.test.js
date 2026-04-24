const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const LEGACY_CURRENT_ROUND_ID_SLOT = 21n;
const LEGACY_FUNDRAISING_ROUNDS_SLOT = 23n;
const LEGACY_STABLE_ACCOUNTING_SLOTS = {
  canonicalPortfolioValue: 8n,
  navPerToken: 9n,
  lastStableNavUpdate: 10n,
  liquidTreasury: 11n,
  outstandingPurchaseReleases: 12n,
  liquidityCatchBuyAccrued: 13n,
  liquidityAvaxPairingAccrued: 14n,
  holderDistributionAccrued: 15n,
  weeklyNavCap: 16n,
};

const legacyStableAccounting = {
  canonicalPortfolioValue: 4_899_100_000n,
  navPerToken: 12_345_678n,
  lastStableNavUpdate: 1_777_031_713n,
  liquidTreasury: 7_056_316_567n,
  outstandingPurchaseReleases: 111_000_000n,
  liquidityCatchBuyAccrued: 222_000_000n,
  liquidityAvaxPairingAccrued: 472_605_000n,
  holderDistributionAccrued: 333_000_000n,
  weeklyNavCap: 1_500n,
};

function storageWord(value) {
  return ethers.toBeHex(value, 32);
}

function mappingStructSlot(key, mappingSlot, offset = 0n) {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [key, mappingSlot]);
  return ethers.toBeHex(BigInt(ethers.keccak256(encoded)) + BigInt(offset), 32);
}

async function setStorage(address, slot, value) {
  await ethers.provider.send("hardhat_setStorageAt", [address, storageWord(slot), storageWord(value)]);
}

async function deployV6Fixture() {
  const [owner, ops, governance, failsafe] = await ethers.getSigners();

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
  const usdc = await MockERC20.deploy("Mock USDC", "USDC");
  await usdc.waitForDeployment();
  const wavax = await MockERC20.deploy("Mock WAVAX", "WAVAX");
  await wavax.waitForDeployment();

  const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
  const feed = await MockAggregator.deploy(8, 25n * 10n ** 8n);
  await feed.waitForDeployment();

  const PortfolioRegistry = await ethers.getContractFactory("Gm10PortfolioRegistry");
  const legacyPortfolioRegistry = await PortfolioRegistry.deploy(await fundV2.getAddress());
  await legacyPortfolioRegistry.waitForDeployment();

  const PortfolioRegistryV2 = await ethers.getContractFactory("Gm10PortfolioRegistryV2");
  const portfolioRegistryV2 = await PortfolioRegistryV2.deploy(await fundV2.getAddress());
  await portfolioRegistryV2.waitForDeployment();

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
        await legacyPortfolioRegistry.getAddress(),
        await investorAccounting.getAddress(),
      ],
    },
  });
  await fund.waitForDeployment();

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
    call: { fn: "initializeV5", args: [await portfolioRegistryV2.getAddress(), 24 * 60 * 60] },
  });
  await fund.waitForDeployment();

  const FundV6 = await ethers.getContractFactory("GemMintStrategyFundV6", governance);
  fund = await upgrades.upgradeProxy(await fund.getAddress(), FundV6, {
    kind: "uups",
    call: { fn: "initializeV6", args: [await usdt.getAddress(), await feed.getAddress(), await investorAccounting.getAddress()] },
  });
  await fund.waitForDeployment();

  return { fund, governance, legacyPortfolioRegistry, portfolioRegistryV2 };
}

const legacyRounds = [
  {
    roundId: 1n,
    targetAmount: ethers.parseEther("500"),
    raisedAmount: ethers.parseEther("500"),
    tokenPrice: ethers.parseEther("0.0025"),
    minInvestment: ethers.parseEther("0.1"),
    maxInvestment: ethers.parseEther("250"),
    startTime: 1776110400n,
    endTime: 1777060800n,
    isActive: false,
    isFinalized: true,
  },
  {
    roundId: 2n,
    targetAmount: ethers.parseEther("5000"),
    raisedAmount: ethers.parseEther("1347.9836"),
    tokenPrice: ethers.parseEther("0.0035"),
    minInvestment: ethers.parseEther("0.1"),
    maxInvestment: ethers.parseEther("500"),
    startTime: 1776351600n,
    endTime: 1778943600n,
    isActive: true,
    isFinalized: false,
  },
  {
    roundId: 3n,
    targetAmount: ethers.parseEther("7500"),
    raisedAmount: ethers.parseEther("0"),
    tokenPrice: ethers.parseEther("0.004"),
    minInvestment: ethers.parseEther("0.25"),
    maxInvestment: ethers.parseEther("750"),
    startTime: 1780000000n,
    endTime: 1782500000n,
    isActive: false,
    isFinalized: false,
  },
];

function roundStorageValues(round) {
  const packedFlags = (round.isActive ? 1n : 0n) | (round.isFinalized ? 256n : 0n);
  return [
    round.roundId,
    round.targetAmount,
    round.raisedAmount,
    round.tokenPrice,
    round.minInvestment,
    round.maxInvestment,
    round.startTime,
    round.endTime,
    packedFlags,
  ];
}

async function seedLegacyRoundStorage(proxyAddress, rounds = legacyRounds) {
  await setStorage(proxyAddress, LEGACY_CURRENT_ROUND_ID_SLOT, BigInt(rounds.length));

  for (const round of rounds) {
    const roundBase = mappingStructSlot(round.roundId, LEGACY_FUNDRAISING_ROUNDS_SLOT);
    for (const [offset, value] of roundStorageValues(round).entries()) {
      await setStorage(proxyAddress, BigInt(roundBase) + BigInt(offset), value);
    }
  }
}

async function seedLegacyStableAccounting(proxyAddress) {
  for (const [key, slot] of Object.entries(LEGACY_STABLE_ACCOUNTING_SLOTS)) {
    await setStorage(proxyAddress, slot, legacyStableAccounting[key]);
  }
}

describe("Gm10LegacyStorageRepairUpgrade", function () {
  it("keeps the temporary repair implementation under the EIP-170 deployment limit", async function () {
    const artifact = await hre.artifacts.readArtifact("Gm10LegacyStorageRepairUpgrade");
    const deployedBytes = ((artifact.deployedBytecode || "0x").length - 2) / 2;
    expect(deployedBytes).to.be.lessThanOrEqual(24576);
  });

  it("preserves every legacy fundraising round through the repair upgrade", async function () {
    const { fund, governance, legacyPortfolioRegistry } = await loadFixture(deployV6Fixture);
    const proxyAddress = await fund.getAddress();

    expect(await fund.currentRoundId()).to.equal(0n);
    for (const round of legacyRounds) {
      expect((await fund.getRound(round.roundId)).targetAmount).to.equal(0n);
    }

    await seedLegacyRoundStorage(proxyAddress);
    await seedLegacyStableAccounting(proxyAddress);

    const finalImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const RepairUpgrade = await ethers.getContractFactory("Gm10LegacyStorageRepairUpgrade");
    const repairUpgrade = await RepairUpgrade.deploy();
    await repairUpgrade.waitForDeployment();
    const repairCalldata = repairUpgrade.interface.encodeFunctionData("repairLegacyStorageAndReturn", [
      finalImplementation,
      await legacyPortfolioRegistry.getAddress(),
    ]);

    const uups = new ethers.Contract(
      proxyAddress,
      ["function upgradeToAndCall(address newImplementation, bytes data) payable"],
      governance
    );
    await uups.upgradeToAndCall(await repairUpgrade.getAddress(), repairCalldata);
    expect(await upgrades.erc1967.getImplementationAddress(proxyAddress)).to.equal(finalImplementation);

    const repairedFund = await ethers.getContractAt("GemMintStrategyFundV6", proxyAddress);

    expect(await repairedFund.currentRoundId()).to.equal(BigInt(legacyRounds.length));
    for (const expected of legacyRounds) {
      const actual = await repairedFund.getRound(expected.roundId);
      expect(actual.roundId).to.equal(expected.roundId);
      expect(actual.targetAmount).to.equal(expected.targetAmount);
      expect(actual.raisedAmount).to.equal(expected.raisedAmount);
      expect(actual.tokenPrice).to.equal(expected.tokenPrice);
      expect(actual.minInvestment).to.equal(expected.minInvestment);
      expect(actual.maxInvestment).to.equal(expected.maxInvestment);
      expect(actual.startTime).to.equal(expected.startTime);
      expect(actual.endTime).to.equal(expected.endTime);
      expect(actual.isActive).to.equal(expected.isActive);
      expect(actual.isFinalized).to.equal(expected.isFinalized);
    }
    expect(await repairedFund.portfolioRegistry()).to.equal(await legacyPortfolioRegistry.getAddress());
  });

  it("preserves legacy stable accounting through the repair upgrade", async function () {
    const { fund, governance, legacyPortfolioRegistry } = await loadFixture(deployV6Fixture);
    const proxyAddress = await fund.getAddress();

    await seedLegacyRoundStorage(proxyAddress);
    await seedLegacyStableAccounting(proxyAddress);

    const finalImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const RepairUpgrade = await ethers.getContractFactory("Gm10LegacyStorageRepairUpgrade");
    const repairUpgrade = await RepairUpgrade.deploy();
    await repairUpgrade.waitForDeployment();
    const repairCalldata = repairUpgrade.interface.encodeFunctionData("repairLegacyStorageAndReturn", [
      finalImplementation,
      await legacyPortfolioRegistry.getAddress(),
    ]);

    const uups = new ethers.Contract(
      proxyAddress,
      ["function upgradeToAndCall(address newImplementation, bytes data) payable"],
      governance
    );
    await uups.upgradeToAndCall(await repairUpgrade.getAddress(), repairCalldata);

    const repairedFund = await ethers.getContractAt("GemMintStrategyFundV6", proxyAddress);
    const stableAccounting = await repairedFund.stableAccounting();
    expect(stableAccounting.canonicalPortfolioValue).to.equal(legacyStableAccounting.canonicalPortfolioValue);
    expect(await repairedFund.navPerTokenUsdt6()).to.equal(legacyStableAccounting.navPerToken);
    expect(stableAccounting.lastStableNavUpdateTimestamp).to.equal(legacyStableAccounting.lastStableNavUpdate);
    expect(stableAccounting.liquidTreasury).to.equal(legacyStableAccounting.liquidTreasury);
    expect(stableAccounting.outstandingPurchaseReleases).to.equal(legacyStableAccounting.outstandingPurchaseReleases);
    expect(stableAccounting.liquidityCatchBuyAccrued).to.equal(legacyStableAccounting.liquidityCatchBuyAccrued);
    expect(stableAccounting.liquidityAvaxPairingAccrued).to.equal(legacyStableAccounting.liquidityAvaxPairingAccrued);
    expect(stableAccounting.holderDistributionAccrued).to.equal(legacyStableAccounting.holderDistributionAccrued);
    expect(stableAccounting.weeklyNavCap).to.equal(legacyStableAccounting.weeklyNavCap);
  });
});
