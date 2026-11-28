// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {Allocation} from "../src/blocks/types/Allocation.sol";
import {IBlock} from "../src/blocks/interfaces/IBlock.sol";
import {ICondition} from "../src/blocks/interfaces/ICondition.sol";
import {Indicator, Op, Schedule} from "../src/blocks/types/Enums.sol";
import {Channels} from "../src/blocks/Channels.sol";
import {AssetBlock} from "../src/blocks/leaves/AssetBlock.sol";
import {CashBlock} from "../src/blocks/leaves/CashBlock.sol";
import {EqualGroup} from "../src/blocks/groups/EqualGroup.sol";
import {IfBlock} from "../src/blocks/logic/IfBlock.sol";
import {RebalanceBlock} from "../src/blocks/logic/RebalanceBlock.sol";
import {BlockBuilders} from "./support/BlockBuilders.sol";
import {MockReadings} from "./mocks/MockReadings.sol";

/// @notice The simplest strategy that still decides something: own AAPL and MSFT in equal parts while the market is in an uptrend, and sit in cash
/// when it is not. Look once a week, and only trade if a stock has drifted more than 5 points from its half.
///
///     RebalanceBlock (weekly, 5% drift)
///     └─ IfBlock (SPY price is above its 200-day average?)
///        ├─ yes: EqualGroup [AssetBlock AAPL, AssetBlock MSFT]
///        └─ no:  CashBlock
contract SimpleStrategyTest is Test {
    MockReadings private readings;
    RebalanceBlock private strategy;

    address private aapl = makeAddr("AAPL");
    address private msft = makeAddr("MSFT");
    address private spy = makeAddr("SPY");

    function setUp() public {
        readings = new MockReadings();
        strategy = new RebalanceBlock(trendGate(), 500, Schedule.Weekly);
    }

    // ---------------------------------------------------------------------------------------------------------- the strategy
    function trendGate() private returns (IBlock) {
        ICondition marketIsUp =
            BlockBuilders.compareReadings(Indicator.Price, 0, spy, Op.Greater, Indicator.Sma, 200, spy);

        IBlock[] memory stocks = new IBlock[](2);
        stocks[0] = new AssetBlock(aapl);
        stocks[1] = new AssetBlock(msft);

        return new IfBlock(marketIsUp, new EqualGroup(stocks), new CashBlock());
    }

    /// The market's price and its 200-day average, with 6 decimals as the blocks read them
    function setMarket(int256 price, int256 average) private {
        readings.set(Channels.indicator(Indicator.Price, 0, spy), price);
        readings.set(Channels.indicator(Indicator.Sma, 200, spy), average);
    }

    function target(uint16 aaplBps, uint16 msftBps) private view returns (Allocation[] memory list) {
        list = new Allocation[](2);
        list[0] = Allocation(aapl, aaplBps);
        list[1] = Allocation(msft, msftBps);
    }

    // ---------------------------------------------------------------------------------------------------------- what it holds
    function test_inAnUptrendItHoldsBothStocksEqually() public {
        setMarket(510e6, 480e6);

        Allocation[] memory held = strategy.evaluate(readings);

        assertEq(held.length, 2);
        assertEq(held[0].stock, aapl);
        assertEq(held[0].weightBps, 5000);
        assertEq(held[1].stock, msft);
        assertEq(held[1].weightBps, 5000);
    }

    function test_inADowntrendItHoldsNothing() public {
        setMarket(450e6, 480e6);

        assertEq(strategy.evaluate(readings).length, 0);
    }

    function test_theMarketGoingFromUpToDownMovesItToCash() public {
        setMarket(510e6, 480e6);
        assertEq(strategy.evaluate(readings).length, 2);

        setMarket(470e6, 480e6);
        assertEq(strategy.evaluate(readings).length, 0);
    }

    function test_withoutAMarketReadingItDoesNotGuess() public {
        // No price posted yet: the evaluation stops instead of picking a side
        vm.expectRevert("No reading");
        strategy.evaluate(readings);
    }

    // ---------------------------------------------------------------------------------------------------------- when it acts
    function test_itTradesOnTheFirstLook() public view {
        assertTrue(strategy.shouldRebalance(target(0, 0), target(5000, 5000), 0));
    }

    function test_itLeavesASmallDriftAlone() public {
        vm.warp(1_800_000_000);
        uint256 lastLook = block.timestamp;

        vm.warp(lastLook + 7 days);
        assertFalse(strategy.shouldRebalance(target(5300, 4700), target(5000, 5000), lastLook));
    }

    function test_itTradesBackWhenAStockHasDriftedAWeekLater() public {
        vm.warp(1_800_000_000);
        uint256 lastLook = block.timestamp;

        vm.warp(lastLook + 7 days);
        assertTrue(strategy.shouldRebalance(target(6500, 3500), target(5000, 5000), lastLook));
    }

    function test_itDoesNotLookTwiceInAWeek() public {
        vm.warp(1_800_000_000);
        uint256 lastLook = block.timestamp;

        vm.warp(lastLook + 3 days);
        assertFalse(strategy.shouldRebalance(target(6500, 3500), target(5000, 5000), lastLook));
    }
}
