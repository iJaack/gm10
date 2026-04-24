const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

async function deployV3WithLegacyRegistryFixture() {
  const [owner, ops, governance, failsafe, investor, other] = await ethers.getSigners();

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

  const PortfolioRegistry = await ethers.getContractFactory("Gm10PortfolioRegistry");
  const legacyRegistry = await PortfolioRegistry.deploy(await fundV2.getAddress());
  await legacyRegistry.waitForDeployment();

  const InvestorAccounting = await ethers.getContractFactory("Gm10InvestorAccounting");
  const investorAccounting = await InvestorAccounting.deploy(await fundV2.getAddress());
  await investorAccounting.waitForDeployment();

  const FundV3 = await ethers.getContractFactory("GemMintStrategyFundV3");
  const fund = await upgrades.upgradeProxy(await fundV2.getAddress(), FundV3, {
    kind: "uups",
    call: {
      fn: "initializeV3",
      args: [
        await usdt.getAddress(),
        await feed.getAddress(),
        ops.address,
        governance.address,
        failsafe.address,
        await legacyRegistry.getAddress(),
        await investorAccounting.getAddress(),
      ],
    },
  });
  await fund.waitForDeployment();

  const now = await time.latest();
  await fund.connect(ops).createFundraisingRound(
    ethers.parseEther("1000"),
    ethers.parseEther("1"),
    0n,
    ethers.parseEther("1000"),
    now,
    now + 3600
  );
  await fund.connect(investor).invest(1n, { value: ethers.parseEther("20") });

  return { fund, legacyRegistry, ops, governance, other };
}

async function recordLegacyPosition(ctx, index) {
  const marketId = ethers.id("COURTYARD");
  const chainEid = 30109;
  const purchaseKey = ethers.id(`legacy-purchase-${index}`);

  await ctx.legacyRegistry.connect(ctx.governance).setChainSafe(
    chainEid,
    ctx.other.address,
    ethers.ZeroHash,
    ethers.id("POLYGON_SAFE"),
    true
  );
  await ctx.legacyRegistry.connect(ctx.governance).setMarketplaceApproval(marketId, true);
  await ctx.legacyRegistry.connect(ctx.governance).authorizePurchase(
    purchaseKey,
    chainEid,
    marketId,
    ethers.id(`asset-${index}`),
    500_000_000n,
    ethers.id(`mandate-${index}`)
  );
  await ctx.fund.connect(ctx.ops).releasePurchaseFunds(purchaseKey, 100_000_000n);
  await ctx.legacyRegistry.connect(ctx.ops).recordPurchaseExecution(
    purchaseKey,
    ethers.id(`execution-${index}`),
    ethers.id(`settlement-${index}`),
    ethers.id(`proof-${index}`)
  );
  await ctx.fund.connect(ctx.ops).recordCollectiblePosition(purchaseKey, {
    custodyMode: 0,
    tokenStandard: ethers.id("ERC721"),
    evmCollection: ctx.other.address,
    nonEvmCollection: ethers.ZeroHash,
    tokenId: BigInt(index),
    nonEvmTokenId: ethers.ZeroHash,
    externalAssetId: ethers.id(`external-${index}`),
    categoryId: ethers.id("pokemon-card"),
    marketplaceProvenanceRef: ethers.id(`vault-${index}`),
    acquisitionPriceUsdt6: 80_000_000n + BigInt(index),
    metadataHash: ethers.id(`metadata-${index}`),
    proofHash: ethers.id(`position-proof-${index}`),
  });
}

function expectPositionEqual(actual, expected) {
  expect(actual.id).to.equal(expected.id);
  expect(actual.originPurchaseKey).to.equal(expected.originPurchaseKey);
  expect(actual.chainEid).to.equal(expected.chainEid);
  expect(actual.marketplaceId).to.equal(expected.marketplaceId);
  expect(actual.custodyMode).to.equal(expected.custodyMode);
  expect(actual.tokenStandard).to.equal(expected.tokenStandard);
  expect(actual.evmCollection).to.equal(expected.evmCollection);
  expect(actual.nonEvmCollection).to.equal(expected.nonEvmCollection);
  expect(actual.tokenId).to.equal(expected.tokenId);
  expect(actual.nonEvmTokenId).to.equal(expected.nonEvmTokenId);
  expect(actual.externalAssetId).to.equal(expected.externalAssetId);
  expect(actual.categoryId).to.equal(expected.categoryId);
  expect(actual.marketplaceProvenanceRef).to.equal(expected.marketplaceProvenanceRef);
  expect(actual.acquisitionPriceUsdt6).to.equal(expected.acquisitionPriceUsdt6);
  expect(actual.currentValueUsdt6).to.equal(expected.currentValueUsdt6);
  expect(actual.lastNavMarkUsdt6).to.equal(expected.lastNavMarkUsdt6);
  expect(actual.acquisitionDate).to.equal(expected.acquisitionDate);
  expect(actual.lastValuationAt).to.equal(expected.lastValuationAt);
  expect(actual.status).to.equal(expected.status);
  expect(actual.metadataHash).to.equal(expected.metadataHash);
  expect(actual.proofHash).to.equal(expected.proofHash);
}

describe("Gm10 migrated portfolio registry V2", function () {
  it("imports every legacy position into a V2-compatible registry", async function () {
    const ctx = await loadFixture(deployV3WithLegacyRegistryFixture);
    await recordLegacyPosition(ctx, 1);
    await recordLegacyPosition(ctx, 2);

    const MigratedRegistry = await ethers.getContractFactory("Gm10MigratedPortfolioRegistryV2");
    const migratedRegistry = await MigratedRegistry.deploy(
      await ctx.fund.getAddress(),
      await ctx.legacyRegistry.getAddress(),
      await ctx.legacyRegistry.collectiblePositionCount()
    );
    await migratedRegistry.waitForDeployment();

    const count = await ctx.legacyRegistry.collectiblePositionCount();
    expect(await migratedRegistry.collectiblePositionCount()).to.equal(count);
    for (let positionId = 1n; positionId <= count; positionId++) {
      expectPositionEqual(
        await migratedRegistry.getCollectiblePosition(positionId),
        await ctx.legacyRegistry.getCollectiblePosition(positionId)
      );
    }
  });

  it("switches only the fund registry pointer without changing round state", async function () {
    const ctx = await loadFixture(deployV3WithLegacyRegistryFixture);
    const proxyAddress = await ctx.fund.getAddress();
    const beforeRound = await ctx.fund.getRound(1n);
    const finalImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    const MigratedRegistry = await ethers.getContractFactory("Gm10MigratedPortfolioRegistryV2");
    const migratedRegistry = await MigratedRegistry.deploy(proxyAddress, await ctx.legacyRegistry.getAddress(), 0n);
    await migratedRegistry.waitForDeployment();

    const PointerUpgrade = await ethers.getContractFactory("Gm10RegistryPointerUpgrade");
    const pointerUpgrade = await PointerUpgrade.deploy();
    await pointerUpgrade.waitForDeployment();
    const pointerCalldata = pointerUpgrade.interface.encodeFunctionData("setPortfolioRegistryAndReturn", [
      finalImplementation,
      await migratedRegistry.getAddress(),
    ]);

    const uups = new ethers.Contract(
      proxyAddress,
      ["function upgradeToAndCall(address newImplementation, bytes data) payable"],
      ctx.governance
    );
    await uups.upgradeToAndCall(await pointerUpgrade.getAddress(), pointerCalldata);

    const fund = await ethers.getContractAt("GemMintStrategyFundV3", proxyAddress);
    const afterRound = await fund.getRound(1n);
    expect(await upgrades.erc1967.getImplementationAddress(proxyAddress)).to.equal(finalImplementation);
    expect(await fund.portfolioRegistry()).to.equal(await migratedRegistry.getAddress());
    expect(afterRound.roundId).to.equal(beforeRound.roundId);
    expect(afterRound.targetAmount).to.equal(beforeRound.targetAmount);
    expect(afterRound.raisedAmount).to.equal(beforeRound.raisedAmount);
    expect(afterRound.isActive).to.equal(beforeRound.isActive);
  });
});
