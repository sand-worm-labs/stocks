// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IReactive} from "reactive-lib/interfaces/IReactive.sol";
import {AbstractReactive} from "reactive-lib/abstract-base/AbstractReactive.sol";

/// @notice The reactive half of the pattern: watches an event on one chain and, when it happens, asks the Reactive Network to call a contract
/// on another. Replace the event and the payload with what the real rule needs.
/// @dev Deployed to the Reactive Network (Lasna for testing). It exists twice: once on the network itself, where it subscribes, and once in
/// a ReactVM, where `react` runs. `vm` (from AbstractReactive) says which copy this is.
contract ExampleReactive is IReactive, AbstractReactive {
    /// @dev The event watched: `event Ping(address indexed sender, uint256 value)` on the origin contract
    uint256 private constant PING_TOPIC_0 = uint256(keccak256("Ping(address,uint256)"));
    uint64 private constant CALLBACK_GAS_LIMIT = 1_000_000;

    uint256 public immutable destinationChainId;
    address public immutable destination;

    constructor(uint256 originChainId, address originContract, uint256 destinationChainId_, address destination_)
        payable {
        destinationChainId = destinationChainId_;
        destination = destination_;

        // Subscribing is done by the copy on the Reactive Network; the ReactVM copy has no system contract to subscribe with
        if (!vm) {
            service.subscribe(
                originChainId, originContract, PING_TOPIC_0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE
            );
        }
    }

    /// @notice Called by the Reactive Network for each event the subscription matches
    function react(LogRecord calldata log) external vmOnly {
        if (log.topic_0 != PING_TOPIC_0) return;

        address sender = address(uint160(log.topic_1));
        uint256 value = abi.decode(log.data, (uint256));

        // The first argument is overwritten with this contract's owner on the way, which is how the destination knows who is calling
        bytes memory payload = abi.encodeWithSignature("record(address,address,uint256)", address(0), sender, value);
        emit Callback(destinationChainId, destination, CALLBACK_GAS_LIMIT, payload);
    }
}
