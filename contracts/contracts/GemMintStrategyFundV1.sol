// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IRouter.sol";

/**
 * @title GemMintStrategyFundV1
 * @author Gem Mint Strategy Team
 * @notice $CATCH Token - Upgradeable Tokenized Pokemon Card Fund on Avalanche C-Chain
 * @dev UUPS Upgradeable ERC20 token with onchain buyback mechanism
 *
 * Features:
 * - UUPS upgradeable proxy pattern
 * - ERC20 compliant token ($CATCH)
 * - Role-based access control (Admin, Manager, Oracle, Governance)
 * - NAV (Net Asset Value) tracking with oracle updates
 * - Fundraising rounds with configurable parameters
 * - Investment/redemption mechanisms
 * - Onchain buyback mechanism (10% of card sales → AVAX → 50% LP + 50% buyback)
 * - Card portfolio tracking onchain
 * - DAO governance integration ready
 * - Emergency pause functionality
 */
contract GemMintStrategyFundV1 is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    // ============ Structs ============

    struct Card {
        string cardId;           // Unique identifier (e.g., "PSA-12345678" or NFT contract address)
        string name;             // Card name (e.g., "Charizard")
        string set;              // Set name (e.g., "Base Set 1st Edition")
        string grader;           // Grading company (PSA, CGC, BGS, TAG)
        uint8 grade;             // Grade (1-10, stored as 10-100 for decimals)
        uint256 acquisitionPrice; // Price paid in AVAX (18 decimals)
        uint256 currentValue;    // Current market value in AVAX (18 decimals)
        uint256 acquisitionDate; // Timestamp of acquisition
        bool isActive;           // Whether card is still in portfolio
        string vaultLocation;    // Physical vault location or NFT platform
        string ipfsMetadata;     // IPFS hash for card images/documents
    }

    struct FundraisingRound {
        uint256 roundId;
        uint256 targetAmount;    // Target raise in AVAX (18 decimals)
        uint256 raisedAmount;    // Amount raised so far in AVAX
        uint256 tokenPrice;      // Price per CATCH in AVAX (18 decimals)
        uint256 minInvestment;   // Minimum investment per transaction
        uint256 maxInvestment;   // Maximum investment per address
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
    }

    struct Investor {
        uint256 totalInvested;   // Total AVAX invested
        uint256 tokensReceived;  // Total CATCH tokens received
        uint256 firstInvestmentTime;
        bool isWhitelisted;
        uint256[] participatedRounds;
    }

    // ============ State Variables ============

    // NAV tracking
    uint256 public totalPortfolioValue;      // Total value of all cards in AVAX (18 decimals)
    uint256 public navPerToken;              // NAV per CATCH token in AVAX (18 decimals)
    uint256 public lastNavUpdate;            // Timestamp of last NAV update

    // Fund parameters
    uint256 public managementFee;            // Annual management fee in basis points (e.g., 100 = 1%)
    uint256 public performanceFee;           // Performance fee in basis points
    uint256 public constant MAX_FEE = 1000;  // Maximum 10% fee cap
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Buyback configuration
    uint256 public buybackPercentage;        // % of sale proceeds for buyback (default: 1000 = 10%)
    uint256 public lpAllocation;             // % of buyback funds to LP (default: 5000 = 50%)
    address public dexRouter;                // Trader Joe router address
    address public usdcToken;                // USDC address on Avalanche

    // Portfolio tracking
    mapping(uint256 => Card) public cards;
    uint256 public cardCount;
    uint256 public activeCardCount;

    // Fundraising
    mapping(uint256 => FundraisingRound) public fundraisingRounds;
    uint256 public currentRoundId;
    uint256 public totalRoundsCompleted;

    // Investor tracking
    mapping(address => Investor) public investors;
    mapping(uint256 => mapping(address => uint256)) public roundInvestments; // roundId => investor => amount
    address[] public investorList;
    uint256 public totalInvestors;

    // Treasury
    address public treasury;
    uint256 public treasuryBalance;

    // Redemption
    bool public redemptionsEnabled;
    uint256 public redemptionFee;            // Fee in basis points
    uint256 public minRedemptionAmount;

    // ============ Events ============

    event CardAdded(uint256 indexed cardIndex, string cardId, string name, uint256 acquisitionPrice);
    event CardUpdated(uint256 indexed cardIndex, uint256 newValue);
    event CardSold(uint256 indexed cardIndex, uint256 salePrice, uint256 buybackAmount);

    event NAVUpdated(uint256 totalValue, uint256 navPerToken, uint256 timestamp);

    event RoundCreated(uint256 indexed roundId, uint256 targetAmount, uint256 tokenPrice, uint256 startTime, uint256 endTime);
    event RoundFinalized(uint256 indexed roundId, uint256 totalRaised, uint256 tokensIssued);

    event Investment(address indexed investor, uint256 indexed roundId, uint256 avaxAmount, uint256 tokensReceived);
    event Redemption(address indexed investor, uint256 tokensRedeemed, uint256 avaxReceived);

    event TreasuryWithdrawal(address indexed to, uint256 amount, string reason);
    event FeesCollected(uint256 managementFee, uint256 performanceFee);

    event BuybackExecuted(uint256 usdcAmount, uint256 avaxReceived, uint256 lpAmount, uint256 buybackAmount);
    event BuybackConfigUpdated(uint256 buybackPercentage, uint256 lpAllocation);
    event DexConfigUpdated(address dexRouter, address usdcToken);

    // ============ Errors ============

    error RoundNotActive();
    error RoundNotEnded();
    error InvestmentBelowMinimum();
    error InvestmentAboveMaximum();
    error TargetReached();
    error RedemptionsDisabled();
    error InsufficientBalance();
    error InvalidParameters();
    error Unauthorized();
    error ZeroAddress();
    error CardNotFound();

    // ============ Storage Gap for Future Upgrades ============
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer (replaces constructor) ============

    /**
     * @notice Initialize the contract (called once during deployment)
     * @param _treasury Treasury address
     * @param _managementFee Management fee in basis points
     * @param _performanceFee Performance fee in basis points
     */
    function initialize(
        address _treasury,
        uint256 _managementFee,
        uint256 _performanceFee
    ) public initializer {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_managementFee > MAX_FEE || _performanceFee > MAX_FEE) revert InvalidParameters();

        __ERC20_init("Gem Mint Strategy", "CATCH");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        treasury = _treasury;
        managementFee = _managementFee;
        performanceFee = _performanceFee;

        // Default buyback configuration
        buybackPercentage = 1000;    // 10%
        lpAllocation = 5000;          // 50%

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);

        // Initial NAV set to 1 AVAX (18 decimals)
        navPerToken = 1e18;
        lastNavUpdate = block.timestamp;
    }

    // ============ UUPS Upgrade Authorization ============

    /**
     * @notice Authorize upgrade (restricted to GOVERNANCE_ROLE)
     * @dev Required by UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(GOVERNANCE_ROLE) {}

    // ============ Fundraising Functions ============

    /**
     * @notice Create a new fundraising round
     * @param _targetAmount Target amount to raise in AVAX
     * @param _tokenPrice Price per CATCH token in AVAX
     * @param _minInvestment Minimum investment per transaction
     * @param _maxInvestment Maximum investment per address for this round
     * @param _startTime Round start timestamp
     * @param _endTime Round end timestamp
     */
    function createFundraisingRound(
        uint256 _targetAmount,
        uint256 _tokenPrice,
        uint256 _minInvestment,
        uint256 _maxInvestment,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyRole(MANAGER_ROLE) {
        if (_startTime >= _endTime) revert InvalidParameters();
        if (_tokenPrice == 0 || _targetAmount == 0) revert InvalidParameters();
        if (_minInvestment > _maxInvestment) revert InvalidParameters();

        currentRoundId++;

        fundraisingRounds[currentRoundId] = FundraisingRound({
            roundId: currentRoundId,
            targetAmount: _targetAmount,
            raisedAmount: 0,
            tokenPrice: _tokenPrice,
            minInvestment: _minInvestment,
            maxInvestment: _maxInvestment,
            startTime: _startTime,
            endTime: _endTime,
            isActive: true,
            isFinalized: false
        });

        emit RoundCreated(currentRoundId, _targetAmount, _tokenPrice, _startTime, _endTime);
    }

    /**
     * @notice Invest AVAX in current fundraising round
     */
    function invest(uint256 _roundId) external payable nonReentrant {
        FundraisingRound storage round = fundraisingRounds[_roundId];

        if (!round.isActive) revert RoundNotActive();
        if (block.timestamp < round.startTime || block.timestamp > round.endTime) revert RoundNotActive();
        if (msg.value < round.minInvestment) revert InvestmentBelowMinimum();
        if (roundInvestments[_roundId][msg.sender] + msg.value > round.maxInvestment) revert InvestmentAboveMaximum();
        if (round.raisedAmount + msg.value > round.targetAmount) revert TargetReached();

        // Calculate tokens to mint
        uint256 tokensToMint = (msg.value * 1e18) / round.tokenPrice;

        // Update round state
        round.raisedAmount += msg.value;
        roundInvestments[_roundId][msg.sender] += msg.value;

        // Update investor state
        Investor storage investor = investors[msg.sender];
        if (investor.firstInvestmentTime == 0) {
            investor.firstInvestmentTime = block.timestamp;
            investorList.push(msg.sender);
            totalInvestors++;
        }
        investor.totalInvested += msg.value;
        investor.tokensReceived += tokensToMint;
        investor.participatedRounds.push(_roundId);

        // Mint tokens
        _mint(msg.sender, tokensToMint);

        // Transfer AVAX to treasury
        treasuryBalance += msg.value;
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Transfer failed");

        emit Investment(msg.sender, _roundId, msg.value, tokensToMint);
    }

    /**
     * @notice Finalize fundraising round
     */
    function finalizeRound(uint256 _roundId) external onlyRole(MANAGER_ROLE) {
        FundraisingRound storage round = fundraisingRounds[_roundId];

        if (round.isFinalized) revert InvalidParameters();
        if (block.timestamp < round.endTime && round.raisedAmount < round.targetAmount) revert RoundNotEnded();

        round.isActive = false;
        round.isFinalized = true;
        totalRoundsCompleted++;

        emit RoundFinalized(_roundId, round.raisedAmount, (round.raisedAmount * 1e18) / round.tokenPrice);
    }

    // ============ Portfolio Management ============

    /**
     * @notice Add a new card to the portfolio
     */
    function addCard(
        string calldata _cardId,
        string calldata _name,
        string calldata _set,
        string calldata _grader,
        uint8 _grade,
        uint256 _acquisitionPrice,
        string calldata _vaultLocation,
        string calldata _ipfsMetadata
    ) external onlyRole(MANAGER_ROLE) {
        cardCount++;
        activeCardCount++;

        cards[cardCount] = Card({
            cardId: _cardId,
            name: _name,
            set: _set,
            grader: _grader,
            grade: _grade,
            acquisitionPrice: _acquisitionPrice,
            currentValue: _acquisitionPrice, // Initial value is acquisition price
            acquisitionDate: block.timestamp,
            isActive: true,
            vaultLocation: _vaultLocation,
            ipfsMetadata: _ipfsMetadata
        });

        totalPortfolioValue += _acquisitionPrice;
        _updateNAV();

        emit CardAdded(cardCount, _cardId, _name, _acquisitionPrice);
    }

    /**
     * @notice Update card value (Oracle role)
     */
    function updateCardValue(uint256 _cardIndex, uint256 _newValue) external onlyRole(ORACLE_ROLE) {
        Card storage card = cards[_cardIndex];
        if (!card.isActive) revert CardNotFound();

        uint256 oldValue = card.currentValue;
        card.currentValue = _newValue;

        // Update total portfolio value
        if (_newValue > oldValue) {
            totalPortfolioValue += (_newValue - oldValue);
        } else {
            totalPortfolioValue -= (oldValue - _newValue);
        }

        _updateNAV();

        emit CardUpdated(_cardIndex, _newValue);
    }

    /**
     * @notice Sell a card and execute buyback mechanism
     * @param _cardIndex Index of card to sell
     * @param _salePrice Sale price in USDC (6 decimals)
     */
    function sellCardWithBuyback(
        uint256 _cardIndex,
        uint256 _salePrice
    ) external onlyRole(MANAGER_ROLE) nonReentrant {
        Card storage card = cards[_cardIndex];
        if (!card.isActive) revert CardNotFound();

        // Mark card as sold
        card.isActive = false;
        activeCardCount--;
        
        // Update portfolio value
        totalPortfolioValue -= card.currentValue;
        card.currentValue = 0;

        // Calculate buyback amount (10% of sale proceeds)
        uint256 buybackAmount = (_salePrice * buybackPercentage) / FEE_DENOMINATOR;

        // Transfer USDC from treasury/multisig to contract
        require(
            IERC20(usdcToken).transferFrom(msg.sender, address(this), buybackAmount),
            "USDC transfer failed"
        );

        // Execute buyback: USDC → AVAX → 50% LP + 50% CATCH buyback
        _executeBuyback(buybackAmount);

        _updateNAV();

        emit CardSold(_cardIndex, _salePrice, buybackAmount);
    }

    // ============ Buyback Mechanism ============

    /**
     * @notice Execute buyback: swap USDC to AVAX, then split for LP and token buyback
     */
    function _executeBuyback(uint256 usdcAmount) internal {
        // 1. Swap USDC → AVAX via Trader Joe
        uint256 avaxReceived = _swapUSDCForAVAX(usdcAmount);

        // 2. Split AVAX: 50% for LP, 50% for CATCH buyback
        uint256 lpAmount = (avaxReceived * lpAllocation) / FEE_DENOMINATOR;
        uint256 buybackAmount = avaxReceived - lpAmount;

        // 3. Add to LP (AVAX + mint proportional CATCH)
        _addToLiquidityPool(lpAmount);

        // 4. Buy back CATCH from market and burn
        _buybackAndBurnCATCH(buybackAmount);

        emit BuybackExecuted(usdcAmount, avaxReceived, lpAmount, buybackAmount);
    }

    function _swapUSDCForAVAX(uint256 usdcAmount) internal returns (uint256) {
        // Use Trader Joe router to swap USDC → WAVAX → AVAX
        address[] memory path = new address[](2);
        path[0] = usdcToken;
        path[1] = IRouter(dexRouter).WAVAX();

        IERC20(usdcToken).approve(dexRouter, usdcAmount);

        uint256[] memory amounts = IRouter(dexRouter).swapExactTokensForAVAX(
            usdcAmount,
            0, // Accept any amount (use slippage protection in production)
            path,
            address(this),
            block.timestamp + 300
        );

        return amounts[1]; // AVAX received
    }

    function _addToLiquidityPool(uint256 avaxAmount) internal {
        // Mint proportional CATCH tokens
        uint256 catchAmount = (avaxAmount * 1e18) / navPerToken;
        _mint(address(this), catchAmount);

        // Approve router
        _approve(address(this), dexRouter, catchAmount);

        // Add liquidity - LP tokens sent to burn address
        IRouter(dexRouter).addLiquidityAVAX{value: avaxAmount}(
            address(this),
            catchAmount,
            0, // Accept any amount
            0,
            address(0xdead), // Burn LP tokens!
            block.timestamp + 300
        );
    }

    function _buybackAndBurnCATCH(uint256 avaxAmount) internal {
        // Swap AVAX → CATCH on DEX
        address[] memory path = new address[](2);
        path[0] = IRouter(dexRouter).WAVAX();
        path[1] = address(this);

        uint256[] memory amounts = IRouter(dexRouter).swapExactAVAXForTokens{value: avaxAmount}(
            0, // Accept any amount
            path,
            address(this), // Contract holds bought CATCH
            block.timestamp + 300
        );

        // Burn the bought CATCH to reduce supply
        _burn(address(this), amounts[1]);
    }

    // ============ Configuration Functions ============

    /**
     * @notice Update buyback configuration
     */
    function updateBuybackConfig(
        uint256 _buybackPercentage,
        uint256 _lpAllocation
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (_buybackPercentage > MAX_FEE) revert InvalidParameters();
        if (_lpAllocation > FEE_DENOMINATOR) revert InvalidParameters();

        buybackPercentage = _buybackPercentage;
        lpAllocation = _lpAllocation;

        emit BuybackConfigUpdated(_buybackPercentage, _lpAllocation);
    }

    /**
     * @notice Update DEX configuration
     */
    function updateDexConfig(
        address _dexRouter,
        address _usdcToken
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (_dexRouter == address(0) || _usdcToken == address(0)) revert ZeroAddress();

        dexRouter = _dexRouter;
        usdcToken = _usdcToken;

        emit DexConfigUpdated(_dexRouter, _usdcToken);
    }

    // ============ NAV Functions ============

    /**
     * @notice Update NAV (internal)
     */
    function _updateNAV() internal {
        uint256 supply = totalSupply();
        if (supply > 0) {
            navPerToken = (totalPortfolioValue * 1e18) / supply;
            lastNavUpdate = block.timestamp;
            emit NAVUpdated(totalPortfolioValue, navPerToken, block.timestamp);
        }
    }

    /**
     * @notice Force NAV update (Oracle role)
     */
    function forceUpdateNAV() external onlyRole(ORACLE_ROLE) {
        _updateNAV();
    }

    // ============ Redemption Functions ============

    /**
     * @notice Redeem CATCH tokens for AVAX at NAV
     */
    function redeem(uint256 _tokenAmount) external nonReentrant {
        if (!redemptionsEnabled) revert RedemptionsDisabled();
        if (_tokenAmount < minRedemptionAmount) revert InsufficientBalance();
        if (balanceOf(msg.sender) < _tokenAmount) revert InsufficientBalance();

        // Calculate AVAX to return (minus redemption fee)
        uint256 avaxAmount = (_tokenAmount * navPerToken) / 1e18;
        uint256 feeAmount = (avaxAmount * redemptionFee) / FEE_DENOMINATOR;
        uint256 netAvaxAmount = avaxAmount - feeAmount;

        // Burn tokens
        _burn(msg.sender, _tokenAmount);

        // Update NAV
        totalPortfolioValue -= avaxAmount;
        _updateNAV();

        // Transfer AVAX
        (bool success, ) = msg.sender.call{value: netAvaxAmount}("");
        require(success, "Transfer failed");

        emit Redemption(msg.sender, _tokenAmount, netAvaxAmount);
    }

    /**
     * @notice Enable/disable redemptions
     */
    function setRedemptionsEnabled(bool _enabled) external onlyRole(GOVERNANCE_ROLE) {
        redemptionsEnabled = _enabled;
    }

    // ============ Admin Functions ============

    /**
     * @notice Pause contract (emergency)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Withdraw from treasury
     */
    function withdrawFromTreasury(address _to, uint256 _amount, string calldata _reason)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (_to == address(0)) revert ZeroAddress();
        treasuryBalance -= _amount;
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Transfer failed");
        emit TreasuryWithdrawal(_to, _amount, _reason);
    }

    // ============ View Functions ============

    /**
     * @notice Get investor info
     */
    function getInvestor(address _investor) external view returns (Investor memory) {
        return investors[_investor];
    }

    /**
     * @notice Get card info
     */
    function getCard(uint256 _cardIndex) external view returns (Card memory) {
        return cards[_cardIndex];
    }

    /**
     * @notice Get round info
     */
    function getRound(uint256 _roundId) external view returns (FundraisingRound memory) {
        return fundraisingRounds[_roundId];
    }

    // ============ Required Overrides ============

    function _update(address from, address to, uint256 value)
        internal
        virtual
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
    }

    /**
     * @notice Receive AVAX
     */
    receive() external payable {}
}
