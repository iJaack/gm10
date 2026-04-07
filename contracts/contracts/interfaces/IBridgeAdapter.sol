// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBridgeAdapter
 * @notice Pluggable bridge adapter interface. Implementations wrap specific bridge
 *         protocols (Stargate V2, CCIP, etc.) and expose a uniform surface to the fund.
 */
interface IBridgeAdapter {
    /**
     * @notice Quote the native fee required to bridge `amount` of `token` to `dstEid`.
     * @param dstEid       LayerZero endpoint ID of the destination chain.
     * @param token        ERC-20 token address on the source chain.
     * @param amount       Amount of token (in token's native decimals).
     * @param options      Bridge-specific options bytes (e.g. LayerZero executor options).
     * @return nativeFee   Native fee in wei that must be forwarded as msg.value when calling bridge().
     */
    function quoteBridge(
        uint32 dstEid,
        address token,
        uint256 amount,
        bytes calldata options
    ) external view returns (uint256 nativeFee);

    /**
     * @notice Bridge `amount` of `token` to `recipient` on the destination chain.
     * @dev    The caller MUST have approved this contract to spend `amount` of `token`,
     *         or transfer must succeed via another pull mechanism implemented here.
     *         msg.value MUST equal the fee returned by quoteBridge().
     * @param dstEid       LayerZero endpoint ID of the destination chain.
     * @param token        ERC-20 token address on the source chain.
     * @param amount       Amount of token to bridge.
     * @param recipient    Recipient address on the destination chain (EVM Safe address).
     * @param options      Bridge-specific options bytes.
     */
    function bridge(
        uint32 dstEid,
        address token,
        uint256 amount,
        address recipient,
        bytes calldata options
    ) external payable;
}
