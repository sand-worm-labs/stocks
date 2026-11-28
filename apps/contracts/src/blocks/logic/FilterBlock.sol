// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {CountOutOfRange, NoStock, PickOutOfRange, ScoreChannelForEachStock, StockTwice, WeightChannelForEachStock} from "../BlockErrors.sol";
import {Allocations} from "../Allocations.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {IReadings} from "../interfaces/IReadings.sol";
import {Allocation} from "../types/Allocation.sol";
import {Pick, Weighting} from "../types/Enums.sol";

/// @notice Out of a list of stocks, holds the `count` with the highest (or lowest) value, as it is read from a channel for each, and splits what it
/// is given between them equally, or by another value each has (a market cap, or the inverse of a volatility).
/// @dev It does not know what the values are. The publisher works them out off-chain, over history the chain does not have, and what this block does
/// with them is the part anyone can check: it ranks them and weights the winners the same way for everyone. A tie goes to the earlier in the list.
contract FilterBlock is IBlock {
    uint256 public constant MOST_CANDIDATES = 16;

    address[] private candidates;
    // The value each candidate is ranked by, in the order of the candidates
    bytes32[] private scoreChannels;
    // The value each candidate is weighted by, when the winners are not weighted equally
    bytes32[] private weightChannels;
    Pick public immutable pick;
    uint8 public immutable count;
    Weighting public immutable weighting;

    constructor(
        address[] memory candidates_,
        bytes32[] memory scoreChannels_,
        Pick pick_,
        uint8 count_,
        Weighting weighting_,
        bytes32[] memory weightChannels_
    ) {
        if (candidates_.length == 0 || candidates_.length > MOST_CANDIDATES) {
            revert CountOutOfRange(candidates_.length, MOST_CANDIDATES);
        }
        if (scoreChannels_.length != candidates_.length) revert ScoreChannelForEachStock();
        if (count_ == 0 || count_ > candidates_.length) revert PickOutOfRange();
        if (weighting_ != Weighting.Equal && weightChannels_.length != candidates_.length) {
            revert WeightChannelForEachStock();
        }

        for (uint256 i = 0; i < candidates_.length; i++) {
            if (candidates_[i] == address(0)) revert NoStock();
            for (uint256 j = 0; j < i; j++) {
                if (candidates_[j] == candidates_[i]) revert StockTwice();
            }
            candidates.push(candidates_[i]);
            scoreChannels.push(scoreChannels_[i]);
        }
        for (uint256 i = 0; i < weightChannels_.length; i++) {
            weightChannels.push(weightChannels_[i]);
        }
        pick = pick_;
        count = count_;
        weighting = weighting_;
    }

    function candidatesOf() external view returns (address[] memory) {
        return candidates;
    }

    function evaluate(IReadings readings) external view returns (Allocation[] memory list) {
        uint256[] memory winners = _winners(readings);
        uint16[] memory shares = Allocations.sharesFor(weighting, _weightValues(readings, winners));

        list = new Allocation[](winners.length);
        for (uint256 i = 0; i < winners.length; i++) {
            list[i] = Allocation(candidates[winners[i]], shares[i]);
        }
    }

    /// @dev The positions of the winners, best first: takes the best of what is left, `count` times
    function _winners(IReadings readings) private view returns (uint256[] memory winners) {
        uint256 total = candidates.length;
        int256[] memory scores = new int256[](total);
        for (uint256 i = 0; i < total; i++) {
            scores[i] = readings.read(scoreChannels[i]);
        }

        bool[] memory taken = new bool[](total);
        winners = new uint256[](count);
        for (uint256 rank = 0; rank < count; rank++) {
            uint256 best = _bestLeft(scores, taken);
            taken[best] = true;
            winners[rank] = best;
        }
    }

    function _bestLeft(int256[] memory scores, bool[] memory taken) private view returns (uint256 best) {
        bool hasBest;
        for (uint256 i = 0; i < scores.length; i++) {
            if (taken[i]) continue;
            if (!hasBest || _beats(scores[i], scores[best])) {
                best = i;
                hasBest = true;
            }
        }
    }

    function _beats(int256 a, int256 b) private view returns (bool) {
        return pick == Pick.Top ? a > b : a < b;
    }

    /// @dev The value each winner is weighted by. Nothing is read for an equal split.
    function _weightValues(IReadings readings, uint256[] memory winners) private view returns (int256[] memory values) {
        values = new int256[](winners.length);
        if (weighting == Weighting.Equal) return values;
        for (uint256 i = 0; i < winners.length; i++) {
            values[i] = readings.read(weightChannels[winners[i]]);
        }
    }
}
