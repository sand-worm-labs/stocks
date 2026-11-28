// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IReadings} from "./IReadings.sol";

/// @notice The question an if block asks
interface ICondition {
    function holds(IReadings readings) external view returns (bool);
}
