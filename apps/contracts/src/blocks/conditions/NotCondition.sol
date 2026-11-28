// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {NoCondition} from "../BlockErrors.sol";
import {ICondition} from "../interfaces/ICondition.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice NOT: true when the condition inside is false. NAND is a NotCondition around an AllCondition, and NOR around an AnyCondition.
contract NotCondition is ICondition {
    ICondition public immutable inner;

    constructor(ICondition inner_) {
        if (address(inner_) == address(0)) revert NoCondition();
        inner = inner_;
    }

    function holds(IReadings readings) external view returns (bool) {
        return !inner.holds(readings);
    }
}
