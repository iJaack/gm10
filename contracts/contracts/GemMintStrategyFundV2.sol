// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./GemMintStrategyFundV1.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";

/**
 * @title GemMintStrategyFundV2
 * @notice V2 Upgrade: Adds Governance Voting and Budget Approval Model
 */
contract GemMintStrategyFundV2 is 
    GemMintStrategyFundV1,
    ERC20VotesUpgradeable 
{
    error InsufficientBudgetAuthorized();

    // ============ New State Variables ============
    // Appended to the end to preserve storage layout
    
    // Mapping of authorized budgets for specific assets/categories
    // Asset Address (or category ID) => MAX Usable Amount
    mapping(address => uint256) public approvedBudgets;

    // ============ Events ============
    event BudgetApproved(address indexed asset, uint256 amount);
    event AssetPurchased(address indexed asset, uint256 cost);

    // ============ Initializer ============
    
    function __GemMintStrategyFundV2_init(
        address _treasury,
        uint256 _managementFee,
        uint256 _performanceFee
    ) internal onlyInitializing {
        __GemMintStrategyFundV1_init(_treasury, _managementFee, _performanceFee);
        __GemMintStrategyFundV2_init_unchained();
    }

    /// @custom:oz-upgrades-unsafe-allow incorrect-initializer-order
    function __GemMintStrategyFundV2_init_unchained() internal onlyInitializing {
        // ERC20Votes itself has no initializer logic, but Votes requires an EIP-712 domain to support signatures.
        __ERC20Votes_init();
        __EIP712_init("Gem Mint Strategy", "1");
    }

    /**
     * @notice Initializer for fresh deployments at V2 (deploy proxy directly pointing to V2)
     */
    function initialize(
        address _treasury,
        uint256 _managementFee,
        uint256 _performanceFee
    ) public override initializer {
        __GemMintStrategyFundV2_init(_treasury, _managementFee, _performanceFee);
    }

    /**
     * @notice Re-initializer for V2 upgrade
     * @custom:oz-upgrades-unsafe-allow incorrect-initializer-order
     */
    function initializeV2() public reinitializer(2) {
        __GemMintStrategyFundV2_init_unchained();
    }

    // ============ Governance Functions ============

    /**
     * @notice Governance approves a budget for a specific asset or category
     * @param _asset The address of the asset (or 0x0 for a category marker if desired)
     * @param _amount The maximum amount of funds authorized for this asset
     */
    function approveBudget(address _asset, uint256 _amount) 
        external 
        virtual
        onlyRole(GOVERNANCE_ROLE) 
    {
        approvedBudgets[_asset] = _amount;
        emit BudgetApproved(_asset, _amount);
    }

    // ============ Manager Functions ============

    /**
     * @notice Manager withdraws governance-approved funds to execute an off-chain asset purchase
     * @dev Deducts from the approved budget for `_asset`, checks the contract's free balance
     *      (accounting for outstanding refund liabilities), then transfers `_cost` AVAX to
     *      msg.sender. The manager is responsible for executing the actual marketplace purchase
     *      and calling addCard() to record the acquired asset on-chain.
     *
     *      Future versions can replace the AVAX transfer with a marketplace adapter call:
     *        IERC20(usdcToken).approve(marketplace, _cost);
     *        Marketplace.buy(_asset, _cost, ...);
     *
     * @param _asset The address identifier of the asset category (used as budget key)
     * @param _cost The AVAX amount to withdraw for the purchase
     */
    function purchaseAuthorizedAsset(address _asset, uint256 _cost)
        external
        virtual
        onlyRole(MANAGER_ROLE)
        nonReentrant
    {
        uint256 currentBudget = approvedBudgets[_asset];
        if (currentBudget < _cost) revert InsufficientBudgetAuthorized();

        // Ensure free balance covers cost (total balance minus refund reserve)
        if (address(this).balance < _cost + totalRefundLiabilities) revert InsufficientFreeBalance();

        // Deduct from approved budget
        approvedBudgets[_asset] = currentBudget - _cost;

        // Transfer AVAX to manager for off-chain purchase execution
        _transferNative(msg.sender, _cost);

        emit AssetPurchased(_asset, _cost);
    }

    // ============ Overrides ============

    // Required overrides for ERC20Votes
    function _update(address from, address to, uint256 value) 
        internal 
        virtual
        override(GemMintStrategyFundV1, ERC20VotesUpgradeable) 
    {
        super._update(from, to, value);
    }


}
