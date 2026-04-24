// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./GemMintStrategyFundV5.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract GemMintStrategyFundV6 is GemMintStrategyFundV5 {
    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV6(
        address _canonicalUsdt,
        address _avaxUsdFeed,
        address _investorAccounting
    ) external reinitializer(6) {
        assembly {
            sstore(75, _canonicalUsdt)
            sstore(76, _avaxUsdFeed)
            sstore(78, _investorAccounting)
        }
    }
}
