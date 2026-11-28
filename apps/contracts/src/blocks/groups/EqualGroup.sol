// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {CountOutOfRange, NoChild} from "../BlockErrors.sol";
import {Allocation} from "../types/Allocation.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {IReadings} from "../interfaces/IReadings.sol";
import {Allocations} from "../Allocations.sol";

/// @notice Splits what it is given equally between its children. A stock that two children both hold has its shares added.
contract EqualGroup is IBlock {
    uint256 public constant MOST_CHILDREN = 16;

    IBlock[] private children;

    constructor(IBlock[] memory children_) {
        if (children_.length == 0 || children_.length > MOST_CHILDREN) revert CountOutOfRange(children_.length, MOST_CHILDREN);
        for (uint256 i = 0; i < children_.length; i++) {
            if (address(children_[i]) == address(0)) revert NoChild();
            children.push(children_[i]);
        }
    }

    function childrenOf() external view returns (IBlock[] memory) {
        return children;
    }

    function evaluate(IReadings readings) external view returns (Allocation[] memory) {
        return Allocations.combine(readings, children, Allocations.equalShares(children.length));
    }
}
