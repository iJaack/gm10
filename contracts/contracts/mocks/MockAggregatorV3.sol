// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockAggregatorV3 {
    uint8 public immutable decimals;
    int256 private answer;
    uint80 private latestRoundId = 1;
    uint80 private latestAnsweredInRound = 1;
    uint256 private latestUpdatedAt;

    constructor(uint8 _decimals, int256 _answer) {
        decimals = _decimals;
        answer = _answer;
        latestUpdatedAt = block.timestamp;
    }

    function setAnswer(int256 _answer) external {
        answer = _answer;
    }

    function setRoundData(uint80 _roundId, uint80 _answeredInRound, uint256 _updatedAt) external {
        latestRoundId = _roundId;
        latestAnsweredInRound = _answeredInRound;
        latestUpdatedAt = _updatedAt;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 currentAnswer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (latestRoundId, answer, latestUpdatedAt, latestUpdatedAt, latestAnsweredInRound);
    }
}
