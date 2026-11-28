// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IReactive} from "reactive-lib/interfaces/IReactive.sol";

import {CrossNetworkEcho} from "../src/testnet/CrossNetworkEcho.sol";
import {CrossNetworkWatcher} from "../src/testnet/CrossNetworkWatcher.sol";

/// @dev What these can show is the contracts' own logic. Whether Reactive carries a callback from a mainnet event to a testnet is only shown by
/// running them on the networks.
contract CrossNetworkTest is Test {
    uint256 private constant BASE = 8453;
    uint256 private constant BASE_SEPOLIA = 84532;
    uint256 private constant SYNC = uint256(keccak256("Sync(uint256,uint256)"));

    address private pool = makeAddr("a pool on Base");
    address private proxy = makeAddr("callback proxy");
    // The echo remembers who deployed it as the reactive owner, which here is this test
    address private rvmId = address(this);
    CrossNetworkEcho private echo;
    CrossNetworkWatcher private watcher;

    function setUp() public {
        echo = new CrossNetworkEcho(proxy);
        watcher = new CrossNetworkWatcher(BASE, pool, SYNC, BASE_SEPOLIA, address(echo), 2);
    }

    function _event(uint256 chain, address from, uint256 topic, uint256 block_) private pure returns (IReactive.LogRecord memory) {
        return IReactive.LogRecord(chain, from, topic, 0, 0, 0, abi.encode(uint256(1), uint256(2)), block_, 0, 0, 0, 0);
    }

    function test_anEventOnTheOriginBecomesACallbackToTheDestination() public {
        bytes memory payload = abi.encodeWithSignature(
            "echo(address,uint256,uint256,bytes32)", address(0), BASE, 123, keccak256(abi.encode(uint256(1), uint256(2)))
        );
        vm.expectEmit(true, true, true, true, address(watcher));
        emit IReactive.Callback(BASE_SEPOLIA, address(echo), 500_000, payload);

        watcher.react(_event(BASE, pool, SYNC, 123));
        assertEq(watcher.callbacksSent(), 1);
    }

    function test_itPassesOnNoMoreThanItWasToldTo() public {
        watcher.react(_event(BASE, pool, SYNC, 1));
        watcher.react(_event(BASE, pool, SYNC, 2));

        vm.recordLogs();
        watcher.react(_event(BASE, pool, SYNC, 3));
        assertEq(vm.getRecordedLogs().length, 0);
        assertEq(watcher.callbacksSent(), 2);
    }

    function test_itIgnoresOtherPoolsChainsAndEvents() public {
        vm.recordLogs();
        watcher.react(_event(BASE, makeAddr("other pool"), SYNC, 1));
        watcher.react(_event(1, pool, SYNC, 1));
        watcher.react(_event(BASE, pool, 1234, 1));
        assertEq(vm.getRecordedLogs().length, 0);
    }

    function test_onlyTheProxyForTheOwnersContractCanWriteDownAnEcho() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        echo.echo(rvmId, BASE, 5, bytes32(0));

        vm.prank(proxy);
        echo.echo(rvmId, BASE, 5, bytes32("hash"));
        assertEq(echo.echoes(), 1);
        assertEq(echo.lastOriginChainId(), BASE);
        assertEq(echo.lastOriginBlock(), 5);
    }

    function test_itNeedsSomethingToWatch() public {
        vm.expectRevert(CrossNetworkWatcher.NothingToWatch.selector);
        new CrossNetworkWatcher(BASE, address(0), SYNC, BASE_SEPOLIA, address(echo), 2);
        vm.expectRevert(CrossNetworkWatcher.NothingToWatch.selector);
        new CrossNetworkWatcher(BASE, pool, SYNC, BASE_SEPOLIA, address(echo), 0);
    }
}
