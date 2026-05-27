const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

async function deployContinuousMintReceiverFixture() {
  const [
    owner,
    coreTeam,
    governanceTreasury,
    communityEcosystem,
    advisors,
    strategicPartnerships,
    buyer,
    treasury,
    attacker,
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
  await fund.mintForTest(owner.address, ethers.parseEther("100"));
  await fund.setStableAccountingForTest(100_000_000n, 0n, 0n, 0n, 0n, 0n);
  await fund.syncStableNavForTest();
  await fund.grantGovernanceForTest(owner.address);

  const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
  const feed = await MockAggregator.deploy(8, 25n * 10n ** 8n);
  await feed.waitForDeployment();

  await fund.setContinuousAccrualControls(false, true, true, -500);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Mock USDC", "USDC");
  await usdc.waitForDeployment();
  await fund.setAvaxPricingForTest(await feed.getAddress(), 24 * 60 * 60);

  const Receiver = await ethers.getContractFactory("Gm10ContinuousMintReceiver");
  const receiver = await Receiver.deploy(
    await fund.getAddress(),
    treasury.address,
    owner.address,
    await usdc.getAddress(),
    6
  );
  await receiver.waitForDeployment();
  await fund.grantManagerForTest(await receiver.getAddress());

  return { fund, controller, receiver, usdc, owner, buyer, treasury, attacker };
}

describe("Gm10ContinuousMintReceiver", function () {
  it("settles native AVAX only after it lands in the fund proxy", async function () {
    const { fund, controller, receiver, owner, buyer } = await deployContinuousMintReceiverFixture();
    const commitId = ethers.id("native-lifi-route-settlement-1");
    const providerRouteId = ethers.id("native-lifi-route-1");
    const settledAmount = ethers.parseEther("1");
    const settlementAmountUsdt6 = 25_000_000n;
    const expiresAt = (await ethers.provider.getBlock("latest")).timestamp + 600;
    const [buyerCatch18, segmentCatchEach18] = await fund.previewContinuousMint(settlementAmountUsdt6);

    await owner.sendTransaction({ to: await fund.getAddress(), value: ethers.parseEther("2") });

    await expect(
      receiver.connect(buyer).registerCommit(
        commitId,
        providerRouteId,
        buyer.address,
        ethers.ZeroAddress,
        settledAmount,
        expiresAt
      )
    )
      .to.emit(receiver, "ContinuousCommitRegistered")
      .withArgs(commitId, providerRouteId, buyer.address, ethers.ZeroAddress, settledAmount, expiresAt);

    const registeredCommit = await receiver.commits(commitId);
    expect(registeredCommit.escrow).to.equal(await fund.getAddress());
    expect(registeredCommit.fundAvaxBalanceBefore).to.equal(ethers.parseEther("2"));

    await expect(
      receiver.connect(buyer).commitSettledRoute(commitId, providerRouteId, buyer.address, ethers.ZeroAddress, settledAmount)
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");

    await owner.sendTransaction({ to: await fund.getAddress(), value: settledAmount });

    await expect(
      receiver.connect(buyer).commitSettledRoute(commitId, providerRouteId, buyer.address, ethers.ZeroAddress, settledAmount)
    )
      .to.emit(receiver, "ContinuousCommitSettled")
      .withArgs(commitId, providerRouteId, buyer.address, ethers.ZeroAddress, settledAmount, buyerCatch18);

    expect(await receiver.accountedFundAvaxSettlementWei()).to.equal(settledAmount);
    expect(await fund.balanceOf(buyer.address)).to.equal(buyerCatch18);

    for (let segment = 0; segment < 5; segment += 1) {
      const recipient = await controller.segmentRecipient(segment);
      expect(await fund.balanceOf(recipient)).to.equal(segmentCatchEach18);
    }
  });

  it("does not double-count one AVAX landing across concurrent native commits", async function () {
    const { fund, receiver, owner, buyer, attacker } = await deployContinuousMintReceiverFixture();
    const firstCommitId = ethers.id("native-lifi-route-settlement-2a");
    const secondCommitId = ethers.id("native-lifi-route-settlement-2b");
    const firstProviderRouteId = ethers.id("native-lifi-route-2a");
    const secondProviderRouteId = ethers.id("native-lifi-route-2b");
    const settledAmount = ethers.parseEther("1");
    const expiresAt = (await ethers.provider.getBlock("latest")).timestamp + 600;

    await receiver.connect(buyer).registerCommit(
      firstCommitId,
      firstProviderRouteId,
      buyer.address,
      ethers.ZeroAddress,
      settledAmount,
      expiresAt
    );
    await receiver.connect(attacker).registerCommit(
      secondCommitId,
      secondProviderRouteId,
      attacker.address,
      ethers.ZeroAddress,
      settledAmount,
      expiresAt
    );

    await owner.sendTransaction({ to: await fund.getAddress(), value: settledAmount });

    await receiver.connect(buyer).commitSettledRoute(
      firstCommitId,
      firstProviderRouteId,
      buyer.address,
      ethers.ZeroAddress,
      settledAmount
    );

    await expect(
      receiver.connect(attacker).commitSettledRoute(
        secondCommitId,
        secondProviderRouteId,
        attacker.address,
        ethers.ZeroAddress,
        settledAmount
      )
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");
  });

  it("settles a registered LI.FI route only after approved settlement tokens arrive", async function () {
    const { fund, controller, receiver, usdc, buyer, treasury } = await deployContinuousMintReceiverFixture();
    const commitId = ethers.id("lifi-route-settlement-1");
    const providerRouteId = ethers.id("lifi-route-1");
    const minSettlement = 100_000_000n;
    const settledAmount = 101_000_000n;
    const expiresAt = (await ethers.provider.getBlock("latest")).timestamp + 600;
    const [buyerCatch18, segmentCatchEach18] = await fund.previewContinuousMint(settledAmount);

    await expect(
      receiver.connect(buyer).registerCommit(
        commitId,
        providerRouteId,
        buyer.address,
        await usdc.getAddress(),
        minSettlement,
        expiresAt
      )
    )
      .to.emit(receiver, "ContinuousCommitRegistered")
      .withArgs(commitId, providerRouteId, buyer.address, await usdc.getAddress(), minSettlement, expiresAt);

    await expect(
      receiver.connect(buyer).commitSettledRoute(commitId, providerRouteId, buyer.address, await usdc.getAddress(), settledAmount)
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");

    const registeredCommit = await receiver.commits(commitId);
    await usdc.mint(registeredCommit.escrow, settledAmount);

    await expect(
      receiver.connect(buyer).commitSettledRoute(commitId, providerRouteId, buyer.address, await usdc.getAddress(), settledAmount)
    )
      .to.emit(receiver, "ContinuousCommitSettled")
      .withArgs(commitId, providerRouteId, buyer.address, await usdc.getAddress(), settledAmount, buyerCatch18);

    expect(await fund.balanceOf(buyer.address)).to.equal(buyerCatch18);
    expect(await usdc.balanceOf(treasury.address)).to.equal(settledAmount);
    expect(await usdc.balanceOf(registeredCommit.escrow)).to.equal(0n);

    for (let segment = 0; segment < 5; segment += 1) {
      const recipient = await controller.segmentRecipient(segment);
      expect(await fund.balanceOf(recipient)).to.equal(segmentCatchEach18);
    }

    await expect(
      receiver.connect(buyer).commitSettledRoute(commitId, providerRouteId, buyer.address, await usdc.getAddress(), settledAmount)
    ).to.be.revertedWithCustomError(receiver, "CommitAlreadySettled");
  });

  it("does not let another wallet hijack a registered settled route", async function () {
    const { receiver, usdc, buyer, attacker } = await deployContinuousMintReceiverFixture();
    const commitId = ethers.id("lifi-route-settlement-2");
    const providerRouteId = ethers.id("lifi-route-2");
    const settledAmount = 50_000_000n;
    const expiresAt = (await ethers.provider.getBlock("latest")).timestamp + 600;

    await receiver.connect(buyer).registerCommit(
      commitId,
      providerRouteId,
      buyer.address,
      await usdc.getAddress(),
      settledAmount,
      expiresAt
    );
    const registeredCommit = await receiver.commits(commitId);
    await usdc.mint(registeredCommit.escrow, settledAmount);

    await expect(
      receiver.connect(attacker).commitSettledRoute(
        commitId,
        providerRouteId,
        attacker.address,
        await usdc.getAddress(),
        settledAmount
      )
    ).to.be.revertedWithCustomError(receiver, "UnauthorizedCommitCaller");
  });

  it("does not count settlement tokens that were present before registration", async function () {
    const { receiver, usdc, buyer } = await deployContinuousMintReceiverFixture();
    const commitId = ethers.id("lifi-route-settlement-3");
    const providerRouteId = ethers.id("lifi-route-3");
    const settledAmount = 75_000_000n;
    const expiresAt = (await ethers.provider.getBlock("latest")).timestamp + 600;

    await usdc.mint(await receiver.getAddress(), settledAmount);
    await receiver.connect(buyer).registerCommit(
      commitId,
      providerRouteId,
      buyer.address,
      await usdc.getAddress(),
      settledAmount,
      expiresAt
    );

    await expect(
      receiver.connect(buyer).commitSettledRoute(
        commitId,
        providerRouteId,
        buyer.address,
        await usdc.getAddress(),
        settledAmount
      )
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");
  });

  it("isolates settlement balances per registered commit escrow", async function () {
    const { receiver, usdc, buyer, attacker } = await deployContinuousMintReceiverFixture();
    const firstCommitId = ethers.id("lifi-route-settlement-4a");
    const secondCommitId = ethers.id("lifi-route-settlement-4b");
    const firstProviderRouteId = ethers.id("lifi-route-4a");
    const secondProviderRouteId = ethers.id("lifi-route-4b");
    const settledAmount = 60_000_000n;
    const expiresAt = (await ethers.provider.getBlock("latest")).timestamp + 600;

    await receiver.connect(buyer).registerCommit(
      firstCommitId,
      firstProviderRouteId,
      buyer.address,
      await usdc.getAddress(),
      settledAmount,
      expiresAt
    );
    await receiver.connect(attacker).registerCommit(
      secondCommitId,
      secondProviderRouteId,
      attacker.address,
      await usdc.getAddress(),
      settledAmount,
      expiresAt
    );

    const firstCommit = await receiver.commits(firstCommitId);
    await usdc.mint(firstCommit.escrow, settledAmount);

    await expect(
      receiver.connect(attacker).commitSettledRoute(
        secondCommitId,
        secondProviderRouteId,
        attacker.address,
        await usdc.getAddress(),
        settledAmount
      )
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");
  });
});
