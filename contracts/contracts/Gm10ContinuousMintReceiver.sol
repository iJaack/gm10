// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
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
    error TransferFailed();

    constructor(address receiver_) {
        receiver = receiver_;
    }

    receive() external payable {}

    function release(address token, address to, uint256 amount) external {
        if (msg.sender != receiver) revert UnauthorizedCommitCaller();
        if (to == address(0) || amount == 0) revert TransferFailed();
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
            return;
        }
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
        bool cancelled;
        uint8 settlementDecimals;
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
    event ContinuousCommitRefunded(
        bytes32 indexed commitId,
        address indexed buyer,
        address settlementToken,
        uint256 refundedAmount
    );

    error ZeroAddress();
    error InvalidParameters();
    error UnsupportedSettlementToken();
    error CommitAlreadyRegistered();
    error CommitNotRegistered();
    error CommitAlreadySettled();
    error CommitCancelled();
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

    function configureSettlementToken(address token, bool approved, uint8 decimals_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _configureSettlementToken(token, approved, decimals_);
    }

    function predictEscrow(bytes32 commitId) public view returns (address) {
        bytes32 creationHash = keccak256(abi.encodePacked(
            type(Gm10ContinuousCommitEscrow).creationCode,
            abi.encode(address(this))
        ));
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            commitId,
            creationHash
        )))));
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
        SettlementTokenConfig memory tokenConfig = settlementTokens[settlementToken];
        if (!tokenConfig.approved) revert UnsupportedSettlementToken();
        if (commits[commitId].buyer != address(0)) revert CommitAlreadyRegistered();

        escrow = address(new Gm10ContinuousCommitEscrow{salt: commitId}(address(this)));

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
            fundAvaxBalanceBefore: 0,
            accountedFundAvaxBefore: 0,
            cancelled: false,
            settlementDecimals: tokenConfig.decimals
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
        if (commit.cancelled) revert CommitCancelled();
        if (msg.sender != commit.buyer && !hasRole(OPERATOR_ROLE, msg.sender)) revert UnauthorizedCommitCaller();
        if (
            commit.providerRouteId != providerRouteId ||
            commit.buyer != buyer ||
            commit.settlementToken != settlementToken
        ) revert CommitMismatch();
        if (block.timestamp > commit.expiresAt) revert CommitExpired();
        if (settledAmount < commit.minSettlementAmount) revert InvalidParameters();
        if (_escrowBalance(commit) < settledAmount) revert InsufficientSettlementBalance();

        commit.settled = true;
        commit.settledAmount = settledAmount;

        if (settlementToken == NATIVE_AVAX) {
            _escrow(commit).release(NATIVE_AVAX, address(fund), settledAmount);
            accountedFundAvaxSettlementWei += settledAmount;
            buyerCatch18 = fund.settleContinuousMintFromAvax(commitId, buyer, settledAmount);
        } else {
            if (!settlementTokens[settlementToken].approved) revert UnsupportedSettlementToken();
            uint256 settlementAmountUsdt6 = _toUsdt6(settledAmount, commit.settlementDecimals);
            if (settlementAmountUsdt6 == 0) revert InvalidParameters();
            buyerCatch18 = fund.settleContinuousMint(commitId, buyer, settlementAmountUsdt6);
            _escrow(commit).release(settlementToken, treasury, settledAmount);
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

    function refundCommit(bytes32 commitId) external nonReentrant returns (uint256 refundedAmount) {
        ContinuousCommit storage commit = commits[commitId];
        if (commit.buyer == address(0)) revert CommitNotRegistered();
        if (msg.sender != commit.buyer && !hasRole(OPERATOR_ROLE, msg.sender)) revert UnauthorizedCommitCaller();
        if (!commit.settled) commit.cancelled = true;

        refundedAmount = _escrowBalance(commit);
        if (refundedAmount == 0) revert InsufficientSettlementBalance();
        _escrow(commit).release(commit.settlementToken, commit.buyer, refundedAmount);

        emit ContinuousCommitRefunded(commitId, commit.buyer, commit.settlementToken, refundedAmount);
    }

    function _configureSettlementToken(address token, bool approved, uint8 decimals_) internal {
        if (decimals_ > 18) revert InvalidParameters();
        if (token == NATIVE_AVAX) {
            if (decimals_ != 18) revert InvalidParameters();
        } else if (approved && IERC20Metadata(token).decimals() != decimals_) {
            revert InvalidParameters();
        }
        settlementTokens[token] = SettlementTokenConfig({ approved: approved, decimals: decimals_ });
        emit SettlementTokenConfigured(token, approved, decimals_);
    }

    function _escrow(ContinuousCommit storage commit) internal view returns (Gm10ContinuousCommitEscrow) {
        return Gm10ContinuousCommitEscrow(payable(commit.escrow));
    }

    function _escrowBalance(ContinuousCommit storage commit) internal view returns (uint256) {
        if (commit.settlementToken == NATIVE_AVAX) return commit.escrow.balance;
        return IERC20(commit.settlementToken).balanceOf(commit.escrow);
    }

    function _toUsdt6(uint256 amount, uint8 decimals_) internal pure returns (uint256) {
        if (decimals_ == 6) return amount;
        if (decimals_ > 6) return amount / (10 ** (decimals_ - 6));
        return amount * (10 ** (6 - decimals_));
    }
}
