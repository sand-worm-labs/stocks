// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Allocation} from "../types/Allocation.sol";
import {IReadings} from "./IReadings.sol";

/// @notice Every block answers one question: what should the strategy hold, given the numbers now? It only reads, so anyone can ask, and the
/// answer is the same for everyone who asks with the same numbers.
interface IBlock {
    function evaluate(IReadings readings) external view returns (Allocation[] memory);
}
