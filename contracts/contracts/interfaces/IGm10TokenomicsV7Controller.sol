// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGm10TokenomicsV7Controller {
    function initializeSegments(
        address coreTeam,
        address governanceTreasury,
        address communityEcosystem,
        address advisors,
        address strategicPartnerships
    ) external;

    function setSegmentRecipient(uint8 segment, address recipient) external;
    function segmentRecipient(uint8 segment) external view returns (address);
    function setProfitShareExclusion(address account, bool excluded) external;
    function excludedFromProfitShare(address account) external view returns (bool);
    function profitEligibleSupply18() external view returns (uint256);
}
