// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {AbstractCallback} from "reactive-lib/abstract-base/AbstractCallback.sol";

import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {SafeToken} from "../libraries/SafeToken.sol";
import {IAerodromeRouter} from "./IAerodromeRouter.sol";

/// @notice The destination half of the Aerodrome stop-loss: sells the owner's stock token for USDC on Aerodrome when the reactive contract says
/// the stop has been hit.
/// @dev Deployed on the pool's chain by the person whose stock it is. They are its only owner, the only person whose tokens it ever moves, and
/// where every sale's proceeds go. The money never sits here: it is pulled from the owner's wallet within the allowance they gave this contract
/// and the USDC goes straight back to them. A sale is refused unless it gets at least the price the reactive contract saw, less a small slippage.
contract AerodromeStopLossCallback is AbstractCallback {
    using SafeToken for IERC20Minimal;

    event Sold(address indexed owner, uint256 stockSold, uint256 observedPrice);
    event NothingToSell(address indexed owner);
    error SlippageOver100();


    uint256 private constant BPS = 10_000;
    uint256 private constant PRICE_UNIT = 1e18;

    IAerodromeRouter public immutable router;
    address public immutable poolFactory;
    IERC20Minimal public immutable stock;
    IERC20Minimal public immutable quote;
    uint256 public immutable stockUnit;
    uint256 public immutable quoteUnit;
    uint256 public immutable maxSlippageBps;
    address public immutable owner;

    /// @param callbackSender The Reactive callback proxy of this chain, the only address allowed to call `stopLoss`
    /// @param poolFactory_ The Aerodrome pool factory the stock/USDC pool came from (a route names it)
    /// @param maxSlippageBps_ How far below the price the stop saw a sale may land, in basis points (100 is 1%)
    constructor(
        address callbackSender,
        address router_,
        address poolFactory_,
        address stock_,
        address quote_,
        uint8 stockDecimals,
        uint8 quoteDecimals,
        uint256 maxSlippageBps_
    ) payable AbstractCallback(callbackSender) {
        if (maxSlippageBps_ >= BPS) revert SlippageOver100();
        owner = msg.sender;
        router = IAerodromeRouter(router_);
        poolFactory = poolFactory_;
        stock = IERC20Minimal(stock_);
        quote = IERC20Minimal(quote_);
        stockUnit = 10 ** stockDecimals;
        quoteUnit = 10 ** quoteDecimals;
        maxSlippageBps = maxSlippageBps_;
    }

    /// @param rvmId Filled in by the Reactive Network with the address of the reactive contract's owner
    /// @param observedPrice USDC per whole stock token with 18 decimals, as the reactive contract saw it
    function stopLoss(address rvmId, uint256 observedPrice) external authorizedSenderOnly rvmIdOnly(rvmId) {
        // What the owner is willing to have sold is what they approved to this contract, and no more than they hold
        uint256 amountIn = _min(stock.balanceOf(owner), stock.allowance(owner, address(this)));
        if (amountIn == 0) {
            emit NothingToSell(owner);
            return;
        }

        stock.safeTransferFrom(owner, address(this), amountIn);
        stock.safeApprove(address(router), amountIn);

        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](1);
        routes[0] =
            IAerodromeRouter.Route({from: address(stock), to: address(quote), stable: false, factory: poolFactory});

        router.swapExactTokensForTokens(amountIn, _minOut(amountIn, observedPrice), routes, owner, block.timestamp);

        stock.safeApprove(address(router), 0);
        emit Sold(owner, amountIn, observedPrice);
    }

    /// @dev The USDC a sale has to bring in: the stock's value at the price seen, less the slippage allowed
    function _minOut(uint256 amountIn, uint256 observedPrice) private view returns (uint256) {
        return (amountIn * observedPrice * quoteUnit * (BPS - maxSlippageBps)) / (stockUnit * PRICE_UNIT * BPS);
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}
