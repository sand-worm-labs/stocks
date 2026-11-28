// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Indicator} from "./types/Enums.sol";

/// @notice A way to name channels. A channel is an id, and the publisher posts to the ids a vault's blocks read: nothing here is required, and a
/// block can read any `bytes32`. This is only how the app and the tests name the channel of an indicator of a stock.
/// @dev Numbers are signed fixed point with 6 decimals: 1_000_000 is 1.0, so a return of +12.5% is 125_000 and an RSI of 70 is 70_000_000.
library Channels {
    /// @notice An indicator of a stock over a window of days (ignored by `Price`)
    function indicator(Indicator kind, uint16 window, address stock) internal pure returns (bytes32) {
        return keccak256(abi.encode("indicator", kind, window, stock));
    }
}
