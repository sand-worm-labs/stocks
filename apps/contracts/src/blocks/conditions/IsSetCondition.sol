// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice True when the channel has a value (that is fresh), whatever the value is, and false when it has none
contract IsSetCondition is ICondition {
    bytes32 public immutable channel;

    constructor(bytes32 channel_) {
        channel = channel_;
    }

    function holds(IReadings readings) external view returns (bool) {
        (bool isSet,) = readings.tryRead(channel);
        return isSet;
    }
}
