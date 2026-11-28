// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {AbstractCallback} from "reactive-lib/abstract-base/AbstractCallback.sol";

/// @notice The destination half of the cross-network experiment (see `CrossNetworkWatcher`): when a callback arrives it writes down which chain and
/// block the event was on, so that a person can read here whether it got through. It holds and moves nothing.
contract CrossNetworkEcho is AbstractCallback {
    event Echoed(address indexed rvmId, uint256 originChainId, uint256 originBlock, bytes32 dataHash);

    uint256 public echoes;
    uint256 public lastOriginChainId;
    uint256 public lastOriginBlock;

    /// @param callbackSender The Reactive callback proxy of this chain, the only address allowed to call `echo` (Base Sepolia's is listed on
    /// dev.reactive.network: check it there)
    constructor(address callbackSender) payable AbstractCallback(callbackSender) {}

    /// @param rvmId Filled in by the Reactive Network with the address of the reactive contract's owner
    function echo(address rvmId, uint256 originChainId, uint256 originBlock, bytes32 dataHash)
        external
        authorizedSenderOnly
        rvmIdOnly(rvmId)
    {
        echoes++;
        lastOriginChainId = originChainId;
        lastOriginBlock = originBlock;
        emit Echoed(rvmId, originChainId, originBlock, dataHash);
    }
}
