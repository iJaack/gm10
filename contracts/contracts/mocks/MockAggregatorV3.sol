// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockAggregatorV3 {
    uint8 public immutable decimals;
    int256 private answer;

    constructor(uint8 _decimals, int256 _answer) {
        decimals = _decimals;
        answer = _answer;
    }

    function setAnswer(int256 _answer) external {
        answer = _answer;
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
        return (1, answer, block.timestamp, block.timestamp, 1);
    }
}
