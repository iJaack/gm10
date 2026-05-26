// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../GemMintStrategyFundV8.sol";

contract MockGemMintStrategyFundV8 is GemMintStrategyFundV8 {
    struct SaleForTest {
        uint256 markedValueUsdt6;
        uint256 costBasisUsdt6;
        uint256 netProceedsUsdt6;
    }

    mapping(bytes32 => SaleForTest) private salesForTest;

    constructor(address _tokenomicsController) GemMintStrategyFundV8(_tokenomicsController) {}

    function mintForTest(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function setStableAccountingForTest(
        uint256 liquidTreasury,
        uint256 outstandingPurchaseReleases,
        uint256 canonicalPortfolioValue,
        uint256 liquidityCatchBuyAccrued,
        uint256 liquidityAvaxPairingAccrued,
        uint256 holderDistributionAccrued
    ) external {
        liquidTreasuryUsdt6 = liquidTreasury;
        outstandingPurchaseReleasesUsdt6 = outstandingPurchaseReleases;
        canonicalPortfolioValueUsdt6 = canonicalPortfolioValue;
        liquidityCatchBuyAccruedUsdt6 = liquidityCatchBuyAccrued;
        liquidityAvaxPairingAccruedUsdt6 = liquidityAvaxPairingAccrued;
        holderDistributionAccruedUsdt6 = holderDistributionAccrued;
    }

    function accrueMarketSupportForTest(
        uint256 liquidityCatchBuyAccrued,
        uint256 liquidityAvaxPairingAccrued,
        uint256 holderDistributionAccrued,
        uint256 buybackBurnAccrued
    ) external {
        liquidityCatchBuyAccruedUsdt6 += liquidityCatchBuyAccrued;
        liquidityAvaxPairingAccruedUsdt6 += liquidityAvaxPairingAccrued;
        holderDistributionAccruedUsdt6 += holderDistributionAccrued;
        buybackBurnAccruedUsdt6 += buybackBurnAccrued;
    }

    function setMarketSupportAccrualsForTest(uint256 buybackBurnAccrued, uint256 lpSupportAccrued) external {
        buybackBurnAccruedUsdt6 = buybackBurnAccrued;
        lpSupportAccruedUsdt6 = lpSupportAccrued;
    }

    function syncStableNavForTest() external {
        _syncStableNav();
    }

    function setContinuousMintPausedForTest(bool paused) external {
        continuousMintPaused = paused;
    }

    function grantManagerForTest(address account) external {
        _grantRole(MANAGER_ROLE, account);
    }

    function settleContinuousMintForTest(bytes32 commitId, address buyer, uint256 settlementAmountUsdt6)
        external
        returns (uint256)
    {
        return _settleContinuousMint(commitId, buyer, settlementAmountUsdt6);
    }

    function setSaleForTest(
        bytes32 saleKey,
        uint256 markedValueUsdt6,
        uint256 costBasisUsdt6,
        uint256 netProceedsUsdt6
    ) external {
        salesForTest[saleKey] = SaleForTest(markedValueUsdt6, costBasisUsdt6, netProceedsUsdt6);
    }

    function _finalizeSaleRecord(bytes32 saleKey)
        internal
        override
        returns (
            uint256 positionId,
            uint256 markedValueUsdt6,
            uint256 acquisitionPriceUsdt6,
            uint256 netProceedsUsdt6
        )
    {
        SaleForTest memory sale = salesForTest[saleKey];
        if (sale.netProceedsUsdt6 == 0) revert InvalidParameters();
        return (1, sale.markedValueUsdt6, sale.costBasisUsdt6, sale.netProceedsUsdt6);
    }
}
