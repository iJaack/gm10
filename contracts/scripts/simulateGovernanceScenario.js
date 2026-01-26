const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = hre.network.name;

    let Fund, Governor, Timelock;
    let FUND_PROXY, GOVERNOR_ADDRESS, TIMELOCK_ADDRESS;

    console.log("--- Simulation Start (Fresh Deployment) ---");
    console.log("Network:", networkName);
    console.log("Deployer:", deployer.address);

    // ============ 0. Deploy Contracts (Mocking Production Setup) ============
    if (networkName === "hardhat" || networkName === "localhost") {
        console.log("\n--- 0. Deployment ---");

        // 1. Deploy Fund V1
        console.log("Deploying Fund V1...");
        const FundV1 = await ethers.getContractFactory("GemMintStrategyFundV1");
        const fundV1Impl = await FundV1.deploy();
        await fundV1Impl.waitForDeployment();

        const GemMintProxy = await ethers.getContractFactory("GemMintProxy");

        // Init Data
        const initData = FundV1.interface.encodeFunctionData("initialize", [
            deployer.address, // Treasury
            100, // Mgmt Fee
            1000 // Perf Fee
        ]);

        const fundProxy = await GemMintProxy.deploy(await fundV1Impl.getAddress(), initData);
        await fundProxy.waitForDeployment();
        FUND_PROXY = await fundProxy.getAddress();
        console.log("Fund Proxy (V1):", FUND_PROXY);

        // 2. Upgrade to V2
        console.log("Upgrading to Fund V2...");
        const FundV2 = await ethers.getContractFactory("GemMintStrategyFundV2");
        const fundV2Impl = await FundV2.deploy();
        await fundV2Impl.waitForDeployment();

        const fundV1Attached = FundV1.attach(FUND_PROXY);
        await fundV1Attached.upgradeToAndCall(await fundV2Impl.getAddress(), FundV2.interface.encodeFunctionData("initializeV2", []));
        console.log("Upgraded to V2.");

        Fund = FundV2.attach(FUND_PROXY);

        // 3. Deploy Timelock
        console.log("Deploying Timelock...");
        const TimelockFactory = await ethers.getContractFactory("GemMintTimelock");
        const timelockImpl = await TimelockFactory.deploy();
        await timelockImpl.waitForDeployment();

        const initDataTimelock = TimelockFactory.interface.encodeFunctionData("initialize", [
            1, // Min Delay 1 sec
            [], [], deployer.address // Admin
        ]);
        const timelockProxy = await GemMintProxy.deploy(await timelockImpl.getAddress(), initDataTimelock);
        await timelockProxy.waitForDeployment();
        TIMELOCK_ADDRESS = await timelockProxy.getAddress();
        Timelock = TimelockFactory.attach(TIMELOCK_ADDRESS);
        console.log("Timelock Proxy:", TIMELOCK_ADDRESS);

        // 4. Deploy Governor
        console.log("Deploying Governor...");
        const GovernorFactory = await ethers.getContractFactory("GemMintGovernor");
        const governorImpl = await GovernorFactory.deploy();
        await governorImpl.waitForDeployment();

        const initDataGovernor = GovernorFactory.interface.encodeFunctionData("initialize", [
            FUND_PROXY,
            TIMELOCK_ADDRESS
        ]);
        const governorProxy = await GemMintProxy.deploy(await governorImpl.getAddress(), initDataGovernor);
        await governorProxy.waitForDeployment();
        GOVERNOR_ADDRESS = await governorProxy.getAddress();
        Governor = GovernorFactory.attach(GOVERNOR_ADDRESS);
        console.log("Governor Proxy:", GOVERNOR_ADDRESS);

        // 5. Setup Roles
        console.log("Setting up Roles...");
        const PROPOSER_ROLE = await Timelock.PROPOSER_ROLE();
        const EXECUTOR_ROLE = await Timelock.EXECUTOR_ROLE();
        const GOVERNANCE_ROLE = await Fund.GOVERNANCE_ROLE();

        await Timelock.grantRole(PROPOSER_ROLE, GOVERNOR_ADDRESS);
        await Timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);

        await Fund.grantRole(GOVERNANCE_ROLE, TIMELOCK_ADDRESS);
        console.log("Granted GOVERNANCE_ROLE to Timelock.");

    } else {
        throw new Error("This script is configured for Hardhat Local Network (Factory mode).");
    }

    // ============ Simulation Logic ============

    // 1. Checks
    console.log("\n--- 1. Checks ---");
    const managerRole = await Fund.MANAGER_ROLE();
    console.log("Deployer has MANAGER_ROLE:", await Fund.hasRole(managerRole, deployer.address));

    // 2. Create Round
    console.log("\n--- 2. Fundraising Round ---");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const target = ethers.parseEther("1000");
    const price = ethers.parseEther("0.001");
    const startTime = now + 60;
    const endTime = startTime + 86400;

    await Fund.createFundraisingRound(target, price, ethers.parseEther("0.01"), ethers.parseEther("100"), startTime, endTime);
    await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + 1]);
    await ethers.provider.send("evm_mine");
    const roundId = await Fund.currentRoundId();
    console.log(`Round ${roundId} created and active.`);

    // 3. Participants
    console.log("\n--- 3. Participants ---");
    const participants = [];
    const fundAmount = ethers.parseEther("20");
    const investAmount = ethers.parseEther("15");

    for (let i = 0; i < 10; i++) { // 10 Users
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        participants.push(wallet);
        // Fund
        await deployer.sendTransaction({ to: wallet.address, value: fundAmount });
        // Invest & Delegate
        await Fund.connect(wallet).invest(roundId, { value: investAmount });
        await Fund.connect(wallet).delegate(wallet.address);
        // Log progress dot
        process.stdout.write(".");
    }
    console.log("\nParticipants ready.");

    // 4. Governance: Proposal A (Pass)
    console.log("\n--- 4. Proposal A (Pass: Approve Budget) ---");
    const budgetAmount = ethers.parseEther("500");
    const encodedFunction = Fund.interface.encodeFunctionData("approveBudget", [deployer.address, budgetAmount]);

    const proposeTx = await Governor.connect(participants[0]).propose(
        [FUND_PROXY], [0], [encodedFunction], "Proposal A: Approve Budget"
    );
    const receiptA = await proposeTx.wait();
    const idA = receiptA.logs[0].args[0];
    console.log("Proposal A ID:", idA.toString());

    // Wait Delay
    const delay = await Governor.votingDelay();
    await ethers.provider.send("hardhat_mine", [ethers.toBeHex(Number(delay) + 1)]);

    // Vote: 7 For
    for (let i = 0; i < 7; i++) {
        await Governor.connect(participants[i]).castVote(idA, 1);
    }
    console.log("Voted 7/10 For.");

    // 5. Governance: Proposal B (Fail)
    console.log("\n--- 5. Proposal B (Fail: Update Buyback) ---");
    const encodedFunctionB = Fund.interface.encodeFunctionData("updateBuybackConfig", [2000, 5000]);
    const proposeTxB = await Governor.connect(participants[1]).propose(
        [FUND_PROXY], [0], [encodedFunctionB], "Proposal B: Bad Config"
    );
    const receiptB = await proposeTxB.wait();
    const idB = receiptB.logs[0].args[0];
    console.log("Proposal B ID:", idB.toString());

    // Wait Delay
    await ethers.provider.send("hardhat_mine", [ethers.toBeHex(Number(delay) + 1)]);

    // Vote: 3 For, 7 Against
    for (let i = 0; i < 3; i++) {
        await Governor.connect(participants[i]).castVote(idB, 1);
    }
    for (let i = 3; i < 10; i++) {
        await Governor.connect(participants[i]).castVote(idB, 0);
    }
    console.log("Voted 3 For, 7 Against.");

    // 6. Execution (Proposal A)
    console.log("\n--- 6. Execute Proposal A ---");
    const period = await Governor.votingPeriod();
    await ethers.provider.send("hardhat_mine", [ethers.toBeHex(Number(period) + 1)]);

    const descHashA = ethers.id("Proposal A: Approve Budget");
    await Governor.queue([FUND_PROXY], [0], [encodedFunction], descHashA);

    const timelockDelay = await Timelock.getMinDelay();
    await ethers.provider.send("evm_increaseTime", [Number(timelockDelay) + 10]);
    await ethers.provider.send("evm_mine");

    await Governor.execute([FUND_PROXY], [0], [encodedFunction], descHashA);
    console.log("Proposal A Executed.");

    // Verify Logic
    const approved = await Fund.approvedBudgets(deployer.address);
    console.log(`Verifying: Approved Budget for Manager is ${ethers.formatEther(approved)} AVAX`);

    const stateB = await Governor.state(idB); // 3 = Defeated
    console.log(`Verifying: Proposal B State is ${stateB} (3=Defeated)`);

    // 7. Card Sale
    console.log("\n--- 7. Card Sale (Manager Action) ---");
    await Fund.addCard("CHARIZARD", "Charizard", "Base", "PSA", 100, ethers.parseEther("10"), "V", "meta");
    console.log("Skipping actual 'sellCardWithBuyback' execution as it requires DEX setup/USDC deployment.");
    console.log("Simulation Completed Successfully.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
