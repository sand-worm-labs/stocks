// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Allocation} from "../types/Allocation.sol";

/// @notice When to act on what a strategy wants: a look is due and some stock has drifted from its target. A vault asks before it trades.
interface IRebalancePolicy {
    function shouldRebalance(Allocation[] memory current, Allocation[] memory target, uint256 lastRebalancedAt)
        external
        view
        returns (bool);
}
