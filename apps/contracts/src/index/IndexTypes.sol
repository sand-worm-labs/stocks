// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IndexWeighting} from "../blocks/types/Enums.sol";
import {IReadings} from "../blocks/interfaces/IReadings.sol";

/// @notice What an index is made with. Everything here is fixed for the life of the index, except who curates it and who runs it.
struct IndexSettings {
    string name;
    string symbol;
    address curator;
    // Who runs the rounds. Zero means the curator.
    address keeper;
    IndexWeighting weighting;
    // Zero holds every stock the index lists. Otherwise, of the stocks it lists, it holds only the `topN` with the highest
    // scores (the largest by market cap, the deepest pools, the steadiest), and is rebuilt that way every round. Not for `Equal` or `Custom`, which
    // have no score to rank by.
    uint16 topN;
    // Where an index weighted by market cap or by volatility reads them; not used by the other two
    IReadings readings;
    // How much of the index stays USDC, in basis points
    uint16 cashBps;
    uint16 maxSlippageBps;
    // A stock whose pool holds less than this is not given a share, and not bought
    uint256 minPoolDepth;
    // How far a stock may be from its target, as a share of the target, before a round trades it (500 is 5%)
    uint16 driftBps;
    uint256 roundInterval;
}
