// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Gm10Types {
    enum PurchaseStatus {
        None,
        Approved,
        FundsReleased,
        Executed,
        PositionRecorded,
        Cancelled
    }

    enum SaleStatus {
        None,
        Approved,
        Executed,
        ProceedsReceived,
        Finalized,
        Cancelled
    }

    enum PositionStatus {
        None,
        Active,
        ListedForSale,
        Sold,
        WrittenOff
    }

    enum CustodyMode {
        NativeChain,
        MirroredAvalanche
    }

    enum ValuationSourceType {
        Unknown,
        ExactTrade,
        ComparableSales,
        ListingBand
    }

    struct ChainSafeConfig {
        bool enabled;
        uint32 chainEid;
        address evmSafe;
        bytes32 nonEvmSafe;
        bytes32 label;
    }

    struct PurchaseAuthorization {
        bytes32 purchaseKey;
        PurchaseStatus status;
        uint32 chainEid;
        bytes32 marketplaceId;
        bytes32 assetRef;
        uint256 maxSpendUsdt6;
        uint256 releasedUsdt6;
        address destinationSafe;
        bytes32 destinationSafeAlt;
        uint256 approvedAt;
        bytes32 mandateHash;
        bytes32 executionRef;
        bytes32 settlementRef;
        bytes32 proofHash;
    }

    struct SaleAuthorization {
        bytes32 saleKey;
        SaleStatus status;
        uint256 positionId;
        uint32 chainEid;
        bytes32 marketplaceId;
        uint256 minNetProceedsUsdt6;
        uint256 grossProceedsUsdt6;
        uint256 marketplaceFeesUsdt6;
        uint256 bridgeFeesUsdt6;
        uint256 netProceedsUsdt6;
        uint256 approvedAt;
        bytes32 mandateHash;
        bytes32 executionRef;
        bytes32 proceedsRef;
        bytes32 proofHash;
    }

    struct CollectiblePosition {
        uint256 id;
        bytes32 originPurchaseKey;
        uint32 chainEid;
        bytes32 marketplaceId;
        CustodyMode custodyMode;
        bytes32 tokenStandard;
        address evmCollection;
        bytes32 nonEvmCollection;
        uint256 tokenId;
        bytes32 nonEvmTokenId;
        bytes32 externalAssetId;
        bytes32 categoryId;
        bytes32 marketplaceProvenanceRef;
        uint256 acquisitionPriceUsdt6;
        uint256 currentValueUsdt6;
        uint256 lastNavMarkUsdt6;
        uint256 acquisitionDate;
        uint256 lastValuationAt;
        PositionStatus status;
        bytes32 metadataHash;
        bytes32 proofHash;
    }

    struct PositionInput {
        CustodyMode custodyMode;
        bytes32 tokenStandard;
        address evmCollection;
        bytes32 nonEvmCollection;
        uint256 tokenId;
        bytes32 nonEvmTokenId;
        bytes32 externalAssetId;
        bytes32 categoryId;
        bytes32 marketplaceProvenanceRef;
        uint256 acquisitionPriceUsdt6;
        bytes32 metadataHash;
        bytes32 proofHash;
    }

    struct ValuationObservation {
        uint256 positionId;
        ValuationSourceType sourceType;
        uint256 observedAt;
        bytes32 sourceRef;
        uint256 candidateValueUsdt6;
        uint256 appliedValueUsdt6;
        bool capped;
        bytes32 proofHash;
    }

    struct InvestorAccounting {
        uint256 totalContributedAvax18;
        uint256 totalCostBasisUsdt6;
        uint256 remainingCostBasisUsdt6;
        uint256 directMintedTokens18;
        uint256 attributableTokens18;
        uint256 redeemedTokens18;
        uint256 redemptionProceedsUsdt6;
        int256 realizedPnlUsdt6;
        uint256 transferredInTokens18;
        uint256 transferredOutTokens18;
    }

    struct InvestorPnlView {
        uint256 totalContributedAvax18;
        uint256 totalCostBasisUsdt6;
        uint256 remainingCostBasisUsdt6;
        uint256 directMintedTokens18;
        uint256 attributableTokens18;
        uint256 transferredInTokens18;
        uint256 transferredOutTokens18;
        uint256 currentAttributableValueUsdt6;
        int256 realizedPnlUsdt6;
        int256 unrealizedPnlUsdt6;
    }
}
