// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IReadings} from "../../src/blocks/interfaces/IReadings.sol";

/// @dev Numbers set by hand, with 6 decimals as the blocks read them
contract MockReadings is IReadings {
    mapping(bytes32 => int256) public values;
    mapping(bytes32 => bool) public isSet;

    function set(bytes32 channel, int256 value) external {
        values[channel] = value;
        isSet[channel] = true;
    }

    function unset(bytes32 channel) external {
        delete values[channel];
        delete isSet[channel];
    }

    function read(bytes32 channel) external view returns (int256) {
        require(isSet[channel], "No reading");
        return values[channel];
    }

    function tryRead(bytes32 channel) external view returns (bool, int256) {
        return (isSet[channel], values[channel]);
    }
}
