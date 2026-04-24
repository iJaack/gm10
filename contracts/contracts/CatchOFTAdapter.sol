// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CatchOFTAdapter
 * @notice LayerZero OFT adapter for the live CATCH ERC20 proxy.
 * @dev The adapter pattern is used so the existing token proxy can remain the canonical Avalanche token
 *      while cross-chain sends are handled through LayerZero's reference adapter.
 */
contract CatchOFTAdapter is OFTAdapter {
    using SafeERC20 for IERC20;

    address public immutable adaptedToken;

    error CannotRescueAdaptedToken();
    error InvalidRescueRecipient();

    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate,
        address _owner
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(_owner) {
        adaptedToken = _token;
    }

    function rescueLockedToken(address _token, address _to, uint256 _amount) external onlyOwner {
        if (_token == adaptedToken) revert CannotRescueAdaptedToken();
        if (_to == address(0)) revert InvalidRescueRecipient();
        IERC20(_token).safeTransfer(_to, _amount);
    }
}
