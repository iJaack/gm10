// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Gm10PortfolioRegistryV2.sol";

interface IGm10LegacyPortfolioRegistryReader {
    function collectiblePositionCount() external view returns (uint256);

    function getCollectiblePosition(uint256 positionId)
        external
        view
        returns (Gm10Types.CollectiblePosition memory);
}

contract Gm10MigratedPortfolioRegistryV2 is Gm10PortfolioRegistryV2 {
    address public immutable legacyRegistry;

    event LegacyPositionImported(uint256 indexed positionId);

    constructor(address _fund, address _legacyRegistry, uint256 _positionCount)
        Gm10PortfolioRegistryV2(_fund)
    {
        if (_legacyRegistry == address(0)) revert InvalidParameters();
        legacyRegistry = _legacyRegistry;
        _importLegacyPositions(_legacyRegistry, _positionCount);
    }

    function _importLegacyPositions(address _legacyRegistry, uint256 _positionCount) private {
        IGm10LegacyPortfolioRegistryReader source = IGm10LegacyPortfolioRegistryReader(_legacyRegistry);
        if (_positionCount > source.collectiblePositionCount()) revert InvalidParameters();
        for (uint256 positionId = 1; positionId <= _positionCount; positionId++) {
            Gm10Types.CollectiblePosition memory position = source.getCollectiblePosition(positionId);
            if (position.id != positionId || position.status == Gm10Types.PositionStatus.None) {
                revert InvalidParameters();
            }
            collectiblePositions[positionId] = position;
            emit LegacyPositionImported(positionId);
        }
        collectiblePositionCount = _positionCount;
    }
}
