// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockLayerZeroEndpointV2 {
    mapping(address => address) public delegates;

    function setDelegate(address _delegate) external {
        delegates[msg.sender] = _delegate;
    }
}
