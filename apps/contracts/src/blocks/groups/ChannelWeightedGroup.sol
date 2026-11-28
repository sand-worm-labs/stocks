// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ChannelForEachChild, CountOutOfRange, NoChild, UseEqualGroup} from "../BlockErrors.sol";
import {Allocations} from "../Allocations.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {IReadings} from "../interfaces/IReadings.sol";
import {Allocation} from "../types/Allocation.sol";
import {Weighting} from "../types/Enums.sol";

/// @notice Splits what it is given between its children by a value each has, read from a channel: in proportion to it (a market cap: the bigger gets
/// more) or in proportion to 1 over it (a volatility: the steadier gets more). It does not know what the value is. For an equal split use
/// `EqualGroup`, and for shares given outright `SpecifiedGroup`.
contract ChannelWeightedGroup is IBlock {
    uint256 public constant MOST_CHILDREN = 16;

    IBlock[] private children;
    bytes32[] private channels;
    Weighting public immutable weighting;

    constructor(IBlock[] memory children_, bytes32[] memory channels_, Weighting weighting_) {
        if (children_.length == 0 || children_.length > MOST_CHILDREN) revert CountOutOfRange(children_.length, MOST_CHILDREN);
        if (children_.length != channels_.length) revert ChannelForEachChild();
        if (weighting_ == Weighting.Equal) revert UseEqualGroup();
        weighting = weighting_;
        for (uint256 i = 0; i < children_.length; i++) {
            if (address(children_[i]) == address(0)) revert NoChild();
            children.push(children_[i]);
            channels.push(channels_[i]);
        }
    }

    function childrenOf() external view returns (IBlock[] memory, bytes32[] memory) {
        return (children, channels);
    }

    function evaluate(IReadings readings) external view returns (Allocation[] memory) {
        int256[] memory values = new int256[](children.length);
        for (uint256 i = 0; i < children.length; i++) {
            values[i] = readings.read(channels[i]);
        }
        return Allocations.combine(readings, children, Allocations.sharesFor(weighting, values));
    }
}
