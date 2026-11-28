// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The part of the module registry of ERC-7484 (https://eips.ethereum.org/EIPS/eip-7484) that an account asks: has this module been attested to,
/// for this kind of module, by the attesters this account trusts? It reverts when it has not, so a call that does not revert may go on.
interface IERC7484 {
    function checkForAccount(address smartAccount, address module, uint256 moduleType) external view;
}
