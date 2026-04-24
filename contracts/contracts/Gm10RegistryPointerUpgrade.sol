// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Gm10RegistryPointerUpgrade {
    bytes32 private constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    uint256 private constant CURRENT_PORTFOLIO_REGISTRY_SLOT = 77;

    error InvalidParameters();
    error ZeroAddress();

    event Upgraded(address indexed implementation);
    event PortfolioRegistryUpdated(address indexed portfolioRegistry);

    function proxiableUUID() external pure returns (bytes32) {
        return ERC1967_IMPLEMENTATION_SLOT;
    }

    function setPortfolioRegistryAndReturn(address _finalImplementation, address _portfolioRegistry) external {
        if (_finalImplementation == address(0) || _portfolioRegistry == address(0)) revert ZeroAddress();
        if (_finalImplementation.code.length == 0 || _portfolioRegistry.code.length == 0) revert InvalidParameters();
        assembly {
            sstore(CURRENT_PORTFOLIO_REGISTRY_SLOT, _portfolioRegistry)
            sstore(ERC1967_IMPLEMENTATION_SLOT, _finalImplementation)
        }
        emit PortfolioRegistryUpdated(_portfolioRegistry);
        emit Upgraded(_finalImplementation);
    }
}
