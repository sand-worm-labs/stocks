// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice Where a block gets the values it decides on: numbers kept by an id (a channel), each of which may be set or not set.
interface IReadings {
    /// @notice The value of a channel. Reverts when it is not set (or not fresh), so a block never decides on a number that is not there.
    function read(bytes32 channel) external view returns (int256);

    /// @notice The value of a channel and whether it is set: a channel that is not set, or not fresh, is not an error here
    function tryRead(bytes32 channel) external view returns (bool isSet, int256 value);
}
