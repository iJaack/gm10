// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./GemMintStrategyFundV3.sol";
import "./interfaces/IBridgeAdapter.sol";
import "./interfaces/ISwapRouterV4.sol";

/**
 * @title GemMintStrategyFundV4
 * @notice Adds cross-chain treasury management to V3.
 *
 * `swapAndBridge` lets an operator:
 *   1. Swap any tokenIn → tokenOut via a whitelisted DEX router.
 *   2. Bridge tokenOut to a destination-chain Safe via a pluggable IBridgeAdapter.
 *
 * dstEid/dstSafe are passed explicitly by the caller (validated off-chain against the
 * portfolio registry). The adapter allowlist and OPERATOR_ROLE provide on-chain access
 * control. A per-purchaseKey bridge guard prevents double-bridging.
 *
 * Storage layout (append-only after V3):
 *   swapRouterV4           address
 *   approvedBridgeAdapters mapping(address => bool)
 *   isBridged              mapping(bytes32 => bool)
 *   __gapV4                uint256[48]
 */
/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract GemMintStrategyFundV4 is GemMintStrategyFundV3 {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address public swapRouterV4;
    mapping(address => bool) public approvedBridgeAdapters;
    mapping(bytes32 => bool)  public isBridged;

    uint256[48] private __gapV4;

    event PurchaseFundsBridged(
        bytes32 indexed purchaseKey,
        uint32  dstEid,
        address dstSafe,
        address tokenBridged,
        uint256 amountBridged,
        uint256 bridgeFee
    );
    event BridgeAdapterSet(address indexed adapter, bool approved);

    error AdapterNotApproved(address adapter);
    error AlreadyBridged(bytes32 purchaseKey);
    error InsufficientBridgeFee();
    error SlippageTooHigh();

    // ─────────────────────────────────────────────────────────────────────────

    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV4(address _swapRouterV4) external reinitializer(4) {
        if (_swapRouterV4 == address(0)) revert ZeroAddress();
        swapRouterV4 = _swapRouterV4;
    }

    function setApprovedBridgeAdapter(address adapter, bool approved)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (adapter == address(0)) revert ZeroAddress();
        approvedBridgeAdapters[adapter] = approved;
        emit BridgeAdapterSet(adapter, approved);
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Swap tokenIn for amountOut of tokenOut, then bridge to dstSafe on dstEid.
     * @param purchaseKey   Unique key (prevents double-bridging).
     * @param tokenIn       Source token; address(0) = native AVAX.
     * @param tokenOut      Token to bridge.
     * @param path          DEX swap path.
     * @param amountOut     Exact tokenOut to bridge.
     * @param maxAmountIn   Slippage cap for tokenIn.
     * @param bridgeAdapter Approved IBridgeAdapter.
     * @param dstEid        LayerZero endpoint ID of destination chain.
     * @param dstSafe       Safe address on destination chain.
     * @param lzOptions     LayerZero executor options.
     */
    function swapAndBridge(
        bytes32       purchaseKey,
        address       tokenIn,
        address       tokenOut,
        address[] calldata path,
        uint256       amountOut,
        uint256       maxAmountIn,
        address       bridgeAdapter,
        uint32        dstEid,
        address       dstSafe,
        bytes calldata lzOptions
    ) external payable onlyRole(OPERATOR_ROLE) nonReentrant {
        if (!approvedBridgeAdapters[bridgeAdapter]) revert AdapterNotApproved(bridgeAdapter);
        if (isBridged[purchaseKey]) revert AlreadyBridged(purchaseKey);

        uint256 bridgeFee = IBridgeAdapter(bridgeAdapter).quoteBridge(
            dstEid, tokenOut, amountOut, lzOptions
        );
        if (msg.value < bridgeFee) revert InsufficientBridgeFee();

        _executeSwap(tokenIn, path, amountOut, maxAmountIn, bridgeFee);

        IERC20(tokenOut).forceApprove(bridgeAdapter, amountOut);
        IBridgeAdapter(bridgeAdapter).bridge{value: bridgeFee}(
            dstEid, tokenOut, amountOut, dstSafe, lzOptions
        );

        isBridged[purchaseKey] = true;
        emit PurchaseFundsBridged(purchaseKey, dstEid, dstSafe, tokenOut, amountOut, bridgeFee);
    }

    function _executeSwap(
        address tokenIn,
        address[] calldata path,
        uint256 amountOut,
        uint256 maxAmountIn,
        uint256 bridgeFee
    ) internal {
        if (tokenIn == address(0)) {
            uint256 avaxForSwap = msg.value - bridgeFee;
            if (avaxForSwap > maxAmountIn) revert SlippageTooHigh();
            uint256[] memory amounts = ISwapRouterV4(swapRouterV4).swapAVAXForExactTokens{
                value: avaxForSwap
            }(amountOut, path, address(this), block.timestamp + 300);
            if (amounts[0] > maxAmountIn) revert SlippageTooHigh();
        } else {
            IERC20(tokenIn).forceApprove(swapRouterV4, maxAmountIn);
            ISwapRouterV4(swapRouterV4).swapTokensForExactTokens(
                amountOut, maxAmountIn, path, address(this), block.timestamp + 300
            );
            IERC20(tokenIn).forceApprove(swapRouterV4, 0);
        }
    }
}
