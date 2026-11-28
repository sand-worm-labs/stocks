// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice A stock and the share of the strategy's value it should be, in basis points (2500 is 25%). What the shares leave out of 10,000 is cash.
struct Allocation {
    address stock;
    uint16 weightBps;
}
