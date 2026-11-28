// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {MirrorBook} from "./MirrorBook.sol";
import {MirrorPool} from "./MirrorPool.sol";

/// @notice Makes the test-network copies of Base mainnet pools (`MirrorPool`) and tells the router where they are, as Slipstream's pool factory does.
/// Only its owner makes pools, and one mainnet pool has one copy.
contract MirrorPoolFactory {
    event PoolCreated(address indexed pool, address indexed mainnetPool, address token0, address token1, int24 tickSpacing);
    event RouterChanged(address router);

    error OwnerOnly();
    error AlreadyMirrored(address mainnetPool);
    error SameToken();

    MirrorBook public immutable book;
    address public immutable owner;
    address public router;

    /// @notice A copy by the two tokens (either order) and the mainnet pool's tick spacing, as the router asks for it
    mapping(address => mapping(address => mapping(int24 => address))) public getPool;
    mapping(address mainnetPool => address) public copyOf;
    address[] public pools;

    constructor(MirrorBook book_) {
        book = book_;
        owner = msg.sender;
    }

    function poolCount() external view returns (uint256) {
        return pools.length;
    }

    function setRouter(address router_) external {
        if (msg.sender != owner) revert OwnerOnly();
        router = router_;
        emit RouterChanged(router_);
    }

    /// @param token0 the mainnet pool's token0, and `token1` its token1: the copy keeps that order so the mirrored price means the same
    function createPool(address mainnetPool, address token0, address token1, int24 tickSpacing, uint16 feeBps)
        external
        returns (address pool)
    {
        if (msg.sender != owner) revert OwnerOnly();
        if (token0 == token1) revert SameToken();
        if (copyOf[mainnetPool] != address(0)) revert AlreadyMirrored(mainnetPool);

        pool = address(new MirrorPool(book, mainnetPool, token0, token1, tickSpacing, feeBps));
        getPool[token0][token1][tickSpacing] = pool;
        getPool[token1][token0][tickSpacing] = pool;
        copyOf[mainnetPool] = pool;
        pools.push(pool);
        emit PoolCreated(pool, mainnetPool, token0, token1, tickSpacing);
    }
}
