const { expect } = require("chai");
const hre = require("hardhat");

const { ethers, upgrades } = hre;

describe("GemMintStrategyFund (Upgradeable Proxy)", function () {
  let owner;
  let investor;
  let proposer;
  let voter;
  let treasury;

  const MANAGEMENT_FEE = 100; // 1%
  const PERFORMANCE_FEE = 1000; // 10%
  const ONE = 10n ** 18n;

  async function deployV1Proxy() {
    const FundV1 = await ethers.getContractFactory("GemMintStrategyFundV1");
    const proxy = await upgrades.deployProxy(
      FundV1,
      [treasury.address, MANAGEMENT_FEE, PERFORMANCE_FEE],
      { kind: "uups", initializer: "initialize" }
    );
    await proxy.waitForDeployment();
    return proxy;
  }

  beforeEach(async function () {
    [owner, investor, proposer, voter, treasury] = await ethers.getSigners();
  });

  it("keeps investments in-contract and updates NAV to the round price", async function () {
    const fund = await deployV1Proxy();
    const fundAddress = await fund.getAddress();

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const target = ethers.parseEther("100");
    const price = ethers.parseEther("0.5"); // 0.5 AVAX per token
    const min = ethers.parseEther("0.1");
    const max = ethers.parseEther("10");

    await fund.createFundraisingRound(target, price, min, max, now, now + 3600);

    const investAmount = ethers.parseEther("1");
    await fund.connect(investor).invest(1, { value: investAmount });

    const expectedTokens = (investAmount * ONE) / price;
    expect(await fund.balanceOf(investor.address)).to.equal(expectedTokens);

    // If funds were forwarded out to an EOA treasury, the proxy's balance would remain 0.
    expect(await ethers.provider.getBalance(fundAddress)).to.equal(investAmount);

    // NAV should match the round price: (cash + portfolio) / supply.
    expect(await fund.navPerToken()).to.equal(price);
  });

  it("supports redemption when funded in-contract (no treasury forwarding)", async function () {
    const fund = await deployV1Proxy();
    const fundAddress = await fund.getAddress();

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const target = ethers.parseEther("100");
    const price = ethers.parseEther("1");
    await fund.createFundraisingRound(target, price, 0, target, now, now + 3600);

    const investAmount = ethers.parseEther("1");
    await fund.connect(investor).invest(1, { value: investAmount });

    await fund.setRedemptionsEnabled(true);

    const tokens = await fund.balanceOf(investor.address);
    const redeemTokens = tokens / 2n;
    const expectedAvax = (redeemTokens * (await fund.navPerToken())) / ONE;

    const beforeBalance = await ethers.provider.getBalance(fundAddress);
    await fund.connect(investor).redeem(redeemTokens);
    const afterBalance = await ethers.provider.getBalance(fundAddress);

    expect(beforeBalance - afterBalance).to.equal(expectedAvax);
    expect(await fund.balanceOf(investor.address)).to.equal(tokens - redeemTokens);
  });

  it("enables round-specific refunds for failed rounds and burns round-minted tokens", async function () {
    const fund = await deployV1Proxy();
    const now = (await ethers.provider.getBlock("latest")).timestamp;

    const target = ethers.parseEther("100");
    const price = ethers.parseEther("1");
    const endTime = now + 120;

    await fund.createFundraisingRound(target, price, 0, target, now, endTime);

    const investAmount = ethers.parseEther("5");
    await fund.connect(investor).invest(1, { value: investAmount });
    expect(await fund.balanceOf(investor.address)).to.equal(investAmount);

    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
    await ethers.provider.send("evm_mine");

    await fund.enableRoundRefunds(1);
    expect(await fund.roundRefundsEnabled(1)).to.equal(true);
    expect(await fund.totalRefundLiabilities()).to.equal(investAmount);

    const beforeBalance = await ethers.provider.getBalance(investor.address);
    const tx = await fund.connect(investor).claimRoundRefund(1);
    const receipt = await tx.wait();
    const gasPrice = receipt.gasPrice ?? tx.gasPrice ?? 0n;
    const gasCost = receipt.gasUsed * gasPrice;
    const afterBalance = await ethers.provider.getBalance(investor.address);

    expect(afterBalance + gasCost - beforeBalance).to.equal(investAmount);
    expect(await fund.balanceOf(investor.address)).to.equal(0);
    expect(await fund.totalRefundLiabilities()).to.equal(0);
    await expect(fund.connect(investor).claimRoundRefund(1)).to.be.revertedWithCustomError(
      fund,
      "RefundAlreadyClaimed"
    );
  });

  it("prevents refund claims if investor no longer holds tokens minted by that round", async function () {
    const fund = await deployV1Proxy();
    const now = (await ethers.provider.getBlock("latest")).timestamp;

    const target = ethers.parseEther("50");
    const price = ethers.parseEther("1");
    const endTime = now + 120;

    await fund.createFundraisingRound(target, price, 0, target, now, endTime);

    const investAmount = ethers.parseEther("3");
    await fund.connect(investor).invest(1, { value: investAmount });
    await fund.connect(investor).transfer(proposer.address, investAmount);

    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
    await ethers.provider.send("evm_mine");
    await fund.enableRoundRefunds(1);

    await expect(fund.connect(investor).claimRoundRefund(1)).to.be.revertedWithCustomError(
      fund,
      "InsufficientTokensForRefund"
    );
  });

  it("locks treasury withdrawals while failed-round refund liabilities are outstanding", async function () {
    const fund = await deployV1Proxy();
    const now = (await ethers.provider.getBlock("latest")).timestamp;

    const target = ethers.parseEther("100");
    const price = ethers.parseEther("1");
    const endTime = now + 120;

    await fund.createFundraisingRound(target, price, 0, target, now, endTime);
    await fund.connect(investor).invest(1, { value: ethers.parseEther("2") });

    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime + 1]);
    await ethers.provider.send("evm_mine");
    await fund.enableRoundRefunds(1);

    await expect(
      fund.withdrawFromTreasury(treasury.address, ethers.parseEther("1"), "test")
    ).to.be.revertedWithCustomError(fund, "RefundReserveLocked");
  });

  it("can upgrade V1->V2 (initializeV2) and enable voting power via delegation", async function () {
    const fundV1 = await deployV1Proxy();
    const proxyAddress = await fundV1.getAddress();

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const target = ethers.parseEther("100");
    const price = ethers.parseEther("1");
    await fundV1.createFundraisingRound(target, price, 0, target, now, now + 3600);
    await fundV1.connect(investor).invest(1, { value: ethers.parseEther("2") });

    const FundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");
    const fund = await upgrades.upgradeProxy(proxyAddress, FundV2, {
      kind: "uups",
      call: { fn: "initializeV2", args: [] },
    });
    await fund.waitForDeployment();

    await fund.connect(investor).delegate(investor.address);
    expect(await fund.getVotes(investor.address)).to.equal(
      await fund.balanceOf(investor.address)
    );
  });

  it("executes a real governance flow (propose -> vote -> queue -> execute) via timelock", async function () {
    // Deploy fund V1 proxy and upgrade to V2 (votes + budget).
    const fundV1 = await deployV1Proxy();
    const proxyAddress = await fundV1.getAddress();

    const FundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");
    const fund = await upgrades.upgradeProxy(proxyAddress, FundV2, {
      kind: "uups",
      call: { fn: "initializeV2", args: [] },
    });
    await fund.waitForDeployment();

    // Create a cheap round so proposer meets the 10,000 token proposal threshold.
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const target = ethers.parseEther("1000");
    const price = ethers.parseEther("0.001"); // 1000 tokens per AVAX
    const startTime = now;
    const endTime = now + 3600;
    await fund.createFundraisingRound(
      target,
      price,
      ethers.parseEther("0.01"),
      ethers.parseEther("100"),
      startTime,
      endTime
    );

    // Two holders: proposer + voter. Each gets 15,000 tokens (>= 10,000 threshold).
    await fund.connect(proposer).invest(1, { value: ethers.parseEther("15") });
    await fund.connect(voter).invest(1, { value: ethers.parseEther("15") });
    await fund.connect(proposer).delegate(proposer.address);
    await fund.connect(voter).delegate(voter.address);

    // Deploy Timelock + Governor via ERC1967Proxy wrapper.
    const GemMintProxy = await ethers.getContractFactory("GemMintProxy");

    const TimelockFactory = await ethers.getContractFactory("GemMintTimelock");
    const timelockImpl = await TimelockFactory.deploy();
    await timelockImpl.waitForDeployment();
    const timelockInit = TimelockFactory.interface.encodeFunctionData("initialize", [
      1, // 1s delay for tests
      [],
      [],
      owner.address,
    ]);
    const timelockProxy = await GemMintProxy.deploy(
      await timelockImpl.getAddress(),
      timelockInit
    );
    await timelockProxy.waitForDeployment();
    const timelockAddress = await timelockProxy.getAddress();
    const timelock = TimelockFactory.attach(timelockAddress);

    const GovernorFactory = await ethers.getContractFactory("GemMintGovernor");
    const governorImpl = await GovernorFactory.deploy();
    await governorImpl.waitForDeployment();
    const governorInit = GovernorFactory.interface.encodeFunctionData("initialize", [
      proxyAddress,
      timelockAddress,
    ]);
    const governorProxy = await GemMintProxy.deploy(
      await governorImpl.getAddress(),
      governorInit
    );
    await governorProxy.waitForDeployment();
    const governorAddress = await governorProxy.getAddress();
    const governor = GovernorFactory.attach(governorAddress);

    // Setup roles.
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governorAddress);
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), ethers.ZeroAddress);
    await fund.grantRole(await fund.GOVERNANCE_ROLE(), timelockAddress);

    // Propose an approveBudget call.
    const asset = owner.address;
    const budgetAmount = ethers.parseEther("500");
    const description = "Proposal: Approve Budget";
    const calldata = fund.interface.encodeFunctionData("approveBudget", [
      asset,
      budgetAmount,
    ]);

    await governor
      .connect(proposer)
      .propose([proxyAddress], [0], [calldata], description);

    const descriptionHash = ethers.id(description);
    const proposalId = await governor.hashProposal(
      [proxyAddress],
      [0],
      [calldata],
      descriptionHash
    );

    // Wait voting delay.
    const delay = await governor.votingDelay();
    await ethers.provider.send("hardhat_mine", [ethers.toBeHex(Number(delay) + 1)]);

    // Vote.
    await governor.connect(proposer).castVote(proposalId, 1);
    await governor.connect(voter).castVote(proposalId, 1);

    // Wait voting period.
    const period = await governor.votingPeriod();
    await ethers.provider.send("hardhat_mine", [ethers.toBeHex(Number(period) + 1)]);

    // Queue + execute.
    await governor.queue([proxyAddress], [0], [calldata], descriptionHash);

    const minDelay = await timelock.getMinDelay();
    await ethers.provider.send("evm_increaseTime", [Number(minDelay) + 1]);
    await ethers.provider.send("evm_mine");

    await governor.execute([proxyAddress], [0], [calldata], descriptionHash);

    expect(await fund.approvedBudgets(asset)).to.equal(budgetAmount);
  });
});
