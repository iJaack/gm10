// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGm10ContinuousMintReceiver {
    function previewContinuousMint(uint256 settlementAmountUsdt6)
        external
        view
        returns (uint256 buyerCatch18, uint256 segmentCatchEach18, uint256 mintPriceUsdt6);

    function commitSettledRoute(
        bytes32 commitId,
        bytes32 providerRouteId,
        address buyer,
        address settlementToken,
        uint256 settledAmount
    ) external returns (uint256 buyerCatch18);

    function retryOftDelivery(bytes32 commitId) external payable;

    function claimAvalancheCatch(bytes32 commitId) external;
}
