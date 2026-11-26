// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IReactive} from "reactive-lib/interfaces/IReactive.sol";
import {AbstractReactive} from "reactive-lib/abstract-base/AbstractReactive.sol";

/// @notice A stop-loss on one stock token, watched from its Aerodrome pool. When the pool's price falls to the stop price, it asks the
/// Reactive Network to call `AerodromeStopLossCallback.stopLoss` on the pool's chain, once.
/// @dev The reactive half. Deployed to the Reactive Network by the person whose stock it is, as a personal contract, next to their own
/// callback contract. It watches a classic Aerodrome pool, which emits `Sync(uint256 reserve0, uint256 reserve1)` on every change
/// (aerodrome-finance/contracts, `interfaces/IPool.sol`); a concentrated-liquidity (Slipstream) pool emits other events and needs another contract.
/// The price is the pool's spot price, which a large trade can move for a moment, so the callback also guards what it will accept.
contract AerodromeStopLossReactive is IReactive, AbstractReactive {
    event StopLossTriggered(uint256 price);

    uint256 private constant SYNC_TOPIC_0 = uint256(keccak256("Sync(uint256,uint256)"));
    uint64 private constant CALLBACK_GAS_LIMIT = 1_000_000;
    /// @dev Prices are quote tokens per whole stock token, with 18 decimals, whatever the tokens' own decimals
    uint256 public constant PRICE_UNIT = 1e18;

    uint256 public immutable chainId;
    address public immutable pool;
    address public immutable callback;
    bool public immutable isStockToken0;
    uint256 public immutable stockUnit;
    uint256 public immutable quoteUnit;
    uint256 public immutable stopPrice;

    /// @notice Set once the stop has fired, so it fires once and not on every update after
    bool public triggered;

    /// @param chainId_ The chain the pool and the callback are on (Base is 8453)
    /// @param isStockToken0_ Whether the stock is the pool's token0 (and the quote, USDC, token1)
    /// @param stopPrice_ In USDC per whole stock token with 18 decimals: the entry price times (1 - the stop-loss limit)
    constructor(
        uint256 chainId_,
        address pool_,
        address callback_,
        bool isStockToken0_,
        uint8 stockDecimals,
        uint8 quoteDecimals,
        uint256 stopPrice_
    ) payable {
        require(stopPrice_ > 0, "Stop price is zero");
        chainId = chainId_;
        pool = pool_;
        callback = callback_;
        isStockToken0 = isStockToken0_;
        stockUnit = 10 ** stockDecimals;
        quoteUnit = 10 ** quoteDecimals;
        stopPrice = stopPrice_;

        // Subscribing is done by the copy on the Reactive Network; the ReactVM copy has no system contract to subscribe with
        if (!vm) {
            service.subscribe(chainId_, pool_, SYNC_TOPIC_0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
        }
    }

    /// @notice Called by the Reactive Network for each `Sync` of the pool
    function react(LogRecord calldata log) external vmOnly {
        if (triggered) return;
        if (log.chain_id != chainId || log._contract != pool || log.topic_0 != SYNC_TOPIC_0) return;

        (uint256 reserve0, uint256 reserve1) = abi.decode(log.data, (uint256, uint256));
        (uint256 stockReserve, uint256 quoteReserve) = isStockToken0 ? (reserve0, reserve1) : (reserve1, reserve0);
        if (stockReserve == 0 || quoteReserve == 0) return;

        uint256 price = (quoteReserve * stockUnit * PRICE_UNIT) / (stockReserve * quoteUnit);
        if (price > stopPrice) return;

        triggered = true;
        emit StopLossTriggered(price);

        // The first argument is overwritten with this contract's owner on the way, so the callback knows whose stop it is
        bytes memory payload = abi.encodeWithSignature("stopLoss(address,uint256)", address(0), price);
        emit Callback(chainId, callback, CALLBACK_GAS_LIMIT, payload);
    }
}
