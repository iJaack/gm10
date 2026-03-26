// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./Gm10Types.sol";

contract Gm10InvestorAccounting {
    using Math for uint256;

    address public immutable fund;
    mapping(address => Gm10Types.InvestorAccounting) private investorAccountings;

    error OnlyFund();

    modifier onlyFund() {
        if (msg.sender != fund) revert OnlyFund();
        _;
    }

    constructor(address _fund) {
        fund = _fund;
    }

    function recordInvestment(
        address account,
        uint256 contributedAvax18,
        uint256 costBasisUsdt6,
        uint256 mintedTokens18
    ) external onlyFund {
        Gm10Types.InvestorAccounting storage accounting = investorAccountings[account];
        accounting.totalContributedAvax18 += contributedAvax18;
        accounting.totalCostBasisUsdt6 += costBasisUsdt6;
        accounting.remainingCostBasisUsdt6 += costBasisUsdt6;
        accounting.directMintedTokens18 += mintedTokens18;
        accounting.attributableTokens18 += mintedTokens18;
    }

    function previewRedemption(address account, uint256 tokenAmount)
        external
        view
        returns (uint256 attributableRedeemed18, uint256 costBasisRemovedUsdt6)
    {
        Gm10Types.InvestorAccounting storage accounting = investorAccountings[account];
        uint256 attributableBefore18 = accounting.attributableTokens18;
        attributableRedeemed18 = tokenAmount > attributableBefore18 ? attributableBefore18 : tokenAmount;
        costBasisRemovedUsdt6 = attributableRedeemed18 == 0 || attributableBefore18 == 0
            ? 0
            : Math.mulDiv(accounting.remainingCostBasisUsdt6, attributableRedeemed18, attributableBefore18);
    }

    function recordRedemption(
        address account,
        uint256 attributableRedeemed18,
        uint256 costBasisRemovedUsdt6,
        uint256 netProceedsUsdt6
    ) external onlyFund {
        Gm10Types.InvestorAccounting storage accounting = investorAccountings[account];

        if (attributableRedeemed18 > 0) {
            accounting.attributableTokens18 -= attributableRedeemed18;
            accounting.remainingCostBasisUsdt6 -= costBasisRemovedUsdt6;
        }

        accounting.redeemedTokens18 += attributableRedeemed18;
        accounting.redemptionProceedsUsdt6 += netProceedsUsdt6;
        accounting.realizedPnlUsdt6 += int256(netProceedsUsdt6) - int256(costBasisRemovedUsdt6);
    }

    function recordTransfer(address from, address to, uint256 amount18) external onlyFund {
        if (from == address(0) || to == address(0) || from == to || amount18 == 0) return;

        Gm10Types.InvestorAccounting storage fromAccounting = investorAccountings[from];
        Gm10Types.InvestorAccounting storage toAccounting = investorAccountings[to];

        uint256 attributableBefore18 = fromAccounting.attributableTokens18;
        uint256 remainingCostBasisBeforeUsdt6 = fromAccounting.remainingCostBasisUsdt6;
        uint256 attributableTransfer18 = amount18 > attributableBefore18 ? attributableBefore18 : amount18;
        uint256 shiftedCostBasisUsdt6 = attributableTransfer18 == 0 || attributableBefore18 == 0
            ? 0
            : Math.mulDiv(remainingCostBasisBeforeUsdt6, attributableTransfer18, attributableBefore18);

        if (attributableTransfer18 > 0) {
            fromAccounting.attributableTokens18 -= attributableTransfer18;
            fromAccounting.remainingCostBasisUsdt6 -= shiftedCostBasisUsdt6;
        }

        fromAccounting.transferredOutTokens18 += amount18;
        toAccounting.transferredInTokens18 += amount18;
    }

    function getInvestorAccounting(address account)
        external
        view
        returns (Gm10Types.InvestorAccounting memory)
    {
        return investorAccountings[account];
    }

    function getInvestorPnl(address account, uint256 navPerTokenUsdt6)
        external
        view
        returns (Gm10Types.InvestorPnlView memory)
    {
        Gm10Types.InvestorAccounting memory accounting = investorAccountings[account];
        uint256 currentAttributableValueUsdt6 = Math.mulDiv(accounting.attributableTokens18, navPerTokenUsdt6, 1e18);
        int256 unrealizedPnlUsdt6 = int256(currentAttributableValueUsdt6) - int256(accounting.remainingCostBasisUsdt6);

        return Gm10Types.InvestorPnlView({
            totalContributedAvax18: accounting.totalContributedAvax18,
            totalCostBasisUsdt6: accounting.totalCostBasisUsdt6,
            remainingCostBasisUsdt6: accounting.remainingCostBasisUsdt6,
            directMintedTokens18: accounting.directMintedTokens18,
            attributableTokens18: accounting.attributableTokens18,
            transferredInTokens18: accounting.transferredInTokens18,
            transferredOutTokens18: accounting.transferredOutTokens18,
            currentAttributableValueUsdt6: currentAttributableValueUsdt6,
            realizedPnlUsdt6: accounting.realizedPnlUsdt6,
            unrealizedPnlUsdt6: unrealizedPnlUsdt6
        });
    }
}
