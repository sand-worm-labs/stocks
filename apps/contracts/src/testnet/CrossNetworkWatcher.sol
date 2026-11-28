// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IReactive} from "reactive-lib/interfaces/IReactive.sol";
import {AbstractReactive} from "reactive-lib/abstract-base/AbstractReactive.sol";

/// @notice An experiment, for a test network only: a reactive contract on Lasna (the Reactive testnet) that watches an event on one chain and sends
/// a callback to another, so that what Reactive does with a mainnet origin and a testnet destination can be seen. Reactive's docs say the two must not
/// be mixed and do not say what happens if they are. It moves no money: the callback it sends (`CrossNetworkEcho.echo`) only writes down what it saw.
/// @dev It sends at most `mostCallbacks` callbacks and then goes quiet, because each one costs gas to be delivered and a busy pool emits many events.
contract CrossNetworkWatcher is IReactive, AbstractReactive {
    event Seen(uint256 indexed number, uint256 originBlock);

    uint64 private constant CALLBACK_GAS_LIMIT = 500_000;

    uint256 public immutable originChainId;
    address public immutable origin;
    uint256 public immutable topic0;
    uint256 public immutable destinationChainId;
    address public immutable callback;
    uint256 public immutable mostCallbacks;

    uint256 public callbacksSent;

    error NothingToWatch();

    /// @param originChainId_ The chain the event happens on (Base is 8453)
    /// @param origin_ The contract that emits it
    /// @param topic0_ The event's signature hash, as a number
    /// @param destinationChainId_ The chain the callback goes to (Base Sepolia is 84532)
    /// @param callback_ The `CrossNetworkEcho` on that chain
    /// @param mostCallbacks_ How many events to pass on before going quiet
    constructor(
        uint256 originChainId_,
        address origin_,
        uint256 topic0_,
        uint256 destinationChainId_,
        address callback_,
        uint256 mostCallbacks_
    ) payable {
        if (origin_ == address(0) || callback_ == address(0) || mostCallbacks_ == 0) revert NothingToWatch();
        originChainId = originChainId_;
        origin = origin_;
        topic0 = topic0_;
        destinationChainId = destinationChainId_;
        callback = callback_;
        mostCallbacks = mostCallbacks_;

        // Subscribing is done by the copy on the Reactive Network; the ReactVM copy has no system contract to subscribe with
        if (!vm) {
            service.subscribe(originChainId_, origin_, topic0_, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
        }
    }

    /// @notice Called by the Reactive Network for each matching event
    function react(LogRecord calldata log) external vmOnly {
        if (callbacksSent >= mostCallbacks) return;
        if (log.chain_id != originChainId || log._contract != origin || log.topic_0 != topic0) return;

        callbacksSent++;
        emit Seen(callbacksSent, log.block_number);

        // The first argument is overwritten with this contract's owner on the way, so the callback knows whose it is
        bytes memory payload =
            abi.encodeWithSignature("echo(address,uint256,uint256,bytes32)", address(0), log.chain_id, log.block_number, keccak256(log.data));
        emit Callback(destinationChainId, callback, CALLBACK_GAS_LIMIT, payload);
    }
}
