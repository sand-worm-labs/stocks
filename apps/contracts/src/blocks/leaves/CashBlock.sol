// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Allocation} from "../types/Allocation.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice Hold nothing: all of what this block is given stays USDC. What an if block falls back to when the answer is to be out of the market.
contract CashBlock is IBlock {
    function evaluate(IReadings) external pure returns (Allocation[] memory) {
        return new Allocation[](0);
    }
}
