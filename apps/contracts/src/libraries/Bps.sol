// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice Basis points, hundredths of a percent: 10,000 is 100% and 2,500 is 25%. How every share and limit in this suite is written.
library Bps {
    uint256 internal constant DENOMINATOR = 10_000;

    /// @notice `bps` of an amount, rounded down
    function portion(uint256 amount, uint256 bps) internal pure returns (uint256) {
        return (amount * bps) / DENOMINATOR;
    }

    /// @notice What is left of an amount after giving up `slippageBps` of it: the least a trade may bring back
    function lessSlippage(uint256 amount, uint256 slippageBps) internal pure returns (uint256) {
        return portion(amount, DENOMINATOR - slippageBps);
    }

    /// @notice What share of a whole a part is, in basis points, rounded down
    function shareOf(uint256 part, uint256 whole) internal pure returns (uint256) {
        return (part * DENOMINATOR) / whole;
    }
}
