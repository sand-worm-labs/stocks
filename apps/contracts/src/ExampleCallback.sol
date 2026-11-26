// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {AbstractCallback} from "reactive-lib/abstract-base/AbstractCallback.sol";

/// @notice The destination half of the pattern: a contract on the chain where something should happen, called by the Reactive Network on
/// behalf of a reactive contract. Replace it with the contract that does the real work.
/// @dev Deployed to the destination chain (say Base). `callbackSender` is that chain's Reactive callback proxy, which is the only address
/// allowed to call in, and the deployer is the only reactive-contract owner whose callbacks are accepted (`rvmIdOnly`).
contract ExampleCallback is AbstractCallback {
    event Received(address indexed rvmId, address indexed sender, uint256 value);

    constructor(address callbackSender) payable AbstractCallback(callbackSender) {}

    /// @param rvmId Filled in by the Reactive Network with the address of the reactive contract's owner, whatever the payload says
    function record(address rvmId, address sender, uint256 value) external authorizedSenderOnly rvmIdOnly(rvmId) {
        emit Received(rvmId, sender, value);
    }
}
