// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {CountOutOfRange, NoCondition} from "../BlockErrors.sol";
import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice True when at least one condition in it is true
contract AnyCondition is ICondition {
    ICondition[] private conditions;

    constructor(ICondition[] memory conditions_) {
        if (conditions_.length == 0 || conditions_.length > 16) revert CountOutOfRange(conditions_.length, 16);
        for (uint256 i = 0; i < conditions_.length; i++) {
            if (address(conditions_[i]) == address(0)) revert NoCondition();
            conditions.push(conditions_[i]);
        }
    }

    function holds(IReadings readings) external view returns (bool) {
        for (uint256 i = 0; i < conditions.length; i++) {
            if (conditions[i].holds(readings)) return true;
        }
        return false;
    }
}
