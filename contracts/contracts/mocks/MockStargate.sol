// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IStargatePool.sol";

/**
 * @title MockStargate
 * @notice Test mock for IStargatePool. Accepts tokens and emits an event instead of
 *         actually bridging. The quoted fee is configurable.
 */
contract MockStargate is IStargatePool {
    uint256 public mockFee = 0.01 ether;
    bool public shouldRevert;

    event MockSendCalled(
        uint32 dstEid,
        bytes32 to,
        uint256 amountLD,
        uint256 nativeFeeForwarded
    );

    function setMockFee(uint256 fee) external {
        mockFee = fee;
    }

    function setShouldRevert(bool _revert) external {
        shouldRevert = _revert;
    }

    function quoteSend(SendParam calldata, bool)
        external
        view
        override
        returns (MessagingFee memory fee)
    {
        return MessagingFee({ nativeFee: mockFee, lzTokenFee: 0 });
    }

    function send(
        SendParam calldata sendParam,
        MessagingFee calldata fee,
        address /* refundAddress */
    ) external payable override returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        require(!shouldRevert, "MockStargate: forced revert");
        require(msg.value >= fee.nativeFee, "MockStargate: insufficient fee");

        // In a real Stargate pool the pool pulls tokens from the caller.
        // This mock skips token transfer; only the fee forwarding is verified.

        emit MockSendCalled(sendParam.dstEid, sendParam.to, sendParam.amountLD, msg.value);

        bytes32 guid = keccak256(abi.encode(sendParam, block.timestamp));
        msgReceipt = MessagingReceipt({ guid: guid, nonce: 1, fee: fee });
        oftReceipt = OFTReceipt({
            amountSentLD: sendParam.amountLD,
            amountReceivedLD: sendParam.amountLD
        });
    }
}
