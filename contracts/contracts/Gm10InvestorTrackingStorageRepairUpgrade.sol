// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Gm10InvestorTrackingStorageRepairUpgrade {
    bytes32 private constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    uint256 private constant CURRENT_FUNDRAISING_ROUNDS_SLOT = 12;
    uint256 private constant CURRENT_CURRENT_ROUND_ID_SLOT = 13;
    uint256 private constant CURRENT_TOTAL_ROUNDS_COMPLETED_SLOT = 14;
    uint256 private constant CURRENT_INVESTOR_LIST_SLOT = 18;
    uint256 private constant CURRENT_TOTAL_INVESTORS_SLOT = 19;

    error InvalidParameters();
    error ZeroAddress();

    event Upgraded(address indexed implementation);
    event InvestorTrackingStorageRepaired(uint256 currentRoundId, uint256 totalRoundsCompleted);

    function proxiableUUID() external pure returns (bytes32) {
        return ERC1967_IMPLEMENTATION_SLOT;
    }

    function repairInvestorTrackingAndReturn(address _finalImplementation) external {
        if (_finalImplementation == address(0)) revert ZeroAddress();
        if (_finalImplementation.code.length == 0) revert InvalidParameters();

        uint256 currentRoundId;
        assembly {
            currentRoundId := sload(CURRENT_CURRENT_ROUND_ID_SLOT)
        }
        if (currentRoundId == 0) revert InvalidParameters();

        uint256 totalRoundsCompleted;
        for (uint256 roundId = 1; roundId <= currentRoundId; roundId++) {
            uint256 roundBase = uint256(keccak256(abi.encode(roundId, CURRENT_FUNDRAISING_ROUNDS_SLOT)));
            uint256 storedRoundId;
            uint256 packedFlags;
            assembly {
                storedRoundId := sload(roundBase)
                packedFlags := sload(add(roundBase, 8))
            }

            if (storedRoundId != 0 && ((packedFlags >> 8) & 0xff) != 0) {
                totalRoundsCompleted++;
            }
        }

        assembly {
            sstore(CURRENT_TOTAL_ROUNDS_COMPLETED_SLOT, totalRoundsCompleted)
            sstore(CURRENT_INVESTOR_LIST_SLOT, 0)
            sstore(CURRENT_TOTAL_INVESTORS_SLOT, 0)
            sstore(ERC1967_IMPLEMENTATION_SLOT, _finalImplementation)
        }

        emit InvestorTrackingStorageRepaired(currentRoundId, totalRoundsCompleted);
        emit Upgraded(_finalImplementation);
    }
}
