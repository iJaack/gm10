// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Gm10Types } from "../Gm10Types.sol";

interface IGm10ContinuousSaleRouter {
    function previewSaleProfitRoute(uint256 realizedProfitUsdt6, Gm10Types.MarketSnapshot calldata snapshot)
        external
        view
        returns (Gm10Types.SaleProfitRoute memory route);

    function finalizeSaleWithMarketSnapshot(bytes32 saleKey, Gm10Types.MarketSnapshot calldata snapshot) external;
}
