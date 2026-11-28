// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {CountOutOfRange, NoChild, ShareForEachChild, ShareOfZero, SharesOver100} from "../BlockErrors.sol";
import {Allocation} from "../types/Allocation.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {IReadings} from "../interfaces/IReadings.sol";
import {Allocations} from "../Allocations.sol";
import {Bps} from "../../libraries/Bps.sol";

/// @notice Splits what it is given as it was told: each child has a share, in basis points. Shares that add up to less than 10,000 leave the
/// rest as cash.
contract SpecifiedGroup is IBlock {
    uint256 public constant MOST_CHILDREN = 16;

    IBlock[] private children;
    uint16[] private shares;

    constructor(IBlock[] memory children_, uint16[] memory shares_) {
        if (children_.length == 0 || children_.length > MOST_CHILDREN) revert CountOutOfRange(children_.length, MOST_CHILDREN);
        if (children_.length != shares_.length) revert ShareForEachChild();
        uint256 sum;
        for (uint256 i = 0; i < children_.length; i++) {
            if (address(children_[i]) == address(0)) revert NoChild();
            if (shares_[i] == 0) revert ShareOfZero();
            sum += shares_[i];
            children.push(children_[i]);
            shares.push(shares_[i]);
        }
        if (sum > Bps.DENOMINATOR) revert SharesOver100();
    }

    function childrenOf() external view returns (IBlock[] memory, uint16[] memory) {
        return (children, shares);
    }

    function evaluate(IReadings readings) external view returns (Allocation[] memory) {
        return Allocations.combine(readings, children, shares);
    }
}
