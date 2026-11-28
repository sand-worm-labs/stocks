// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {CountOutOfRange, NeededOutOfRange, NoCondition} from "../BlockErrors.sol";
import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice At least `needed` of its conditions are true: 1 of n is an AnyCondition (OR), n of n is an AllCondition (AND), and half and a bit more is
/// a majority vote. It stops asking as soon as the answer is settled.
contract QuorumCondition is ICondition {
    uint256 public constant MOST_CONDITIONS = 16;

    ICondition[] private conditions;
    uint256 public immutable needed;

    constructor(ICondition[] memory conditions_, uint256 needed_) {
        if (conditions_.length == 0 || conditions_.length > MOST_CONDITIONS) {
            revert CountOutOfRange(conditions_.length, MOST_CONDITIONS);
        }
        if (needed_ == 0 || needed_ > conditions_.length) revert NeededOutOfRange();
        for (uint256 i = 0; i < conditions_.length; i++) {
            if (address(conditions_[i]) == address(0)) revert NoCondition();
            conditions.push(conditions_[i]);
        }
        needed = needed_;
    }

    function holds(IReadings readings) external view returns (bool) {
        uint256 trueSoFar;
        for (uint256 i = 0; i < conditions.length; i++) {
            if (conditions[i].holds(readings)) trueSoFar++;
            if (trueSoFar >= needed) return true;
            // Even if every one left were true it would not be enough
            if (trueSoFar + (conditions.length - i - 1) < needed) return false;
        }
        return false;
    }
}
