// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Gm10LiquidTreasuryReconciliationUpgrade {
    bytes32 private constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    bytes32 private constant ACCESS_CONTROL_STORAGE_LOCATION =
        0x02dd7bc7dec4dceedda775e58dd541e08a116c6c53815c0bd028192f7b626800;
    bytes32 private constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    uint256 private constant CANONICAL_PORTFOLIO_VALUE_SLOT = 79;
    uint256 private constant NAV_PER_TOKEN_USDT6_SLOT = 80;
    uint256 private constant LAST_STABLE_NAV_UPDATE_SLOT = 81;
    uint256 private constant LIQUID_TREASURY_SLOT = 82;
    uint256 private constant OUTSTANDING_PURCHASE_RELEASES_SLOT = 83;
    uint256 private constant LIQUIDITY_CATCH_BUY_ACCRUED_SLOT = 84;
    uint256 private constant LIQUIDITY_AVAX_PAIRING_ACCRUED_SLOT = 85;
    uint256 private constant HOLDER_DISTRIBUTION_ACCRUED_SLOT = 86;
    uint256 private constant ERC20_TOTAL_SUPPLY_SLOT =
        0x52c63247e1f47db19d5ce0460030c497f067ca4cebf71ba98eeadabe20bace02;

    error InvalidParameters();
    error Unauthorized();
    error ZeroAddress();

    event Upgraded(address indexed implementation);
    event LiquidTreasuryAccountingReconciled(
        uint256 previousLiquidTreasuryUsdt6,
        uint256 newLiquidTreasuryUsdt6,
        bytes32 indexed reconciliationRef,
        bytes32 proofHash
    );

    function proxiableUUID() external pure returns (bytes32) {
        return ERC1967_IMPLEMENTATION_SLOT;
    }

    function reconcileLiquidTreasuryAndReturn(
        address _finalImplementation,
        uint256 _targetLiquidTreasuryUsdt6,
        bytes32 _reconciliationRef,
        bytes32 _proofHash
    ) external {
        if (!_hasGovernanceRole(msg.sender)) revert Unauthorized();
        if (_finalImplementation == address(0)) revert ZeroAddress();
        if (_finalImplementation.code.length == 0) revert InvalidParameters();
        if (_reconciliationRef == bytes32(0) || _proofHash == bytes32(0)) revert InvalidParameters();

        uint256 holderDistributionAccruedUsdt6;
        assembly {
            holderDistributionAccruedUsdt6 := sload(HOLDER_DISTRIBUTION_ACCRUED_SLOT)
        }
        if (_targetLiquidTreasuryUsdt6 < holderDistributionAccruedUsdt6) revert InvalidParameters();

        uint256 previousLiquidTreasuryUsdt6;
        uint256 canonicalPortfolioValueUsdt6;
        uint256 outstandingPurchaseReleasesUsdt6;
        uint256 liquidityCatchBuyAccruedUsdt6;
        uint256 liquidityAvaxPairingAccruedUsdt6;
        uint256 supply;
        assembly {
            previousLiquidTreasuryUsdt6 := sload(LIQUID_TREASURY_SLOT)
            canonicalPortfolioValueUsdt6 := sload(CANONICAL_PORTFOLIO_VALUE_SLOT)
            outstandingPurchaseReleasesUsdt6 := sload(OUTSTANDING_PURCHASE_RELEASES_SLOT)
            liquidityCatchBuyAccruedUsdt6 := sload(LIQUIDITY_CATCH_BUY_ACCRUED_SLOT)
            liquidityAvaxPairingAccruedUsdt6 := sload(LIQUIDITY_AVAX_PAIRING_ACCRUED_SLOT)
            supply := sload(ERC20_TOTAL_SUPPLY_SLOT)
        }

        uint256 totalStableAssetsUsdt6 =
            _targetLiquidTreasuryUsdt6 +
            outstandingPurchaseReleasesUsdt6 +
            canonicalPortfolioValueUsdt6 +
            liquidityCatchBuyAccruedUsdt6 +
            liquidityAvaxPairingAccruedUsdt6 +
            holderDistributionAccruedUsdt6;
        uint256 navPerTokenUsdt6 = supply == 0 ? 0 : (totalStableAssetsUsdt6 * 1e18) / supply;

        assembly {
            sstore(LIQUID_TREASURY_SLOT, _targetLiquidTreasuryUsdt6)
            sstore(NAV_PER_TOKEN_USDT6_SLOT, navPerTokenUsdt6)
            sstore(LAST_STABLE_NAV_UPDATE_SLOT, timestamp())
            sstore(ERC1967_IMPLEMENTATION_SLOT, _finalImplementation)
        }

        emit LiquidTreasuryAccountingReconciled(
            previousLiquidTreasuryUsdt6,
            _targetLiquidTreasuryUsdt6,
            _reconciliationRef,
            _proofHash
        );
        emit Upgraded(_finalImplementation);
    }

    function _hasGovernanceRole(address _account) private view returns (bool granted) {
        bytes32 role = GOVERNANCE_ROLE;
        bytes32 accessControlStorageLocation = ACCESS_CONTROL_STORAGE_LOCATION;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, role)
            mstore(add(ptr, 0x20), accessControlStorageLocation)
            let roleSlot := keccak256(ptr, 0x40)
            mstore(ptr, _account)
            mstore(add(ptr, 0x20), roleSlot)
            granted := sload(keccak256(ptr, 0x40))
        }
    }
}
