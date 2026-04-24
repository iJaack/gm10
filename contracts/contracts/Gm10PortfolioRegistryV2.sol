// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./Gm10Types.sol";

contract Gm10PortfolioRegistryV2 {
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
    event PurchaseAuthorized(bytes32 indexed purchaseKey, uint32 indexed chainEid, bytes32 indexed marketplaceId, address fundingToken, uint256 maxSpendUsdt6);
    event PurchaseFundingConfirmed(bytes32 indexed purchaseKey, address indexed fundingToken, uint256 amountUsdt6, uint32 destinationChainEid, address destinationSafe);
    event PurchaseExecutionRecorded(bytes32 indexed purchaseKey, bytes32 executionRef, bytes32 settlementRef);
    event CollectiblePositionRecorded(uint256 indexed positionId, bytes32 indexed purchaseKey, uint256 acquisitionPriceUsdt6);
    event SaleAuthorized(bytes32 indexed saleKey, uint256 indexed positionId, uint256 minNetProceedsUsdt6);
    event SaleExecutionRecorded(bytes32 indexed saleKey, uint256 grossProceedsUsdt6, uint256 netProceedsUsdt6);
    event ExternalSaleProceedsRecorded(bytes32 indexed saleKey, uint32 sourceChainEid, address sourceToken, uint256 sourceTokenAmount);
    event SaleProceedsConfirmed(bytes32 indexed saleKey, address indexed proceedsToken, uint256 proceedsAmount, uint256 netProceedsUsdt6);
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
        if (!IGm10FundAccessV2(fund).hasRole(role, msg.sender)) revert MissingRole();
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
        authorizePurchaseV2(purchaseKey, chainEid, marketplaceId, assetRef, address(0), maxSpendUsdt6, mandateHash);
    }

    function authorizePurchaseV2(
        bytes32 purchaseKey,
        uint32 chainEid,
        bytes32 marketplaceId,
        bytes32 assetRef,
        address fundingToken,
        uint256 maxSpendUsdt6,
        bytes32 mandateHash
    ) public onlyFundRole(GOVERNANCE_ROLE) {
        if (purchaseAuthorizations[purchaseKey].status != Gm10Types.PurchaseStatus.None) revert WorkflowAlreadyExists();
        Gm10Types.ChainSafeConfig storage safeConfig = chainSafes[chainEid];
        if (!safeConfig.enabled) revert UnsupportedChain();
        if (!approvedMarketplaceIds[marketplaceId]) revert UnsupportedMarketplace();
        if (maxSpendUsdt6 == 0 || mandateHash == bytes32(0)) revert InvalidParameters();

        purchaseAuthorizations[purchaseKey] = Gm10Types.PurchaseAuthorization({
            purchaseKey: purchaseKey,
            status: Gm10Types.PurchaseStatus.Approved,
            chainEid: chainEid,
            marketplaceId: marketplaceId,
            assetRef: assetRef,
            fundingToken: fundingToken,
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

        emit PurchaseAuthorized(purchaseKey, chainEid, marketplaceId, fundingToken, maxSpendUsdt6);
    }

    function cancelPurchaseAuthorization(bytes32 purchaseKey) external onlyFundRole(GOVERNANCE_ROLE) {
        Gm10Types.PurchaseAuthorization storage authorization = purchaseAuthorizations[purchaseKey];
        if (authorization.status != Gm10Types.PurchaseStatus.Approved) revert InvalidWorkflowState();
        authorization.status = Gm10Types.PurchaseStatus.Cancelled;
    }

    function releasePurchaseFunds(bytes32, uint256) external pure {
        revert InvalidWorkflowState();
    }

    function confirmPurchaseFunding(
        bytes32 purchaseKey,
        address fundingToken,
        uint256 amountUsdt6,
        uint32 destinationChainEid,
        address destinationSafe,
        bytes32 settlementRef,
        bytes32 proofHash
    ) external onlyFund {
        Gm10Types.PurchaseAuthorization storage authorization = purchaseAuthorizations[purchaseKey];
        if (authorization.status != Gm10Types.PurchaseStatus.Approved) revert InvalidWorkflowState();
        if (amountUsdt6 == 0 || amountUsdt6 > authorization.maxSpendUsdt6) revert PurchaseBudgetExceeded();
        if (
            authorization.fundingToken != fundingToken ||
            authorization.chainEid != destinationChainEid ||
            authorization.destinationSafe != destinationSafe ||
            settlementRef == bytes32(0) ||
            proofHash == bytes32(0)
        ) revert InvalidParameters();

        authorization.status = Gm10Types.PurchaseStatus.FundingConfirmed;
        authorization.releasedUsdt6 = amountUsdt6;
        authorization.settlementRef = settlementRef;
        authorization.proofHash = proofHash;

        emit PurchaseFundingConfirmed(purchaseKey, fundingToken, amountUsdt6, destinationChainEid, destinationSafe);
    }

    function recordPurchaseExecution(
        bytes32 purchaseKey,
        bytes32 executionRef,
        bytes32 settlementRef,
        bytes32 proofHash
    ) external onlyFundRole(MANAGER_ROLE) {
        Gm10Types.PurchaseAuthorization storage authorization = purchaseAuthorizations[purchaseKey];
        if (authorization.status != Gm10Types.PurchaseStatus.FundingConfirmed) revert InvalidWorkflowState();
        if (executionRef == bytes32(0) || settlementRef == bytes32(0) || proofHash == bytes32(0)) revert InvalidParameters();
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
        if (mandateHash == bytes32(0)) revert InvalidParameters();

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
            sourceChainEid: 0,
            sourceToken: address(0),
            sourceTokenAmount: 0,
            sourceTokenDecimals: 0,
            proceedsToken: address(0),
            proceedsAmount: 0,
            approvedAt: block.timestamp,
            mandateHash: mandateHash,
            executionRef: bytes32(0),
            proceedsRef: bytes32(0),
            sourceProceedsRef: bytes32(0),
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
        if (executionRef == bytes32(0) || proofHash == bytes32(0)) revert InvalidParameters();

        uint256 netProceedsUsdt6 = grossProceedsUsdt6 - marketplaceFeesUsdt6 - bridgeFeesUsdt6;
        if (netProceedsUsdt6 < sale.minNetProceedsUsdt6) revert SaleBelowMinimum();

        sale.status = Gm10Types.SaleStatus.Executed;
        sale.grossProceedsUsdt6 = grossProceedsUsdt6;
        sale.marketplaceFeesUsdt6 = marketplaceFeesUsdt6;
        sale.bridgeFeesUsdt6 = bridgeFeesUsdt6;
        sale.netProceedsUsdt6 = 0;
        sale.executionRef = executionRef;
        sale.proceedsRef = proceedsRef;
        sale.proofHash = proofHash;

        emit SaleExecutionRecorded(saleKey, grossProceedsUsdt6, netProceedsUsdt6);
    }

    function recordExternalSaleProceeds(
        bytes32 saleKey,
        uint32 sourceChainEid,
        address sourceToken,
        uint256 sourceTokenAmount,
        uint8 sourceTokenDecimals,
        bytes32 sourceProceedsRef,
        bytes32 proofHash
    ) external onlyFundRole(MANAGER_ROLE) {
        Gm10Types.SaleAuthorization storage sale = saleAuthorizations[saleKey];
        if (sale.status != Gm10Types.SaleStatus.Executed) revert InvalidWorkflowState();
        if (sourceChainEid == 0 || sourceTokenAmount == 0 || sourceProceedsRef == bytes32(0) || proofHash == bytes32(0)) {
            revert InvalidParameters();
        }

        sale.status = Gm10Types.SaleStatus.ExternalProceedsPending;
        sale.sourceChainEid = sourceChainEid;
        sale.sourceToken = sourceToken;
        sale.sourceTokenAmount = sourceTokenAmount;
        sale.sourceTokenDecimals = sourceTokenDecimals;
        sale.sourceProceedsRef = sourceProceedsRef;
        sale.proofHash = proofHash;

        emit ExternalSaleProceedsRecorded(saleKey, sourceChainEid, sourceToken, sourceTokenAmount);
    }

    function confirmSaleProceedsReceived(bytes32, uint256) external pure {
        revert InvalidWorkflowState();
    }

    function confirmSaleProceedsReceivedV2(
        bytes32 saleKey,
        address proceedsToken,
        uint256 proceedsAmount,
        uint256 netProceedsUsdt6,
        bytes32 proceedsRef,
        bytes32 proofHash
    ) external onlyFund {
        Gm10Types.SaleAuthorization storage sale = saleAuthorizations[saleKey];
        if (
            sale.status != Gm10Types.SaleStatus.Executed &&
            sale.status != Gm10Types.SaleStatus.ExternalProceedsPending
        ) revert InvalidWorkflowState();
        if (
            proceedsAmount == 0 ||
            netProceedsUsdt6 < sale.minNetProceedsUsdt6 ||
            proceedsRef == bytes32(0) ||
            proofHash == bytes32(0)
        ) revert InvalidParameters();

        sale.status = Gm10Types.SaleStatus.ProceedsReceived;
        sale.proceedsToken = proceedsToken;
        sale.proceedsAmount = proceedsAmount;
        sale.netProceedsUsdt6 = netProceedsUsdt6;
        sale.proceedsRef = proceedsRef;
        sale.proofHash = proofHash;

        emit SaleProceedsConfirmed(saleKey, proceedsToken, proceedsAmount, netProceedsUsdt6);
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

        appliedValueUsdt6 = candidateValueUsdt6;
        oldValueUsdt6 = position.currentValueUsdt6;
        bool capped;

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

        position.currentValueUsdt6 = appliedValueUsdt6;
        position.lastValuationAt = block.timestamp;
        position.lastNavMarkUsdt6 = appliedValueUsdt6;
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

interface IGm10FundAccessV2 {
    function hasRole(bytes32 role, address account) external view returns (bool);
}
