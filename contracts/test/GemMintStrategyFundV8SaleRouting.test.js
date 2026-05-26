const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { time } = require("@nomicfoundation/hardhat-network-helpers");

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

  const Router = await ethers.getContractFactory("Gm10SaleProfitRouter");
  const router = await Router.deploy();
  await router.waitForDeployment();

  return { fund, owner, router };
}

describe("GemMintStrategyFundV8 NAV", function () {
  it("excludes market-support buckets from stable NAV", async function () {
    const { fund, owner } = await deployMockV8();

    await fund.mintForTest(owner.address, ethers.parseEther("100"));
    await fund.setStableAccountingForTest(100_000_000n, 0n, 0n, 0n, 0n, 0n);
    await fund.syncStableNavForTest();

    const navBefore = await fund.navPerTokenUsdt6();
    expect(navBefore).to.equal(1_000_000n);

    await fund.accrueMarketSupportForTest(20_000_000n, 10_000_000n, 5_000_000n, 7_000_000n);
    await fund.syncStableNavForTest();

    expect(await fund.navPerTokenUsdt6()).to.equal(navBefore);
  });
});

describe("GemMintStrategyFundV8 sale routing", function () {
  async function snapshot(overrides = {}) {
    return {
      spotPremiumBps: overrides.spotPremiumBps ?? 0n,
      lpCoverageBps: overrides.lpCoverageBps ?? 2_000n,
      protocolLpCoverageBps: overrides.protocolLpCoverageBps ?? 2_000n,
      slippageDepthScoreBps: overrides.slippageDepthScoreBps ?? 8_000n,
      liquidTreasuryRatioBps: overrides.liquidTreasuryRatioBps ?? 2_000n,
      saleRoiBps: overrides.saleRoiBps ?? 1_000n,
      proofHash: overrides.proofHash ?? ethers.id("market-snapshot"),
      observedAt: overrides.observedAt ?? await time.latest(),
    };
  }

  it("routes realized profit by premium and discount band", async function () {
    const { router } = await deployMockV8();
    const cases = [
      { name: "premium", spotPremiumBps: 400n, expected: [8_500n, 1_500n, 0n] },
      { name: "neutral", spotPremiumBps: 0n, expected: [7_500n, 2_500n, 0n] },
      { name: "small discount", spotPremiumBps: -700n, expected: [6_500n, 2_500n, 1_000n] },
      { name: "large discount", spotPremiumBps: -2_000n, expected: [5_500n, 2_500n, 2_000n] },
      { name: "deep discount", spotPremiumBps: -3_500n, expected: [4_500n, 2_500n, 3_000n] },
    ];

    for (const testCase of cases) {
      const route = await router.previewSaleProfitRoute(
        100_000_000n,
        await snapshot({ spotPremiumBps: testCase.spotPremiumBps })
      );
      expect(
        [route.reinvestBps, route.lpSupportBps, route.buybackBurnBps],
        testCase.name
      ).to.deep.equal(testCase.expected);
      expect(route.reinvestBps + route.lpSupportBps + route.buybackBurnBps).to.equal(10_000n);
    }
  });

  it("adjusts routing for weak liquidity and weak treasury", async function () {
    const { router } = await deployMockV8();

    const liquidityWeak = await router.previewSaleProfitRoute(
      100_000_000n,
      await snapshot({ spotPremiumBps: -2_000n, slippageDepthScoreBps: 4_000n })
    );
    expect([liquidityWeak.reinvestBps, liquidityWeak.lpSupportBps, liquidityWeak.buybackBurnBps])
      .to.deep.equal([4_500n, 3_500n, 2_000n]);

    const treasuryWeak = await router.previewSaleProfitRoute(
      100_000_000n,
      await snapshot({ spotPremiumBps: -2_000n, slippageDepthScoreBps: 4_000n, liquidTreasuryRatioBps: 500n })
    );
    expect([treasuryWeak.reinvestBps, treasuryWeak.lpSupportBps, treasuryWeak.buybackBurnBps])
      .to.deep.equal([5_500n, 3_500n, 1_000n]);
  });

  it("rejects stale or proofless market snapshots", async function () {
    const { router } = await deployMockV8();
    await expect(
      router.previewSaleProfitRoute(100_000_000n, await snapshot({ proofHash: ethers.ZeroHash }))
    ).to.be.revertedWithCustomError(router, "InvalidParameters");

    await expect(
      router.previewSaleProfitRoute(100_000_000n, await snapshot({ observedAt: (await time.latest()) - 3600 }))
    ).to.be.revertedWithCustomError(router, "StalePriceFeed");
  });

  it("finalizes a verified sale using dynamic routing and no holder distribution", async function () {
    const { fund, owner, router } = await deployMockV8();
    await fund.grantManagerForTest(owner.address);

    const saleKey = ethers.id("sale-v8-neutral");
    await fund.setStableAccountingForTest(25_000_000n, 0n, 100_000_000n, 0n, 0n, 0n);
    await fund.setSaleForTest(saleKey, 100_000_000n, 80_000_000n, 120_000_000n);

    await expect(fund.finalizeSaleWithMarketSnapshot(saleKey, await router.getAddress(), await snapshot()))
      .to.emit(fund, "SaleProfitRouted")
      .withArgs(saleKey, 40_000_000n, 7_500n, 2_500n, 0n, ethers.id("market-snapshot"));

    const accounting = await fund.stableAccounting();
    expect(accounting.canonicalPortfolioValue).to.equal(0n);
    expect(accounting.holderDistributionAccrued).to.equal(0n);
    expect(accounting.liquidTreasury).to.equal(135_000_000n);
    expect(await fund.lpSupportAccruedUsdt6()).to.equal(10_000_000n);
    expect(await fund.buybackBurnAccruedUsdt6()).to.equal(0n);
  });
});
