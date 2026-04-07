// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IStargatePool
 * @notice Minimal Stargate V2 OFT pool interface used by StargateBridgeAdapter.
 *         Inlined to avoid adding a new npm dependency.
 */
interface IStargatePool {
    struct SendParam {
        uint32  dstEid;         // Destination LayerZero endpoint ID
        bytes32 to;             // Recipient address, right-padded to bytes32
        uint256 amountLD;       // Amount in local decimals
        uint256 minAmountLD;    // Minimum amount to accept (slippage guard)
        bytes   extraOptions;   // Additional executor options
        bytes   composeMsg;     // Compose message payload (empty for simple transfers)
        bytes   oftCmd;         // OFT-specific command (empty for non-taxi mode)
    }

    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }

    struct MessagingReceipt {
        bytes32 guid;
        uint64  nonce;
        MessagingFee fee;
    }

    struct OFTReceipt {
        uint256 amountSentLD;
        uint256 amountReceivedLD;
    }

    /**
     * @notice Returns the fee required to send tokens via Stargate.
     * @param sendParam     Send parameters struct.
     * @param payInLzToken  Whether fee is paid in LZ token (always false for native fee).
     */
    function quoteSend(SendParam calldata sendParam, bool payInLzToken)
        external
        view
        returns (MessagingFee memory fee);

    /**
     * @notice Sends tokens cross-chain via Stargate.
     * @param sendParam     Send parameters.
     * @param fee           Messaging fee (native + lzToken).
     * @param refundAddress Address to refund excess native fee to.
     */
    function send(
        SendParam calldata sendParam,
        MessagingFee calldata fee,
        address refundAddress
    ) external payable returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt);
}
