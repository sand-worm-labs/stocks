// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

struct Execution {
    address target;
    uint256 value;
    bytes callData;
}

/// @notice How ERC-7579 packs what an account is asked to run: one call as target, value and data; a batch as an array of them
library ExecutionLib {
    function encodeSingle(address target, uint256 value, bytes memory callData) internal pure returns (bytes memory) {
        return abi.encodePacked(target, value, callData);
    }

    function decodeSingle(bytes calldata executionCalldata)
        internal
        pure
        returns (address target, uint256 value, bytes calldata callData)
    {
        target = address(bytes20(executionCalldata[0:20]));
        value = uint256(bytes32(executionCalldata[20:52]));
        callData = executionCalldata[52:];
    }

    function encodeBatch(Execution[] memory executions) internal pure returns (bytes memory) {
        return abi.encode(executions);
    }

    function decodeBatch(bytes memory executionCalldata) internal pure returns (Execution[] memory) {
        return abi.decode(executionCalldata, (Execution[]));
    }
}
