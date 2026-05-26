// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Gm10Types {
    enum PurchaseStatus {
        None,
        Approved,
        FundsReleased,
        FundingConfirmed,
        Executed,
        PositionRecorded,
        Cancelled
    }

    enum SaleStatus {
        None,
        Approved,
        Executed,
        ExternalProceedsPending,
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
        address fundingToken;
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
        uint32 sourceChainEid;
        address sourceToken;
        uint256 sourceTokenAmount;
        uint8 sourceTokenDecimals;
        address proceedsToken;
        uint256 proceedsAmount;
        uint256 approvedAt;
        bytes32 mandateHash;
        bytes32 executionRef;
        bytes32 proceedsRef;
        bytes32 sourceProceedsRef;
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

    struct ContinuousCommit {
        bytes32 commitId;
        bytes32 providerRouteId;
        uint256 sourceChainId;
        address sourceToken;
        address settlementToken;
        address buyer;
        uint256 minSettlementAmount;
        uint256 settledAmount;
        uint256 mintedBuyerCatch18;
        uint256 mintedSegmentCatch18;
        uint64 quoteExpiresAt;
        bool consumed;
        bool deliveryRequested;
        bool deliveryCompleted;
    }

    struct MarketSnapshot {
        int256 spotPremiumBps;
        uint256 lpCoverageBps;
        uint256 protocolLpCoverageBps;
        uint256 slippageDepthScoreBps;
        uint256 liquidTreasuryRatioBps;
        uint256 saleRoiBps;
        bytes32 proofHash;
        uint64 observedAt;
    }

    struct SaleProfitRoute {
        uint256 reinvestBps;
        uint256 lpSupportBps;
        uint256 buybackBurnBps;
    }

    struct BuybackBurnExecution {
        address venue;
        address tokenIn;
        uint256 amountIn;
        uint256 minCatchOut;
        uint256 deadline;
        bytes32 proofHash;
    }

    struct LpSupportExecution {
        address venue;
        uint256 catchAmount;
        uint256 pairedAvaxAmount;
        uint8 custodyMode;
        uint256 deadline;
        bytes32 proofHash;
    }
}
