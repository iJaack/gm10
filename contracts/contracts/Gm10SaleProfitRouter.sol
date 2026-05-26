// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Gm10Types.sol";
import "./interfaces/IGm10ContinuousSaleRouter.sol";

contract Gm10SaleProfitRouter is IGm10ContinuousSaleRouter {
    error InvalidParameters();
    error StalePriceFeed();

    function previewSaleProfitRoute(uint256, Gm10Types.MarketSnapshot calldata snapshot)
        external
        view
        returns (Gm10Types.SaleProfitRoute memory route)
    {
        if (snapshot.proofHash == bytes32(0) || snapshot.observedAt == 0 || snapshot.observedAt > block.timestamp) {
            revert InvalidParameters();
        }
        if (block.timestamp - snapshot.observedAt > 30 minutes) revert StalePriceFeed();

        if (snapshot.spotPremiumBps >= 300) {
            route = Gm10Types.SaleProfitRoute(8_500, 1_500, 0);
        } else if (snapshot.spotPremiumBps > -500) {
            route = Gm10Types.SaleProfitRoute(7_500, 2_500, 0);
        } else if (snapshot.spotPremiumBps > -1_500) {
            route = Gm10Types.SaleProfitRoute(6_500, 2_500, 1_000);
        } else if (snapshot.spotPremiumBps > -3_000) {
            route = Gm10Types.SaleProfitRoute(5_500, 2_500, 2_000);
        } else {
            route = Gm10Types.SaleProfitRoute(4_500, 2_500, 3_000);
        }

        if (snapshot.slippageDepthScoreBps < 5_000 || snapshot.lpCoverageBps < 1_000) {
            uint256 shift = route.reinvestBps >= 1_000 ? 1_000 : route.reinvestBps;
            route.reinvestBps -= shift;
            route.lpSupportBps += shift;
        }

        if (snapshot.liquidTreasuryRatioBps < 1_000) {
            uint256 burnShift = route.buybackBurnBps >= 1_000 ? 1_000 : route.buybackBurnBps;
            route.buybackBurnBps -= burnShift;
            route.reinvestBps += burnShift;
            if (burnShift < 1_000) {
                uint256 lpShift = route.lpSupportBps >= 1_000 - burnShift ? 1_000 - burnShift : route.lpSupportBps;
                route.lpSupportBps -= lpShift;
                route.reinvestBps += lpShift;
            }
        }

        if (
            route.reinvestBps < 4_000 ||
            route.reinvestBps > 9_000 ||
            route.lpSupportBps < 1_000 ||
            route.lpSupportBps > 4_000 ||
            route.buybackBurnBps > 3_000 ||
            route.reinvestBps + route.lpSupportBps + route.buybackBurnBps != 10_000
        ) revert InvalidParameters();
    }

    function finalizeSaleWithMarketSnapshot(bytes32, Gm10Types.MarketSnapshot calldata) external pure {
        revert InvalidParameters();
    }
}
