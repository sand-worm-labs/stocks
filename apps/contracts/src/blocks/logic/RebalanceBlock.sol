// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {DriftOver100, NoChild} from "../BlockErrors.sol";
import {Allocation} from "../types/Allocation.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {IRebalancePolicy} from "../interfaces/IRebalancePolicy.sol";
import {IReadings} from "../interfaces/IReadings.sol";
import {Schedule} from "../types/Enums.sol";
import {Allocations} from "../Allocations.sol";
import {Bps} from "../../libraries/Bps.sol";

/// @notice Wraps a block with when to act on it. It holds what its child holds; what it adds is a policy: look at the portfolio this often, and
/// trade it back to target only when a stock has drifted more than `driftBps` from its share.
/// @dev Changing nothing about what is wanted, it lets a vault tell "this has changed" from "this has drifted a little": most days the answer is
/// to do nothing, and every trade costs a fee and some slippage.
contract RebalanceBlock is IBlock, IRebalancePolicy {
    IBlock public immutable child;
    uint16 public immutable driftBps;
    Schedule public immutable every;

    constructor(IBlock child_, uint16 driftBps_, Schedule every_) {
        if (address(child_) == address(0)) revert NoChild();
        if (driftBps_ > Bps.DENOMINATOR) revert DriftOver100();
        child = child_;
        driftBps = driftBps_;
        every = every_;
    }

    function evaluate(IReadings readings) external view returns (Allocation[] memory) {
        return child.evaluate(readings);
    }

    /// @notice How long to leave between looks
    function interval() public view returns (uint256) {
        if (every == Schedule.Daily) return 1 days;
        if (every == Schedule.Weekly) return 7 days;
        return 30 days;
    }

    /// @notice Whether to trade now: it is time to look again, and some stock is further from its target than the drift allows. The first look,
    /// when `lastRebalancedAt` is 0, is always due, since there is nothing held to compare with.
    function shouldRebalance(Allocation[] memory current, Allocation[] memory target, uint256 lastRebalancedAt)
        external
        view
        returns (bool)
    {
        if (lastRebalancedAt == 0) return true;
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < lastRebalancedAt + interval()) return false;
        return Allocations.maxDrift(current, target) > driftBps;
    }
}
