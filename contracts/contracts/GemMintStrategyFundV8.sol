// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Gm10FundStorageV2.sol";
import "./Gm10Types.sol";
import "./interfaces/IGm10ContinuousSaleRouter.sol";
import "./interfaces/IGm10PortfolioRegistry.sol";
import "./interfaces/IGm10TokenomicsV7Controller.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract GemMintStrategyFundV8 is Gm10FundStorageV2 {
    using Math for uint256;

    address internal canonicalUsdt;
    address internal avaxUsdFeed;
    address public portfolioRegistry;
    address public investorAccounting;

    uint256 internal canonicalPortfolioValueUsdt6;
    uint256 public navPerTokenUsdt6;
    uint256 internal lastStableNavUpdate;
    uint256 internal liquidTreasuryUsdt6;
    uint256 internal outstandingPurchaseReleasesUsdt6;
    uint256 internal liquidityCatchBuyAccruedUsdt6;
    uint256 internal liquidityAvaxPairingAccruedUsdt6;
    uint256 internal holderDistributionAccruedUsdt6;
    uint256 internal weeklyNavCapBps;

    mapping(address => bool) private approvedRecoveryAddresses;

    address private swapRouterV4;
    mapping(address => bool) private approvedBridgeAdapters;
    mapping(bytes32 => bool) private isBridged;
    uint256[48] private __gapV4;

    uint256 public maxPriceFeedStaleness;
    mapping(address => bool) public approvedSaleSettlementToken;
    mapping(address => uint8) public saleSettlementTokenDecimals;
    mapping(address => uint256) public accountedSettlementBalance;
    uint256[44] private __gapV5;

    uint256[50] private __gapV7;

    bool public continuousMintPaused;
    bool public buybackPaused;
    bool public lpSupportPaused;

    int256 public mintSpreadBps;
    uint256 public buybackBurnAccruedUsdt6;
    uint256 public lpSupportAccruedUsdt6;
    mapping(address => uint8) public lpVenueCustodyMode;

    mapping(bytes32 => Gm10Types.ContinuousCommit) internal continuousCommits;

    address internal immutable tokenomicsController;

    event ContinuousAccrualInitialized(int256 mintSpreadBps);
    event ContinuousMintSettled(
        bytes32 indexed commitId,
        address indexed buyer,
        uint256 settlementAmountUsdt6,
        uint256 buyerCatch18,
        uint256 segmentCatchEach18
    );
    event SaleProfitRouted(
        bytes32 indexed saleKey,
        uint256 realizedProfitUsdt6,
        uint256 reinvestBps,
        uint256 lpSupportBps,
        uint256 buybackBurnBps,
        bytes32 proofHash
    );
    event BuybackBurnExecuted(address indexed venue, uint256 amountInUsdt6, uint256 minCatchOut18, bytes32 proofHash);
    event LpSupportExecuted(
        address indexed venue,
        uint256 catchAmountUsdt6,
        uint256 pairedAvaxAmountUsdt6,
        uint8 custodyMode,
        bytes32 proofHash
    );
    event LpVenueCustodyModeUpdated(address indexed venue, uint8 mode);
    event ContinuousAccrualControlsUpdated(
        bool continuousMintPaused,
        bool buybackPaused,
        bool lpSupportPaused,
        int256 mintSpreadBps
    );

    /// @custom:oz-upgrades-unsafe-allow constructor state-variable-immutable
    constructor(address _tokenomicsController) {
        tokenomicsController = _tokenomicsController;
    }

    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV8() external reinitializer(8) {
        continuousMintPaused = true;
        buybackPaused = true;
        lpSupportPaused = true;
        mintSpreadBps = -500;
        emit ContinuousAccrualInitialized(mintSpreadBps);
    }

    function setRedemptionsEnabled(bool) external pure {
        revert InvalidParameters();
    }

    function redemptionsPermanentlyDisabled() external pure returns (bool) {
        return true;
    }

    function redeem(uint256) external pure {
        revert RedemptionsDisabled();
    }

    function previewContinuousMint(uint256 settlementAmountUsdt6)
        public
        view
        returns (uint256 buyerCatch18, uint256 segmentCatchEach18, uint256 mintPriceUsdt6)
    {
        if (settlementAmountUsdt6 == 0 || navPerTokenUsdt6 == 0) revert InvalidParameters();
        int256 mintMultiplierBps = 10_000 + mintSpreadBps;
        if (mintMultiplierBps <= 0) revert InvalidParameters();
        mintPriceUsdt6 = Math.mulDiv(navPerTokenUsdt6, uint256(mintMultiplierBps), 10_000);
        buyerCatch18 = Math.mulDiv(settlementAmountUsdt6, 1e18, mintPriceUsdt6);
        segmentCatchEach18 = Math.mulDiv(buyerCatch18, 100, 10_000);
    }

    function settleContinuousMint(bytes32 commitId, address buyer, uint256 settlementAmountUsdt6)
        external
        onlyRole(MANAGER_ROLE)
        returns (uint256 buyerCatch18)
    {
        return _settleContinuousMint(commitId, buyer, settlementAmountUsdt6);
    }

    function finalizeSaleWithMarketSnapshot(
        bytes32 saleKey,
        address saleRouter,
        Gm10Types.MarketSnapshot calldata snapshot
    ) external onlyRole(MANAGER_ROLE) {
        _finalizeSaleWithMarketSnapshot(saleKey, saleRouter, snapshot);
    }

    function setLpVenueCustodyMode(address venue, uint8 mode) external onlyRole(MANAGER_ROLE) {
        if (venue == address(0) || mode > 1) revert InvalidParameters();
        lpVenueCustodyMode[venue] = mode;
        emit LpVenueCustodyModeUpdated(venue, mode);
    }

    function setContinuousAccrualControls(
        bool _continuousMintPaused,
        bool _buybackPaused,
        bool _lpSupportPaused,
        int256 _mintSpreadBps
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (_mintSpreadBps <= -10_000) revert InvalidParameters();
        continuousMintPaused = _continuousMintPaused;
        buybackPaused = _buybackPaused;
        lpSupportPaused = _lpSupportPaused;
        mintSpreadBps = _mintSpreadBps;
        emit ContinuousAccrualControlsUpdated(
            continuousMintPaused,
            buybackPaused,
            lpSupportPaused,
            mintSpreadBps
        );
    }

    function executeBuybackBurn(Gm10Types.BuybackBurnExecution calldata execution)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (buybackPaused) revert EnforcedPause();
        if (execution.deadline < block.timestamp || execution.proofHash == bytes32(0)) revert InvalidParameters();
        if (execution.amountIn == 0 || execution.amountIn > buybackBurnAccruedUsdt6) revert InsufficientFreeBalance();
        buybackBurnAccruedUsdt6 -= execution.amountIn;
        emit BuybackBurnExecuted(execution.venue, execution.amountIn, execution.minCatchOut, execution.proofHash);
        _syncStableNav();
    }

    function executeLpSupport(Gm10Types.LpSupportExecution calldata execution)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (lpSupportPaused) revert EnforcedPause();
        if (
            execution.deadline < block.timestamp ||
            execution.proofHash == bytes32(0) ||
            lpVenueCustodyMode[execution.venue] != execution.custodyMode
        ) revert InvalidParameters();
        uint256 total = execution.catchAmount + execution.pairedAvaxAmount;
        if (total == 0 || total > lpSupportAccruedUsdt6) revert InsufficientFreeBalance();
        lpSupportAccruedUsdt6 -= total;
        emit LpSupportExecuted(
            execution.venue,
            execution.catchAmount,
            execution.pairedAvaxAmount,
            execution.custodyMode,
            execution.proofHash
        );
        _syncStableNav();
    }

    function stableAccounting()
        external
        view
        returns (
            uint256 canonicalPortfolioValue,
            uint256 lastStableNavUpdateTimestamp,
            uint256 liquidTreasury,
            uint256 outstandingPurchaseReleases,
            uint256 liquidityCatchBuyAccrued,
            uint256 liquidityAvaxPairingAccrued,
            uint256 holderDistributionAccrued,
            uint256 weeklyNavCap
        )
    {
        return (
            canonicalPortfolioValueUsdt6,
            lastStableNavUpdate,
            liquidTreasuryUsdt6,
            outstandingPurchaseReleasesUsdt6,
            liquidityCatchBuyAccruedUsdt6,
            liquidityAvaxPairingAccruedUsdt6,
            holderDistributionAccruedUsdt6,
            weeklyNavCapBps
        );
    }

    function _settleContinuousMint(bytes32 commitId, address buyer, uint256 settlementAmountUsdt6)
        internal
        returns (uint256 buyerCatch18)
    {
        if (continuousMintPaused) revert EnforcedPause();
        Gm10Types.ContinuousCommit storage commit = continuousCommits[commitId];
        if (
            commitId == bytes32(0) ||
            buyer == address(0) ||
            settlementAmountUsdt6 == 0 ||
            navPerTokenUsdt6 == 0 ||
            commit.consumed
        ) revert InvalidParameters();

        uint256 segmentCatchEach18;
        (buyerCatch18, segmentCatchEach18,) = previewContinuousMint(settlementAmountUsdt6);
        commit.commitId = commitId;
        commit.buyer = buyer;
        commit.settledAmount = settlementAmountUsdt6;
        commit.mintedBuyerCatch18 = buyerCatch18;
        commit.mintedSegmentCatch18 = segmentCatchEach18;
        commit.consumed = true;

        _mint(address(this), buyerCatch18);
        _mintSegmentAllocations(segmentCatchEach18);

        uint256 treasuryShare = Math.mulDiv(settlementAmountUsdt6, 9_000, 10_000);
        liquidTreasuryUsdt6 += treasuryShare;
        lpSupportAccruedUsdt6 += settlementAmountUsdt6 - treasuryShare;
        _syncStableNav();
        emit ContinuousMintSettled(commitId, buyer, settlementAmountUsdt6, buyerCatch18, segmentCatchEach18);
    }

    function _mintSegmentAllocations(uint256 segmentCatchEach18) internal {
        if (segmentCatchEach18 == 0) return;
        for (uint8 segment = 0; segment < 5; ++segment) {
            _mint(IGm10TokenomicsV7Controller(tokenomicsController).segmentRecipient(segment), segmentCatchEach18);
        }
    }

    function _finalizeSaleWithMarketSnapshot(
        bytes32 saleKey,
        address saleRouter,
        Gm10Types.MarketSnapshot calldata snapshot
    ) internal {
        if (saleRouter == address(0)) revert InvalidParameters();
        (, uint256 markedValueUsdt6, uint256 costBasisUsdt6, uint256 netProceedsUsdt6) =
            _finalizeSaleRecord(saleKey);

        if (canonicalPortfolioValueUsdt6 >= markedValueUsdt6) {
            canonicalPortfolioValueUsdt6 -= markedValueUsdt6;
        } else {
            canonicalPortfolioValueUsdt6 = 0;
        }

        if (netProceedsUsdt6 <= costBasisUsdt6) {
            liquidTreasuryUsdt6 += netProceedsUsdt6;
            _syncStableNav();
            return;
        }

        uint256 realizedProfitUsdt6 = netProceedsUsdt6 - costBasisUsdt6;
        Gm10Types.SaleProfitRoute memory route =
            IGm10ContinuousSaleRouter(saleRouter).previewSaleProfitRoute(realizedProfitUsdt6, snapshot);
        uint256 reinvest = Math.mulDiv(realizedProfitUsdt6, route.reinvestBps, 10_000);
        uint256 lpSupport = Math.mulDiv(realizedProfitUsdt6, route.lpSupportBps, 10_000);

        liquidTreasuryUsdt6 += costBasisUsdt6 + reinvest;
        lpSupportAccruedUsdt6 += lpSupport;
        buybackBurnAccruedUsdt6 += realizedProfitUsdt6 - reinvest - lpSupport;

        emit SaleProfitRouted(
            saleKey,
            realizedProfitUsdt6,
            route.reinvestBps,
            route.lpSupportBps,
            route.buybackBurnBps,
            snapshot.proofHash
        );
        _syncStableNav();
    }

    function _finalizeSaleRecord(bytes32 saleKey)
        internal
        virtual
        returns (
            uint256 positionId,
            uint256 markedValueUsdt6,
            uint256 acquisitionPriceUsdt6,
            uint256 netProceedsUsdt6
        )
    {
        return IGm10PortfolioRegistry(portfolioRegistry).finalizeSale(saleKey);
    }

    function _syncStableNav() internal {
        uint256 totalStableAssetsUsdt6 =
            liquidTreasuryUsdt6 +
            outstandingPurchaseReleasesUsdt6 +
            canonicalPortfolioValueUsdt6;

        uint256 supply = totalSupply();
        navPerTokenUsdt6 = supply == 0 ? 0 : Math.mulDiv(totalStableAssetsUsdt6, 1e18, supply);
        lastStableNavUpdate = block.timestamp;
    }

    uint256[38] private __gapV8;
}
