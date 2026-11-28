// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice Narrowing a number without losing part of it: each of these reverts when the value does not fit
library SafeCast {
    error DoesNotFit(uint256 value);

    function toUint16(uint256 value) internal pure returns (uint16) {
        if (value > type(uint16).max) revert DoesNotFit(value);
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint16(value);
    }

    /// @notice The size of a signed number
    function abs(int256 value) internal pure returns (uint256) {
        if (value >= 0) {
            // forge-lint: disable-next-line(unsafe-typecast)
            return uint256(value);
        }
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(-value);
    }

    /// @notice How far apart two signed numbers are
    function distance(int256 a, int256 b) internal pure returns (uint256) {
        return abs(a > b ? a - b : b - a);
    }
}
