const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GemMintStrategyFundV5 security workflows", function () {
  async function deployV5Fixture() {
    const [owner, ops, governance, failsafe, investor, operator, other, receiver] = await ethers.getSigners();

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

    const MockSwapRouterV4 = await ethers.getContractFactory("MockSwapRouterV4");
    const swapRouter = await MockSwapRouterV4.deploy(await wavax.getAddress());
    await swapRouter.waitForDeployment();
    await usdc.mint(await swapRouter.getAddress(), ethers.parseUnits("1000000", 6));

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

    await fund.connect(governance).setSaleSettlementToken(await usdc.getAddress(), true, 6);
    return {
      fund,
      usdt,
      usdc,
      wavax,
      feed,
      portfolioRegistry,
      investorAccounting,
      swapRouter,
      owner,
      ops,
      governance,
      failsafe,
      investor,
      operator,
      other,
      receiver,
    };
  }

  async function seedRound(fund, manager, investor, amount) {
    const now = await time.latest();
    await fund.connect(manager).createFundraisingRound(
      ethers.parseEther("1000"),
      ethers.parseEther("1"),
      0n,
      ethers.parseEther("1000"),
      now,
      now + 3600
    );
    await fund.connect(investor).invest(1n, { value: ethers.parseEther(amount) });
  }

  async function setupMarketAndPurchase(ctx, purchaseKey = ethers.id("purchase-v5")) {
    const marketId = ethers.id("COURTYARD");
    const chainEid = 30109;
    await ctx.portfolioRegistry.connect(ctx.governance).setChainSafe(
      chainEid,
      ctx.other.address,
      ethers.ZeroHash,
      ethers.id("POLYGON_SAFE"),
      true
    );
    await ctx.portfolioRegistry.connect(ctx.governance).setMarketplaceApproval(marketId, true);
    await ctx.portfolioRegistry.connect(ctx.governance).authorizePurchaseV2(
      purchaseKey,
      chainEid,
      marketId,
      ethers.id("asset-v5"),
      await ctx.usdc.getAddress(),
      100_000_000n,
      ethers.id("mandate-v5")
    );
    return { marketId, chainEid, purchaseKey, destinationSafe: ctx.other.address };
  }

  async function confirmAndRecordPosition(ctx, purchaseKey, chainEid, destinationSafe) {
    await ctx.fund.connect(ctx.ops).confirmPurchaseFunding(
      purchaseKey,
      await ctx.usdc.getAddress(),
      100_000_000n,
      chainEid,
      destinationSafe,
      ethers.id("funding-settlement"),
      ethers.id("funding-proof")
    );
    await ctx.portfolioRegistry.connect(ctx.ops).recordPurchaseExecution(
      purchaseKey,
      ethers.id("tx-buy"),
      ethers.id("buy-settlement"),
      ethers.id("buy-proof")
    );
    await ctx.fund.connect(ctx.ops).recordCollectiblePosition(purchaseKey, {
      custodyMode: 0,
      tokenStandard: ethers.id("ERC721"),
      evmCollection: ctx.ops.address,
      nonEvmCollection: ethers.ZeroHash,
      tokenId: 1n,
      nonEvmTokenId: ethers.ZeroHash,
      externalAssetId: ethers.id("collectible-v5"),
      categoryId: ethers.id("sports-card"),
      marketplaceProvenanceRef: ethers.id("courtyard-vault"),
      acquisitionPriceUsdt6: 80_000_000n,
      metadataHash: ethers.id("meta-v5"),
      proofHash: ethers.id("position-proof-v5"),
    });
  }

  async function setupExecutedSale(ctx, marketId) {
    const saleKey = ethers.id(`sale-${Date.now()}-${Math.random()}`);
    await ctx.portfolioRegistry.connect(ctx.governance).authorizeSale(
      saleKey,
      1n,
      marketId,
      100_000_000n,
      ethers.id("sale-mandate")
    );
    await ctx.portfolioRegistry.connect(ctx.ops).recordSaleExecution(
      saleKey,
      120_000_000n,
      8_000_000n,
      2_000_000n,
      ethers.id("tx-sale"),
      ethers.id("raw-proceeds"),
      ethers.id("sale-proof")
    );
    return saleKey;
  }

  it("requires confirmed purchase funding before execution and validates authorization fields", async function () {
    const ctx = await loadFixture(deployV5Fixture);
    await seedRound(ctx.fund, ctx.ops, ctx.investor, "10");
    const { purchaseKey, chainEid, destinationSafe } = await setupMarketAndPurchase(ctx);

    await expect(
      ctx.portfolioRegistry.connect(ctx.ops).recordPurchaseExecution(
        purchaseKey,
        ethers.id("tx-buy"),
        ethers.id("settlement"),
        ethers.id("proof")
      )
    ).to.be.revertedWithCustomError(ctx.portfolioRegistry, "InvalidWorkflowState");

    await expect(
      ctx.fund.connect(ctx.ops).confirmPurchaseFunding(
        purchaseKey,
        await ctx.usdt.getAddress(),
        100_000_000n,
        chainEid,
        destinationSafe,
        ethers.id("settlement"),
        ethers.id("proof")
      )
    ).to.be.revertedWithCustomError(ctx.portfolioRegistry, "InvalidParameters");

    await expect(
      ctx.fund.connect(ctx.ops).confirmPurchaseFunding(
        purchaseKey,
        await ctx.usdc.getAddress(),
        101_000_000n,
        chainEid,
        destinationSafe,
        ethers.id("settlement"),
        ethers.id("proof")
      )
    ).to.be.revertedWithCustomError(ctx.portfolioRegistry, "PurchaseBudgetExceeded");

    const before = (await ctx.fund.stableAccounting()).liquidTreasury;
    await ctx.fund.connect(ctx.ops).confirmPurchaseFunding(
      purchaseKey,
      await ctx.usdc.getAddress(),
      100_000_000n,
      chainEid,
      destinationSafe,
      ethers.id("settlement"),
      ethers.id("proof")
    );
    const after = (await ctx.fund.stableAccounting()).liquidTreasury;
    expect(before - after).to.equal(100_000_000n);
  });

  it("constrains swapAndBridge to registry-approved purchase intent", async function () {
    await loadFixture(deployV5Fixture);
    const artifact = await hre.artifacts.readArtifact("GemMintStrategyFundV5");
    const abiNames = new Set(artifact.abi.filter((entry) => entry.type === "function").map((entry) => entry.name));
    expect(abiNames.has("swapAndBridge")).to.equal(false);
  });

  it("settles USDC sale proceeds only from verified fund-held balance and applies the waterfall", async function () {
    const ctx = await loadFixture(deployV5Fixture);
    await seedRound(ctx.fund, ctx.ops, ctx.investor, "10");
    const { marketId, purchaseKey, chainEid, destinationSafe } = await setupMarketAndPurchase(ctx);
    await confirmAndRecordPosition(ctx, purchaseKey, chainEid, destinationSafe);
    const saleKey = await setupExecutedSale(ctx, marketId);

    await expect(
      ctx.portfolioRegistry.connect(ctx.ops).confirmSaleProceedsReceived(saleKey, 110_000_000n)
    ).to.be.revertedWithCustomError(ctx.portfolioRegistry, "InvalidWorkflowState");

    await ctx.usdc.mint(await ctx.fund.getAddress(), 110_000_000n);
    await ctx.fund.connect(ctx.ops).confirmStableSaleProceeds(
      saleKey,
      await ctx.usdc.getAddress(),
      110_000_000n,
      false,
      ethers.id("usdc-proceeds"),
      ethers.id("usdc-proof")
    );
    await ctx.fund.connect(ctx.ops).finalizeSale(saleKey);

    const stableAccounting = await ctx.fund.stableAccounting();
    expect(stableAccounting.liquidTreasury).to.equal(257_500_000n);
    expect(stableAccounting.liquidityCatchBuyAccrued).to.equal(5_250_000n);
    expect(stableAccounting.liquidityAvaxPairingAccrued).to.equal(5_250_000n);
    expect(stableAccounting.holderDistributionAccrued).to.equal(12_000_000n);

    await expect(
      ctx.fund.connect(ctx.ops).confirmStableSaleProceeds(
        saleKey,
        await ctx.usdc.getAddress(),
        1n,
        false,
        ethers.id("reused-proceeds"),
        ethers.id("reused-proof")
      )
    ).to.be.revertedWithCustomError(ctx.fund, "SettlementAlreadyAccounted");
  });

  it("supports AVAX sale proceeds and rejects stale oracle data", async function () {
    const ctx = await loadFixture(deployV5Fixture);
    await seedRound(ctx.fund, ctx.ops, ctx.investor, "10");
    const { marketId, purchaseKey, chainEid, destinationSafe } = await setupMarketAndPurchase(ctx);
    await confirmAndRecordPosition(ctx, purchaseKey, chainEid, destinationSafe);
    const saleKey = await setupExecutedSale(ctx, marketId);

    await expect(
      ctx.fund.connect(ctx.ops).confirmNativeSaleProceeds(
        saleKey,
        ethers.id("avax-proceeds"),
        ethers.id("avax-proof")
      )
    ).to.be.revertedWithCustomError(ctx.fund, "InvalidSettlementAmount");

    const staleTime = (await time.latest()) - (2 * 24 * 60 * 60);
    await ctx.feed.setRoundData(1, 1, staleTime);
    await expect(
      ctx.fund.connect(ctx.ops).confirmNativeSaleProceeds(
        saleKey,
        ethers.id("avax-proceeds"),
        ethers.id("avax-proof"),
        { value: ethers.parseEther("4.4") }
      )
    ).to.be.revertedWithCustomError(ctx.fund, "StalePriceFeed");

    await ctx.feed.setRoundData(2, 2, await time.latest());
    await ctx.fund.connect(ctx.ops).confirmNativeSaleProceeds(
      saleKey,
      ethers.id("avax-proceeds"),
      ethers.id("avax-proof"),
      { value: ethers.parseEther("4.4") }
    );
    await ctx.fund.connect(ctx.ops).finalizeSale(saleKey);
    expect((await ctx.fund.stableAccounting()).holderDistributionAccrued).to.equal(12_000_000n);
  });

  it("keeps arbitrary external-token proceeds pending until normalized", async function () {
    const ctx = await loadFixture(deployV5Fixture);
    await seedRound(ctx.fund, ctx.ops, ctx.investor, "10");
    const { marketId, purchaseKey, chainEid, destinationSafe } = await setupMarketAndPurchase(ctx);
    await confirmAndRecordPosition(ctx, purchaseKey, chainEid, destinationSafe);
    const saleKey = await setupExecutedSale(ctx, marketId);

    await ctx.portfolioRegistry.connect(ctx.ops).recordExternalSaleProceeds(
      saleKey,
      101,
      ctx.receiver.address,
      ethers.parseEther("1"),
      18,
      ethers.id("eth-weth-proceeds"),
      ethers.id("external-proof")
    );
    await expect(ctx.fund.connect(ctx.ops).finalizeSale(saleKey))
      .to.be.revertedWithCustomError(ctx.portfolioRegistry, "InvalidWorkflowState");

    await ctx.usdc.mint(await ctx.fund.getAddress(), 110_000_000n);
    await ctx.fund.connect(ctx.ops).confirmStableSaleProceeds(
      saleKey,
      await ctx.usdc.getAddress(),
      110_000_000n,
      false,
      ethers.id("normalized-usdc"),
      ethers.id("normalized-proof")
    );
    await expect(ctx.fund.connect(ctx.ops).finalizeSale(saleKey)).to.not.be.reverted;
  });

  it("prevents rescuing canonical CATCH from the OFT adapter", async function () {
    const ctx = await loadFixture(deployV5Fixture);
    const MockEndpoint = await ethers.getContractFactory("MockLayerZeroEndpointV2");
    const endpoint = await MockEndpoint.deploy();
    await endpoint.waitForDeployment();
    const CatchOFTAdapter = await ethers.getContractFactory("CatchOFTAdapter");
    const adapter = await CatchOFTAdapter.deploy(
      await ctx.usdt.getAddress(),
      await endpoint.getAddress(),
      ctx.ops.address,
      ctx.ops.address
    );
    await adapter.waitForDeployment();

    await ctx.usdt.mint(await adapter.getAddress(), 100n);
    await ctx.usdc.mint(await adapter.getAddress(), 100n);

    await expect(
      adapter.connect(ctx.ops).rescueLockedToken(await ctx.usdt.getAddress(), ctx.receiver.address, 1n)
    ).to.be.revertedWithCustomError(adapter, "CannotRescueAdaptedToken");

    await expect(
      adapter.connect(ctx.receiver).rescueLockedToken(await ctx.usdc.getAddress(), ctx.receiver.address, 1n)
    ).to.be.reverted;

    await expect(
      adapter.connect(ctx.ops).rescueLockedToken(await ctx.usdc.getAddress(), ctx.receiver.address, 50n)
    ).to.changeTokenBalances(ctx.usdc, [adapter, ctx.receiver], [-50n, 50n]);
  });
});
