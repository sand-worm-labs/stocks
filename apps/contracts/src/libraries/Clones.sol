// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice A copy of a contract that is 45 bytes: it hands every call to the original and keeps its own storage (ERC-1167, the "minimal proxy").
/// Written out here so nothing is imported for it. The bytes are the standard ones, and the test deploys one and calls it.
library Clones {
    error CloneFailed();

    function clone(address implementation) internal returns (address instance) {
        /// @solidity memory-safe-assembly
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create(0, ptr, 0x37)
        }
        if (instance == address(0)) revert CloneFailed();
    }
}
