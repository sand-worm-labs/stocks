// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice Prices from a Slipstream pool's `sqrtPriceX96`, with no decimals to think about: the numbers are raw token amounts, so the two tokens'
/// decimals cancel. `usdcIsToken0` says which side of the pool the USDC is on.
/// @dev Done in two steps so nothing overflows for amounts and prices a stock pool can reach.
library VaultMath {
    uint256 internal constant Q96 = 1 << 96;

    /// @notice What `stockAmount` is worth in USDC at this price
    function usdcValue(uint256 stockAmount, uint160 sqrtPriceX96, bool usdcIsToken0) internal pure returns (uint256) {
        uint256 root = sqrtPriceX96;
        // forge-lint: disable-next-line(divide-before-multiply)
        if (usdcIsToken0) return (((stockAmount * Q96) / root) * Q96) / root;
        // forge-lint: disable-next-line(divide-before-multiply)
        return (((stockAmount * root) / Q96) * root) / Q96;
    }

    /// @notice How much stock `usdcAmount` buys at this price, before fees
    function stockFor(uint256 usdcAmount, uint160 sqrtPriceX96, bool usdcIsToken0) internal pure returns (uint256) {
        uint256 root = sqrtPriceX96;
        // forge-lint: disable-next-line(divide-before-multiply)
        if (usdcIsToken0) return (((usdcAmount * root) / Q96) * root) / Q96;
        // forge-lint: disable-next-line(divide-before-multiply)
        return (((usdcAmount * Q96) / root) * Q96) / root;
    }

    /// @notice The average tick over `window` seconds, from two readings of the pool's running total, rounded down as Uniswap's oracle library does
    function averageTick(int56 cumulativeThen, int56 cumulativeNow, uint32 window)
        internal
        pure
        returns (int24 average)
    {
        int256 delta = int256(cumulativeNow) - int256(cumulativeThen);
        int256 seconds_ = int256(uint256(window));
        int256 quotient = delta / seconds_;
        if (delta < 0 && delta % seconds_ != 0) quotient--;
        // A tick is always within int24, and so is an average of ticks
        // forge-lint: disable-next-line(unsafe-typecast)
        average = int24(quotient);
    }

    function distance(int24 a, int24 b) internal pure returns (uint256) {
        int256 gap = int256(a) - int256(b);
        return uint256(gap < 0 ? -gap : gap);
    }
}
