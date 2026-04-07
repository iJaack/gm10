// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ISwapRouterV4.sol";

/**
 * @title MockSwapRouterV4
 * @notice Test mock for ISwapRouterV4.
 *
 *   - swapAVAXForExactTokens: mints/transfers `amountOut` of path[last] to `to`,
 *     charges `mockAmountIn` of AVAX (refunds excess), returns amounts array.
 *   - swapTokensForExactTokens: pulls `mockAmountIn` of path[0] from caller,
 *     transfers `amountOut` of path[last] to `to`.
 *
 * Configure `mockAmountIn` to simulate slippage scenarios.
 * Configure `shouldReturnLess` to simulate a swap that returns less than requested.
 */
contract MockSwapRouterV4 is ISwapRouterV4 {
    address public immutable wavax;

    uint256 public mockAmountIn = 1 ether; // AVAX or token units charged per swap
    bool public shouldReturnLess;          // if true, returns amountOut - 1

    constructor(address _wavax) {
        wavax = _wavax;
    }

    function setMockAmountIn(uint256 amount) external {
        mockAmountIn = amount;
    }

    function setShouldReturnLess(bool _less) external {
        shouldReturnLess = _less;
    }

    // ── ISwapRouterV4 ────────────────────────────────────────────────────────

    function swapAVAXForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external payable override returns (uint256[] memory amounts) {
        require(msg.value >= mockAmountIn, "MockRouter: insufficient AVAX");

        uint256 actualOut = shouldReturnLess ? amountOut - 1 : amountOut;

        // Transfer output token to `to`
        address tokenOut = path[path.length - 1];
        IERC20(tokenOut).transfer(to, actualOut);

        // Refund excess AVAX
        uint256 excess = msg.value - mockAmountIn;
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            require(ok, "MockRouter: AVAX refund failed");
        }

        amounts = new uint256[](path.length);
        amounts[0] = mockAmountIn;
        amounts[path.length - 1] = actualOut;
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external override returns (uint256[] memory amounts) {
        require(mockAmountIn <= amountInMax, "MockRouter: excessive input");

        uint256 actualOut = shouldReturnLess ? amountOut - 1 : amountOut;

        // Pull `mockAmountIn` of tokenIn from caller
        IERC20(path[0]).transferFrom(msg.sender, address(this), mockAmountIn);

        // Transfer output token to `to`
        address tokenOut = path[path.length - 1];
        IERC20(tokenOut).transfer(to, actualOut);

        amounts = new uint256[](path.length);
        amounts[0] = mockAmountIn;
        amounts[path.length - 1] = actualOut;
    }

    function swapExactAVAXForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external payable override returns (uint256[] memory amounts) {
        uint256 actualOut = shouldReturnLess ? amountOutMin - 1 : amountOutMin;
        address tokenOut = path[path.length - 1];
        IERC20(tokenOut).transfer(to, actualOut);
        amounts = new uint256[](path.length);
        amounts[0] = msg.value;
        amounts[path.length - 1] = actualOut;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external override returns (uint256[] memory amounts) {
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        uint256 actualOut = shouldReturnLess ? amountOutMin - 1 : amountOutMin;
        IERC20(path[path.length - 1]).transfer(to, actualOut);
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = actualOut;
    }

    function swapExactTokensForAVAX(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external override returns (uint256[] memory amounts) {
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        (bool ok,) = to.call{value: amountOutMin}("");
        require(ok, "MockRouter: AVAX transfer failed");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = amountOutMin;
    }

    function WAVAX() external view override returns (address) {
        return wavax;
    }

    receive() external payable {}
}
