// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {NeedsTwoConditions} from "../BlockErrors.sol";
import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice XOR: true when exactly one of the two conditions is true
contract XorCondition is ICondition {
    ICondition public immutable first;
    ICondition public immutable second;

    constructor(ICondition first_, ICondition second_) {
        if (address(first_) == address(0) || address(second_) == address(0)) revert NeedsTwoConditions();
        first = first_;
        second = second_;
    }

    function holds(IReadings readings) external view returns (bool) {
        return first.holds(readings) != second.holds(readings);
    }
}
