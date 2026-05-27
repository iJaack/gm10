// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IGm10ContinuousMintFund {
    function settleContinuousMint(bytes32 commitId, address buyer, uint256 settlementAmountUsdt6)
        external
        returns (uint256 buyerCatch18);

    function settleContinuousMintFromAvax(bytes32 commitId, address buyer, uint256 avaxAmountWei)
        external
        returns (uint256 buyerCatch18);
}

contract Gm10ContinuousCommitEscrow {
    using SafeERC20 for IERC20;

    address public immutable receiver;

    error UnauthorizedCommitCaller();

    constructor(address receiver_) {
        receiver = receiver_;
    }

    function release(address token, address to, uint256 amount) external {
        if (msg.sender != receiver) revert UnauthorizedCommitCaller();
        IERC20(token).safeTransfer(to, amount);
    }
}

contract Gm10ContinuousMintReceiver is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    address public constant NATIVE_AVAX = address(0);

    struct SettlementTokenConfig {
        bool approved;
        uint8 decimals;
    }

    struct ContinuousCommit {
        bytes32 providerRouteId;
        address buyer;
        address settlementToken;
        address escrow;
        uint256 minSettlementAmount;
        uint64 expiresAt;
        bool settled;
        uint256 settledAmount;
        uint256 mintedBuyerCatch18;
        uint256 fundAvaxBalanceBefore;
        uint256 accountedFundAvaxBefore;
    }

    IGm10ContinuousMintFund public immutable fund;
    address public immutable treasury;
    uint256 public accountedFundAvaxSettlementWei;

    mapping(address => SettlementTokenConfig) public settlementTokens;
    mapping(bytes32 => ContinuousCommit) public commits;

    event SettlementTokenConfigured(address indexed token, bool approved, uint8 decimals);
    event ContinuousCommitRegistered(
        bytes32 indexed commitId,
        bytes32 indexed providerRouteId,
        address indexed buyer,
        address settlementToken,
        uint256 minSettlementAmount,
        uint64 expiresAt
    );
    event ContinuousCommitSettled(
        bytes32 indexed commitId,
        bytes32 indexed providerRouteId,
        address indexed buyer,
        address settlementToken,
        uint256 settledAmount,
        uint256 buyerCatch18
    );

    error ZeroAddress();
    error InvalidParameters();
    error UnsupportedSettlementToken();
    error CommitAlreadyRegistered();
    error CommitNotRegistered();
    error CommitAlreadySettled();
    error CommitMismatch();
    error CommitExpired();
    error UnauthorizedCommitCaller();
    error InsufficientSettlementBalance();

    constructor(
        address fund_,
        address treasury_,
        address admin_,
        address initialSettlementToken,
        uint8 initialSettlementTokenDecimals
    ) {
        if (fund_ == address(0) || treasury_ == address(0) || admin_ == address(0)) revert ZeroAddress();
        fund = IGm10ContinuousMintFund(fund_);
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(OPERATOR_ROLE, admin_);
        _configureSettlementToken(NATIVE_AVAX, true, 18);
        if (initialSettlementToken != NATIVE_AVAX) {
            _configureSettlementToken(initialSettlementToken, true, initialSettlementTokenDecimals);
        }
    }

    function configureSettlementToken(address token, bool approved, uint8 decimals)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _configureSettlementToken(token, approved, decimals);
    }

    function registerCommit(
        bytes32 commitId,
        bytes32 providerRouteId,
        address buyer,
        address settlementToken,
        uint256 minSettlementAmount,
        uint64 expiresAt
    ) external returns (address escrow) {
        if (msg.sender != buyer && !hasRole(OPERATOR_ROLE, msg.sender)) revert UnauthorizedCommitCaller();
        if (
            commitId == bytes32(0) ||
            providerRouteId == bytes32(0) ||
            buyer == address(0) ||
            minSettlementAmount == 0 ||
            expiresAt <= block.timestamp
        ) revert InvalidParameters();
        if (!settlementTokens[settlementToken].approved) revert UnsupportedSettlementToken();
        if (commits[commitId].buyer != address(0)) revert CommitAlreadyRegistered();
        escrow = settlementToken == NATIVE_AVAX
            ? address(fund)
            : address(new Gm10ContinuousCommitEscrow(address(this)));

        commits[commitId] = ContinuousCommit({
            providerRouteId: providerRouteId,
            buyer: buyer,
            settlementToken: settlementToken,
            escrow: escrow,
            minSettlementAmount: minSettlementAmount,
            expiresAt: expiresAt,
            settled: false,
            settledAmount: 0,
            mintedBuyerCatch18: 0,
            fundAvaxBalanceBefore: settlementToken == NATIVE_AVAX ? address(fund).balance : 0,
            accountedFundAvaxBefore: settlementToken == NATIVE_AVAX ? accountedFundAvaxSettlementWei : 0
        });

        emit ContinuousCommitRegistered(
            commitId,
            providerRouteId,
            buyer,
            settlementToken,
            minSettlementAmount,
            expiresAt
        );
    }

    function commitSettledRoute(
        bytes32 commitId,
        bytes32 providerRouteId,
        address buyer,
        address settlementToken,
        uint256 settledAmount
    ) external nonReentrant returns (uint256 buyerCatch18) {
        ContinuousCommit storage commit = commits[commitId];
        if (commit.buyer == address(0)) revert CommitNotRegistered();
        if (commit.settled) revert CommitAlreadySettled();
        if (msg.sender != commit.buyer && !hasRole(OPERATOR_ROLE, msg.sender)) revert UnauthorizedCommitCaller();
        if (
            commit.providerRouteId != providerRouteId ||
            commit.buyer != buyer ||
            commit.settlementToken != settlementToken
        ) revert CommitMismatch();
        if (block.timestamp > commit.expiresAt) revert CommitExpired();
        if (settledAmount < commit.minSettlementAmount) revert InvalidParameters();
        commit.settled = true;
        commit.settledAmount = settledAmount;

        if (settlementToken == NATIVE_AVAX) {
            uint256 fundBalanceDelta = address(fund).balance > commit.fundAvaxBalanceBefore
                ? address(fund).balance - commit.fundAvaxBalanceBefore
                : 0;
            uint256 accountedSinceRegistration = accountedFundAvaxSettlementWei > commit.accountedFundAvaxBefore
                ? accountedFundAvaxSettlementWei - commit.accountedFundAvaxBefore
                : 0;
            uint256 unaccountedDelta = fundBalanceDelta > accountedSinceRegistration
                ? fundBalanceDelta - accountedSinceRegistration
                : 0;
            if (unaccountedDelta < settledAmount) revert InsufficientSettlementBalance();

            accountedFundAvaxSettlementWei += settledAmount;
            buyerCatch18 = fund.settleContinuousMintFromAvax(commitId, buyer, settledAmount);
        } else {
            SettlementTokenConfig memory tokenConfig = settlementTokens[settlementToken];
            if (!tokenConfig.approved) revert UnsupportedSettlementToken();
            if (IERC20(settlementToken).balanceOf(commit.escrow) < settledAmount) revert InsufficientSettlementBalance();

            uint256 settlementAmountUsdt6 = _toUsdt6(settledAmount, tokenConfig.decimals);
            if (settlementAmountUsdt6 == 0) revert InvalidParameters();
            buyerCatch18 = fund.settleContinuousMint(commitId, buyer, settlementAmountUsdt6);
            Gm10ContinuousCommitEscrow(commit.escrow).release(settlementToken, treasury, settledAmount);
        }

        commit.mintedBuyerCatch18 = buyerCatch18;

        emit ContinuousCommitSettled(
            commitId,
            providerRouteId,
            buyer,
            settlementToken,
            settledAmount,
            buyerCatch18
        );
    }

    function _configureSettlementToken(address token, bool approved, uint8 decimals) internal {
        if (token == address(0) && decimals != 18) revert InvalidParameters();
        if (decimals > 18) revert InvalidParameters();
        settlementTokens[token] = SettlementTokenConfig({ approved: approved, decimals: decimals });
        emit SettlementTokenConfigured(token, approved, decimals);
    }

    function _toUsdt6(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        if (decimals == 6) return amount;
        if (decimals > 6) return amount / (10 ** (decimals - 6));
        return amount * (10 ** (6 - decimals));
    }
}
