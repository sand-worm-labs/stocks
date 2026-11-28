// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Execution} from "../erc7579/ExecutionLib.sol";
import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {ISlipstreamRouter} from "../interfaces/ISlipstreamRouter.sol";
import {Stock} from "../registry/StockTypes.sol";

/// @notice One swap an executor wants the account to make: `amountIn` of one token for at least `minOut` of the other, through the stock's router
struct Trade {
    Stock stock;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 minOut;
}

library Trades {
    /// @notice The calls that make the trades, three for each: let the router take what is sold, swap, and take the permission back
    function calls(Trade[] memory trades, address account) internal view returns (Execution[] memory list) {
        list = new Execution[](trades.length * 3);
        for (uint256 i = 0; i < trades.length; i++) {
            Trade memory trade = trades[i];
            list[i * 3] = _approve(trade.tokenIn, trade.stock.router, trade.amountIn);
            list[i * 3 + 1] = _swap(trade, account);
            list[i * 3 + 2] = _approve(trade.tokenIn, trade.stock.router, 0);
        }
    }

    /// @notice The trades of both lists, in order
    function concat(Trade[] memory head, Trade[] memory tail) internal pure returns (Trade[] memory list) {
        list = new Trade[](head.length + tail.length);
        for (uint256 i = 0; i < head.length; i++) {
            list[i] = head[i];
        }
        for (uint256 i = 0; i < tail.length; i++) {
            list[head.length + i] = tail[i];
        }
    }

    /// @notice The first `count` trades of a list that was made longer than it needed to be
    function first(Trade[] memory trades, uint256 count) internal pure returns (Trade[] memory list) {
        list = new Trade[](count);
        for (uint256 i = 0; i < count; i++) {
            list[i] = trades[i];
        }
    }

    function _approve(address token, address spender, uint256 amount) private pure returns (Execution memory) {
        return Execution(token, 0, abi.encodeCall(IERC20Minimal.approve, (spender, amount)));
    }

    function _swap(Trade memory trade, address account) private view returns (Execution memory) {
        ISlipstreamRouter.ExactInputSingleParams memory params = ISlipstreamRouter.ExactInputSingleParams({
            tokenIn: trade.tokenIn,
            tokenOut: trade.tokenOut,
            tickSpacing: trade.stock.tickSpacing,
            recipient: account,
            deadline: block.timestamp,
            amountIn: trade.amountIn,
            amountOutMinimum: trade.minOut,
            sqrtPriceLimitX96: 0
        });
        return Execution(trade.stock.router, 0, abi.encodeCall(ISlipstreamRouter.exactInputSingle, (params)));
    }
}
