const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, upgrades } = hre;
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GemMintStrategyFundV4", function () {
  // ── Fixture ────────────────────────────────────────────────────────────────

  async function deployV4Fixture() {
    const [owner, ops, governance, failsafe, investor, operator, other] = await ethers.getSigners();

    // Deploy V2 proxy
    const FundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");
    const fundV2 = await upgrades.deployProxy(
      FundV2,
      [owner.address, 100n, 1000n],
      { kind: "uups", initializer: "initialize" }
    );
    await fundV2.waitForDeployment();

    // Mocks
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20.deploy("Mock USDT", "USDT");
    await usdt.waitForDeployment();
    const usdc = await MockERC20.deploy("Mock USDC", "USDC");
    await usdc.waitForDeployment();
    const wavax = await MockERC20.deploy("Mock WAVAX", "WAVAX");
    await wavax.waitForDeployment();

    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    const feed = await MockAggregator.deploy(8, 25n * 10n ** 8n); // AVAX = $25
    await feed.waitForDeployment();

    // Registry + accounting
    const PortfolioRegistry = await ethers.getContractFactory("Gm10PortfolioRegistry");
    const portfolioRegistry = await PortfolioRegistry.deploy(await fundV2.getAddress());
    await portfolioRegistry.waitForDeployment();

    const InvestorAccounting = await ethers.getContractFactory("Gm10InvestorAccounting");
    const investorAccounting = await InvestorAccounting.deploy(await fundV2.getAddress());
    await investorAccounting.waitForDeployment();

    // Upgrade V2 → V3
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

    // Deploy swap router mock
    const MockSwapRouterV4 = await ethers.getContractFactory("MockSwapRouterV4");
    const swapRouter = await MockSwapRouterV4.deploy(await wavax.getAddress());
    await swapRouter.waitForDeployment();

    // Seed swap router with USDC for swap returns
    await usdc.mint(await swapRouter.getAddress(), ethers.parseUnits("1000000", 6));

    // Upgrade V3 → V4  (governance holds GOVERNANCE_ROLE after V3 init)
    const FundV4 = await ethers.getContractFactory("GemMintStrategyFundV4", governance);
    fund = await upgrades.upgradeProxy(await fund.getAddress(), FundV4, {
      kind: "uups",
      call: {
        fn: "initializeV4",
        args: [await swapRouter.getAddress()],
      },
    });
    await fund.waitForDeployment();

    // Deploy Stargate mock and adapter
    const MockStargate = await ethers.getContractFactory("MockStargate");
    const mockStargate = await MockStargate.deploy();
    await mockStargate.waitForDeployment();

    const StargateBridgeAdapter = await ethers.getContractFactory("StargateBridgeAdapter");
    const adapter = await StargateBridgeAdapter.deploy(
      await fund.getAddress(),
      ops.address
    );
    await adapter.waitForDeployment();

    // Wire: adapter pool for USDC → mockStargate
    await adapter.connect(ops).setPool(
      await usdc.getAddress(),
      await mockStargate.getAddress()
    );

    // Approve adapter in fund
    await fund.connect(ops).setApprovedBridgeAdapter(await adapter.getAddress(), true);

    // Grant OPERATOR_ROLE to operator
    const OPERATOR_ROLE = await fund.OPERATOR_ROLE();
    await fund.connect(ops).grantRole(OPERATOR_ROLE, operator.address);

    // Fund the contract with AVAX
    await investor.sendTransaction({ to: await fund.getAddress(), value: ethers.parseEther("10") });

    // Set up a purchase authorization on Polygon (chain EID 30109)
    const POLYGON_EID = 30109;
    const polygonSafe = other.address; // use 'other' as the mock Polygon Safe
    const marketId = ethers.id("COURTYARD");
    const purchaseKey = ethers.id("purchase-v4-1");

    // ops has GOVERNANCE_ROLE inherited from V3 initializeV3
    await portfolioRegistry.connect(governance).setChainSafe(
      POLYGON_EID,
      polygonSafe,
      ethers.ZeroHash,
      ethers.id("POLYGON_SAFE"),
      true
    );
    await portfolioRegistry.connect(governance).setMarketplaceApproval(marketId, true);
    await portfolioRegistry.connect(governance).authorizePurchase(
      purchaseKey,
      POLYGON_EID,
      marketId,
      ethers.id("asset-courtyard-1"),
      500_000_000n, // $500 max spend
      ethers.id("mandate-v4-1")
    );

    const AVAX_PATH = [ethers.ZeroAddress, await usdc.getAddress()]; // tokenIn=address(0), tokenOut=USDC
    const MOCK_BRIDGE_FEE = ethers.parseEther("0.01");
    const AMOUNT_OUT = ethers.parseUnits("100", 6); // 100 USDC

    return {
      fund, usdt, usdc, wavax, feed, portfolioRegistry, investorAccounting,
      swapRouter, mockStargate, adapter,
      owner, ops, governance, failsafe, investor, operator, other,
      POLYGON_EID, polygonSafe, marketId, purchaseKey,
      AVAX_PATH, MOCK_BRIDGE_FEE, AMOUNT_OUT,
      OPERATOR_ROLE,
    };
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

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
    await fund.connect(investor).invest(await fund.currentRoundId(), { value: ethers.parseEther(amount) });
  }

  // ── Test 1: Happy path AVAX → USDC, bridge to Polygon Safe ─────────────────

  it("1. happy path: swapAndBridge AVAX→USDC to Polygon Safe emits PurchaseFundsBridged", async function () {
    const { fund, usdc, adapter, operator, polygonSafe, purchaseKey, AVAX_PATH, MOCK_BRIDGE_FEE, AMOUNT_OUT, POLYGON_EID } =
      await loadFixture(deployV4Fixture);

    const addrFund = await fund.getAddress();
    const addrAdapter = await adapter.getAddress();

    const totalValue = MOCK_BRIDGE_FEE + ethers.parseEther("1"); // bridge fee + swap budget

    await expect(
      fund.connect(operator).swapAndBridge(
        purchaseKey,
        ethers.ZeroAddress,       // tokenIn = native AVAX
        await usdc.getAddress(),  // tokenOut = USDC
        AVAX_PATH,
        AMOUNT_OUT,
        ethers.parseEther("1"),   // maxAmountIn: 1 AVAX
        addrAdapter,
        "0x",
        { value: totalValue }
      )
    )
      .to.emit(fund, "PurchaseFundsBridged")
      .withArgs(purchaseKey, POLYGON_EID, polygonSafe, await usdc.getAddress(), AMOUNT_OUT, MOCK_BRIDGE_FEE);

    // Bridge ref recorded
    const ref = await fund.purchaseBridgeRefs(purchaseKey);
    expect(ref.dstChainEid).to.equal(POLYGON_EID);
    expect(ref.dstSafe).to.equal(polygonSafe);
    expect(ref.tokenBridged).to.equal(await usdc.getAddress());
    expect(ref.amountBridged).to.equal(AMOUNT_OUT);
    expect(ref.bridgedAt).to.be.gt(0n);
  });

  // ── Test 2: ERC-20 in → different tokenOut (WAVAX → USDC path) ─────────────

  it("2. ERC-20 tokenIn: swaps WAVAX→USDC and bridges", async function () {
    const { fund, usdc, wavax, swapRouter, adapter, operator, purchaseKey, MOCK_BRIDGE_FEE, AMOUNT_OUT } =
      await loadFixture(deployV4Fixture);

    const addrAdapter = await adapter.getAddress();
    const addrFund = await fund.getAddress();

    // Seed fund with WAVAX
    await wavax.mint(addrFund, ethers.parseEther("10"));

    const path = [await wavax.getAddress(), await usdc.getAddress()];
    const maxIn = ethers.parseEther("5"); // max 5 WAVAX

    await expect(
      fund.connect(operator).swapAndBridge(
        purchaseKey,
        await wavax.getAddress(), // ERC-20 tokenIn
        await usdc.getAddress(),
        path,
        AMOUNT_OUT,
        maxIn,
        addrAdapter,
        "0x",
        { value: MOCK_BRIDGE_FEE }
      )
    ).to.emit(fund, "PurchaseFundsBridged");

    const ref = await fund.purchaseBridgeRefs(purchaseKey);
    expect(ref.amountBridged).to.equal(AMOUNT_OUT);
  });

  // ── Test 3: Slippage guard (avaxForSwap > maxAmountIn) ─────────────────────

  it("3. reverts when AVAX swap budget exceeds maxAmountIn", async function () {
    const { fund, usdc, adapter, operator, purchaseKey, MOCK_BRIDGE_FEE, AMOUNT_OUT } =
      await loadFixture(deployV4Fixture);

    // Send 2 AVAX for swap budget but restrict maxAmountIn to 1 AVAX.
    // avaxForSwap = msg.value - bridgeFee = 2 AVAX > maxAmountIn = 1 AVAX → SlippageTooHigh
    await expect(
      fund.connect(operator).swapAndBridge(
        purchaseKey,
        ethers.ZeroAddress,
        await usdc.getAddress(),
        [ethers.ZeroAddress, await usdc.getAddress()],
        AMOUNT_OUT,
        ethers.parseEther("1"),  // maxAmountIn = 1 AVAX
        await adapter.getAddress(),
        "0x",
        { value: MOCK_BRIDGE_FEE + ethers.parseEther("2") } // sends 2 AVAX for swap
      )
    ).to.be.revertedWithCustomError(fund, "SlippageTooHigh");
  });

  // ── Test 4: Unapproved adapter ─────────────────────────────────────────────

  it("4. reverts when adapter is not approved", async function () {
    const { fund, usdc, operator, purchaseKey, MOCK_BRIDGE_FEE, AMOUNT_OUT } =
      await loadFixture(deployV4Fixture);

    const fakeAdapter = ethers.Wallet.createRandom().address;

    await expect(
      fund.connect(operator).swapAndBridge(
        purchaseKey,
        ethers.ZeroAddress,
        await usdc.getAddress(),
        [ethers.ZeroAddress, await usdc.getAddress()],
        AMOUNT_OUT,
        ethers.parseEther("1"),
        fakeAdapter,
        "0x",
        { value: MOCK_BRIDGE_FEE + ethers.parseEther("1") }
      )
    ).to.be.revertedWithCustomError(fund, "AdapterNotApproved");
  });

  // ── Test 5: Double-bridge prevention ──────────────────────────────────────

  it("5. reverts on double-bridge for the same purchaseKey", async function () {
    const { fund, usdc, adapter, operator, purchaseKey, MOCK_BRIDGE_FEE, AMOUNT_OUT, AVAX_PATH } =
      await loadFixture(deployV4Fixture);

    const callArgs = [
      purchaseKey,
      ethers.ZeroAddress,
      await usdc.getAddress(),
      AVAX_PATH,
      AMOUNT_OUT,
      ethers.parseEther("1"),
      await adapter.getAddress(),
      "0x",
    ];
    const callValue = { value: MOCK_BRIDGE_FEE + ethers.parseEther("1") };

    // First call succeeds
    await fund.connect(operator).swapAndBridge(...callArgs, callValue);

    // Second call reverts
    await expect(
      fund.connect(operator).swapAndBridge(...callArgs, callValue)
    ).to.be.revertedWithCustomError(fund, "AlreadyBridged");
  });

  // ── Test 6: Non-operator caller ────────────────────────────────────────────

  it("6. reverts when caller does not have OPERATOR_ROLE", async function () {
    const { fund, usdc, adapter, other, purchaseKey, MOCK_BRIDGE_FEE, AMOUNT_OUT, AVAX_PATH } =
      await loadFixture(deployV4Fixture);

    await expect(
      fund.connect(other).swapAndBridge(
        purchaseKey,
        ethers.ZeroAddress,
        await usdc.getAddress(),
        AVAX_PATH,
        AMOUNT_OUT,
        ethers.parseEther("1"),
        await adapter.getAddress(),
        "0x",
        { value: MOCK_BRIDGE_FEE + ethers.parseEther("1") }
      )
    ).to.be.reverted; // AccessControl revert
  });

  // ── Test 7: Insufficient bridge fee ────────────────────────────────────────

  it("7. reverts when msg.value is less than the bridge fee", async function () {
    const { fund, usdc, adapter, operator, purchaseKey, MOCK_BRIDGE_FEE, AMOUNT_OUT, AVAX_PATH } =
      await loadFixture(deployV4Fixture);

    await expect(
      fund.connect(operator).swapAndBridge(
        purchaseKey,
        ethers.ZeroAddress,
        await usdc.getAddress(),
        AVAX_PATH,
        AMOUNT_OUT,
        ethers.parseEther("1"),
        await adapter.getAddress(),
        "0x",
        { value: MOCK_BRIDGE_FEE - 1n } // just under fee
      )
    ).to.be.revertedWithCustomError(fund, "InsufficientBridgeFee");
  });

  // ── Test 8: Swap returns less than amountOut ───────────────────────────────

  it("8. reverts when swap router returns less than amountOut", async function () {
    const { fund, usdc, adapter, swapRouter, operator, purchaseKey, MOCK_BRIDGE_FEE, AMOUNT_OUT, AVAX_PATH } =
      await loadFixture(deployV4Fixture);

    await swapRouter.setShouldReturnLess(true);

    // The router mints amountOut-1, but the fund tries to approve+bridge amountOut.
    // The ERC20 transfer in the adapter will fail (insufficient balance/allowance).
    await expect(
      fund.connect(operator).swapAndBridge(
        purchaseKey,
        ethers.ZeroAddress,
        await usdc.getAddress(),
        AVAX_PATH,
        AMOUNT_OUT,
        ethers.parseEther("1"),
        await adapter.getAddress(),
        "0x",
        { value: MOCK_BRIDGE_FEE + ethers.parseEther("1") }
      )
    ).to.be.reverted;
  });

  // ── Test 9: V3 releasePurchaseFunds still works ────────────────────────────

  it("9. V3 releasePurchaseFunds accounting path is unaffected by V4 upgrade", async function () {
    const { fund, ops, governance, portfolioRegistry, investor } =
      await loadFixture(deployV4Fixture);

    await seedRound(fund, ops, investor, "5");

    const marketId = ethers.id("COURTYARD");
    const purchaseKeyV3 = ethers.id("purchase-v3-legacy");
    const CHAIN_ETH = 30101;

    await portfolioRegistry.connect(governance).setChainSafe(CHAIN_ETH, ops.address, ethers.ZeroHash, ethers.id("ETH_SAFE"), true);
    await portfolioRegistry.connect(governance).authorizePurchase(
      purchaseKeyV3,
      CHAIN_ETH,
      marketId,
      ethers.id("legacy-asset"),
      100_000_000n,
      ethers.id("legacy-mandate")
    );

    const amountUsdt6 = 50_000_000n;
    const before = (await fund.stableAccounting()).liquidTreasury;

    await fund.connect(ops).releasePurchaseFunds(purchaseKeyV3, amountUsdt6);

    const after = (await fund.stableAccounting()).liquidTreasury;
    expect(before - after).to.equal(amountUsdt6);
  });

  // ── Test 10: Admin can add and remove bridge adapter ──────────────────────

  it("10. DEFAULT_ADMIN_ROLE can set and unset an approved bridge adapter", async function () {
    const { fund, ops, other } = await loadFixture(deployV4Fixture);

    const newAdapter = other.address;

    // Not approved initially
    expect(await fund.approvedBridgeAdapters(newAdapter)).to.be.false;

    // Add
    await expect(fund.connect(ops).setApprovedBridgeAdapter(newAdapter, true))
      .to.emit(fund, "BridgeAdapterSet")
      .withArgs(newAdapter, true);
    expect(await fund.approvedBridgeAdapters(newAdapter)).to.be.true;

    // Remove
    await expect(fund.connect(ops).setApprovedBridgeAdapter(newAdapter, false))
      .to.emit(fund, "BridgeAdapterSet")
      .withArgs(newAdapter, false);
    expect(await fund.approvedBridgeAdapters(newAdapter)).to.be.false;
  });
});
