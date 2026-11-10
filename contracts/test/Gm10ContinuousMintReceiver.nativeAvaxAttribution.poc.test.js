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
  await usdc.setDecimalsForTest(6);

  const Receiver = await ethers.getContractFactory("Gm10ContinuousMintReceiver");
  const receiver = await Receiver.deploy(
    await fund.getAddress(),
    treasury.address,
    owner.address,
    await usdc.getAddress(),
    6
  );
  await receiver.waitForDeployment();
  await fund.grantContinuousMintForTest(await receiver.getAddress());

  return { fund, controller, receiver, usdc, owner, buyer, treasury, attacker, thirdParty, MockERC20 };
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

describe("native AVAX settlement attribution regression", function () {
  it("pays the buyer who funded that commit escrow and leaves the other commit untouched", async function () {
    const { fund, receiver, buyer, attacker } = await deployContinuousMintReceiverFixture();
    const payment = ethers.parseEther("1");
    const expiresAt = (await latestTimestamp()) + 3600;
    const attackerCommitId = ethers.id("regression-attacker-commit");
    const attackerRouteId = ethers.id("regression-attacker-route");
    const buyerCommitId = ethers.id("regression-buyer-commit");
    const buyerRouteId = ethers.id("regression-buyer-route");
    const [buyerCatch18] = await fund.previewContinuousMint(9_120000n);

    await registerNative(receiver, attacker, attackerCommitId, attackerRouteId, 1n, expiresAt);
    await registerNative(receiver, buyer, buyerCommitId, buyerRouteId, payment, expiresAt);
    const attackerEscrow = (await receiver.commits(attackerCommitId)).escrow;
    const buyerEscrow = (await receiver.commits(buyerCommitId)).escrow;
    expect(attackerEscrow).to.not.equal(buyerEscrow);
    expect(attackerEscrow).to.equal(await receiver.predictEscrow(attackerCommitId));
    expect(buyerEscrow).to.equal(await receiver.predictEscrow(buyerCommitId));

    await buyer.sendTransaction({ to: buyerEscrow, value: payment });

    await expect(
      receiver.connect(attacker).commitSettledRoute(
        attackerCommitId,
        attackerRouteId,
        attacker.address,
        NATIVE_AVAX,
        payment
      )
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");

    await receiver.connect(buyer).commitSettledRoute(
      buyerCommitId,
      buyerRouteId,
      buyer.address,
      NATIVE_AVAX,
      payment
    );

    expect(await fund.balanceOf(buyer.address)).to.equal(buyerCatch18);
    expect(await fund.balanceOf(attacker.address)).to.equal(0n);
    expect(await ethers.provider.getBalance(buyerEscrow)).to.equal(0n);
    expect(await ethers.provider.getBalance(await fund.getAddress())).to.equal(payment);
  });

  it("does not mint for AVAX sent to the fund instead of the commit escrow", async function () {
    const { fund, receiver, attacker, thirdParty } = await deployContinuousMintReceiverFixture();
    const inflow = ethers.parseEther("2");
    const expiresAt = (await latestTimestamp()) + 86_400;
    const commitId = ethers.id("regression-third-party-inflow");
    const routeId = ethers.id("regression-third-party-route");

    await registerNative(receiver, attacker, commitId, routeId, 1n, expiresAt);
    await thirdParty.sendTransaction({ to: await fund.getAddress(), value: inflow });

    await expect(
      receiver.connect(attacker).commitSettledRoute(commitId, routeId, attacker.address, NATIVE_AVAX, inflow)
    ).to.be.revertedWithCustomError(receiver, "InsufficientSettlementBalance");
    expect(await fund.balanceOf(attacker.address)).to.equal(0n);
  });

  it("returns escrowed AVAX to the buyer and blocks a later mint", async function () {
    const { fund, receiver, buyer } = await deployContinuousMintReceiverFixture();
    const payment = ethers.parseEther("1");
    const expiresAt = (await latestTimestamp()) + 600;
    const commitId = ethers.id("regression-refund");
    const routeId = ethers.id("regression-refund-route");

    await registerNative(receiver, buyer, commitId, routeId, payment, expiresAt);
    const escrow = (await receiver.commits(commitId)).escrow;
    await buyer.sendTransaction({ to: escrow, value: payment });

    await expect(receiver.connect(buyer).refundCommit(commitId))
      .to.emit(receiver, "ContinuousCommitRefunded")
      .withArgs(commitId, buyer.address, NATIVE_AVAX, payment);
    expect(await ethers.provider.getBalance(escrow)).to.equal(0n);
    expect((await receiver.commits(commitId)).cancelled).to.equal(true);

    await buyer.sendTransaction({ to: escrow, value: payment });
    await expect(
      receiver.connect(buyer).commitSettledRoute(commitId, routeId, buyer.address, NATIVE_AVAX, payment)
    ).to.be.revertedWithCustomError(receiver, "CommitCancelled");
    await expect(receiver.connect(buyer).refundCommit(commitId))
      .to.emit(receiver, "ContinuousCommitRefunded")
      .withArgs(commitId, buyer.address, NATIVE_AVAX, payment);

    await time.increaseTo(expiresAt + 1);
    expect(await fund.balanceOf(buyer.address)).to.equal(0n);
  });

  it("keeps the registered decimal snapshot when a token changes its reported decimals", async function () {
    const { fund, receiver, buyer, attacker, owner, MockERC20 } = await deployContinuousMintReceiverFixture();
    const volatile = await MockERC20.deploy("Volatile Receipt", "VOL");
    await volatile.waitForDeployment();

    await expect(
      receiver.connect(attacker).configureSettlementToken(await volatile.getAddress(), true, 18)
    ).to.be.revertedWithCustomError(receiver, "AccessControlUnauthorizedAccount");
    await expect(
      receiver.connect(owner).configureSettlementToken(await volatile.getAddress(), true, 6)
    ).to.be.revertedWithCustomError(receiver, "InvalidParameters");

    await receiver.connect(owner).configureSettlementToken(await volatile.getAddress(), true, 18);
    const oneToken = ethers.parseEther("1");
    const [catchForOneUsd] = await fund.previewContinuousMint(1_000_000n);
    const expiresAt = (await latestTimestamp()) + 3600;
    const commitId = ethers.id("regression-decimal-snapshot");
    const routeId = ethers.id("regression-decimal-snapshot-route");

    await receiver.connect(buyer).registerCommit(
      commitId,
      routeId,
      buyer.address,
      await volatile.getAddress(),
      oneToken,
      expiresAt
    );
    await volatile.setDecimalsForTest(6);
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
    expect((await receiver.commits(commitId)).settlementDecimals).to.equal(18);
  });
});
