// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {StockRegistry} from "../registry/StockRegistry.sol";
import {Stock} from "../registry/StockTypes.sol";
import {PoolPricing} from "./PoolPricing.sol";

/// @notice What an account holds, stock by stock, at the pools' trusted prices
struct Holdings {
    Stock[] stocks;
    // How many of each stock's token the account holds
    uint256[] held;
    // What that is worth in USDC
    uint256[] values;
    uint256 usdcBalance;
    // USDC and all the stocks together
    uint256 total;
}

library Portfolio {
    /// @notice Reads what `account` holds of each listed stock and of USDC. A price is looked up only for a stock the account holds, so a pool whose
    /// price cannot be trusted stops only what needs it.
    function read(StockRegistry registry, address account, address[] memory stockAddresses)
        internal
        view
        returns (Holdings memory holdings)
    {
        uint256 length = stockAddresses.length;
        holdings.stocks = new Stock[](length);
        holdings.held = new uint256[](length);
        holdings.values = new uint256[](length);
        holdings.usdcBalance = IERC20Minimal(registry.usdc()).balanceOf(account);
        holdings.total = holdings.usdcBalance;

        for (uint256 i = 0; i < length; i++) {
            Stock memory stock = registry.stockOf(stockAddresses[i]);
            holdings.stocks[i] = stock;
            holdings.held[i] = IERC20Minimal(stock.token).balanceOf(account);
            holdings.values[i] = PoolPricing.valueOf(stock, holdings.held[i]);
            holdings.total += holdings.values[i];
        }
    }
}
