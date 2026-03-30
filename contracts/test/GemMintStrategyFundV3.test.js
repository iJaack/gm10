const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GemMintStrategyFundV3", function () {
  async function deployV3Fixture() {
    const [owner, ops, governance, failsafe, investor, recovery, receiver] = await ethers.getSigners();

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
    const portfolioRegistry = await PortfolioRegistry.deploy(await fundV2.getAddress());
    await portfolioRegistry.waitForDeployment();

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
          await portfolioRegistry.getAddress(),
          await investorAccounting.getAddress(),
        ],
      },
    });
    await fund.waitForDeployment();

    return { fund, usdt, feed, portfolioRegistry, investorAccounting, owner, ops, governance, failsafe, investor, recovery, receiver };
  }

  async function seedRound(fund, manager, investor, amount, price = "1") {
    const now = await time.latest();
    await fund.connect(manager).createFundraisingRound(
      ethers.parseEther("1000"),
      ethers.parseEther(price),
      0n,
      ethers.parseEther("1000"),
      now,
      now + 3600
    );
    await fund.connect(investor).invest(1n, { value: ethers.parseEther(amount) });
  }

  it("records AVAX investments into USDT cost basis after the V3 upgrade", async function () {
    const { fund, ops, investor, investorAccounting } = await loadFixture(deployV3Fixture);

    await seedRound(fund, ops, investor, "2");

    const accounting = await investorAccounting.getInvestorAccounting(investor.address);
    const pnl = await investorAccounting.getInvestorPnl(investor.address, await fund.navPerTokenUsdt6());

    expect(accounting.totalContributedAvax18).to.equal(ethers.parseEther("2"));
    expect(accounting.totalCostBasisUsdt6).to.equal(50_000_000n);
    expect(accounting.directMintedTokens18).to.equal(ethers.parseEther("2"));
    expect(await fund.navPerTokenUsdt6()).to.equal(25_000_000n);
    expect(pnl.currentAttributableValueUsdt6).to.equal(50_000_000n);
  });

  it("limits the failsafe to pause, unpause, and approved recovery withdrawals", async function () {
    const { fund, ops, failsafe, recovery, investor } = await loadFixture(deployV3Fixture);

    await seedRound(fund, ops, investor, "1");
    await fund.connect(ops).setApprovedRecoveryAddress(recovery.address, true);

    await expect(fund.connect(failsafe).pause()).to.not.be.reverted;
    await expect(fund.connect(failsafe).unpause()).to.not.be.reverted;

    const beforeBalance = await ethers.provider.getBalance(recovery.address);
    const tx = await fund.connect(failsafe).emergencyWithdrawNativeToRecovery(
      recovery.address,
      ethers.parseEther("0.25"),
      "failsafe drill"
    );
    await tx.wait();
    const afterBalance = await ethers.provider.getBalance(recovery.address);

    expect(afterBalance - beforeBalance).to.equal(ethers.parseEther("0.25"));
    await expect(
      fund.connect(failsafe).emergencyWithdrawNativeToRecovery(
        investor.address,
        1n,
        "invalid"
      )
    ).to.be.revertedWithCustomError(fund, "InvalidRecoveryAddress");
  });

  it("tracks purchase approvals, sale finalization, and the mandatory profit waterfall", async function () {
    const { fund, ops, governance, investor, portfolioRegistry } = await loadFixture(deployV3Fixture);

    await seedRound(fund, ops, investor, "10");

    const marketId = ethers.id("COURTYARD");
    const purchaseKey = ethers.id("purchase-1");
    const saleKey = ethers.id("sale-1");

    await portfolioRegistry.connect(governance).setChainSafe(30101, ops.address, ethers.ZeroHash, ethers.id("ETH_SAFE"), true);
    await portfolioRegistry.connect(governance).setMarketplaceApproval(marketId, true);

    await portfolioRegistry.connect(governance).authorizePurchase(
      purchaseKey,
      30101,
      marketId,
      ethers.id("asset-1"),
      100_000_000n,
      ethers.id("mandate-1")
    );
    await fund.connect(ops).releasePurchaseFunds(purchaseKey, 100_000_000n);
    await portfolioRegistry.connect(ops).recordPurchaseExecution(
      purchaseKey,
      ethers.id("tx-buy"),
      ethers.id("bridge-buy"),
      ethers.id("proof-buy")
    );
    await fund.connect(ops).recordCollectiblePosition(purchaseKey, {
      custodyMode: 0,
      tokenStandard: ethers.id("ERC721"),
      evmCollection: ops.address,
      nonEvmCollection: ethers.ZeroHash,
      tokenId: 1n,
      nonEvmTokenId: ethers.ZeroHash,
      externalAssetId: ethers.id("collectible-1"),
      categoryId: ethers.id("sports-card"),
      marketplaceProvenanceRef: ethers.id("courtyard-vault"),
      acquisitionPriceUsdt6: 80_000_000n,
      metadataHash: ethers.id("meta-1"),
      proofHash: ethers.id("proof-1"),
    });

    let stableAccounting = await fund.stableAccounting();
    expect(stableAccounting[2]).to.equal(170_000_000n);
    expect(stableAccounting[0]).to.equal(80_000_000n);

    await portfolioRegistry.connect(governance).authorizeSale(
      saleKey,
      1n,
      marketId,
      100_000_000n,
      ethers.id("sale-mandate")
    );
    await portfolioRegistry.connect(ops).recordSaleExecution(
      saleKey,
      120_000_000n,
      8_000_000n,
      2_000_000n,
      ethers.id("tx-sale"),
      ethers.id("bridge-sale"),
      ethers.id("proof-sale")
    );
    await portfolioRegistry.connect(ops).confirmSaleProceedsReceived(saleKey, 110_000_000n);
    await fund.connect(ops).finalizeSale(saleKey);

    stableAccounting = await fund.stableAccounting();
    expect(stableAccounting[2]).to.equal(262_000_000n);
    expect(stableAccounting[4]).to.equal(7_500_000n);
    expect(stableAccounting[5]).to.equal(6_000_000n);
    expect(stableAccounting[6]).to.equal(4_500_000n);
    expect(stableAccounting[0]).to.equal(0n);
  });

  it("separates transferred holdings from direct cost-basis holdings", async function () {
    const { fund, ops, investor, receiver, investorAccounting } = await loadFixture(deployV3Fixture);

    await seedRound(fund, ops, investor, "4");
    await fund.connect(investor).transfer(receiver.address, ethers.parseEther("1"));

    const investorView = await investorAccounting.getInvestorAccounting(investor.address);
    const receiverAccounting = await investorAccounting.getInvestorAccounting(receiver.address);

    expect(investorView.attributableTokens18).to.equal(ethers.parseEther("3"));
    expect(investorView.remainingCostBasisUsdt6).to.equal(75_000_000n);
    expect(investorView.transferredOutTokens18).to.equal(ethers.parseEther("1"));
    expect(receiverAccounting.transferredInTokens18).to.equal(ethers.parseEther("1"));
    expect(receiverAccounting.totalCostBasisUsdt6).to.equal(0n);
  });

  it("records live ERC721 collection addresses in purchased positions", async function () {
    const { fund, ops, governance, investor, portfolioRegistry } = await loadFixture(deployV3Fixture);

    await seedRound(fund, ops, investor, "5");

    const MockCollection = await ethers.getContractFactory("MockGm10Collection");
    const alphaCollection = await MockCollection.deploy("GM10 Alpha", "GM10A", "ipfs://alpha/");
    await alphaCollection.waitForDeployment();
    const betaCollection = await MockCollection.deploy("GM10 Beta", "GM10B", "ipfs://beta/");
    await betaCollection.waitForDeployment();

    await alphaCollection.mint(ops.address);
    await betaCollection.mint(ops.address);

    const marketId = ethers.id("GM10_TEST_MARKET");
    await portfolioRegistry.connect(governance).setChainSafe(43113, ops.address, ethers.ZeroHash, ethers.id("FUJI_SAFE"), true);
    await portfolioRegistry.connect(governance).setMarketplaceApproval(marketId, true);

    const purchaseKeys = [ethers.id("erc721-purchase-1"), ethers.id("erc721-purchase-2")];
    const collections = [await alphaCollection.getAddress(), await betaCollection.getAddress()];

    for (let i = 0; i < purchaseKeys.length; i++) {
      const purchaseKey = purchaseKeys[i];
      await portfolioRegistry.connect(governance).authorizePurchase(
        purchaseKey,
        43113,
        marketId,
        ethers.id(`erc721-asset-${i + 1}`),
        20_000_000n,
        ethers.id(`erc721-mandate-${i + 1}`)
      );
      await fund.connect(ops).releasePurchaseFunds(purchaseKey, 20_000_000n);
      await portfolioRegistry.connect(ops).recordPurchaseExecution(
        purchaseKey,
        ethers.id(`erc721-buy-${i + 1}`),
        ethers.id(`erc721-settlement-${i + 1}`),
        ethers.id(`erc721-proof-${i + 1}`)
      );
      await fund.connect(ops).recordCollectiblePosition(purchaseKey, {
        custodyMode: 0,
        tokenStandard: ethers.id("ERC721"),
        evmCollection: collections[i],
        nonEvmCollection: ethers.ZeroHash,
        tokenId: 1n,
        nonEvmTokenId: ethers.ZeroHash,
        externalAssetId: ethers.id(`erc721-collectible-${i + 1}`),
        categoryId: ethers.id("pokemon-slab"),
        marketplaceProvenanceRef: ethers.id(`erc721-marketplace-${i + 1}`),
        acquisitionPriceUsdt6: 18_000_000n,
        metadataHash: ethers.id(`erc721-meta-${i + 1}`),
        proofHash: ethers.id(`erc721-position-proof-${i + 1}`),
      });
    }

    const position1 = await portfolioRegistry.getCollectiblePosition(1n);
    const position2 = await portfolioRegistry.getCollectiblePosition(2n);

    expect(position1.evmCollection).to.equal(await alphaCollection.getAddress());
    expect(position2.evmCollection).to.equal(await betaCollection.getAddress());
    expect(position1.tokenId).to.equal(1n);
    expect(position2.tokenId).to.equal(1n);
  });

  it("keeps the V3 ABI slim and below the EIP-170 limit", async function () {
    const artifact = await hre.artifacts.readArtifact("GemMintStrategyFundV3");
    const deployedSize = (artifact.deployedBytecode.length - 2) / 2;
    const abiNames = new Set(
      artifact.abi.filter((entry) => entry.type === "function").map((entry) => entry.name)
    );

    expect(deployedSize).to.be.lessThan(24_577);
    expect(abiNames.has("approveBudget")).to.equal(false);
    expect(abiNames.has("purchaseAuthorizedAsset")).to.equal(false);
    expect(abiNames.has("enableRoundRefunds")).to.equal(false);
    expect(abiNames.has("claimRoundRefund")).to.equal(false);
    expect(abiNames.has("addCard")).to.equal(false);
    expect(abiNames.has("updateCardValue")).to.equal(false);
    expect(abiNames.has("sellCardWithBuyback")).to.equal(false);
    expect(abiNames.has("updateBuybackConfig")).to.equal(false);
    expect(abiNames.has("updateDexConfig")).to.equal(false);
    expect(abiNames.has("forceUpdateNAV")).to.equal(false);
    expect(abiNames.has("getCard")).to.equal(false);
    expect(abiNames.has("getInvestor")).to.equal(false);
  });
});
