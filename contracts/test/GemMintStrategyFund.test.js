const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GemMintStrategyFund", function () {
    let GemMintStrategyFund;
    let fund;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let treasury;
    let addrs;

    const MANAGEMENT_FEE = 200; // 2%
    const PERFORMANCE_FEE = 1000; // 10%

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, treasury, ...addrs] = await ethers.getSigners();

        GemMintStrategyFund = await ethers.getContractFactory("GemMintStrategyFund");
        fund = await GemMintStrategyFund.deploy(treasury.address, MANAGEMENT_FEE, PERFORMANCE_FEE);
        await fund.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await fund.hasRole(await fund.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(true);
        });

        it("Should set the right treasury", async function () {
            expect(await fund.treasury()).to.equal(treasury.address);
        });

        it("Should set the correct fees", async function () {
            expect(await fund.managementFee()).to.equal(MANAGEMENT_FEE);
            expect(await fund.performanceFee()).to.equal(PERFORMANCE_FEE);
        });

        it("Should start with 0 total supply", async function () {
            expect(await fund.totalSupply()).to.equal(0);
        });

        it("Should start with initial NAV of 1 AVAX", async function () {
            const nav = await fund.navPerToken();
            expect(nav).to.equal(ethers.parseEther("1"));
        });
    });

    describe("Fundraising", function () {
        const TARGET_AMOUNT = ethers.parseEther("100");
        const TOKEN_PRICE = ethers.parseEther("0.1"); // 10 tokens per AVAX
        const MIN_INVESTMENT = ethers.parseEther("0.1");
        const MAX_INVESTMENT = ethers.parseEther("10");

        let startTime, endTime;

        beforeEach(async function () {
            const block = await ethers.provider.getBlock("latest");
            startTime = block.timestamp + 60; // Start in 1 minute
            endTime = startTime + 3600; // Last for 1 hour

            await fund.createFundraisingRound(
                TARGET_AMOUNT,
                TOKEN_PRICE,
                MIN_INVESTMENT,
                MAX_INVESTMENT,
                startTime,
                endTime
            );
        });

        it("Should allow investment when round is active", async function () {
            // Advance time to start
            await ethers.provider.send("evm_increaseTime", [61]);
            await ethers.provider.send("evm_mine");

            const investAmount = ethers.parseEther("1");
            await fund.connect(addr1).invest({ value: investAmount });

            // Check balance
            // 1 AVAX / 0.1 Price = 10 Tokens
            expect(await fund.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));

            // Check Treasury
            // Treasury balance is tracked in contract state variable, not automatically sent to address yet in this implementation logic (based on code reading)
            // Actually reading code: treasuryBalance += msg.value (state var only)
            expect(await fund.treasuryBalance()).to.equal(investAmount);

            // NAV should reflect on-chain assets (cash) per token: 1 AVAX / 10 tokens = 0.1 AVAX
            expect(await fund.navPerToken()).to.equal(TOKEN_PRICE);
        });

        it("Should fail if investment is below minimum", async function () {
            await ethers.provider.send("evm_increaseTime", [61]);
            await ethers.provider.send("evm_mine");

            const weakAmount = ethers.parseEther("0.05");
            await expect(
                fund.connect(addr1).invest({ value: weakAmount })
            ).to.be.revertedWithCustomError(fund, "InvestmentBelowMinimum");
        });

        it("Should fail if round has not started", async function () {
            const investAmount = ethers.parseEther("1");
            await expect(
                fund.connect(addr1).invest({ value: investAmount })
            ).to.be.revertedWithCustomError(fund, "RoundNotActive");
        });
    });

    describe("Portfolio Management", function () {
        it("Should allow manager to add a card", async function () {
            const cardId = "PSA-123";
            const price = ethers.parseEther("10");

            await fund.addCard(
                cardId,
                "Charizard",
                "Base Set",
                "PSA",
                100, // Grade 10
                price,
                "Vault A",
                "ipfs://test"
            );

            expect(await fund.cardCount()).to.equal(1);
            expect(await fund.totalPortfolioValue()).to.equal(price);
        });

        it("Should update NAV when card is added", async function () {
            // First invest to get some tokens minted so NAV calc works
            const TARGET = ethers.parseEther("100");
            const PRICE = ethers.parseEther("1");
            const block = await ethers.provider.getBlock("latest");
            await fund.createFundraisingRound(TARGET, PRICE, 0, TARGET, block.timestamp, block.timestamp + 3600);

            await fund.connect(addr1).invest({ value: ethers.parseEther("10") });
            // 10 AVAX invested, 10 tokens minted. NAV should match the round price (1 AVAX per token).
            expect(await fund.navPerToken()).to.equal(ethers.parseEther("1"));

            // Simulate spending 5 AVAX to acquire a card (cash leaves the contract).
            const cardPrice = ethers.parseEther("5");
            await fund.withdrawFromTreasury(treasury.address, cardPrice, "Acquire card");

            // After spending, NAV should drop: 5 AVAX assets / 10 tokens = 0.5 AVAX per token
            expect(await fund.navPerToken()).to.equal(ethers.parseEther("0.5"));

            // Record the acquired card at the same value; NAV should return to 1.0 AVAX per token.
            await fund.addCard("C1", "N1", "S1", "G1", 100, cardPrice, "V1", "I1");

            const nav = await fund.navPerToken();
            expect(nav).to.equal(ethers.parseEther("1"));
        });
    });
});
