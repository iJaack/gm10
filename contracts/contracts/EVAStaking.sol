// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IEVAStaking.sol";

/**
 * @title EVAStaking
 * @author Eva / Gem Mint Strategy
 * @notice Stake $EVA tokens to unlock invest() on GemMintStrategyFund.
 *         Users must stake >= MIN_STAKE (10M $EVA) with a 30-day lock.
 * @dev UUPS upgradeable, consistent with the rest of the project.
 */
contract EVAStaking is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IEVAStaking
{
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 public constant MIN_STAKE = 10_000_000 * 1e18; // 10M $EVA
    uint256 public constant LOCK_PERIOD = 30 days;

    // ============ State ============

    IERC20 public evaToken;
    mapping(address => StakeInfo) private _stakes;

    // ============ Storage Gap ============
    uint256[48] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    /**
     * @notice Initialize the staking contract
     * @param _evaToken Address of the $EVA ERC-20 token
     * @param _owner Initial owner (admin) of this contract
     */
    function initialize(address _evaToken, address _owner) public initializer {
        require(_evaToken != address(0), "EVAStaking: zero token");
        require(_owner != address(0), "EVAStaking: zero owner");

        __Ownable_init(_owner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        evaToken = IERC20(_evaToken);
    }

    // ============ UUPS ============

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ============ Staking ============

    /**
     * @notice Stake $EVA tokens. Requires amount >= MIN_STAKE.
     * @param amount Number of $EVA tokens (18 decimals) to stake.
     */
    function stake(uint256 amount) external override nonReentrant whenNotPaused {
        require(amount >= MIN_STAKE, "EVAStaking: below MIN_STAKE");
        require(_stakes[msg.sender].amount == 0, "EVAStaking: already staked, use addStake");

        _stakes[msg.sender] = StakeInfo({
            amount: amount,
            unlocksAt: block.timestamp + LOCK_PERIOD
        });

        evaToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount, block.timestamp + LOCK_PERIOD);
    }

    /**
     * @notice Add more $EVA to an existing stake. Resets the lock to 30 days from now.
     * @param amount Additional $EVA to add.
     */
    function addStake(uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "EVAStaking: zero amount");
        StakeInfo storage info = _stakes[msg.sender];
        require(info.amount > 0, "EVAStaking: no existing stake");

        info.amount += amount;
        info.unlocksAt = block.timestamp + LOCK_PERIOD;

        evaToken.safeTransferFrom(msg.sender, address(this), amount);

        emit StakeAdded(msg.sender, amount, info.amount, info.unlocksAt);
    }

    /**
     * @notice Unstake all $EVA after the lock period has elapsed.
     */
    function unstake() external override nonReentrant {
        StakeInfo storage info = _stakes[msg.sender];
        require(info.amount > 0, "EVAStaking: nothing staked");
        require(block.timestamp >= info.unlocksAt, "EVAStaking: still locked");

        uint256 amount = info.amount;
        delete _stakes[msg.sender];

        evaToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    // ============ Views ============

    /**
     * @notice Check if a user has staked enough to invest.
     * @param user Address to check.
     * @return True if staked amount >= MIN_STAKE.
     */
    function canInvest(address user) external view override returns (bool) {
        return _stakes[user].amount >= MIN_STAKE;
    }

    /**
     * @notice Get full stake info for a user.
     * @param user Address to query.
     * @return amount Staked $EVA amount.
     * @return unlocksAt Timestamp when stake unlocks.
     * @return locked Whether the stake is still locked.
     */
    function getStakeInfo(address user)
        external
        view
        override
        returns (uint256 amount, uint256 unlocksAt, bool locked)
    {
        StakeInfo storage info = _stakes[user];
        amount = info.amount;
        unlocksAt = info.unlocksAt;
        locked = info.amount > 0 && block.timestamp < info.unlocksAt;
    }

    // ============ Admin ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
