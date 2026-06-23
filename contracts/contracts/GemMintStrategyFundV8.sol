// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Gm10FundStorageV2.sol";
import "./Gm10Types.sol";
import "./interfaces/IChainlinkPriceFeed.sol";
import "./interfaces/IGm10ContinuousSaleRouter.sol";
import "./interfaces/IGm10PortfolioRegistry.sol";
import "./interfaces/IGm10TokenomicsV7Controller.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract GemMintStrategyFundV8 is Gm10FundStorageV2 {
    using Math for uint256;
    using SafeERC20 for IERC20;

    uint256 private constant WORKFLOW_BPS = 10_000;
    bytes32 private constant VALUATION_MANAGER_ROLE = keccak256("VALUATION_MANAGER_ROLE");

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
    uint256 public accountedFundAvaxSettlementWei;

    address internal immutable tokenomicsController;

    event ContinuousAccrualInitialized(int256 mintSpreadBps);
    event PurchaseFundingConfirmed(
        bytes32 indexed purchaseKey,
        address indexed fundingToken,
        uint256 amountUsdt6,
        uint32 destinationChainEid,
        address destinationSafe
    );
    event ContinuousMintSettled(
        bytes32 indexed commitId,
        address indexed buyer,
        uint256 settlementAmountUsdt6,
        uint256 buyerCatch18,
        uint256 segmentCatchEach18
    );
    event ContinuousMintAvaxSettled(
        bytes32 indexed commitId,
        address indexed buyer,
        uint256 avaxAmountWei,
        uint256 settlementAmountUsdt6
    );
    event SaleProfitRouted(
        bytes32 indexed saleKey,
        uint256 realizedProfitUsdt6,
        uint256 reinvestBps,
        uint256 lpSupportBps,
        uint256 buybackBurnBps,
        bytes32 proofHash
    );
    event SaleProceedsSettled(
        bytes32 indexed saleKey,
        address indexed proceedsToken,
        uint256 proceedsAmount,
        uint256 netProceedsUsdt6
    );
    event BuybackBurnExecuted(address indexed venue, uint256 amountInUsdt6, uint256 minCatchOut18, bytes32 proofHash);
    event LpSupportExecuted(
        address indexed venue,
        uint256 catchAmountUsdt6,
        uint256 pairedAvaxAmountUsdt6,
        uint8 custodyMode,
        bytes32 proofHash
    );
    event LpSupportTokenReleased(
        address indexed token,
        address indexed to,
        uint256 amountUsdt6,
        uint256 tokenAmount,
        bytes32 proofHash
    );
    event LpVenueCustodyModeUpdated(address indexed venue, uint8 mode);
    event ContinuousAccrualControlsUpdated(
        bool continuousMintPaused,
        bool buybackPaused,
        bool lpSupportPaused,
        int256 mintSpreadBps
    );

    error InvalidPriceFeed();
    error StalePriceFeed();
    error InsufficientSettlementBalance();
    error UnapprovedSettlementToken(address token);
    error SettlementAlreadyAccounted();
    error InvalidSettlementAmount();
    error UnsupportedSettlementTokenDecimals();
    error DeprecatedPurchaseRelease();

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

    function releasePurchaseFunds(bytes32, uint256) external pure {
        revert DeprecatedPurchaseRelease();
    }

    function confirmPurchaseFunding(
        bytes32 purchaseKey,
        address fundingToken,
        uint256 amountUsdt6,
        uint32 destinationChainEid,
        address destinationSafe,
        bytes32 settlementRef,
        bytes32 proofHash
    ) external onlyRole(MANAGER_ROLE) {
        if (destinationSafe == address(0) || settlementRef == bytes32(0) || proofHash == bytes32(0)) {
            revert InvalidParameters();
        }
        if (liquidTreasuryUsdt6 < amountUsdt6 + holderDistributionAccruedUsdt6) revert InsufficientFreeBalance();

        IGm10PortfolioRegistry(portfolioRegistry).confirmPurchaseFunding(
            purchaseKey,
            fundingToken,
            amountUsdt6,
            destinationChainEid,
            destinationSafe,
            settlementRef,
            proofHash
        );

        liquidTreasuryUsdt6 -= amountUsdt6;
        outstandingPurchaseReleasesUsdt6 += amountUsdt6;
        _syncStableNav();

        emit PurchaseFundingConfirmed(
            purchaseKey,
            fundingToken,
            amountUsdt6,
            destinationChainEid,
            destinationSafe
        );
    }

    function recordCollectiblePosition(bytes32 purchaseKey, Gm10Types.PositionInput calldata input)
        external
        onlyRole(MANAGER_ROLE)
    {
        (, uint256 acquisitionPriceUsdt6, uint256 releasedUsdt6) =
            IGm10PortfolioRegistry(portfolioRegistry).recordCollectiblePosition(purchaseKey, input);

        outstandingPurchaseReleasesUsdt6 -= releasedUsdt6;
        canonicalPortfolioValueUsdt6 += acquisitionPriceUsdt6;

        if (releasedUsdt6 > acquisitionPriceUsdt6) {
            liquidTreasuryUsdt6 += releasedUsdt6 - acquisitionPriceUsdt6;
        }

        _syncStableNav();
    }

    function submitValuationObservation(
        uint256 positionId,
        Gm10Types.ValuationSourceType sourceType,
        bytes32 sourceRef,
        uint256 candidateValueUsdt6,
        bytes32 proofHash
    ) external onlyRole(VALUATION_MANAGER_ROLE) {
        (uint256 oldValueUsdt6, uint256 appliedValueUsdt6) =
            IGm10PortfolioRegistry(portfolioRegistry).submitValuationObservation(
                positionId,
                sourceType,
                sourceRef,
                candidateValueUsdt6,
                weeklyNavCapBps,
                proofHash
            );

        if (appliedValueUsdt6 > oldValueUsdt6) {
            canonicalPortfolioValueUsdt6 += appliedValueUsdt6 - oldValueUsdt6;
        } else if (oldValueUsdt6 > appliedValueUsdt6) {
            canonicalPortfolioValueUsdt6 -= oldValueUsdt6 - appliedValueUsdt6;
        }
        _syncStableNav();
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

    function settleContinuousMintFromAvax(bytes32 commitId, address buyer, uint256 avaxAmountWei)
        external
        onlyRole(MANAGER_ROLE)
        returns (uint256 buyerCatch18)
    {
        if (avaxAmountWei == 0) revert InvalidParameters();
        if (address(this).balance < accountedFundAvaxSettlementWei + avaxAmountWei) {
            revert InsufficientSettlementBalance();
        }

        accountedFundAvaxSettlementWei += avaxAmountWei;
        uint256 settlementAmountUsdt6 = _quoteAvaxToUsdt(avaxAmountWei);
        buyerCatch18 = _settleContinuousMint(commitId, buyer, settlementAmountUsdt6);
        emit ContinuousMintAvaxSettled(commitId, buyer, avaxAmountWei, settlementAmountUsdt6);
    }

    function confirmStableSaleProceeds(
        bytes32 saleKey,
        address proceedsToken,
        uint256 amount,
        bool pullFromCaller,
        bytes32 proceedsRef,
        bytes32 proofHash
    ) external onlyRole(MANAGER_ROLE) nonReentrant {
        if (!approvedSaleSettlementToken[proceedsToken]) revert UnapprovedSettlementToken(proceedsToken);
        if (amount == 0 || proceedsRef == bytes32(0) || proofHash == bytes32(0)) revert InvalidSettlementAmount();

        IERC20 token = IERC20(proceedsToken);
        if (pullFromCaller) {
            token.safeTransferFrom(msg.sender, address(this), amount);
        } else {
            uint256 currentBalance = token.balanceOf(address(this));
            uint256 accounted = accountedSettlementBalance[proceedsToken];
            if (currentBalance < accounted + amount) revert SettlementAlreadyAccounted();
        }

        accountedSettlementBalance[proceedsToken] += amount;
        uint256 netProceedsUsdt6 = _normalizeStableToUsdt6(proceedsToken, amount);
        IGm10PortfolioRegistry(portfolioRegistry).confirmSaleProceedsReceivedV2(
            saleKey,
            proceedsToken,
            amount,
            netProceedsUsdt6,
            proceedsRef,
            proofHash
        );
        emit SaleProceedsSettled(saleKey, proceedsToken, amount, netProceedsUsdt6);
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

    function releaseLpSupportToken(
        address token,
        address to,
        uint256 amountUsdt6,
        uint256 tokenAmount,
        bytes32 proofHash
    ) external onlyRole(MANAGER_ROLE) nonReentrant {
        if (
            token == address(0) ||
            to == address(0) ||
            amountUsdt6 == 0 ||
            tokenAmount == 0 ||
            proofHash == bytes32(0)
        ) revert InvalidParameters();
        if (!approvedSaleSettlementToken[token]) revert UnapprovedSettlementToken(token);
        if (amountUsdt6 > lpSupportAccruedUsdt6) revert InsufficientFreeBalance();
        if (_normalizeStableToUsdt6(token, tokenAmount) != amountUsdt6) revert InvalidSettlementAmount();

        IERC20(token).safeTransfer(to, tokenAmount);
        emit LpSupportTokenReleased(token, to, amountUsdt6, tokenAmount, proofHash);
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

        _mint(buyer, buyerCatch18);
        _mintSegmentAllocations(segmentCatchEach18);

        uint256 treasuryShare = Math.mulDiv(settlementAmountUsdt6, 9_000, 10_000);
        liquidTreasuryUsdt6 += treasuryShare;
        lpSupportAccruedUsdt6 += settlementAmountUsdt6 - treasuryShare;
        _syncStableNav();
        emit ContinuousMintSettled(commitId, buyer, settlementAmountUsdt6, buyerCatch18, segmentCatchEach18);
    }

    function _quoteAvaxToUsdt(uint256 avaxAmountWei) internal view returns (uint256) {
        if (avaxUsdFeed == address(0)) revert InvalidPriceFeed();
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
            IChainlinkPriceFeed(avaxUsdFeed).latestRoundData();
        if (answer <= 0 || updatedAt == 0 || answeredInRound < roundId) revert InvalidPriceFeed();
        if (block.timestamp - updatedAt > maxPriceFeedStaleness) revert StalePriceFeed();

        uint256 feedDecimals = IChainlinkPriceFeed(avaxUsdFeed).decimals();
        if (feedDecimals > 18) revert InvalidPriceFeed();
        return Math.mulDiv(avaxAmountWei, uint256(answer), (10 ** feedDecimals) * 1e12);
    }

    function _normalizeStableToUsdt6(address token, uint256 amount) internal view returns (uint256) {
        uint8 decimals_ = saleSettlementTokenDecimals[token];
        if (decimals_ < 6) revert UnsupportedSettlementTokenDecimals();
        if (decimals_ == 6) return amount;
        return amount / (10 ** (decimals_ - 6));
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

    uint256[37] private __gapV8;
}
