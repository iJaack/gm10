// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./GemMintStrategyFundV1.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";

/**
 * @title GemMintStrategyFundV2
 * @notice V2 Upgrade: Adds Governance Voting and Budget Approval Model
 */
contract GemMintStrategyFundV2 is 
    GemMintStrategyFundV1,
    ERC20VotesUpgradeable 
{
    // ============ New State Variables ============
    // Appended to the end to preserve storage layout
    
    // Mapping of authorized budgets for specific assets/categories
    // Asset Address (or category ID) => MAX Usable Amount
    mapping(address => uint256) public approvedBudgets;

    // ============ Events ============
    event BudgetApproved(address indexed asset, uint256 amount);
    event AssetPurchased(address indexed asset, uint256 cost);

    // ============ Initializer ============
    
    /**
     * @notice Re-initializer for V2 upgrade
     */
    function initializeV2() public reinitializer(2) {
        __ERC20Votes_init();
    }

    // ============ Governance Functions ============

    /**
     * @notice Governance approves a budget for a specific asset or category
     * @param _asset The address of the asset (or 0x0 for a category marker if desired)
     * @param _amount The maximum amount of funds authorized for this asset
     */
    function approveBudget(address _asset, uint256 _amount) 
        external 
        onlyRole(GOVERNANCE_ROLE) 
    {
        approvedBudgets[_asset] = _amount;
        emit BudgetApproved(_asset, _amount);
    }

    // ============ Manager Functions ============

    /**
     * @notice Manager purchases an asset using an approved budget
     * @dev Simple implementation: Just deducts budget and emits event. 
     *      In a real scenario, this would interact with a DEX or Marketplace.
     * @param _asset The asset to purchase
     * @param _cost The cost of the asset
     */
    function purchaseAuthorizedAsset(address _asset, uint256 _cost)
        external
        onlyRole(MANAGER_ROLE)
    {
        uint256 currentBudget = approvedBudgets[_asset];
        require(currentBudget >= _cost, "Insufficient budget authorized");
        
        // Deduct from budget
        approvedBudgets[_asset] = currentBudget - _cost;
        
        // In a real implementation:
        // IERC20(usdcToken).approve(marketplace, _cost);
        // Marketplace.buy(_asset, _cost, ...);
        
        // For now, we simulate the action
        emit AssetPurchased(_asset, _cost);
    }

    // ============ Overrides ============

    // Required overrides for ERC20Votes
    function _update(address from, address to, uint256 value) 
        internal 
        override(GemMintStrategyFundV1, ERC20VotesUpgradeable) 
    {
        super._update(from, to, value);
    }


}
