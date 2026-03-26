// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../Gm10Types.sol";

interface IGm10InvestorAccounting {
    function recordInvestment(
        address account,
        uint256 contributedAvax18,
        uint256 costBasisUsdt6,
        uint256 mintedTokens18
    ) external;

    function previewRedemption(address account, uint256 tokenAmount)
        external
        view
        returns (uint256 attributableRedeemed18, uint256 costBasisRemovedUsdt6);

    function recordRedemption(
        address account,
        uint256 attributableRedeemed18,
        uint256 costBasisRemovedUsdt6,
        uint256 netProceedsUsdt6
    ) external;

    function recordTransfer(address from, address to, uint256 amount18) external;

    function getInvestorAccounting(address account)
        external
        view
        returns (Gm10Types.InvestorAccounting memory);

    function getInvestorPnl(address account, uint256 navPerTokenUsdt6)
        external
        view
        returns (Gm10Types.InvestorPnlView memory);
}
