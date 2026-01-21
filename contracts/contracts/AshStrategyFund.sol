// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AshStrategyFund
 * @author Ash Strategy Team
 * @notice $CATCH Token - Tokenized Pokemon Card Fund on Avalanche C-Chain
 * @dev ERC20 token representing fractional ownership in a curated portfolio of graded Pokemon cards
 *
 * Features:
 * - ERC20 compliant token ($CATCH)
 * - Role-based access control (Admin, Manager, Oracle)
 * - NAV (Net Asset Value) tracking with oracle updates
 * - Fundraising rounds with configurable parameters
 * - Investment/redemption mechanisms
 * - Card portfolio tracking on-chain
 * - DAO governance integration ready
 * - Emergency pause functionality
 */
contract AshStrategyFund is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard {

    // ============ Roles ============
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    // ============ Structs ============

    struct Card {
        string cardId;           // Unique identifier (e.g., "PSA-12345678")
        string name;             // Card name (e.g., "Charizard")
        string set;              // Set name (e.g., "Base Set 1st Edition")
        string grader;           // Grading company (PSA, CGC, BGS, TAG)
        uint8 grade;             // Grade (1-10, stored as 10-100 for decimals)
        uint256 acquisitionPrice; // Price paid in AVAX (18 decimals)
        uint256 currentValue;    // Current market value in AVAX (18 decimals)
        uint256 acquisitionDate; // Timestamp of acquisition
        bool isActive;           // Whether card is still in portfolio
        string vaultLocation;    // Physical vault location
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
    uint256 public managementFee;            // Annual management fee in basis points (e.g., 200 = 2%)
    uint256 public performanceFee;           // Performance fee in basis points
    uint256 public constant MAX_FEE = 1000;  // Maximum 10% fee cap
    uint256 public constant FEE_DENOMINATOR = 10000;

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
    event CardRemoved(uint256 indexed cardIndex, uint256 salePrice);

    event NAVUpdated(uint256 totalValue, uint256 navPerToken, uint256 timestamp);

    event RoundCreated(uint256 indexed roundId, uint256 targetAmount, uint256 tokenPrice, uint256 startTime, uint256 endTime);
    event RoundFinalized(uint256 indexed roundId, uint256 totalRaised, uint256 tokensIssued);

    event Investment(address indexed investor, uint256 indexed roundId, uint256 avaxAmount, uint256 tokensReceived);
    event Redemption(address indexed investor, uint256 tokensRedeemed, uint256 avaxReceived);

    event TreasuryWithdrawal(address indexed to, uint256 amount, string reason);
    event FeesCollected(uint256 managementFee, uint256 performanceFee);

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

    // ============ Constructor ============

    constructor(
        address _treasury,
        uint256 _managementFee,
        uint256 _performanceFee
    ) ERC20("Ash Strategy CATCH", "CATCH") {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_managementFee > MAX_FEE || _performanceFee > MAX_FEE) revert InvalidParameters();

        treasury = _treasury;
        managementFee = _managementFee;
        performanceFee = _performanceFee;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);

        // Initial NAV set to 1 AVAX (18 decimals)
        navPerToken = 1e18;
        lastNavUpdate = block.timestamp;
    }

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
     * @notice Invest in the current fundraising round
     */
    function invest() external payable nonReentrant whenNotPaused {
        FundraisingRound storage round = fundraisingRounds[currentRoundId];

        if (!round.isActive) revert RoundNotActive();
        if (block.timestamp < round.startTime || block.timestamp > round.endTime) revert RoundNotActive();
        if (msg.value < round.minInvestment) revert InvestmentBelowMinimum();

        uint256 existingInvestment = roundInvestments[currentRoundId][msg.sender];
        if (existingInvestment + msg.value > round.maxInvestment) revert InvestmentAboveMaximum();
        if (round.raisedAmount + msg.value > round.targetAmount) revert TargetReached();

        // Calculate tokens to issue (Standard 18 decimals)
        // (msg.value * 1e18) / tokenPrice
        // Example: 1 AVAX invested at 0.5 AVAX price
        // (1e18 * 1e18) / 0.5e18 = 2e18 tokens
        uint256 tokensToIssue = (msg.value * 1e18) / round.tokenPrice;

        // Update round state
        round.raisedAmount += msg.value;
        roundInvestments[currentRoundId][msg.sender] += msg.value;

        // Update investor record
        Investor storage investor = investors[msg.sender];
        if (investor.firstInvestmentTime == 0) {
            investor.firstInvestmentTime = block.timestamp;
            investorList.push(msg.sender);
            totalInvestors++;
        }
        investor.totalInvested += msg.value;
        investor.tokensReceived += tokensToIssue;
        investor.participatedRounds.push(currentRoundId);

        // Mint tokens to investor
        _mint(msg.sender, tokensToIssue);

        // Update treasury balance
        treasuryBalance += msg.value;

        emit Investment(msg.sender, currentRoundId, msg.value, tokensToIssue);
    }

    /**
     * @notice Finalize a fundraising round
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
     * @notice Update card value (oracle function)
     */
    function updateCardValue(uint256 _cardIndex, uint256 _newValue) external onlyRole(ORACLE_ROLE) {
        Card storage card = cards[_cardIndex];
        if (!card.isActive) revert CardNotFound();

        // Adjust total portfolio value
        totalPortfolioValue = totalPortfolioValue - card.currentValue + _newValue;
        card.currentValue = _newValue;

        _updateNAV();

        emit CardUpdated(_cardIndex, _newValue);
    }

    /**
     * @notice Batch update card values
     */
    function batchUpdateCardValues(
        uint256[] calldata _cardIndices,
        uint256[] calldata _newValues
    ) external onlyRole(ORACLE_ROLE) {
        if (_cardIndices.length != _newValues.length) revert InvalidParameters();

        for (uint256 i = 0; i < _cardIndices.length; i++) {
            Card storage card = cards[_cardIndices[i]];
            if (card.isActive) {
                totalPortfolioValue = totalPortfolioValue - card.currentValue + _newValues[i];
                card.currentValue = _newValues[i];
                emit CardUpdated(_cardIndices[i], _newValues[i]);
            }
        }

        _updateNAV();
    }

    /**
     * @notice Remove a card from portfolio (sold)
     */
    function removeCard(uint256 _cardIndex, uint256 _salePrice) external onlyRole(MANAGER_ROLE) {
        Card storage card = cards[_cardIndex];
        if (!card.isActive) revert CardNotFound();

        card.isActive = false;
        activeCardCount--;
        totalPortfolioValue -= card.currentValue;

        _updateNAV();

        emit CardRemoved(_cardIndex, _salePrice);
    }

    // ============ NAV Functions ============

    /**
     * @notice Internal NAV update
     */
    function _updateNAV() internal {
        uint256 totalSupplyTokens = totalSupply();

        if (totalSupplyTokens > 0) {
            // NAV = Total Portfolio Value / Total Supply
            // Both are 18 decimals, so result is 18 decimals
            // We multiply by 1e18 to keep precision
            navPerToken = (totalPortfolioValue * 1e18) / totalSupplyTokens;
        }

        lastNavUpdate = block.timestamp;

        emit NAVUpdated(totalPortfolioValue, navPerToken, block.timestamp);
    }

    /**
     * @notice Manual NAV update by oracle
     */
    function updateNAV(uint256 _totalPortfolioValue) external onlyRole(ORACLE_ROLE) {
        totalPortfolioValue = _totalPortfolioValue;
        _updateNAV();
    }

    // ============ Redemption Functions ============

    /**
     * @notice Enable/disable redemptions
     */
    function setRedemptionsEnabled(bool _enabled) external onlyRole(MANAGER_ROLE) {
        redemptionsEnabled = _enabled;
    }

    /**
     * @notice Set redemption parameters
     */
    function setRedemptionParameters(
        uint256 _fee,
        uint256 _minAmount
    ) external onlyRole(MANAGER_ROLE) {
        if (_fee > MAX_FEE) revert InvalidParameters();
        redemptionFee = _fee;
        minRedemptionAmount = _minAmount;
    }

    /**
     * @notice Redeem CATCH tokens for AVAX
     */
    function redeem(uint256 _tokenAmount) external nonReentrant whenNotPaused {
        if (!redemptionsEnabled) revert RedemptionsDisabled();
        if (_tokenAmount < minRedemptionAmount) revert InvestmentBelowMinimum();
        if (balanceOf(msg.sender) < _tokenAmount) revert InsufficientBalance();

        // Calculate AVAX to return based on NAV
        // avaxToReturn = (tokenAmount * navPerToken) / 1e18
        // All 18 decimals
        uint256 avaxToReturn = (_tokenAmount * navPerToken) / 1e18;

        // Apply redemption fee
        uint256 fee = (avaxToReturn * redemptionFee) / FEE_DENOMINATOR;
        uint256 netAvax = avaxToReturn - fee;

        if (address(this).balance < netAvax) revert InsufficientBalance();

        // Burn tokens
        _burn(msg.sender, _tokenAmount);

        // Update investor record
        investors[msg.sender].tokensReceived -= _tokenAmount;

        // Transfer AVAX
        (bool success, ) = msg.sender.call{value: netAvax}("");
        require(success, "Transfer failed");

        _updateNAV();

        emit Redemption(msg.sender, _tokenAmount, netAvax);
    }

    // ============ Treasury Functions ============

    /**
     * @notice Withdraw from treasury for card purchases
     */
    function withdrawFromTreasury(
        address _to,
        uint256 _amount,
        string calldata _reason
    ) external onlyRole(MANAGER_ROLE) {
        if (_to == address(0)) revert ZeroAddress();
        if (_amount > treasuryBalance) revert InsufficientBalance();

        treasuryBalance -= _amount;

        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Transfer failed");

        emit TreasuryWithdrawal(_to, _amount, _reason);
    }

    /**
     * @notice Update treasury address
     */
    function setTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newTreasury == address(0)) revert ZeroAddress();
        treasury = _newTreasury;
    }

    // ============ Fee Functions ============

    /**
     * @notice Update fee parameters
     */
    function setFees(
        uint256 _managementFee,
        uint256 _performanceFee
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (_managementFee > MAX_FEE || _performanceFee > MAX_FEE) revert InvalidParameters();
        managementFee = _managementFee;
        performanceFee = _performanceFee;
    }

    // ============ View Functions ============

    /**
     * @notice Get current fundraising round details
     */
    function getCurrentRound() external view returns (FundraisingRound memory) {
        return fundraisingRounds[currentRoundId];
    }

    /**
     * @notice Get card details
     */
    function getCard(uint256 _cardIndex) external view returns (Card memory) {
        return cards[_cardIndex];
    }

    /**
     * @notice Get investor details
     */
    function getInvestor(address _investor) external view returns (Investor memory) {
        return investors[_investor];
    }

    /**
     * @notice Get all active cards
     */
    function getActiveCards() external view returns (uint256[] memory) {
        uint256[] memory activeCards = new uint256[](activeCardCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= cardCount; i++) {
            if (cards[i].isActive) {
                activeCards[index] = i;
                index++;
            }
        }

        return activeCards;
    }

    /**
     * @notice Calculate token value in AVAX
     */
    function getTokenValue(uint256 _tokenAmount) external view returns (uint256) {
        return (_tokenAmount * navPerToken) / 1e18;
    }

    /**
     * @notice Get fund statistics
     */
    function getFundStats() external view returns (
        uint256 _totalSupply,
        uint256 _navPerToken,
        uint256 _totalPortfolioValue,
        uint256 _activeCardCount,
        uint256 _totalInvestors,
        uint256 _treasuryBalance
    ) {
        return (
            totalSupply(),
            navPerToken,
            totalPortfolioValue,
            activeCardCount,
            totalInvestors,
            treasuryBalance
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Pause contract
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

    // ============ Required Overrides ============

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    // ============ Receive Function ============

    receive() external payable {
        treasuryBalance += msg.value;
    }
}
