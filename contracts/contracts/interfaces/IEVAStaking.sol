// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IEVAStaking
 * @notice Interface for the EVA token staking contract used as an invest-gate
 */
interface IEVAStaking {
    struct StakeInfo {
        uint256 amount;
        uint256 unlocksAt;
    }

    event Staked(address indexed user, uint256 amount, uint256 unlocksAt);
    event Unstaked(address indexed user, uint256 amount);
    event StakeAdded(address indexed user, uint256 addedAmount, uint256 newTotal, uint256 newUnlocksAt);

    function stake(uint256 amount) external;
    function unstake() external;
    function addStake(uint256 amount) external;
    function canInvest(address user) external view returns (bool);
    function getStakeInfo(address user) external view returns (uint256 amount, uint256 unlocksAt, bool locked);
}
