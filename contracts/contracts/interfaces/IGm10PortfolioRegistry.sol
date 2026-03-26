// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../Gm10Types.sol";

interface IGm10PortfolioRegistry {
    function setChainSafe(
        uint32 chainEid,
        address evmSafe,
        bytes32 nonEvmSafe,
        bytes32 label,
        bool enabled
    ) external;

    function setMarketplaceApproval(bytes32 marketplaceId, bool approved) external;

    function authorizePurchase(
        bytes32 purchaseKey,
        uint32 chainEid,
        bytes32 marketplaceId,
        bytes32 assetRef,
        uint256 maxSpendUsdt6,
        bytes32 mandateHash
    ) external;

    function cancelPurchaseAuthorization(bytes32 purchaseKey) external;

    function releasePurchaseFunds(bytes32 purchaseKey, uint256 amountUsdt6) external;

    function recordPurchaseExecution(
        bytes32 purchaseKey,
        bytes32 executionRef,
        bytes32 settlementRef,
        bytes32 proofHash
    ) external;

    function recordCollectiblePosition(bytes32 purchaseKey, Gm10Types.PositionInput calldata input)
        external
        returns (uint256 positionId, uint256 acquisitionPriceUsdt6, uint256 releasedUsdt6);

    function authorizeSale(
        bytes32 saleKey,
        uint256 positionId,
        bytes32 marketplaceId,
        uint256 minNetProceedsUsdt6,
        bytes32 mandateHash
    ) external;

    function cancelSaleAuthorization(bytes32 saleKey) external;

    function recordSaleExecution(
        bytes32 saleKey,
        uint256 grossProceedsUsdt6,
        uint256 marketplaceFeesUsdt6,
        uint256 bridgeFeesUsdt6,
        bytes32 executionRef,
        bytes32 proceedsRef,
        bytes32 proofHash
    ) external;

    function confirmSaleProceedsReceived(bytes32 saleKey, uint256 netProceedsUsdt6) external;

    function finalizeSale(bytes32 saleKey)
        external
        returns (
            uint256 positionId,
            uint256 markedValueUsdt6,
            uint256 acquisitionPriceUsdt6,
            uint256 netProceedsUsdt6
        );

    function submitValuationObservation(
        uint256 positionId,
        Gm10Types.ValuationSourceType sourceType,
        bytes32 sourceRef,
        uint256 candidateValueUsdt6,
        uint256 weeklyNavCapBps,
        bytes32 proofHash
    ) external returns (uint256 oldValueUsdt6, uint256 appliedValueUsdt6);

    function collectiblePositionCount() external view returns (uint256);

    function getChainSafe(uint32 chainEid) external view returns (Gm10Types.ChainSafeConfig memory);

    function isMarketplaceApproved(bytes32 marketplaceId) external view returns (bool);

    function getPurchaseAuthorization(bytes32 purchaseKey)
        external
        view
        returns (Gm10Types.PurchaseAuthorization memory);

    function getSaleAuthorization(bytes32 saleKey)
        external
        view
        returns (Gm10Types.SaleAuthorization memory);

    function getCollectiblePosition(uint256 positionId)
        external
        view
        returns (Gm10Types.CollectiblePosition memory);

    function getLatestValuationObservation(uint256 positionId)
        external
        view
        returns (Gm10Types.ValuationObservation memory);
}
