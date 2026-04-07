// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ISwapRouterV4
 * @notice Extended DEX router interface (Trader Joe V2 / Uniswap V2 style) used by
 *         GemMintStrategyFundV4 to support any-pair swaps with both exact-input and
 *         exact-output variants.
 */
interface ISwapRouterV4 {
    // ── Exact output: token-in is native AVAX ──────────────────────────────
    /**
     * @notice Swap native AVAX for exactly `amountOut` of `path[last]`.
     *         Excess AVAX sent as msg.value is refunded to `to`.
     */
    function swapAVAXForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    // ── Exact input: token-in is native AVAX ───────────────────────────────
    /**
     * @notice Swap exactly msg.value of AVAX for at least `amountOutMin` of `path[last]`.
     */
    function swapExactAVAXForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    // ── Exact output: token-in is ERC-20 ───────────────────────────────────
    /**
     * @notice Swap at most `amountInMax` of `path[0]` for exactly `amountOut` of `path[last]`.
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    // ── Exact input: token-in is ERC-20 ────────────────────────────────────
    /**
     * @notice Swap exactly `amountIn` of `path[0]` for at least `amountOutMin` of `path[last]`.
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    // ── Exact input: token-in is ERC-20, token-out is native AVAX ──────────
    function swapExactTokensForAVAX(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function WAVAX() external view returns (address);
}
