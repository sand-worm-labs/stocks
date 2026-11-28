// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {NoStock} from "../BlockErrors.sol";
import {Allocation} from "../types/Allocation.sol";
import {IBlock} from "../interfaces/IBlock.sol";
import {IReadings} from "../interfaces/IReadings.sol";

/// @notice Hold one stock, all of what this block is given. The leaf of a strategy.
/// @dev Long and spot only: the vault holds the token itself. A short, or a stock held through a perp, is not something this suite does.
contract AssetBlock is IBlock {
    address public immutable stock;

    constructor(address stock_) {
        if (stock_ == address(0)) revert NoStock();
        stock = stock_;
    }

    function evaluate(IReadings) external view returns (Allocation[] memory list) {
        list = new Allocation[](1);
        list[0] = Allocation(stock, 10_000);
    }
}
