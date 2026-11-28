// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice What a curator gives to list a stock: its token, the pool it trades in against USDC, the router that trades that pool, and the pool's tick spacing
struct StockSetup {
    address token;
    address pool;
    address router;
    int24 tickSpacing;
}

/// @notice A stock as the registry keeps it, with what was worked out when it was listed
struct Stock {
    address token;
    address pool;
    address router;
    int24 tickSpacing;
    bool usdcIsToken0;
    bool isListed;
}
