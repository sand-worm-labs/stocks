// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The execution mode of ERC-7579: a bytes32 of call type (1 byte), exec type (1 byte), 4 unused, a 4-byte selector and 22 bytes of payload
library ModeLib {
    bytes1 internal constant CALLTYPE_SINGLE = 0x00;
    bytes1 internal constant CALLTYPE_BATCH = 0x01;
    bytes1 internal constant EXECTYPE_DEFAULT = 0x00;
    bytes1 internal constant EXECTYPE_TRY = 0x01;

    function encode(bytes1 callType, bytes1 execType) internal pure returns (bytes32) {
        return bytes32(abi.encodePacked(callType, execType, bytes4(0), bytes4(0), bytes22(0)));
    }

    function callTypeOf(bytes32 mode) internal pure returns (bytes1) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return bytes1(mode);
    }

    function execTypeOf(bytes32 mode) internal pure returns (bytes1) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return bytes1(mode << 8);
    }
}
