// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./GemMintStrategyFundV3.sol";
import "./interfaces/IChainlinkPriceFeed.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract GemMintStrategyFundV5 is GemMintStrategyFundV3 {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_PRICE_FEED_STALENESS = 7 days;

    address private swapRouterV4;
    mapping(address => bool) private approvedBridgeAdapters;
    mapping(bytes32 => bool) private isBridged;

    uint256[48] private __gapV4;

    uint256 public maxPriceFeedStaleness;
    mapping(address => bool) public approvedSaleSettlementToken;
    mapping(address => uint8) public saleSettlementTokenDecimals;
    mapping(address => uint256) public accountedSettlementBalance;

    event PurchaseFundingConfirmed(
        bytes32 indexed purchaseKey,
        address indexed fundingToken,
        uint256 amountUsdt6,
        uint32 destinationChainEid,
        address destinationSafe
    );
    event SaleSettlementTokenSet(address indexed token, bool approved, uint8 decimals_);
    event SaleProceedsSettled(
        bytes32 indexed saleKey,
        address indexed proceedsToken,
        uint256 proceedsAmount,
        uint256 netProceedsUsdt6
    );
    event MaxPriceFeedStalenessSet(uint256 maxStaleness);

    error DeprecatedPurchaseRelease();
    error UnapprovedSettlementToken(address token);
    error SettlementAlreadyAccounted();
    error InvalidSettlementAmount();
    error StalePriceFeed();

    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV5(address _portfolioRegistry, uint256 _maxPriceFeedStaleness)
        external
        reinitializer(5)
    {
        if (_portfolioRegistry == address(0)) revert ZeroAddress();
        portfolioRegistry = _portfolioRegistry;
        _setMaxPriceFeedStaleness(_maxPriceFeedStaleness == 0 ? 1 days : _maxPriceFeedStaleness);
    }

    function setSaleSettlementToken(address _token, bool _approved, uint8 _decimals)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        if (_token == address(0) || _decimals < 6 || _decimals > 18) revert InvalidParameters();
        approvedSaleSettlementToken[_token] = _approved;
        saleSettlementTokenDecimals[_token] = _decimals;
        emit SaleSettlementTokenSet(_token, _approved, _decimals);
    }

    function setMaxPriceFeedStaleness(uint256 _maxPriceFeedStaleness) external onlyRole(GOVERNANCE_ROLE) {
        _setMaxPriceFeedStaleness(_maxPriceFeedStaleness);
    }

    function releasePurchaseFunds(bytes32, uint256) external pure override {
        revert DeprecatedPurchaseRelease();
    }

    function confirmPurchaseFunding(
        bytes32 _purchaseKey,
        address _fundingToken,
        uint256 _amountUsdt6,
        uint32 _destinationChainEid,
        address _destinationSafe,
        bytes32 _settlementRef,
        bytes32 _proofHash
    ) external onlyRole(MANAGER_ROLE) {
        if (_destinationSafe == address(0) || _settlementRef == bytes32(0) || _proofHash == bytes32(0)) {
            revert InvalidParameters();
        }
        if (liquidTreasuryUsdt6 < _amountUsdt6 + holderDistributionAccruedUsdt6) revert InsufficientFreeBalance();

        IGm10PortfolioRegistry(portfolioRegistry).confirmPurchaseFunding(
            _purchaseKey,
            _fundingToken,
            _amountUsdt6,
            _destinationChainEid,
            _destinationSafe,
            _settlementRef,
            _proofHash
        );

        liquidTreasuryUsdt6 -= _amountUsdt6;
        outstandingPurchaseReleasesUsdt6 += _amountUsdt6;
        _syncStableNav();

        emit PurchaseFundingConfirmed(
            _purchaseKey,
            _fundingToken,
            _amountUsdt6,
            _destinationChainEid,
            _destinationSafe
        );
    }

    function confirmNativeSaleProceeds(bytes32 _saleKey, bytes32 _proceedsRef, bytes32 _proofHash)
        external
        payable
        onlyRole(MANAGER_ROLE)
        nonReentrant
    {
        if (msg.value == 0 || _proceedsRef == bytes32(0) || _proofHash == bytes32(0)) revert InvalidSettlementAmount();
        uint256 netProceedsUsdt6 = _quoteAvaxToUsdt(msg.value);
        IGm10PortfolioRegistry(portfolioRegistry).confirmSaleProceedsReceivedV2(
            _saleKey,
            address(0),
            msg.value,
            netProceedsUsdt6,
            _proceedsRef,
            _proofHash
        );
        emit SaleProceedsSettled(_saleKey, address(0), msg.value, netProceedsUsdt6);
    }

    function confirmStableSaleProceeds(
        bytes32 _saleKey,
        address _proceedsToken,
        uint256 _amount,
        bool _pullFromCaller,
        bytes32 _proceedsRef,
        bytes32 _proofHash
    ) external onlyRole(MANAGER_ROLE) nonReentrant {
        if (!approvedSaleSettlementToken[_proceedsToken]) revert UnapprovedSettlementToken(_proceedsToken);
        if (_amount == 0 || _proceedsRef == bytes32(0) || _proofHash == bytes32(0)) revert InvalidSettlementAmount();

        IERC20 token = IERC20(_proceedsToken);
        if (_pullFromCaller) {
            token.safeTransferFrom(msg.sender, address(this), _amount);
        } else {
            uint256 currentBalance = token.balanceOf(address(this));
            uint256 accounted = accountedSettlementBalance[_proceedsToken];
            if (currentBalance < accounted + _amount) revert SettlementAlreadyAccounted();
        }

        accountedSettlementBalance[_proceedsToken] += _amount;
        uint256 netProceedsUsdt6 = _normalizeStableToUsdt6(_proceedsToken, _amount);
        IGm10PortfolioRegistry(portfolioRegistry).confirmSaleProceedsReceivedV2(
            _saleKey,
            _proceedsToken,
            _amount,
            netProceedsUsdt6,
            _proceedsRef,
            _proofHash
        );
        emit SaleProceedsSettled(_saleKey, _proceedsToken, _amount, netProceedsUsdt6);
    }

    function _quoteAvaxToUsdt(uint256 _avaxAmountWei) internal view override returns (uint256) {
        if (avaxUsdFeed == address(0)) revert InvalidPriceFeed();
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
            IChainlinkPriceFeed(avaxUsdFeed).latestRoundData();
        if (answer <= 0 || updatedAt == 0 || answeredInRound < roundId) revert InvalidPriceFeed();
        if (block.timestamp - updatedAt > maxPriceFeedStaleness) revert StalePriceFeed();

        uint256 feedDecimals = IChainlinkPriceFeed(avaxUsdFeed).decimals();
        if (feedDecimals > 18) revert InvalidPriceFeed();
        return Math.mulDiv(_avaxAmountWei, uint256(answer), (10 ** feedDecimals) * 1e12);
    }

    function _normalizeStableToUsdt6(address _token, uint256 _amount) internal view returns (uint256) {
        uint8 decimals_ = saleSettlementTokenDecimals[_token];
        if (decimals_ == 6) return _amount;
        return _amount / (10 ** (decimals_ - 6));
    }

    function _setMaxPriceFeedStaleness(uint256 _maxPriceFeedStaleness) internal {
        if (_maxPriceFeedStaleness == 0 || _maxPriceFeedStaleness > MAX_PRICE_FEED_STALENESS) {
            revert InvalidParameters();
        }
        maxPriceFeedStaleness = _maxPriceFeedStaleness;
        emit MaxPriceFeedStalenessSet(_maxPriceFeedStaleness);
    }

    uint256[44] private __gapV5;
}
