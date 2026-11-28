// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Compare} from "../Compare.sol";
import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";
import {Op} from "../types/Enums.sol";

/// @notice One value against another: "this channel is above that one". Both must be set.
contract ComparisonCondition is ICondition {
    bytes32 public immutable left;
    bytes32 public immutable right;
    Op public immutable op;

    constructor(bytes32 left_, Op op_, bytes32 right_) {
        left = left_;
        op = op_;
        right = right_;
    }

    function holds(IReadings readings) external view returns (bool) {
        return Compare.holds(readings.read(left), op, readings.read(right));
    }
}
