// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Gm10LegacyStorageRepairUpgrade {
    bytes32 private constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    uint256 private constant CURRENT_FUNDRAISING_ROUNDS_SLOT = 12;
    uint256 private constant CURRENT_CURRENT_ROUND_ID_SLOT = 13;
    uint256 private constant CURRENT_PORTFOLIO_REGISTRY_SLOT = 77;
    uint256 private constant CURRENT_CANONICAL_PORTFOLIO_VALUE_SLOT = 79;
    uint256 private constant CURRENT_NAV_PER_TOKEN_USDT6_SLOT = 80;
    uint256 private constant CURRENT_LAST_STABLE_NAV_UPDATE_SLOT = 81;
    uint256 private constant CURRENT_LIQUID_TREASURY_SLOT = 82;
    uint256 private constant CURRENT_OUTSTANDING_PURCHASE_RELEASES_SLOT = 83;
    uint256 private constant CURRENT_LIQUIDITY_CATCH_BUY_ACCRUED_SLOT = 84;
    uint256 private constant CURRENT_LIQUIDITY_AVAX_PAIRING_ACCRUED_SLOT = 85;
    uint256 private constant CURRENT_HOLDER_DISTRIBUTION_ACCRUED_SLOT = 86;
    uint256 private constant CURRENT_WEEKLY_NAV_CAP_SLOT = 87;
    uint256 private constant LEGACY_CANONICAL_PORTFOLIO_VALUE_SLOT = 8;
    uint256 private constant LEGACY_NAV_PER_TOKEN_USDT6_SLOT = 9;
    uint256 private constant LEGACY_LAST_STABLE_NAV_UPDATE_SLOT = 10;
    uint256 private constant LEGACY_LIQUID_TREASURY_SLOT = 11;
    uint256 private constant LEGACY_OUTSTANDING_PURCHASE_RELEASES_SLOT = 12;
    uint256 private constant LEGACY_LIQUIDITY_CATCH_BUY_ACCRUED_SLOT = 13;
    uint256 private constant LEGACY_LIQUIDITY_AVAX_PAIRING_ACCRUED_SLOT = 14;
    uint256 private constant LEGACY_HOLDER_DISTRIBUTION_ACCRUED_SLOT = 15;
    uint256 private constant LEGACY_WEEKLY_NAV_CAP_SLOT = 16;
    uint256 private constant LEGACY_CURRENT_ROUND_ID_SLOT = 21;
    uint256 private constant LEGACY_FUNDRAISING_ROUNDS_SLOT = 23;

    error InvalidParameters();
    error ZeroAddress();

    event Upgraded(address indexed implementation);
    event LegacyStorageRepaired(uint256 currentRoundId, address portfolioRegistry);

    function proxiableUUID() external pure returns (bytes32) {
        return ERC1967_IMPLEMENTATION_SLOT;
    }

    function repairLegacyStorageAndReturn(address _finalImplementation, address _portfolioRegistry) external {
        if (_finalImplementation == address(0) || _portfolioRegistry == address(0)) revert ZeroAddress();
        if (_finalImplementation.code.length == 0) revert InvalidParameters();

        uint256 legacyCurrentRoundId;
        assembly {
            legacyCurrentRoundId := sload(LEGACY_CURRENT_ROUND_ID_SLOT)
        }
        if (legacyCurrentRoundId == 0) revert InvalidParameters();

        _copyStableAccounting();
        assembly {
            sstore(CURRENT_CURRENT_ROUND_ID_SLOT, legacyCurrentRoundId)
            sstore(CURRENT_PORTFOLIO_REGISTRY_SLOT, _portfolioRegistry)
        }

        for (uint256 roundId = 1; roundId <= legacyCurrentRoundId; roundId++) {
            _copyRound(roundId);
        }

        assembly {
            sstore(ERC1967_IMPLEMENTATION_SLOT, _finalImplementation)
        }
        emit LegacyStorageRepaired(legacyCurrentRoundId, _portfolioRegistry);
        emit Upgraded(_finalImplementation);
    }

    function _copyStableAccounting() private {
        assembly {
            sstore(CURRENT_CANONICAL_PORTFOLIO_VALUE_SLOT, sload(LEGACY_CANONICAL_PORTFOLIO_VALUE_SLOT))
            sstore(CURRENT_NAV_PER_TOKEN_USDT6_SLOT, sload(LEGACY_NAV_PER_TOKEN_USDT6_SLOT))
            sstore(CURRENT_LAST_STABLE_NAV_UPDATE_SLOT, sload(LEGACY_LAST_STABLE_NAV_UPDATE_SLOT))
            sstore(CURRENT_LIQUID_TREASURY_SLOT, sload(LEGACY_LIQUID_TREASURY_SLOT))
            sstore(CURRENT_OUTSTANDING_PURCHASE_RELEASES_SLOT, sload(LEGACY_OUTSTANDING_PURCHASE_RELEASES_SLOT))
            sstore(CURRENT_LIQUIDITY_CATCH_BUY_ACCRUED_SLOT, sload(LEGACY_LIQUIDITY_CATCH_BUY_ACCRUED_SLOT))
            sstore(CURRENT_LIQUIDITY_AVAX_PAIRING_ACCRUED_SLOT, sload(LEGACY_LIQUIDITY_AVAX_PAIRING_ACCRUED_SLOT))
            sstore(CURRENT_HOLDER_DISTRIBUTION_ACCRUED_SLOT, sload(LEGACY_HOLDER_DISTRIBUTION_ACCRUED_SLOT))
            sstore(CURRENT_WEEKLY_NAV_CAP_SLOT, sload(LEGACY_WEEKLY_NAV_CAP_SLOT))
        }
    }

    function _copyRound(uint256 _roundId) private {
        uint256 legacyBase = uint256(keccak256(abi.encode(_roundId, LEGACY_FUNDRAISING_ROUNDS_SLOT)));
        uint256 currentBase = uint256(keccak256(abi.encode(_roundId, CURRENT_FUNDRAISING_ROUNDS_SLOT)));
        assembly {
            if sload(legacyBase) {
                sstore(currentBase, sload(legacyBase))
                sstore(add(currentBase, 1), sload(add(legacyBase, 1)))
                sstore(add(currentBase, 2), sload(add(legacyBase, 2)))
                sstore(add(currentBase, 3), sload(add(legacyBase, 3)))
                sstore(add(currentBase, 4), sload(add(legacyBase, 4)))
                sstore(add(currentBase, 5), sload(add(legacyBase, 5)))
                sstore(add(currentBase, 6), sload(add(legacyBase, 6)))
                sstore(add(currentBase, 7), sload(add(legacyBase, 7)))
                sstore(add(currentBase, 8), sload(add(legacyBase, 8)))
                sstore(add(currentBase, 9), sload(add(legacyBase, 9)))
            }
        }
    }
}
