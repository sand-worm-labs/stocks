// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice For a test network only. Holds the latest price state of Base mainnet pools, written in batches by one trusted relayer (`apps/relayer`),
/// because Reactive's Lasna testnet cannot read a mainnet. A testnet contract reads a pool's price here as it would from the pool itself.
/// @dev Trusted, not a bridge: nothing here proves the mainnet price. It emits one event per batch, not one per pool, so a reactive contract that
/// watches it is charged once per batch.
contract MirrorBook {
    struct PoolState {
        uint160 sqrtPriceX96;
        int24 tick;
        uint64 mainnetBlock; // the first slot is 160 + 24 + 64 = 248 bits
        uint128 liquidity;
    }

    event BatchMirrored(uint256 indexed batchId, uint256 pools, uint64 mainnetBlock);

    error NotRelayer();
    error LengthMismatch();

    address public immutable relayer;
    uint256 public batches;
    mapping(address pool => PoolState) public pool;

    constructor() {
        relayer = msg.sender;
    }

    function postMany(address[] calldata pools, PoolState[] calldata states, uint64 mainnetBlock) external {
        if (msg.sender != relayer) revert NotRelayer();
        if (pools.length != states.length) revert LengthMismatch();

        for (uint256 i; i < pools.length; ++i) {
            pool[pools[i]] = states[i];
        }
        emit BatchMirrored(++batches, pools.length, mainnetBlock);
    }
}
