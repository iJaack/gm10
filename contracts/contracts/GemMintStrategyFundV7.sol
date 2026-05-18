// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./GemMintStrategyFundV5.sol";
import "./interfaces/IGm10InvestorAccounting.sol";
import "./interfaces/IChainlinkPriceFeed.sol";
import "./interfaces/IGm10TokenomicsV7Controller.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract GemMintStrategyFundV7 is GemMintStrategyFundV5 {
    uint8 private constant SEGMENT_COUNT = 5;
    uint16 private constant DEFAULT_SEGMENT_ALLOCATION_BPS = 100;
    uint16 private constant BPS_DENOMINATOR = 10_000;

    address private immutable tokenomicsController;

    /// @custom:oz-upgrades-unsafe-allow constructor state-variable-immutable
    constructor(address _tokenomicsController) {
        tokenomicsController = _tokenomicsController;
    }

    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV7() external reinitializer(7) {}

    function _redeem(address _account, uint256 _tokenAmount) internal override {
        (uint256 attributableRedeemed,) =
            IGm10InvestorAccounting(investorAccounting).previewRedemption(_account, _tokenAmount);
        if (attributableRedeemed != _tokenAmount) revert InvalidParameters();

        super._redeem(_account, _tokenAmount);
    }

    function _finalizeRound(uint256 _roundId) internal override {
        FundraisingRound storage round = fundraisingRounds[_roundId];
        uint256 tokensIssued;
        unchecked {
            tokensIssued = (round.raisedAmount * 1e18) / round.tokenPrice;
        }

        super._finalizeRound(_roundId);

        uint256 allocation;
        unchecked {
            allocation = (tokensIssued * DEFAULT_SEGMENT_ALLOCATION_BPS) / BPS_DENOMINATOR;
        }
        for (uint8 segment = 0; segment < SEGMENT_COUNT; ++segment) {
            _mint(IGm10TokenomicsV7Controller(tokenomicsController).segmentRecipient(segment), allocation);
        }

        _updateNAV();
        _syncStableNav();
    }

    function _quoteAvaxToUsdt(uint256 _avaxAmountWei) internal view override returns (uint256) {
        if (avaxUsdFeed == address(0)) revert InvalidPriceFeed();
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
            IChainlinkPriceFeed(avaxUsdFeed).latestRoundData();
        if (answer <= 0 || updatedAt == 0 || answeredInRound < roundId) revert InvalidPriceFeed();
        if (block.timestamp - updatedAt > maxPriceFeedStaleness) revert StalePriceFeed();

        return (_avaxAmountWei * uint256(answer)) / 1e20;
    }

    uint256[50] private __gapV7;
}
