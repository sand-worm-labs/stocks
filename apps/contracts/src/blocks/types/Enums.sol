// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The indicators the app works out and posts. Blocks do not know them: a block reads a value by its channel id, and `Channels.indicator` is
/// only the way the app and the tests name a channel for one of these.
enum Indicator {
    Price,
    Sma,
    Ema,
    SmaReturn,
    Rsi,
    Return,
    Volatility,
    Drawdown,
    StdPrice,
    // What a stock's company is worth: what an index weighted by size reads
    MarketCap
}

/// @notice How an index splits its money between its stocks. What a stock is given is its score as a share of all the scores.
///  Equal      the same for each
///  Liquidity  the USDC its pool holds, read from the pool itself: the deeper pool gets more, and nothing has to be posted
///  MarketCap  what its company is worth, from the readings
///  Inverse    1 over its volatility, from the readings: the steadier gets more
///  Custom     a number the curator sets for each stock: 300 and 100 are three quarters and a quarter. A stock with no number is given nothing.
enum IndexWeighting {
    Equal,
    Liquidity,
    MarketCap,
    Inverse,
    Custom
}

enum Pick {
    Top,
    Bottom
}

/// @notice How to split between things by a value each has
///  Equal         the same share each
///  Proportional  in proportion to the value (a market cap): the bigger gets more
///  Inverse       in proportion to 1 over the value (a volatility): the smaller gets more
enum Weighting {
    Equal,
    Proportional,
    Inverse
}

enum Schedule {
    Daily,
    Weekly,
    Monthly
}

enum Op {
    Greater,
    Less,
    GreaterOrEqual,
    LessOrEqual,
    Equal,
    NotEqual
}
