// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ChannelForEachChild, NoStock, PickOutOfRange, ShareForEachChild, ShareOfZero, SharesOver100, StockTwice, UseEqualGroup, ValueBelowZero, VolatilityNotAboveZero, WeightChannelForEachStock} from "../src/blocks/BlockErrors.sol";
import {Test} from "forge-std/Test.sol";

import {Allocation} from "../src/blocks/types/Allocation.sol";
import {IBlock} from "../src/blocks/interfaces/IBlock.sol";
import {ICondition} from "../src/blocks/interfaces/ICondition.sol";
import {IReadings} from "../src/blocks/interfaces/IReadings.sol";
import {Indicator, Op, Pick, Schedule, Weighting} from "../src/blocks/types/Enums.sol";
import {Allocations} from "../src/blocks/Allocations.sol";
import {Channels} from "../src/blocks/Channels.sol";
import {AssetBlock} from "../src/blocks/leaves/AssetBlock.sol";
import {CashBlock} from "../src/blocks/leaves/CashBlock.sol";
import {EqualGroup} from "../src/blocks/groups/EqualGroup.sol";
import {ChannelWeightedGroup} from "../src/blocks/groups/ChannelWeightedGroup.sol";
import {SpecifiedGroup} from "../src/blocks/groups/SpecifiedGroup.sol";
import {FilterBlock} from "../src/blocks/logic/FilterBlock.sol";
import {IfBlock} from "../src/blocks/logic/IfBlock.sol";
import {RebalanceBlock} from "../src/blocks/logic/RebalanceBlock.sol";
import {AllCondition} from "../src/blocks/conditions/AllCondition.sol";
import {AnyCondition} from "../src/blocks/conditions/AnyCondition.sol";

import {FreshReadings} from "../src/signals/FreshReadings.sol";
import {SignalBoard} from "../src/signals/SignalBoard.sol";
import {BlockBuilders} from "./support/BlockBuilders.sol";
import {MockReadings} from "./mocks/MockReadings.sol";

contract BlocksTest is Test {
    MockReadings private readings;

    address private amzn = makeAddr("AMZN");
    address private nvda = makeAddr("NVDA");
    address private ant = makeAddr("ANT");
    address private aapl = makeAddr("AAPL");
    address private spy = makeAddr("SPY");

    uint256 private constant ONE = 1e6;

    function setUp() public {
        readings = new MockReadings();
    }

    // ---------------------------------------------------------------------------------------------------------- helpers
    function asset(address stock) private returns (IBlock) {
        return new AssetBlock(stock);
    }

    function pair(IBlock a, IBlock b) private pure returns (IBlock[] memory list) {
        list = new IBlock[](2);
        list[0] = a;
        list[1] = b;
    }

    function stockList(address a, address b, address c, address d) private pure returns (address[] memory list) {
        list = new address[](4);
        list[0] = a;
        list[1] = b;
        list[2] = c;
        list[3] = d;
    }

    function setIndicator(Indicator kind, uint16 window, address stock, int256 value) private {
        readings.set(Channels.indicator(kind, window, stock), value);
    }

    function ret(address stock, int256 percentTimesTen) private {
        // 12.5% is 125 here: percent times ten, then 6 decimals of a fraction
        setIndicator(Indicator.Return, 126, stock, (percentTimesTen * int256(ONE)) / 1000);
    }

    function weightOf(Allocation[] memory list, address stock) private pure returns (uint256) {
        return Allocations.weightOf(list, stock);
    }

    function comparison(Indicator kind, uint16 window, address stock, Op op, int256 constantRight)
        private
        returns (ICondition)
    {
        return BlockBuilders.compare(kind, window, stock, op, constantRight);
    }

    // ---------------------------------------------------------------------------------------------------------- leaves
    function test_anAssetHoldsItsStockWhole() public {
        Allocation[] memory list = asset(nvda).evaluate(readings);
        assertEq(list.length, 1);
        assertEq(list[0].stock, nvda);
        assertEq(list[0].weightBps, 10_000);
    }

    function test_cashHoldsNothing() public {
        assertEq(new CashBlock().evaluate(readings).length, 0);
    }

    function test_aBlockNeedsWhatItWrapsToExist() public {
        vm.expectRevert(NoStock.selector);
        new AssetBlock(address(0));
    }

    // ---------------------------------------------------------------------------------------------------------- groups
    function test_anEqualGroupSplitsEvenlyAndHoldsAllOfIt() public {
        IBlock[] memory children = new IBlock[](3);
        children[0] = asset(amzn);
        children[1] = asset(nvda);
        children[2] = asset(ant);
        Allocation[] memory list = new EqualGroup(children).evaluate(readings);

        assertEq(list.length, 3);
        // 10,000 does not divide by 3: the first gets the extra basis point, so nothing is left over
        assertEq(weightOf(list, amzn), 3334);
        assertEq(weightOf(list, nvda), 3333);
        assertEq(weightOf(list, ant), 3333);
        assertEq(Allocations.total(list), 10_000);
    }

    function test_aStockInTwoChildrenHasItsSharesAdded() public {
        Allocation[] memory list = new EqualGroup(pair(asset(nvda), asset(nvda))).evaluate(readings);
        assertEq(list.length, 1);
        assertEq(list[0].weightBps, 10_000);
    }

    function test_aSpecifiedGroupSplitsAsToldAndLeavesTheRestAsCash() public {
        uint16[] memory shares = new uint16[](2);
        shares[0] = 6000;
        shares[1] = 3000;
        Allocation[] memory list = new SpecifiedGroup(pair(asset(nvda), asset(amzn)), shares).evaluate(readings);

        assertEq(weightOf(list, nvda), 6000);
        assertEq(weightOf(list, amzn), 3000);
        assertEq(Allocations.total(list), 9000);
    }

    function test_aSpecifiedGroupMustAddUpAndHaveEveryShare() public {
        // The children are made first, so the revert expected is the group's and not a child's
        IBlock[] memory children = pair(asset(nvda), asset(amzn));

        uint16[] memory over = new uint16[](2);
        over[0] = 6000;
        over[1] = 4001;
        vm.expectRevert(SharesOver100.selector);
        new SpecifiedGroup(children, over);

        uint16[] memory one = new uint16[](1);
        one[0] = 5000;
        vm.expectRevert(ShareForEachChild.selector);
        new SpecifiedGroup(children, one);

        uint16[] memory zero = new uint16[](2);
        zero[1] = 5000;
        vm.expectRevert(ShareOfZero.selector);
        new SpecifiedGroup(children, zero);
    }

    function test_groupsAreNested() public {
        // Half in NVDA, half split between AMZN and ANT
        uint16[] memory shares = new uint16[](2);
        shares[0] = 5000;
        shares[1] = 5000;
        IBlock inner = new EqualGroup(pair(asset(amzn), asset(ant)));
        Allocation[] memory list = new SpecifiedGroup(pair(asset(nvda), inner), shares).evaluate(readings);

        assertEq(weightOf(list, nvda), 5000);
        assertEq(weightOf(list, amzn), 2500);
        assertEq(weightOf(list, ant), 2500);
    }

    /// A value each child has, kept under an id of the test's own: the group does not know it is a volatility
    function weightChannel(string memory what, IBlock child) private pure returns (bytes32) {
        return keccak256(abi.encode(what, child));
    }

    function twoChannels(IBlock a, IBlock b) private pure returns (bytes32[] memory list) {
        list = new bytes32[](2);
        list[0] = weightChannel("volatility", a);
        list[1] = weightChannel("volatility", b);
    }

    function test_aGroupWeightedByTheInverseOfAValueGivesTheSmallerMore() public {
        IBlock calm = asset(amzn);
        IBlock wild = asset(nvda);
        readings.set(weightChannel("volatility", calm), int256(200_000)); // 20%
        readings.set(weightChannel("volatility", wild), int256(400_000)); // 40%

        Allocation[] memory list =
            new ChannelWeightedGroup(pair(calm, wild), twoChannels(calm, wild), Weighting.Inverse).evaluate(readings);
        // 1/0.2 : 1/0.4 is 2 : 1
        assertEq(weightOf(list, amzn), 6666);
        assertEq(weightOf(list, nvda), 3333);
    }

    function test_aGroupWeightedByAValueGivesTheBiggerMore() public {
        IBlock small = asset(amzn);
        IBlock big = asset(nvda);
        readings.set(weightChannel("cap", small), int256(100e6));
        readings.set(weightChannel("cap", big), int256(300e6));
        bytes32[] memory channels = new bytes32[](2);
        channels[0] = weightChannel("cap", small);
        channels[1] = weightChannel("cap", big);

        Allocation[] memory list =
            new ChannelWeightedGroup(pair(small, big), channels, Weighting.Proportional).evaluate(readings);
        assertEq(weightOf(list, amzn), 2500);
        assertEq(weightOf(list, nvda), 7500);
    }

    function test_aValueThatCannotBeWeightedByIsRefused() public {
        IBlock calm = asset(amzn);
        IBlock wild = asset(nvda);
        readings.set(weightChannel("volatility", calm), int256(0));
        readings.set(weightChannel("volatility", wild), int256(400_000));
        ChannelWeightedGroup inverse =
            new ChannelWeightedGroup(pair(calm, wild), twoChannels(calm, wild), Weighting.Inverse);
        vm.expectRevert(VolatilityNotAboveZero.selector);
        inverse.evaluate(readings);

        readings.set(weightChannel("volatility", calm), -int256(1));
        ChannelWeightedGroup proportional =
            new ChannelWeightedGroup(pair(calm, wild), twoChannels(calm, wild), Weighting.Proportional);
        vm.expectRevert(ValueBelowZero.selector);
        proportional.evaluate(readings);
    }

    function test_aChannelWeightedGroupIsBuiltFromSomethingSensible() public {
        IBlock[] memory children = pair(asset(amzn), asset(nvda));
        bytes32[] memory channels = twoChannels(children[0], children[1]);
        vm.expectRevert(UseEqualGroup.selector);
        new ChannelWeightedGroup(children, channels, Weighting.Equal);
        vm.expectRevert(ChannelForEachChild.selector);
        new ChannelWeightedGroup(children, new bytes32[](1), Weighting.Inverse);
    }

    // ---------------------------------------------------------------------------------------------------------- if
    function test_anIfBlockHoldsOneBranchOrTheOther() public {
        ICondition rsiHigh = comparison(Indicator.Rsi, 10, spy, Op.Greater, int256(70 * ONE));
        IBlock block_ = new IfBlock(rsiHigh, asset(amzn), asset(nvda));

        setIndicator(Indicator.Rsi, 10, spy, int256(80 * ONE));
        assertEq(block_.evaluate(readings)[0].stock, amzn);

        setIndicator(Indicator.Rsi, 10, spy, int256(60 * ONE));
        assertEq(block_.evaluate(readings)[0].stock, nvda);
    }

    function test_aConditionCanCompareTwoReadings() public {
        ICondition beatsTheMarket =
            BlockBuilders.compareReadings(Indicator.Return, 10, nvda, Op.Greater, Indicator.Return, 10, spy);

        setIndicator(Indicator.Return, 10, nvda, int256(80_000));
        setIndicator(Indicator.Return, 10, spy, int256(30_000));
        assertTrue(beatsTheMarket.holds(readings));

        setIndicator(Indicator.Return, 10, nvda, int256(20_000));
        assertFalse(beatsTheMarket.holds(readings));
    }

    function test_allAndAnyCombineConditions() public {
        setIndicator(Indicator.Rsi, 10, spy, int256(80 * ONE));
        setIndicator(Indicator.Drawdown, 10, spy, -int256(5 * ONE) / 100);

        ICondition high = comparison(Indicator.Rsi, 10, spy, Op.Greater, int256(70 * ONE));
        ICondition deepFall = comparison(Indicator.Drawdown, 10, spy, Op.Less, -int256(20 * ONE) / 100);

        ICondition[] memory both = new ICondition[](2);
        both[0] = high;
        both[1] = deepFall;
        assertFalse(new AllCondition(both).holds(readings));
        assertTrue(new AnyCondition(both).holds(readings));

        setIndicator(Indicator.Rsi, 10, spy, int256(50 * ONE));
        assertFalse(new AnyCondition(both).holds(readings));
    }

    function test_aMissingReadingStopsTheWholeEvaluation() public {
        IBlock block_ = new IfBlock(comparison(Indicator.Rsi, 10, spy, Op.Greater, 0), asset(amzn), asset(nvda));
        vm.expectRevert("No reading");
        block_.evaluate(readings);
    }

    // ---------------------------------------------------------------------------------------------------------- filter
    function setReturns() private {
        ret(amzn, 80); // +8.0%
        ret(nvda, 300);
        ret(ant, -50);
        ret(aapl, 150);
    }

    function test_aFilterHoldsTheTopByReturnEqually() public {
        setReturns();
        FilterBlock filter = BlockBuilders.filter(
            stockList(amzn, nvda, ant, aapl), Pick.Top, 2, Indicator.Return, 126, Weighting.Equal, 0
        );
        Allocation[] memory list = filter.evaluate(readings);

        assertEq(list.length, 2);
        // Best first
        assertEq(list[0].stock, nvda);
        assertEq(list[1].stock, aapl);
        assertEq(list[0].weightBps, 5000);
        assertEq(list[1].weightBps, 5000);
    }

    function test_aFilterCanTakeTheBottomInstead() public {
        setReturns();
        FilterBlock filter = BlockBuilders.filter(
            stockList(amzn, nvda, ant, aapl), Pick.Bottom, 2, Indicator.Return, 126, Weighting.Equal, 0
        );
        Allocation[] memory list = filter.evaluate(readings);
        assertEq(list[0].stock, ant);
        assertEq(list[1].stock, amzn);
    }

    function test_aFilterCanWeightTheWinnersBySteadiness() public {
        setReturns();
        setIndicator(Indicator.Volatility, 60, nvda, int256(400_000));
        setIndicator(Indicator.Volatility, 60, aapl, int256(200_000));
        FilterBlock filter = BlockBuilders.filter(
            stockList(amzn, nvda, ant, aapl), Pick.Top, 2, Indicator.Return, 126, Weighting.Inverse, 60
        );
        Allocation[] memory list = filter.evaluate(readings);

        assertEq(weightOf(list, aapl), 6666);
        assertEq(weightOf(list, nvda), 3333);
    }

    function test_aTieGoesToTheEarlierInTheList() public {
        ret(amzn, 100);
        ret(nvda, 100);
        ret(ant, 100);
        ret(aapl, 100);
        FilterBlock filter = BlockBuilders.filter(
            stockList(amzn, nvda, ant, aapl), Pick.Top, 2, Indicator.Return, 126, Weighting.Equal, 0
        );
        Allocation[] memory list = filter.evaluate(readings);
        assertEq(list[0].stock, amzn);
        assertEq(list[1].stock, nvda);
    }

    function test_aFilterIsBuiltFromSomethingSensible() public {
        address[] memory list = stockList(amzn, nvda, ant, aapl);
        vm.expectRevert(PickOutOfRange.selector);
        BlockBuilders.filter(list, Pick.Top, 5, Indicator.Return, 126, Weighting.Equal, 0);
        vm.expectRevert(PickOutOfRange.selector);
        BlockBuilders.filter(list, Pick.Top, 0, Indicator.Return, 126, Weighting.Equal, 0);
        // Weighting the winners by a value needs a channel for each stock to read it from
        bytes32[] memory scores = new bytes32[](4);
        vm.expectRevert(WeightChannelForEachStock.selector);
        new FilterBlock(list, scores, Pick.Top, 2, Weighting.Inverse, new bytes32[](1));
        vm.expectRevert(StockTwice.selector);
        BlockBuilders.filter(stockList(amzn, amzn, ant, aapl), Pick.Top, 2, Indicator.Return, 126, Weighting.Equal, 0);
    }

    // ---------------------------------------------------------------------------------------------------------- rebalance
    function targets(uint16 a, uint16 b) private view returns (Allocation[] memory list) {
        list = new Allocation[](2);
        list[0] = Allocation(amzn, a);
        list[1] = Allocation(nvda, b);
    }

    function test_aRebalanceHoldsWhatItsChildHolds() public {
        RebalanceBlock block_ = new RebalanceBlock(asset(nvda), 500, Schedule.Weekly);
        assertEq(block_.evaluate(readings)[0].stock, nvda);
    }

    function test_theFirstLookIsAlwaysDue() public {
        RebalanceBlock block_ = new RebalanceBlock(asset(nvda), 500, Schedule.Weekly);
        assertTrue(block_.shouldRebalance(targets(5000, 5000), targets(5000, 5000), 0));
    }

    function test_itWaitsForTheScheduleAndThenForADrift() public {
        vm.warp(1_800_000_000);
        RebalanceBlock block_ = new RebalanceBlock(asset(nvda), 500, Schedule.Weekly);
        uint256 last = block_.interval() == 7 days ? block_.interval() : 0;
        assertEq(last, 7 days);
        uint256 lastAt = block.timestamp;

        // Drifted 10 points, but not yet a week
        vm.warp(lastAt + 6 days);
        assertFalse(block_.shouldRebalance(targets(6000, 4000), targets(5000, 5000), lastAt));

        // A week on, drifted 10 points: more than the 5 allowed
        vm.warp(lastAt + 7 days);
        assertTrue(block_.shouldRebalance(targets(6000, 4000), targets(5000, 5000), lastAt));

        // A week on but only 3 points apart: leave it
        assertFalse(block_.shouldRebalance(targets(5300, 4700), targets(5000, 5000), lastAt));
    }

    function test_aStockThatIsNoLongerWantedCountsAsDrift() public {
        vm.warp(1_800_000_000);
        RebalanceBlock block_ = new RebalanceBlock(asset(nvda), 500, Schedule.Daily);
        Allocation[] memory held = new Allocation[](1);
        held[0] = Allocation(ant, 5000);
        Allocation[] memory wanted = new Allocation[](1);
        wanted[0] = Allocation(nvda, 5000);
        vm.warp(block.timestamp + 1 days);
        assertTrue(block_.shouldRebalance(held, wanted, block.timestamp - 1 days));
    }

    function test_theSchedulesAreADayAWeekAndAMonth() public {
        assertEq(new RebalanceBlock(asset(nvda), 0, Schedule.Daily).interval(), 1 days);
        assertEq(new RebalanceBlock(asset(nvda), 0, Schedule.Weekly).interval(), 7 days);
        assertEq(new RebalanceBlock(asset(nvda), 0, Schedule.Monthly).interval(), 30 days);
    }

    // ---------------------------------------------------------------------------------------------------------- a whole strategy
    /// The strategy the app builds for "the best performers over 6 months": a rebalance of a filter, in a trend gate:
    /// if SPY's price is above its 200-day average, hold the 2 best of four by 126-day return, steadier ones more; otherwise cash.
    function test_aWholeStrategyIsATreeOfBlocks() public {
        ICondition aboveTrend =
            BlockBuilders.compareReadings(Indicator.Price, 0, spy, Op.Greater, Indicator.Sma, 200, spy);

        FilterBlock best = BlockBuilders.filter(
            stockList(amzn, nvda, ant, aapl), Pick.Top, 2, Indicator.Return, 126, Weighting.Inverse, 60
        );
        IBlock strategy = new RebalanceBlock(new IfBlock(aboveTrend, best, new CashBlock()), 500, Schedule.Weekly);

        setReturns();
        setIndicator(Indicator.Volatility, 60, nvda, int256(400_000));
        setIndicator(Indicator.Volatility, 60, aapl, int256(200_000));

        // Above the trend: the two best, the steadier more
        setIndicator(Indicator.Price, 0, spy, int256(500 * ONE));
        setIndicator(Indicator.Sma, 200, spy, int256(450 * ONE));
        Allocation[] memory up = strategy.evaluate(readings);
        assertEq(up.length, 2);
        assertEq(weightOf(up, aapl), 6666);
        assertEq(weightOf(up, nvda), 3333);

        // Below it: all cash
        setIndicator(Indicator.Price, 0, spy, int256(400 * ONE));
        assertEq(strategy.evaluate(readings).length, 0);
    }

    // ---------------------------------------------------------------------------------------------------------- the board
    function test_aStrategyRunsOnTheBoardsNumbersAndRefusesStaleOnes() public {
        vm.warp(1_800_000_000);
        address publisher = makeAddr("publisher");
        SignalBoard board = new SignalBoard(publisher);
        FreshReadings fresh = new FreshReadings(board, 1 hours);

        FilterBlock filter = BlockBuilders.filter(
            stockList(amzn, nvda, ant, aapl), Pick.Top, 1, Indicator.Return, 126, Weighting.Equal, 0
        );

        vm.startPrank(publisher);
        board.postValue(
            Channels.indicator(Indicator.Return, 126, amzn), int256(80_000), uint64(block.timestamp), bytes32(0)
        );
        board.postValue(
            Channels.indicator(Indicator.Return, 126, nvda), int256(300_000), uint64(block.timestamp), bytes32(0)
        );
        board.postValue(
            Channels.indicator(Indicator.Return, 126, ant), -int256(50_000), uint64(block.timestamp), bytes32(0)
        );
        board.postValue(
            Channels.indicator(Indicator.Return, 126, aapl), int256(150_000), uint64(block.timestamp), bytes32(0)
        );
        vm.stopPrank();

        Allocation[] memory list = filter.evaluate(fresh);
        assertEq(list[0].stock, nvda);

        // An hour and a second on, the numbers are too old for the strategy to run on
        vm.warp(block.timestamp + 1 hours + 1);
        vm.expectRevert();
        filter.evaluate(fresh);
    }
}
