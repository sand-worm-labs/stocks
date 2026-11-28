// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IReadings} from "../blocks/interfaces/IReadings.sol";
import {SignalBoard} from "./SignalBoard.sol";

/// @notice The readings of a signal board, with how old one may be: what a vault hands to a strategy's blocks. A number older than `maxAge` makes
/// the whole evaluation revert when it is read, and counts as not set when it is only asked about, so a strategy is never run on stale numbers.
contract FreshReadings is IReadings {
    SignalBoard public immutable board;
    uint64 public immutable maxAge;
    error NeedsBoardAndAge();


    constructor(SignalBoard board_, uint64 maxAge_) {
        if (address(board_) == address(0) || maxAge_ == 0) revert NeedsBoardAndAge();
        board = board_;
        maxAge = maxAge_;
    }

    function read(bytes32 channel) external view returns (int256) {
        return board.valueIfFresh(channel, maxAge);
    }

    /// @notice A value that was never posted, or has gone stale, is not set
    function tryRead(bytes32 channel) external view returns (bool isSet, int256 value) {
        (int256 latest, uint64 asOf, uint64 seq) = board.latestValue(channel);
        // Too old is the same as not there: what is fresh is a matter of minutes, and a validator nudging the clock by seconds changes nothing
        // forge-lint: disable-next-line(block-timestamp)
        bool isFresh = seq != 0 && block.timestamp <= uint256(asOf) + maxAge;
        return (isFresh, isFresh ? latest : int256(0));
    }
}
