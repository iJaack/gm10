// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IBridgeAdapter.sol";
import "./interfaces/IStargatePool.sol";

/**
 * @title StargateBridgeAdapter
 * @notice IBridgeAdapter implementation that routes cross-chain token transfers
 *         through Stargate V2 OFT pools.
 *
 * @dev Each supported token on this chain maps to a Stargate pool address.
 *      The `fund` address is the only caller allowed to call `bridge()`.
 *      The owner (the fund's admin) can add/update pool mappings.
 *
 * Deployment pattern:
 *   1. Deploy this contract with `fund` = the GemMintStrategyFundV4 proxy address.
 *   2. Call `setPool(USDC_AVAX, STARGATE_USDC_POOL_AVAX)` for each bridgeable token.
 *   3. Call `fund.setApprovedBridgeAdapter(address(this), true)`.
 */
contract StargateBridgeAdapter is IBridgeAdapter, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The fund proxy that is the only allowed caller of bridge().
    address public immutable fund;

    /// @notice token address → Stargate pool address on this chain.
    mapping(address => address) public stargatePool;

    event PoolSet(address indexed token, address indexed pool);
    event BridgeSent(
        uint32 indexed dstEid,
        address indexed token,
        uint256 amount,
        address indexed recipient,
        bytes32 guid
    );

    error NotFund();
    error NoPoolForToken(address token);
    error ZeroAddress();

    modifier onlyFund() {
        if (msg.sender != fund) revert NotFund();
        _;
    }

    constructor(address _fund, address _owner) Ownable(_owner) {
        if (_fund == address(0)) revert ZeroAddress();
        fund = _fund;
    }

    // ── Configuration ────────────────────────────────────────────────────────

    /**
     * @notice Set the Stargate pool address for a given source token.
     * @param token  ERC-20 token address on this chain.
     * @param pool   Corresponding Stargate OFT pool address.
     */
    function setPool(address token, address pool) external onlyOwner {
        if (token == address(0) || pool == address(0)) revert ZeroAddress();
        stargatePool[token] = pool;
        emit PoolSet(token, pool);
    }

    // ── IBridgeAdapter ───────────────────────────────────────────────────────

    /**
     * @inheritdoc IBridgeAdapter
     */
    function quoteBridge(
        uint32 dstEid,
        address token,
        uint256 amount,
        bytes calldata options
    ) external view returns (uint256 nativeFee) {
        address poolAddr = stargatePool[token];
        if (poolAddr == address(0)) revert NoPoolForToken(token);

        IStargatePool.SendParam memory p = _buildSendParam(dstEid, amount, address(0), options);
        IStargatePool.MessagingFee memory fee = IStargatePool(poolAddr).quoteSend(p, false);
        return fee.nativeFee;
    }

    /**
     * @inheritdoc IBridgeAdapter
     * @dev Pulls `amount` of `token` from the caller (fund), then initiates the Stargate send.
     *      msg.value must equal the fee returned by quoteBridge().
     */
    function bridge(
        uint32 dstEid,
        address token,
        uint256 amount,
        address recipient,
        bytes calldata options
    ) external payable onlyFund {
        if (recipient == address(0)) revert ZeroAddress();
        address poolAddr = stargatePool[token];
        if (poolAddr == address(0)) revert NoPoolForToken(token);

        // Pull tokens from fund
        IERC20(token).safeTransferFrom(fund, address(this), amount);

        // Approve the Stargate pool
        IERC20(token).forceApprove(poolAddr, amount);

        IStargatePool.SendParam memory p = _buildSendParam(dstEid, amount, recipient, options);
        IStargatePool.MessagingFee memory fee = IStargatePool.MessagingFee({
            nativeFee: msg.value,
            lzTokenFee: 0
        });

        (IStargatePool.MessagingReceipt memory receipt,) =
            IStargatePool(poolAddr).send{value: msg.value}(p, fee, fund);

        emit BridgeSent(dstEid, token, amount, recipient, receipt.guid);
    }

    // ── Internals ────────────────────────────────────────────────────────────

    function _buildSendParam(
        uint32 dstEid,
        uint256 amount,
        address recipient,
        bytes calldata options
    ) internal pure returns (IStargatePool.SendParam memory) {
        return IStargatePool.SendParam({
            dstEid:      dstEid,
            to:          bytes32(uint256(uint160(recipient))),
            amountLD:    amount,
            minAmountLD: (amount * 9900) / 10000, // 1% default slippage tolerance
            extraOptions: options,
            composeMsg:  bytes(""),
            oftCmd:      bytes("")
        });
    }
}
