// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IReactive} from "reactive-lib/interfaces/IReactive.sol";

import {ExampleCallback} from "../src/ExampleCallback.sol";
import {ExampleReactive} from "../src/ExampleReactive.sol";

contract ExampleTest is Test {
    uint256 private constant ORIGIN_CHAIN = 11155111;
    uint256 private constant DESTINATION_CHAIN = 84532;
    uint256 private constant PING_TOPIC_0 = uint256(keccak256("Ping(address,uint256)"));

    address private origin = makeAddr("origin");
    address private callbackProxy = makeAddr("callbackProxy");
    address private person = makeAddr("person");

    ExampleCallback private callback;
    ExampleReactive private reactive;

    function setUp() public {
        callback = new ExampleCallback(callbackProxy);
        // With no system contract here, this is the ReactVM copy: it doesn't subscribe, and `react` can be called
        reactive = new ExampleReactive(ORIGIN_CHAIN, origin, DESTINATION_CHAIN, address(callback));
    }

    function ping(uint256 value) private view returns (IReactive.LogRecord memory) {
        return IReactive.LogRecord({
            chain_id: ORIGIN_CHAIN,
            _contract: origin,
            topic_0: PING_TOPIC_0,
            topic_1: uint256(uint160(person)),
            topic_2: 0,
            topic_3: 0,
            data: abi.encode(value),
            block_number: block.number,
            op_code: 0,
            block_hash: 0,
            tx_hash: 0,
            log_index: 0
        });
    }

    function test_reactAsksForACallbackToTheDestination() public {
        bytes memory payload = abi.encodeWithSignature("record(address,address,uint256)", address(0), person, 42);

        vm.expectEmit(true, true, true, true, address(reactive));
        emit IReactive.Callback(DESTINATION_CHAIN, address(callback), 1_000_000, payload);

        reactive.react(ping(42));
    }

    function test_reactIgnoresOtherEvents() public {
        IReactive.LogRecord memory other = ping(1);
        other.topic_0 = uint256(keccak256("Other(address,uint256)"));

        vm.recordLogs();
        reactive.react(other);

        assertEq(vm.getRecordedLogs().length, 0);
    }

    function test_callbackIsAcceptedFromTheProxyForTheRightOwner() public {
        vm.expectEmit(true, true, false, true, address(callback));
        emit ExampleCallback.Received(address(this), person, 42);

        vm.prank(callbackProxy);
        callback.record(address(this), person, 42);
    }

    function test_callbackIsRefusedFromAnyoneButTheProxy() public {
        vm.expectRevert("Authorized sender only");
        callback.record(address(this), person, 42);
    }

    function test_callbackIsRefusedForAnotherOwner() public {
        vm.prank(callbackProxy);
        vm.expectRevert("Authorized RVM ID only");
        callback.record(makeAddr("stranger"), person, 42);
    }
}
