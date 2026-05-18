// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Gm10FundStorageV2.sol";
import "./Gm10Types.sol";
import "./interfaces/IGm10PortfolioRegistry.sol";
import "./interfaces/IGm10InvestorAccounting.sol";
import "./interfaces/IChainlinkPriceFeed.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract GemMintStrategyFundV3 is Gm10FundStorageV2 {
    using SafeERC20 for IERC20;

    uint256 private constant WORKFLOW_BPS = 10_000;

    bytes32 private constant FAILSAFE_ROLE = keccak256("FAILSAFE_ROLE");
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

    error InvalidDestination();
    error InvalidPriceFeed();
    error InvalidRecoveryAddress();

    /**
     * @custom:oz-upgrades-validate-as-initializer
     * @custom:oz-upgrades-unsafe-allow missing-initializer-call
     */
    function initializeV3(
        address _canonicalUsdt,
        address _avaxUsdFeed,
        address _opsAdmin,
        address _governanceAuthority,
        address _failsafe,
        address _portfolioRegistry,
        address _investorAccounting
    ) external reinitializer(3) {
        if (
            _canonicalUsdt == address(0) ||
            _avaxUsdFeed == address(0) ||
            _opsAdmin == address(0) ||
            _governanceAuthority == address(0) ||
            _failsafe == address(0) ||
            _portfolioRegistry == address(0) ||
            _investorAccounting == address(0)
        ) revert ZeroAddress();

        canonicalUsdt = _canonicalUsdt;
        avaxUsdFeed = _avaxUsdFeed;
        portfolioRegistry = _portfolioRegistry;
        investorAccounting = _investorAccounting;
        weeklyNavCapBps = 1500;
        treasury = _opsAdmin;

        _grantRole(DEFAULT_ADMIN_ROLE, _opsAdmin);
        _grantRole(MANAGER_ROLE, _opsAdmin);
        _grantRole(ORACLE_ROLE, _opsAdmin);
        _grantRole(VALUATION_MANAGER_ROLE, _opsAdmin);
        _grantRole(GOVERNANCE_ROLE, _governanceAuthority);
        _grantRole(FAILSAFE_ROLE, _failsafe);

        if (msg.sender != _opsAdmin && hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
        }
        if (msg.sender != _opsAdmin && hasRole(MANAGER_ROLE, msg.sender)) {
            _revokeRole(MANAGER_ROLE, msg.sender);
        }
        if (msg.sender != _opsAdmin && hasRole(ORACLE_ROLE, msg.sender)) {
            _revokeRole(ORACLE_ROLE, msg.sender);
        }
        if (msg.sender != _governanceAuthority && hasRole(GOVERNANCE_ROLE, msg.sender)) {
            _revokeRole(GOVERNANCE_ROLE, msg.sender);
        }

        liquidTreasuryUsdt6 = _quoteAvaxToUsdt(address(this).balance);
        canonicalPortfolioValueUsdt6 = _quoteAvaxToUsdt(totalPortfolioValue);
        _syncStableNav();
    }

    function createFundraisingRound(
        uint256 _targetAmount,
        uint256 _tokenPrice,
        uint256 _minInvestment,
        uint256 _maxInvestment,
        uint256 _startTime,
        uint256 _endTime
    ) external virtual onlyRole(MANAGER_ROLE) {
        _createFundraisingRound(_targetAmount, _tokenPrice, _minInvestment, _maxInvestment, _startTime, _endTime);
    }

    function finalizeRound(uint256 _roundId) external virtual onlyRole(MANAGER_ROLE) {
        _finalizeRound(_roundId);
    }

    function invest(uint256 _roundId) public payable virtual nonReentrant whenNotPaused {
        uint256 previousBalance = balanceOf(msg.sender);
        _invest(_roundId, msg.sender, msg.value);

        uint256 minted = balanceOf(msg.sender) - previousBalance;
        uint256 normalizedContributionUsdt6 = _quoteAvaxToUsdt(msg.value);
        IGm10InvestorAccounting(investorAccounting).recordInvestment(
            msg.sender,
            msg.value,
            normalizedContributionUsdt6,
            minted
        );

        liquidTreasuryUsdt6 += normalizedContributionUsdt6;
        _autoFinalizeFundedRound(_roundId);
        _syncStableNav();
    }

    function redeem(uint256 _tokenAmount) external virtual nonReentrant {
        (uint256 attributableRedeemed, uint256 costBasisRemoved) =
            IGm10InvestorAccounting(investorAccounting).previewRedemption(msg.sender, _tokenAmount);

        uint256 grossAvaxAmount = Math.mulDiv(_tokenAmount, navPerToken, 1e18);
        uint256 feeAmount = Math.mulDiv(grossAvaxAmount, redemptionFee, FEE_DENOMINATOR);
        uint256 netAvaxAmount = grossAvaxAmount - feeAmount;
        uint256 netUsdtProceeds = _quoteAvaxToUsdt(netAvaxAmount);

        _redeem(msg.sender, _tokenAmount);

        IGm10InvestorAccounting(investorAccounting).recordRedemption(
            msg.sender,
            attributableRedeemed,
            costBasisRemoved,
            netUsdtProceeds
        );

        if (liquidTreasuryUsdt6 >= netUsdtProceeds) {
            liquidTreasuryUsdt6 -= netUsdtProceeds;
        } else {
            liquidTreasuryUsdt6 = 0;
        }

        _syncStableNav();
    }

    function setRedemptionsEnabled(bool _enabled) external onlyRole(GOVERNANCE_ROLE) {
        redemptionsEnabled = _enabled;
    }

    function setFees(uint256 _managementFee, uint256 _performanceFee) external onlyRole(GOVERNANCE_ROLE) {
        if (_managementFee > 500 || _performanceFee > 3000) revert InvalidParameters();
        managementFee = _managementFee;
        performanceFee = _performanceFee;
        emit FeesUpdated(_managementFee, _performanceFee);
    }

    function setRedemptionParameters(uint256 _redemptionFee, uint256 _minRedemptionAmount)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        if (_redemptionFee > MAX_FEE) revert InvalidParameters();
        redemptionFee = _redemptionFee;
        minRedemptionAmount = _minRedemptionAmount;
        emit RedemptionParametersUpdated(_redemptionFee, _minRedemptionAmount);
    }

    function setTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newTreasury == address(0)) revert ZeroAddress();
        treasury = _newTreasury;
    }

    function pause() external onlyRoleOrFailsafe(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRoleOrFailsafe(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function withdrawFromTreasury(address _to, uint256 _amount, string calldata _reason)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (_to != treasury) revert InvalidDestination();
        _withdrawFromTreasury(_to, _amount, _reason);
    }

    function setCanonicalPricingConfig(address _canonicalUsdt, address _avaxUsdFeed)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        if (_canonicalUsdt == address(0) || _avaxUsdFeed == address(0)) revert ZeroAddress();
        canonicalUsdt = _canonicalUsdt;
        avaxUsdFeed = _avaxUsdFeed;
    }

    function setWeeklyNavCapBps(uint256 _weeklyNavCapBps) external onlyRole(GOVERNANCE_ROLE) {
        if (_weeklyNavCapBps > WORKFLOW_BPS) revert InvalidParameters();
        weeklyNavCapBps = _weeklyNavCapBps;
    }

    function setApprovedRecoveryAddress(address _account, bool _approved) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_account == address(0)) revert InvalidRecoveryAddress();
        approvedRecoveryAddresses[_account] = _approved;
    }

    function releasePurchaseFunds(bytes32 _purchaseKey, uint256 _amountUsdt6) external virtual onlyRole(MANAGER_ROLE) {
        if (liquidTreasuryUsdt6 < _amountUsdt6 + holderDistributionAccruedUsdt6) revert InsufficientFreeBalance();

        IGm10PortfolioRegistry(portfolioRegistry).releasePurchaseFunds(_purchaseKey, _amountUsdt6);

        liquidTreasuryUsdt6 -= _amountUsdt6;
        outstandingPurchaseReleasesUsdt6 += _amountUsdt6;

        _syncStableNav();
    }

    function recordCollectiblePosition(bytes32 _purchaseKey, Gm10Types.PositionInput calldata _input)
        external
        onlyRole(MANAGER_ROLE)
    {
        (, uint256 acquisitionPriceUsdt6, uint256 releasedUsdt6) =
            IGm10PortfolioRegistry(portfolioRegistry).recordCollectiblePosition(_purchaseKey, _input);

        outstandingPurchaseReleasesUsdt6 -= releasedUsdt6;
        canonicalPortfolioValueUsdt6 += acquisitionPriceUsdt6;

        if (releasedUsdt6 > acquisitionPriceUsdt6) {
            liquidTreasuryUsdt6 += releasedUsdt6 - acquisitionPriceUsdt6;
        }

        _syncStableNav();
    }

    function finalizeSale(bytes32 _saleKey) external virtual onlyRole(MANAGER_ROLE) {
        (, uint256 markedValueUsdt6, uint256 costBasisUsdt6, uint256 netProceedsUsdt6) =
            IGm10PortfolioRegistry(portfolioRegistry).finalizeSale(_saleKey);
        uint256 treasuryAllocationUsdt6;
        uint256 holderDistributionAllocationUsdt6;
        uint256 liquidityCatchBuyAllocationUsdt6;
        uint256 liquidityAvaxPairingAllocationUsdt6;

        if (netProceedsUsdt6 <= costBasisUsdt6) {
            treasuryAllocationUsdt6 = netProceedsUsdt6;
        } else {
            uint256 realizedProfitUsdt6 = netProceedsUsdt6 - costBasisUsdt6;
            uint256 treasuryProfitShareUsdt6 = Math.mulDiv(realizedProfitUsdt6, 2500, WORKFLOW_BPS);
            treasuryAllocationUsdt6 = costBasisUsdt6 + treasuryProfitShareUsdt6;
            holderDistributionAllocationUsdt6 = Math.mulDiv(realizedProfitUsdt6, 4000, WORKFLOW_BPS);
            uint256 liquidityAllocationUsdt6 =
                realizedProfitUsdt6 - treasuryProfitShareUsdt6 - holderDistributionAllocationUsdt6;
            liquidityCatchBuyAllocationUsdt6 = liquidityAllocationUsdt6 / 2;
            liquidityAvaxPairingAllocationUsdt6 =
                liquidityAllocationUsdt6 - liquidityCatchBuyAllocationUsdt6;
        }

        if (canonicalPortfolioValueUsdt6 >= markedValueUsdt6) {
            canonicalPortfolioValueUsdt6 -= markedValueUsdt6;
        } else {
            canonicalPortfolioValueUsdt6 = 0;
        }

        liquidTreasuryUsdt6 += treasuryAllocationUsdt6;
        holderDistributionAccruedUsdt6 += holderDistributionAllocationUsdt6;
        liquidityCatchBuyAccruedUsdt6 += liquidityCatchBuyAllocationUsdt6;
        liquidityAvaxPairingAccruedUsdt6 += liquidityAvaxPairingAllocationUsdt6;

        _syncStableNav();
    }

    function submitValuationObservation(
        uint256 _positionId,
        Gm10Types.ValuationSourceType _sourceType,
        bytes32 _sourceRef,
        uint256 _candidateValueUsdt6,
        bytes32 _proofHash
    ) external onlyRole(VALUATION_MANAGER_ROLE) {
        (uint256 oldValueUsdt6, uint256 appliedValueUsdt6) =
            IGm10PortfolioRegistry(portfolioRegistry).submitValuationObservation(
                _positionId,
                _sourceType,
                _sourceRef,
                _candidateValueUsdt6,
                weeklyNavCapBps,
                _proofHash
            );

        if (appliedValueUsdt6 > oldValueUsdt6) {
            canonicalPortfolioValueUsdt6 += appliedValueUsdt6 - oldValueUsdt6;
        } else if (oldValueUsdt6 > appliedValueUsdt6) {
            canonicalPortfolioValueUsdt6 -= oldValueUsdt6 - appliedValueUsdt6;
        }
        _syncStableNav();
    }

    function emergencyWithdrawTokenToRecovery(address _token, address _to, uint256 _amount, string calldata _reason)
        external
        onlyRole(FAILSAFE_ROLE)
    {
        if (!approvedRecoveryAddresses[_to]) revert InvalidRecoveryAddress();
        IERC20(_token).safeTransfer(_to, _amount);

        if (_token == canonicalUsdt) {
            if (liquidTreasuryUsdt6 >= _amount) {
                liquidTreasuryUsdt6 -= _amount;
            } else {
                liquidTreasuryUsdt6 = 0;
            }
            _syncStableNav();
        }

        emit TreasuryWithdrawal(_to, _amount, _reason);
    }

    function emergencyWithdrawNativeToRecovery(address _to, uint256 _amount, string calldata _reason)
        external
        onlyRole(FAILSAFE_ROLE)
    {
        if (!approvedRecoveryAddresses[_to]) revert InvalidRecoveryAddress();
        if (_amount > address(this).balance) revert InsufficientBalance();

        uint256 accountingReductionUsdt6 = _quoteAvaxToUsdt(_amount);
        if (liquidTreasuryUsdt6 >= accountingReductionUsdt6) {
            liquidTreasuryUsdt6 -= accountingReductionUsdt6;
        } else {
            liquidTreasuryUsdt6 = 0;
        }

        _transferNative(_to, _amount);
        _syncStableNav();
        emit TreasuryWithdrawal(_to, _amount, _reason);
    }

    function revokeFailsafe(address _account) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && !hasRole(GOVERNANCE_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        _revokeRole(FAILSAFE_ROLE, _account);
    }

    function getRound(uint256 _roundId) external view returns (FundraisingRound memory) {
        return _getRound(_roundId);
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

    function _quoteAvaxToUsdt(uint256 _avaxAmountWei) internal view virtual returns (uint256) {
        if (avaxUsdFeed == address(0)) revert InvalidPriceFeed();
        (, int256 answer,,,) = IChainlinkPriceFeed(avaxUsdFeed).latestRoundData();
        if (answer <= 0) revert InvalidPriceFeed();

        uint256 feedDecimals = IChainlinkPriceFeed(avaxUsdFeed).decimals();
        return Math.mulDiv(_avaxAmountWei, uint256(answer), (10 ** feedDecimals) * 1e12);
    }

    function _syncStableNav() internal virtual {
        uint256 totalStableAssetsUsdt6 =
            liquidTreasuryUsdt6 +
            outstandingPurchaseReleasesUsdt6 +
            canonicalPortfolioValueUsdt6 +
            liquidityCatchBuyAccruedUsdt6 +
            liquidityAvaxPairingAccruedUsdt6 +
            holderDistributionAccruedUsdt6;

        uint256 supply = totalSupply();
        if (supply > 0) {
            navPerTokenUsdt6 = Math.mulDiv(totalStableAssetsUsdt6, 1e18, supply);
        } else {
            navPerTokenUsdt6 = 0;
        }

        lastStableNavUpdate = block.timestamp;
    }

    function _update(address from, address to, uint256 value) internal override(Gm10FundStorageV2) {
        super._update(from, to, value);
        if (from != address(0) && to != address(0) && from != to && investorAccounting != address(0)) {
            IGm10InvestorAccounting(investorAccounting).recordTransfer(from, to, value);
        }
    }

    modifier onlyRoleOrFailsafe(bytes32 role) {
        if (!hasRole(role, msg.sender) && !hasRole(FAILSAFE_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        _;
    }
}
