// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals = 18;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setDecimalsForTest(uint8 decimals_) external {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
