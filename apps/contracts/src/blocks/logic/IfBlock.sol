// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {NeedsAllThree} from "../BlockErrors.sol";
import {Allocation} from "../types/Allocation.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice Holds what `whenTrue` holds while the condition is true, and what `otherwise` holds when it is not. Use a CashBlock for "out of the market".
contract IfBlock is IBlock {
    ICondition public immutable condition;
    IBlock public immutable whenTrue;
    IBlock public immutable otherwise;

    constructor(ICondition condition_, IBlock whenTrue_, IBlock otherwise_) {
        if (address(condition_) == address(0) || address(whenTrue_) == address(0) || address(otherwise_) == address(0)) {
            revert NeedsAllThree();
        }
        condition = condition_;
        whenTrue = whenTrue_;
        otherwise = otherwise_;
    }

    function evaluate(IReadings readings) external view returns (Allocation[] memory) {
        return condition.holds(readings) ? whenTrue.evaluate(readings) : otherwise.evaluate(readings);
    }
}
