// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

abstract contract Gm10FundStorageV2 is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    ERC20VotesUpgradeable
{
    bytes32 internal constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 internal constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 internal constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    uint256 internal constant MAX_FEE = 1000;
    uint256 internal constant FEE_DENOMINATOR = 10000;

    struct Card {
        string cardId;
        string name;
        string set;
        string grader;
        uint8 grade;
        uint256 acquisitionPrice;
        uint256 currentValue;
        uint256 acquisitionDate;
        bool isActive;
        string marketplaceProvenance;
        string ipfsMetadata;
    }

    struct FundraisingRound {
        uint256 roundId;
        uint256 targetAmount;
        uint256 raisedAmount;
        uint256 tokenPrice;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
    }

    struct Investor {
        uint256 totalInvested;
        uint256 tokensReceived;
        uint256 firstInvestmentTime;
        bool isWhitelisted;
        uint256[] participatedRounds;
    }

    uint256 internal totalPortfolioValue;
    uint256 internal navPerToken;
    uint256 internal lastNavUpdate;

    uint256 internal managementFee;
    uint256 internal performanceFee;

    uint256 internal buybackPercentage;
    uint256 internal lpAllocation;
    address internal dexRouter;
    address internal usdcToken;

    mapping(uint256 => Card) internal cards;
    uint256 internal cardCount;
    uint256 internal activeCardCount;

    mapping(uint256 => FundraisingRound) internal fundraisingRounds;
    uint256 public currentRoundId;
    uint256 internal totalRoundsCompleted;

    mapping(address => Investor) internal investors;
    mapping(uint256 => mapping(address => uint256)) internal roundInvestments;
    mapping(uint256 => mapping(address => uint256)) internal roundTokensMinted;
    address[] internal investorList;
    uint256 internal totalInvestors;

    mapping(uint256 => bool) internal roundRefundsEnabled;
    mapping(uint256 => mapping(address => bool)) internal roundRefundClaimed;
    uint256 internal totalRefundLiabilities;

    address internal treasury;
    uint256 internal treasuryBalance;

    bool internal redemptionsEnabled;
    uint256 internal redemptionFee;
    uint256 internal minRedemptionAmount;

    address internal evaStakingContract;

    uint256[45] private __gap;

    mapping(address => uint256) internal approvedBudgets;

    event NAVUpdated(uint256 totalValue, uint256 navPerToken, uint256 timestamp);
    event RoundCreated(uint256 indexed roundId, uint256 targetAmount, uint256 tokenPrice, uint256 startTime, uint256 endTime);
    event RoundFinalized(uint256 indexed roundId, uint256 totalRaised, uint256 tokensIssued);
    event Investment(address indexed investor, uint256 indexed roundId, uint256 avaxAmount, uint256 tokensReceived);
    event Redemption(address indexed investor, uint256 tokensRedeemed, uint256 avaxReceived);
    event TreasuryWithdrawal(address indexed to, uint256 amount, string reason);
    event FeesUpdated(uint256 managementFee, uint256 performanceFee);
    event RedemptionParametersUpdated(uint256 redemptionFee, uint256 minRedemptionAmount);

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
    error RefundReserveLocked();
    error InsufficientFreeBalance();
    error TransferFailed();

    function __Gm10FundStorageV2_init(
        address _treasury,
        uint256 _managementFee,
        uint256 _performanceFee
    ) internal onlyInitializing {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_managementFee > MAX_FEE || _performanceFee > MAX_FEE) revert InvalidParameters();

        __ERC20_init("Gem Mint Strategy", "CATCH");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __ERC20Votes_init();
        __EIP712_init("Gem Mint Strategy", "1");

        treasury = _treasury;
        managementFee = _managementFee;
        performanceFee = _performanceFee;
        buybackPercentage = 1000;
        lpAllocation = 5000;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);

        navPerToken = 1e18;
        lastNavUpdate = block.timestamp;
    }

    function _authorizeUpgrade(address) internal virtual override onlyRole(GOVERNANCE_ROLE) {}

    function _createFundraisingRound(
        uint256 _targetAmount,
        uint256 _tokenPrice,
        uint256 _minInvestment,
        uint256 _maxInvestment,
        uint256 _startTime,
        uint256 _endTime
    ) internal {
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

    function _finalizeRound(uint256 _roundId) internal {
        FundraisingRound storage round = fundraisingRounds[_roundId];

        if (round.isFinalized) revert InvalidParameters();
        if (block.timestamp < round.endTime && round.raisedAmount < round.targetAmount) revert RoundNotEnded();

        round.isActive = false;
        round.isFinalized = true;
        totalRoundsCompleted++;

        uint256 tokensIssued;
        unchecked {
            tokensIssued = (round.raisedAmount * 1e18) / round.tokenPrice;
        }
        emit RoundFinalized(_roundId, round.raisedAmount, tokensIssued);
    }

    function _autoFinalizeFundedRound(uint256 _roundId) internal {
        FundraisingRound storage round = fundraisingRounds[_roundId];
        if (round.isFinalized || round.raisedAmount < round.targetAmount) return;

        round.isActive = false;
        round.isFinalized = true;
        totalRoundsCompleted++;

        uint256 tokensIssued;
        unchecked {
            tokensIssued = (round.raisedAmount * 1e18) / round.tokenPrice;
        }
        emit RoundFinalized(_roundId, round.raisedAmount, tokensIssued);
    }

    function _invest(uint256 _roundId, address _investor, uint256 _amount) internal virtual {
        FundraisingRound storage round = fundraisingRounds[_roundId];

        if (!round.isActive) revert RoundNotActive();
        if (block.timestamp < round.startTime || block.timestamp > round.endTime) revert RoundNotActive();
        uint256 remainingAmount = round.targetAmount - round.raisedAmount;
        if (_amount > remainingAmount) revert TargetReached();
        if (_amount < round.minInvestment && (remainingAmount == 0 || _amount != remainingAmount)) revert InvestmentBelowMinimum();
        if (roundInvestments[_roundId][_investor] + _amount > round.maxInvestment) revert InvestmentAboveMaximum();

        uint256 tokensToMint;
        unchecked {
            tokensToMint = (_amount * 1e18) / round.tokenPrice;
        }

        round.raisedAmount += _amount;
        roundInvestments[_roundId][_investor] += _amount;
        roundTokensMinted[_roundId][_investor] += tokensToMint;

        Investor storage investor = investors[_investor];
        if (investor.firstInvestmentTime == 0) {
            investor.firstInvestmentTime = block.timestamp;
            investorList.push(_investor);
            totalInvestors++;
        }
        investor.totalInvested += _amount;
        investor.tokensReceived += tokensToMint;
        investor.participatedRounds.push(_roundId);

        _mint(_investor, tokensToMint);
        _updateNAV();

        emit Investment(_investor, _roundId, _amount, tokensToMint);
        _autoFinalizeFundedRound(_roundId);
    }

    function _totalAssets() internal view virtual returns (uint256) {
        return totalPortfolioValue + address(this).balance;
    }

    function _updateNAV() internal virtual {
        uint256 supply = totalSupply();
        uint256 totalAssets = _totalAssets();

        treasuryBalance = address(this).balance;

        if (supply > 0) {
            unchecked {
                navPerToken = (totalAssets * 1e18) / supply;
            }
        }

        lastNavUpdate = block.timestamp;
        emit NAVUpdated(totalAssets, navPerToken, block.timestamp);
    }

    function _redeem(address _account, uint256 _tokenAmount) internal virtual {
        if (!redemptionsEnabled) revert RedemptionsDisabled();
        if (_tokenAmount < minRedemptionAmount) revert InsufficientBalance();
        if (balanceOf(_account) < _tokenAmount) revert InsufficientBalance();

        uint256 avaxAmount;
        uint256 feeAmount;
        uint256 netAvaxAmount;
        unchecked {
            avaxAmount = (_tokenAmount * navPerToken) / 1e18;
            feeAmount = (avaxAmount * redemptionFee) / FEE_DENOMINATOR;
            netAvaxAmount = avaxAmount - feeAmount;
        }

        if (address(this).balance < netAvaxAmount + totalRefundLiabilities) revert InsufficientFreeBalance();

        _burn(_account, _tokenAmount);
        _transferNative(_account, netAvaxAmount);
        _updateNAV();

        emit Redemption(_account, _tokenAmount, netAvaxAmount);
    }

    function _withdrawFromTreasury(address _to, uint256 _amount, string calldata _reason) internal virtual {
        if (_to == address(0)) revert ZeroAddress();
        if (_amount > address(this).balance) revert InsufficientBalance();
        if (address(this).balance - _amount < totalRefundLiabilities) revert RefundReserveLocked();
        _transferNative(_to, _amount);
        _updateNAV();
        emit TreasuryWithdrawal(_to, _amount, _reason);
    }

    function _transferNative(address _to, uint256 _amount) internal {
        (bool success,) = _to.call{value: _amount}("");
        if (!success) revert TransferFailed();
    }

    function _getRound(uint256 _roundId) internal view returns (FundraisingRound memory) {
        return fundraisingRounds[_roundId];
    }

    function _update(address from, address to, uint256 value)
        internal
        virtual
        override(ERC20Upgradeable, ERC20PausableUpgradeable, ERC20VotesUpgradeable)
    {
        super._update(from, to, value);
    }

    receive() external payable {}
}
