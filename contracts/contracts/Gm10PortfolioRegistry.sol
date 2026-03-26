// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./Gm10Types.sol";

contract Gm10PortfolioRegistry {
    using Math for uint256;

    uint256 public constant WORKFLOW_BPS = 10_000;
    bytes32 private constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 private constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    address public immutable fund;
    uint256 public collectiblePositionCount;

    mapping(uint32 => Gm10Types.ChainSafeConfig) private chainSafes;
    mapping(bytes32 => bool) private approvedMarketplaceIds;
    mapping(bytes32 => Gm10Types.PurchaseAuthorization) private purchaseAuthorizations;
    mapping(bytes32 => Gm10Types.SaleAuthorization) private saleAuthorizations;
    mapping(uint256 => Gm10Types.CollectiblePosition) private collectiblePositions;
    mapping(uint256 => Gm10Types.ValuationObservation) private latestValuationObservation;

    event ChainSafeUpdated(uint32 indexed chainEid, address evmSafe, bytes32 nonEvmSafe, bool enabled);
    event MarketplaceApprovalUpdated(bytes32 indexed marketplaceId, bool approved);
    event PurchaseAuthorized(bytes32 indexed purchaseKey, uint32 indexed chainEid, bytes32 indexed marketplaceId, uint256 maxSpendUsdt6);
    event PurchaseFundsReleased(bytes32 indexed purchaseKey, uint256 amountUsdt6);
    event PurchaseExecutionRecorded(bytes32 indexed purchaseKey, bytes32 executionRef, bytes32 settlementRef);
    event CollectiblePositionRecorded(uint256 indexed positionId, bytes32 indexed purchaseKey, uint256 acquisitionPriceUsdt6);
    event SaleAuthorized(bytes32 indexed saleKey, uint256 indexed positionId, uint256 minNetProceedsUsdt6);
    event SaleExecutionRecorded(bytes32 indexed saleKey, uint256 grossProceedsUsdt6, uint256 netProceedsUsdt6);
    event SaleProceedsConfirmed(bytes32 indexed saleKey, uint256 netProceedsUsdt6);
    event SaleFinalized(bytes32 indexed saleKey, uint256 indexed positionId, uint256 markedValueUsdt6, uint256 netProceedsUsdt6);
    event ValuationObservationSubmitted(uint256 indexed positionId, uint8 sourceType, uint256 candidateValueUsdt6, bytes32 sourceRef);

    error OnlyFund();
    error UnsupportedChain();
    error UnsupportedMarketplace();
    error WorkflowAlreadyExists();
    error InvalidWorkflowState();
    error PurchaseBudgetExceeded();
    error UnsupportedPosition();
    error SaleBelowMinimum();
    error InvalidSaleMath();
    error InvalidParameters();
    error MissingRole();

    modifier onlyFundRole(bytes32 role) {
        if (!IGm10FundAccess(fund).hasRole(role, msg.sender)) revert MissingRole();
        _;
    }

    modifier onlyFund() {
        if (msg.sender != fund) revert OnlyFund();
        _;
    }

    constructor(address _fund) {
        if (_fund == address(0)) revert InvalidParameters();
        fund = _fund;
    }

    function setChainSafe(
        uint32 chainEid,
        address evmSafe,
        bytes32 nonEvmSafe,
        bytes32 label,
        bool enabled
    ) external onlyFundRole(GOVERNANCE_ROLE) {
        if (chainEid == 0) revert UnsupportedChain();
        chainSafes[chainEid] = Gm10Types.ChainSafeConfig({
            enabled: enabled,
            chainEid: chainEid,
            evmSafe: evmSafe,
            nonEvmSafe: nonEvmSafe,
            label: label
        });
        emit ChainSafeUpdated(chainEid, evmSafe, nonEvmSafe, enabled);
    }

    function setMarketplaceApproval(bytes32 marketplaceId, bool approved) external onlyFundRole(GOVERNANCE_ROLE) {
        approvedMarketplaceIds[marketplaceId] = approved;
        emit MarketplaceApprovalUpdated(marketplaceId, approved);
    }

    function authorizePurchase(
        bytes32 purchaseKey,
        uint32 chainEid,
        bytes32 marketplaceId,
        bytes32 assetRef,
        uint256 maxSpendUsdt6,
        bytes32 mandateHash
    ) external onlyFundRole(GOVERNANCE_ROLE) {
        if (purchaseAuthorizations[purchaseKey].status != Gm10Types.PurchaseStatus.None) revert WorkflowAlreadyExists();
        if (!chainSafes[chainEid].enabled) revert UnsupportedChain();
        if (!approvedMarketplaceIds[marketplaceId]) revert UnsupportedMarketplace();
        if (maxSpendUsdt6 == 0) revert InvalidParameters();

        Gm10Types.ChainSafeConfig storage safeConfig = chainSafes[chainEid];
        purchaseAuthorizations[purchaseKey] = Gm10Types.PurchaseAuthorization({
            purchaseKey: purchaseKey,
            status: Gm10Types.PurchaseStatus.Approved,
            chainEid: chainEid,
            marketplaceId: marketplaceId,
            assetRef: assetRef,
            maxSpendUsdt6: maxSpendUsdt6,
            releasedUsdt6: 0,
            destinationSafe: safeConfig.evmSafe,
            destinationSafeAlt: safeConfig.nonEvmSafe,
            approvedAt: block.timestamp,
            mandateHash: mandateHash,
            executionRef: bytes32(0),
            settlementRef: bytes32(0),
            proofHash: bytes32(0)
        });

        emit PurchaseAuthorized(purchaseKey, chainEid, marketplaceId, maxSpendUsdt6);
    }

    function cancelPurchaseAuthorization(bytes32 purchaseKey) external onlyFundRole(GOVERNANCE_ROLE) {
        Gm10Types.PurchaseAuthorization storage authorization = purchaseAuthorizations[purchaseKey];
        if (authorization.status != Gm10Types.PurchaseStatus.Approved) revert InvalidWorkflowState();
        authorization.status = Gm10Types.PurchaseStatus.Cancelled;
    }

    function releasePurchaseFunds(bytes32 purchaseKey, uint256 amountUsdt6) external onlyFund {
        Gm10Types.PurchaseAuthorization storage authorization = purchaseAuthorizations[purchaseKey];
        if (authorization.status != Gm10Types.PurchaseStatus.Approved) revert InvalidWorkflowState();
        if (amountUsdt6 == 0 || amountUsdt6 > authorization.maxSpendUsdt6) revert PurchaseBudgetExceeded();
        authorization.status = Gm10Types.PurchaseStatus.FundsReleased;
        authorization.releasedUsdt6 = amountUsdt6;
        emit PurchaseFundsReleased(purchaseKey, amountUsdt6);
    }

    function recordPurchaseExecution(
        bytes32 purchaseKey,
        bytes32 executionRef,
        bytes32 settlementRef,
        bytes32 proofHash
    ) external onlyFundRole(MANAGER_ROLE) {
        Gm10Types.PurchaseAuthorization storage authorization = purchaseAuthorizations[purchaseKey];
        if (authorization.status != Gm10Types.PurchaseStatus.FundsReleased) revert InvalidWorkflowState();
        authorization.status = Gm10Types.PurchaseStatus.Executed;
        authorization.executionRef = executionRef;
        authorization.settlementRef = settlementRef;
        authorization.proofHash = proofHash;
        emit PurchaseExecutionRecorded(purchaseKey, executionRef, settlementRef);
    }

    function recordCollectiblePosition(bytes32 purchaseKey, Gm10Types.PositionInput calldata input)
        external
        onlyFund
        returns (uint256 positionId, uint256 acquisitionPriceUsdt6, uint256 releasedUsdt6)
    {
        Gm10Types.PurchaseAuthorization storage authorization = purchaseAuthorizations[purchaseKey];
        if (authorization.status != Gm10Types.PurchaseStatus.Executed) revert InvalidWorkflowState();
        if (input.acquisitionPriceUsdt6 == 0 || input.acquisitionPriceUsdt6 > authorization.releasedUsdt6) {
            revert PurchaseBudgetExceeded();
        }

        collectiblePositionCount++;
        positionId = collectiblePositionCount;
        collectiblePositions[positionId] = Gm10Types.CollectiblePosition({
            id: positionId,
            originPurchaseKey: purchaseKey,
            chainEid: authorization.chainEid,
            marketplaceId: authorization.marketplaceId,
            custodyMode: input.custodyMode,
            tokenStandard: input.tokenStandard,
            evmCollection: input.evmCollection,
            nonEvmCollection: input.nonEvmCollection,
            tokenId: input.tokenId,
            nonEvmTokenId: input.nonEvmTokenId,
            externalAssetId: input.externalAssetId,
            categoryId: input.categoryId,
            marketplaceProvenanceRef: input.marketplaceProvenanceRef,
            acquisitionPriceUsdt6: input.acquisitionPriceUsdt6,
            currentValueUsdt6: input.acquisitionPriceUsdt6,
            lastNavMarkUsdt6: input.acquisitionPriceUsdt6,
            acquisitionDate: block.timestamp,
            lastValuationAt: block.timestamp,
            status: Gm10Types.PositionStatus.Active,
            metadataHash: input.metadataHash,
            proofHash: input.proofHash
        });

        authorization.status = Gm10Types.PurchaseStatus.PositionRecorded;
        acquisitionPriceUsdt6 = input.acquisitionPriceUsdt6;
        releasedUsdt6 = authorization.releasedUsdt6;

        emit CollectiblePositionRecorded(positionId, purchaseKey, acquisitionPriceUsdt6);
    }

    function authorizeSale(
        bytes32 saleKey,
        uint256 positionId,
        bytes32 marketplaceId,
        uint256 minNetProceedsUsdt6,
        bytes32 mandateHash
    ) external onlyFundRole(GOVERNANCE_ROLE) {
        if (saleAuthorizations[saleKey].status != Gm10Types.SaleStatus.None) revert WorkflowAlreadyExists();
        if (!approvedMarketplaceIds[marketplaceId]) revert UnsupportedMarketplace();

        Gm10Types.CollectiblePosition storage position = collectiblePositions[positionId];
        if (position.status != Gm10Types.PositionStatus.Active) revert UnsupportedPosition();

        position.status = Gm10Types.PositionStatus.ListedForSale;
        saleAuthorizations[saleKey] = Gm10Types.SaleAuthorization({
            saleKey: saleKey,
            status: Gm10Types.SaleStatus.Approved,
            positionId: positionId,
            chainEid: position.chainEid,
            marketplaceId: marketplaceId,
            minNetProceedsUsdt6: minNetProceedsUsdt6,
            grossProceedsUsdt6: 0,
            marketplaceFeesUsdt6: 0,
            bridgeFeesUsdt6: 0,
            netProceedsUsdt6: 0,
            approvedAt: block.timestamp,
            mandateHash: mandateHash,
            executionRef: bytes32(0),
            proceedsRef: bytes32(0),
            proofHash: bytes32(0)
        });

        emit SaleAuthorized(saleKey, positionId, minNetProceedsUsdt6);
    }

    function cancelSaleAuthorization(bytes32 saleKey) external onlyFundRole(GOVERNANCE_ROLE) {
        Gm10Types.SaleAuthorization storage sale = saleAuthorizations[saleKey];
        if (sale.status != Gm10Types.SaleStatus.Approved) revert InvalidWorkflowState();
        sale.status = Gm10Types.SaleStatus.Cancelled;
        collectiblePositions[sale.positionId].status = Gm10Types.PositionStatus.Active;
    }

    function recordSaleExecution(
        bytes32 saleKey,
        uint256 grossProceedsUsdt6,
        uint256 marketplaceFeesUsdt6,
        uint256 bridgeFeesUsdt6,
        bytes32 executionRef,
        bytes32 proceedsRef,
        bytes32 proofHash
    ) external onlyFundRole(MANAGER_ROLE) {
        Gm10Types.SaleAuthorization storage sale = saleAuthorizations[saleKey];
        if (sale.status != Gm10Types.SaleStatus.Approved) revert InvalidWorkflowState();
        if (grossProceedsUsdt6 < marketplaceFeesUsdt6 + bridgeFeesUsdt6) revert InvalidSaleMath();

        uint256 netProceedsUsdt6 = grossProceedsUsdt6 - marketplaceFeesUsdt6 - bridgeFeesUsdt6;
        if (netProceedsUsdt6 < sale.minNetProceedsUsdt6) revert SaleBelowMinimum();

        sale.status = Gm10Types.SaleStatus.Executed;
        sale.grossProceedsUsdt6 = grossProceedsUsdt6;
        sale.marketplaceFeesUsdt6 = marketplaceFeesUsdt6;
        sale.bridgeFeesUsdt6 = bridgeFeesUsdt6;
        sale.netProceedsUsdt6 = netProceedsUsdt6;
        sale.executionRef = executionRef;
        sale.proceedsRef = proceedsRef;
        sale.proofHash = proofHash;

        emit SaleExecutionRecorded(saleKey, grossProceedsUsdt6, netProceedsUsdt6);
    }

    function confirmSaleProceedsReceived(bytes32 saleKey, uint256 netProceedsUsdt6) external onlyFundRole(MANAGER_ROLE) {
        Gm10Types.SaleAuthorization storage sale = saleAuthorizations[saleKey];
        if (sale.status != Gm10Types.SaleStatus.Executed) revert InvalidWorkflowState();
        if (sale.netProceedsUsdt6 != netProceedsUsdt6) revert InvalidSaleMath();
        sale.status = Gm10Types.SaleStatus.ProceedsReceived;
        emit SaleProceedsConfirmed(saleKey, netProceedsUsdt6);
    }

    function finalizeSale(bytes32 saleKey)
        external
        onlyFund
        returns (
            uint256 positionId,
            uint256 markedValueUsdt6,
            uint256 acquisitionPriceUsdt6,
            uint256 netProceedsUsdt6
        )
    {
        Gm10Types.SaleAuthorization storage sale = saleAuthorizations[saleKey];
        if (sale.status != Gm10Types.SaleStatus.ProceedsReceived) revert InvalidWorkflowState();

        Gm10Types.CollectiblePosition storage position = collectiblePositions[sale.positionId];
        if (position.status != Gm10Types.PositionStatus.ListedForSale && position.status != Gm10Types.PositionStatus.Active) {
            revert UnsupportedPosition();
        }

        positionId = sale.positionId;
        markedValueUsdt6 = position.currentValueUsdt6;
        acquisitionPriceUsdt6 = position.acquisitionPriceUsdt6;
        netProceedsUsdt6 = sale.netProceedsUsdt6;

        position.currentValueUsdt6 = 0;
        position.lastNavMarkUsdt6 = 0;
        position.lastValuationAt = block.timestamp;
        position.status = Gm10Types.PositionStatus.Sold;
        sale.status = Gm10Types.SaleStatus.Finalized;

        emit SaleFinalized(saleKey, positionId, markedValueUsdt6, netProceedsUsdt6);
    }

    function submitValuationObservation(
        uint256 positionId,
        Gm10Types.ValuationSourceType sourceType,
        bytes32 sourceRef,
        uint256 candidateValueUsdt6,
        uint256 weeklyNavCapBps,
        bytes32 proofHash
    ) external onlyFund returns (uint256 oldValueUsdt6, uint256 appliedValueUsdt6) {
        Gm10Types.CollectiblePosition storage position = collectiblePositions[positionId];
        if (position.status != Gm10Types.PositionStatus.Active && position.status != Gm10Types.PositionStatus.ListedForSale) {
            revert UnsupportedPosition();
        }

        bool capped;
        appliedValueUsdt6 = candidateValueUsdt6;
        oldValueUsdt6 = position.currentValueUsdt6;

        if (sourceType != Gm10Types.ValuationSourceType.ExactTrade && oldValueUsdt6 > 0) {
            uint256 maxDeltaUsdt6 = Math.mulDiv(oldValueUsdt6, weeklyNavCapBps, WORKFLOW_BPS);
            uint256 upperBoundUsdt6 = oldValueUsdt6 + maxDeltaUsdt6;
            uint256 lowerBoundUsdt6 = oldValueUsdt6 > maxDeltaUsdt6 ? oldValueUsdt6 - maxDeltaUsdt6 : 0;

            if (candidateValueUsdt6 > upperBoundUsdt6) {
                appliedValueUsdt6 = upperBoundUsdt6;
                capped = true;
            } else if (candidateValueUsdt6 < lowerBoundUsdt6) {
                appliedValueUsdt6 = lowerBoundUsdt6;
                capped = true;
            }
        }

        latestValuationObservation[positionId] = Gm10Types.ValuationObservation({
            positionId: positionId,
            sourceType: sourceType,
            observedAt: block.timestamp,
            sourceRef: sourceRef,
            candidateValueUsdt6: candidateValueUsdt6,
            appliedValueUsdt6: appliedValueUsdt6,
            capped: capped,
            proofHash: proofHash
        });

        position.currentValueUsdt6 = appliedValueUsdt6;
        position.lastNavMarkUsdt6 = appliedValueUsdt6;
        position.lastValuationAt = block.timestamp;

        emit ValuationObservationSubmitted(positionId, uint8(sourceType), candidateValueUsdt6, sourceRef);
    }

    function getChainSafe(uint32 chainEid) external view returns (Gm10Types.ChainSafeConfig memory) {
        return chainSafes[chainEid];
    }

    function isMarketplaceApproved(bytes32 marketplaceId) external view returns (bool) {
        return approvedMarketplaceIds[marketplaceId];
    }

    function getPurchaseAuthorization(bytes32 purchaseKey)
        external
        view
        returns (Gm10Types.PurchaseAuthorization memory)
    {
        return purchaseAuthorizations[purchaseKey];
    }

    function getSaleAuthorization(bytes32 saleKey)
        external
        view
        returns (Gm10Types.SaleAuthorization memory)
    {
        return saleAuthorizations[saleKey];
    }

    function getCollectiblePosition(uint256 positionId)
        external
        view
        returns (Gm10Types.CollectiblePosition memory)
    {
        return collectiblePositions[positionId];
    }

    function getLatestValuationObservation(uint256 positionId)
        external
        view
        returns (Gm10Types.ValuationObservation memory)
    {
        return latestValuationObservation[positionId];
    }
}

interface IGm10FundAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}
