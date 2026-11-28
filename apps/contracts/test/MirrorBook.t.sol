// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MirrorBook} from "../src/testnet/MirrorBook.sol";

contract MirrorBookTest is Test {
    MirrorBook private book;
    address private poolA = makeAddr("pool A");
    address private poolB = makeAddr("pool B");

    function setUp() public {
        book = new MirrorBook();
    }

    function _state(uint160 price, int24 tick) private pure returns (MirrorBook.PoolState memory) {
        return MirrorBook.PoolState(price, tick, 123, 456);
    }

    function _two() private view returns (address[] memory pools, MirrorBook.PoolState[] memory states) {
        pools = new address[](2);
        pools[0] = poolA;
        pools[1] = poolB;
        states = new MirrorBook.PoolState[](2);
        states[0] = _state(1000, -200);
        states[1] = _state(2000, -300);
    }

    function test_theRelayerWritesManyPoolsAtOnce() public {
        (address[] memory pools, MirrorBook.PoolState[] memory states) = _two();
        book.postMany(pools, states, 123);

        (uint160 priceA, int24 tickA,,) = book.pool(poolA);
        (uint160 priceB, int24 tickB, uint64 blockB, uint128 liquidityB) = book.pool(poolB);
        assertEq(priceA, 1000);
        assertEq(tickA, -200);
        assertEq(priceB, 2000);
        assertEq(tickB, -300);
        assertEq(blockB, 123);
        assertEq(liquidityB, 456);
    }

    function test_aBatchIsOneEventNotOnePerPool() public {
        (address[] memory pools, MirrorBook.PoolState[] memory states) = _two();

        vm.expectEmit(true, false, false, true, address(book));
        emit MirrorBook.BatchMirrored(1, 2, 123);
        book.postMany(pools, states, 123);
        assertEq(book.batches(), 1);
    }

    function test_aLaterBatchReplacesAPoolsState() public {
        (address[] memory pools, MirrorBook.PoolState[] memory states) = _two();
        book.postMany(pools, states, 123);

        states[0] = _state(1500, -250);
        book.postMany(pools, states, 124);
        (uint160 price, int24 tick,,) = book.pool(poolA);
        assertEq(price, 1500);
        assertEq(tick, -250);
    }

    function test_onlyTheRelayerMayWrite() public {
        (address[] memory pools, MirrorBook.PoolState[] memory states) = _two();
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(MirrorBook.NotRelayer.selector);
        book.postMany(pools, states, 123);
    }

    function test_poolsAndStatesMustMatch() public {
        (address[] memory pools, MirrorBook.PoolState[] memory states) = _two();
        MirrorBook.PoolState[] memory fewer = new MirrorBook.PoolState[](1);
        fewer[0] = states[0];
        vm.expectRevert(MirrorBook.LengthMismatch.selector);
        book.postMany(pools, fewer, 123);
    }
}
