// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./GemMintStrategyFundV3.sol";
import "./interfaces/IBridgeAdapter.sol";
import "./interfaces/ISwapRouterV4.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title GemMintStrategyFundV4
 * @notice UUPS upgrade of V3 that adds cross-chain treasury management.
 *
 * New capability: `swapAndBridge`
 *   - Accepts any tokenIn (native AVAX or ERC-20) and swaps to tokenOut via a DEX router.
 *   - Bridges tokenOut to a destination chain Safe via a pluggable IBridgeAdapter.
 *   - Records the bridge in `purchaseBridgeRefs` to prevent double-bridging.
 *   - Bridge adapters are allowlisted by DEFAULT_ADMIN_ROLE.
 *
 * Storage layout (append-only after V3 slots):
 *   swapRouterV4              address     DEX router for any-pair swaps
 *   approvedBridgeAdapters    mapping     allowlist of IBridgeAdapter contracts
 *   purchaseBridgeRefs        mapping     bridge records keyed by purchaseKey
 *   __gapV4                   uint256[47] forward-reserve
 */
contract GemMintStrategyFundV4 is GemMintStrategyFundV3 {
    using SafeERC20 for IERC20;

    // ── New role ─────────────────────────────────────────────────────────────
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ── New storage (V4 — appended after all V3 slots) ───────────────────────
    address public swapRouterV4;

    mapping(address => bool) public approvedBridgeAdapters;

    struct BridgePurchaseRef {
        uint32  dstChainEid;    // LayerZero endpoint ID of destination
        address dstSafe;        // EVM Safe address on destination chain
        address tokenBridged;   // Token that was bridged
        uint256 amountBridged;  // Amount in token's native decimals
        uint256 bridgedAt;      // block.timestamp when bridge was executed
    }
    mapping(bytes32 => BridgePurchaseRef) public purchaseBridgeRefs;

    uint256[47] private __gapV4;

    // ── Events ───────────────────────────────────────────────────────────────
    event PurchaseFundsBridged(
        bytes32 indexed purchaseKey,
        uint32  indexed dstChainEid,
        address indexed dstSafe,
        address tokenBridged,
        uint256 amountBridged,
        uint256 bridgeFee
    );
    event BridgeAdapterSet(address indexed adapter, bool approved);
    event SwapRouterV4Set(address indexed router);

    // ── Errors ───────────────────────────────────────────────────────────────
    error AdapterNotApproved(address adapter);
    error AlreadyBridged(bytes32 purchaseKey);
    error InsufficientBridgeFee();
    error SlippageTooHigh();
    error SwapFailed();

    // ── Initializer ──────────────────────────────────────────────────────────

    /**
     * @custom:oz-upgrades-validate-as-initializer
     * @custom:oz-upgrades-unsafe-allow missing-initializer-call
     */
    function initializeV4(address _swapRouterV4) external reinitializer(4) {
        if (_swapRouterV4 == address(0)) revert ZeroAddress();
        swapRouterV4 = _swapRouterV4;
    }

    // ── Configuration ────────────────────────────────────────────────────────

    /**
     * @notice Add or remove a bridge adapter from the allowlist.
     */
    function setApprovedBridgeAdapter(address adapter, bool approved)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (adapter == address(0)) revert ZeroAddress();
        approvedBridgeAdapters[adapter] = approved;
        emit BridgeAdapterSet(adapter, approved);
    }

    /**
     * @notice Update the DEX router used for swaps.
     */
    function setSwapRouterV4(address router) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (router == address(0)) revert ZeroAddress();
        swapRouterV4 = router;
        emit SwapRouterV4Set(router);
    }

    // ── Core: swapAndBridge ───────────────────────────────────────────────────

    struct SwapBridgeParams {
        bytes32   purchaseKey;
        address   tokenIn;
        address   tokenOut;
        uint256   amountOut;
        uint256   maxAmountIn;
        address   bridgeAdapter;
    }

    /**
     * @notice Swap `tokenIn` for `amountOut` of `tokenOut`, then bridge `tokenOut`
     *         to the destination chain Safe registered for `purchaseKey`.
     *
     * @param purchaseKey   Registry purchase authorization key.
     * @param tokenIn       Source token. Use address(0) for native AVAX.
     * @param tokenOut      Token to bridge.
     * @param path          DEX swap path.
     * @param amountOut     Exact amount of tokenOut to bridge.
     * @param maxAmountIn   Maximum tokenIn to spend (slippage guard).
     * @param bridgeAdapter Allowlisted IBridgeAdapter implementation.
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
        bytes calldata lzOptions
    ) external payable onlyRole(OPERATOR_ROLE) nonReentrant {
        SwapBridgeParams memory p = SwapBridgeParams({
            purchaseKey:   purchaseKey,
            tokenIn:       tokenIn,
            tokenOut:      tokenOut,
            amountOut:     amountOut,
            maxAmountIn:   maxAmountIn,
            bridgeAdapter: bridgeAdapter
        });
        _swapAndBridge(p, path, lzOptions);
    }

    function _swapAndBridge(
        SwapBridgeParams memory p,
        address[] calldata path,
        bytes calldata lzOptions
    ) internal {
        // 1. Guards
        if (!approvedBridgeAdapters[p.bridgeAdapter]) revert AdapterNotApproved(p.bridgeAdapter);
        if (purchaseBridgeRefs[p.purchaseKey].bridgedAt != 0) revert AlreadyBridged(p.purchaseKey);

        // 2. Validate purchase is for a known chain safe
        (uint32 dstEid, address dstSafe) = _resolveDstSafe(p.purchaseKey);

        // 3. Quote bridge fee
        uint256 bridgeFee = IBridgeAdapter(p.bridgeAdapter).quoteBridge(
            dstEid, p.tokenOut, p.amountOut, lzOptions
        );
        if (msg.value < bridgeFee) revert InsufficientBridgeFee();

        // 4. Swap tokenIn → tokenOut
        _executeSwap(p, path, bridgeFee);

        // 5. Approve adapter and bridge
        IERC20(p.tokenOut).forceApprove(p.bridgeAdapter, p.amountOut);
        IBridgeAdapter(p.bridgeAdapter).bridge{value: bridgeFee}(
            dstEid, p.tokenOut, p.amountOut, dstSafe, lzOptions
        );

        // 6. Record bridge
        purchaseBridgeRefs[p.purchaseKey] = BridgePurchaseRef({
            dstChainEid:   dstEid,
            dstSafe:       dstSafe,
            tokenBridged:  p.tokenOut,
            amountBridged: p.amountOut,
            bridgedAt:     block.timestamp
        });

        emit PurchaseFundsBridged(
            p.purchaseKey, dstEid, dstSafe, p.tokenOut, p.amountOut, bridgeFee
        );
    }

    function _resolveDstSafe(bytes32 purchaseKey) internal view returns (uint32 dstEid, address dstSafe) {
        Gm10Types.PurchaseAuthorization memory auth =
            IGm10PortfolioRegistry(portfolioRegistry).getPurchaseAuthorization(purchaseKey);
        require(auth.chainEid != 0, "V4: no chain config for purchase");
        Gm10Types.ChainSafeConfig memory chainCfg =
            IGm10PortfolioRegistry(portfolioRegistry).getChainSafe(auth.chainEid);
        require(chainCfg.enabled, "V4: chain safe not enabled");
        require(chainCfg.evmSafe != address(0), "V4: no EVM safe for chain");
        return (auth.chainEid, chainCfg.evmSafe);
    }

    function _executeSwap(
        SwapBridgeParams memory p,
        address[] calldata path,
        uint256 bridgeFee
    ) internal {
        if (p.tokenIn == address(0)) {
            uint256 avaxForSwap = msg.value - bridgeFee;
            if (avaxForSwap > p.maxAmountIn) revert SlippageTooHigh();
            uint256[] memory amounts = ISwapRouterV4(swapRouterV4).swapAVAXForExactTokens{
                value: avaxForSwap
            }(p.amountOut, path, address(this), block.timestamp + 300);
            if (amounts[0] > p.maxAmountIn) revert SlippageTooHigh();
        } else {
            IERC20(p.tokenIn).forceApprove(swapRouterV4, p.maxAmountIn);
            ISwapRouterV4(swapRouterV4).swapTokensForExactTokens(
                p.amountOut,
                p.maxAmountIn,
                path,
                address(this),
                block.timestamp + 300
            );
            IERC20(p.tokenIn).forceApprove(swapRouterV4, 0);
        }
    }
}
