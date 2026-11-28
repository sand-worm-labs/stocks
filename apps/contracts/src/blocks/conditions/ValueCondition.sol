// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Compare} from "../Compare.sol";
import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";
import {Op} from "../types/Enums.sol";

/// @notice A value against a number: "this channel is above 70". The channel is any value the publisher keeps, an indicator or a flag or a price. When
/// it is not set the condition cannot be answered and the evaluation stops; use `FlagCondition` or `IsSetCondition` to ask whether it is.
contract ValueCondition is ICondition {
    bytes32 public immutable channel;
    Op public immutable op;
    int256 public immutable constantValue;

    constructor(bytes32 channel_, Op op_, int256 constantValue_) {
        channel = channel_;
        op = op_;
        constantValue = constantValue_;
    }

    function holds(IReadings readings) external view returns (bool) {
        return Compare.holds(readings.read(channel), op, constantValue);
    }
}
