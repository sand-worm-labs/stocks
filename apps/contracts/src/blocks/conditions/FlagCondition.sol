// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice A switch: true when the channel is set to something other than zero, false when it is set to zero or not set at all. Never an error,
/// so a flag the app has not posted yet is simply off.
contract FlagCondition is ICondition {
    bytes32 public immutable channel;

    constructor(bytes32 channel_) {
        channel = channel_;
    }

    function holds(IReadings readings) external view returns (bool) {
        (bool isSet, int256 value) = readings.tryRead(channel);
        return isSet && value != 0;
    }
}
