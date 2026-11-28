// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {NoStock, NotAnIndex} from "../BlockErrors.sol";
import {Allocation} from "../types/Allocation.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {IReadings} from "../interfaces/IReadings.sol";
import {Index} from "../../index/Index.sol";

/// @notice Hold one index, all of what this block is given. The leaf of a strategy that wants a basket of thousands of stocks in one slot.
/// @dev Takes an index that already exists, from any factory, new or old. It does not decide which indexes are trustworthy (that is for whoever
/// builds the strategy, as with `AssetBlock`); it only refuses an address that does not answer like an index, so a mistyped address, an EOA or a
/// plain token is caught when the strategy is made and not when it first trades. The index itself is the engine, in `src/index`.
contract IndexBlock is IBlock {
    address public immutable index;

    constructor(address index_) {
        if (index_ == address(0)) revert NoStock();
        if (!_answersLikeAnIndex(index_)) revert NotAnIndex(index_);
        index = index_;
    }

    function evaluate(IReadings) external view returns (Allocation[] memory list) {
        list = new Allocation[](1);
        list[0] = Allocation(index, 10_000);
    }

    /// @dev A call that cannot revert the constructor on its own: an address with no code, or a token with no such function, is simply "no"
    function _answersLikeAnIndex(address token) private view returns (bool) {
        if (token.code.length == 0) return false;
        (bool isDone, bytes memory answer) = token.staticcall(abi.encodeCall(Index.stockCount, ()));
        return isDone && answer.length == 32;
    }
}
