// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";

import {MockCLPool} from "./mocks/MockCLPool.sol";
import {MockCLRouter} from "./mocks/MockCLRouter.sol";
import {MockReadings} from "./mocks/MockReadings.sol";
import {MockToken} from "./mocks/MockToken.sol";

import {Allocation} from "../src/blocks/types/Allocation.sol";
import {IndexWeighting, Indicator, Op} from "../src/blocks/types/Enums.sol";
import {Channels} from "../src/blocks/Channels.sol";
import {NoStock, NotAnIndex} from "../src/blocks/BlockErrors.sol";
import {IndexBlock} from "../src/blocks/leaves/IndexBlock.sol";
import {CashBlock} from "../src/blocks/leaves/CashBlock.sol";
import {Index} from "../src/index/Index.sol";
import {ComparisonCondition} from "../src/blocks/conditions/ComparisonCondition.sol";
import {IfBlock} from "../src/blocks/logic/IfBlock.sol";
import {IndexDeposits} from "../src/index/IndexDeposits.sol";
import {IndexFactory} from "../src/index/IndexFactory.sol";
import {IndexSettings} from "../src/index/IndexTypes.sol";
import {PoolPricing} from "../src/pricing/PoolPricing.sol";
import {StockRegistry} from "../src/registry/StockRegistry.sol";
import {StockSetup} from "../src/registry/StockTypes.sol";

/// @dev Prices: USDC (6 decimals) is token0 and a stock (8 decimals) token1, so $100 is one raw stock for one raw USDC, with a sqrtPrice of 2^96
/// and a tick of 0. $200 is half the stock for a USDC. The mock router takes 0.3% on every swap, so a stock bought for $300 is worth $299.10.
/// A pool is made with the same amount of USDC and of stock at $100, so the USDC on one side is half its depth.
abstract contract IndexFixture is Test {
    uint160 internal constant ROOT_100 = uint160(1 << 96);
    uint160 internal constant ROOT_200 = 56022770974786139918731938227;
    int24 internal constant TICK_200 = -6932;
    uint256 internal constant DEEP = 500_000e6;

    address internal poolFactory = makeAddr("pool factory");
    address internal curator = makeAddr("curator");
    address internal keeper = makeAddr("keeper");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal stranger = makeAddr("stranger");

    MockToken internal usdc;
    MockCLRouter internal router;
    StockRegistry internal registry;
    MockReadings internal readings;
    IndexFactory internal factory;

    MockToken[] internal tokens;
    MockCLPool[] internal pools;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        usdc = new MockToken(6);
        router = new MockCLRouter(poolFactory);
        registry = new StockRegistry(address(usdc), address(this));
        readings = new MockReadings();
        factory = new IndexFactory(registry);

        usdc.mint(alice, 10_000e6);
        usdc.mint(bob, 10_000e6);
    }

    /// A stock at $100 in a pool with `side` of USDC and as much stock, so a depth of twice that
    function _addStock(uint256 side) internal returns (uint256 position) {
        MockToken token = new MockToken(8);
        MockCLPool pool = new MockCLPool(address(usdc), address(token), poolFactory);
        router.setPool(address(usdc), address(token), pool);
        pool.setPrice(ROOT_100, 0);
        usdc.mint(address(pool), side);
        token.mint(address(pool), side);
        registry.list(StockSetup(address(token), address(pool), address(router), 10));
        tokens.push(token);
        pools.push(pool);
        return tokens.length - 1;
    }

    function _stocks(uint256 from, uint256 to) internal view returns (address[] memory list) {
        list = new address[](to - from);
        for (uint256 i = from; i < to; i++) {
            list[i - from] = address(tokens[i]);
        }
    }

    function _settings(IndexWeighting weighting, uint16 cashBps, uint256 minPoolDepth)
        internal
        view
        returns (IndexSettings memory)
    {
        return IndexSettings({
            name: "Sandworm Index",
            symbol: "SWF",
            curator: address(0),
            keeper: keeper,
            weighting: weighting,
            topN: 0,
            readings: readings,
            cashBps: cashBps,
            maxSlippageBps: 100,
            minPoolDepth: minPoolDepth,
            driftBps: 500,
            roundInterval: 1 days
        });
    }

    function _make(IndexSettings memory settings, address[] memory list) internal returns (Index index) {
        return _makeWith(settings, list, new uint256[](0));
    }

    function _makeWith(IndexSettings memory settings, address[] memory list, uint256[] memory weights)
        internal
        returns (Index index)
    {
        vm.prank(curator);
        index = factory.create(settings, list, weights);
        vm.prank(alice);
        usdc.approve(address(index), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(index), type(uint256).max);
    }

    function _deposit(Index index, address person, uint256 amount) internal {
        vm.prank(person);
        index.requestDeposit(amount);
    }

    /// A whole round, in pages of `page` stocks
    function _round(Index index, uint256 page) internal {
        vm.warp(block.timestamp + 1 days);
        vm.prank(keeper);
        index.startRound();
        while (index.phase() != Index.Phase.Idle) {
            vm.prank(keeper);
            index.step(page);
        }
    }

    function _claim(Index index, address person, uint256 epoch) internal returns (uint256) {
        vm.prank(person);
        index.claim(epoch);
        return index.balanceOf(person);
    }

    function _held(Index index, uint256 position) internal view returns (uint256) {
        return tokens[position].balanceOf(address(index));
    }
}

/// @dev How an index splits its money: the same for each, by the pools' depth, by a market cap or by a steadiness
contract IndexWeightingTest is IndexFixture {
    function test_anEqualIndexSpreadsTheMoneyEvenly() public {
        for (uint256 i = 0; i < 4; i++) _addStock(DEEP);
        Index index = _make(_settings(IndexWeighting.Equal, 0, 0), _stocks(0, 4));

        _deposit(index, alice, 1000e6);
        _round(index, 100);

        // $250 each, less the router's 0.3%, and none left over
        for (uint256 i = 0; i < 4; i++) {
            assertEq(_held(index, i), 249_250_000);
        }
        assertEq(usdc.balanceOf(address(index)), 0);
        assertEq(_claim(index, alice, 0), 1000e6);
    }

    function test_anIndexKeepsTheCashItWasToldTo() public {
        for (uint256 i = 0; i < 4; i++) _addStock(DEEP);
        Index index = _make(_settings(IndexWeighting.Equal, 1000, 0), _stocks(0, 4));

        _deposit(index, alice, 1000e6);
        _round(index, 100);

        assertEq(usdc.balanceOf(address(index)), 100e6);
        assertEq(_held(index, 0), 224_325_000);
    }

    function test_aLiquidityIndexGivesMoreToTheDeeperPool() public {
        _addStock(500_000e6);
        _addStock(1_500_000e6);
        Index index = _make(_settings(IndexWeighting.Liquidity, 0, 0), _stocks(0, 2));

        _deposit(index, alice, 400e6);
        _round(index, 100);

        // Pools of $1M and $3M: a quarter and three quarters, with no number posted by anyone
        assertEq(_held(index, 0), 99_700_000);
        assertEq(_held(index, 1), 299_100_000);
    }

    function test_aStockWhosePoolIsTooShallowIsGivenNothing() public {
        _addStock(DEEP);
        _addStock(DEEP);
        _addStock(20_000e6);
        Index index = _make(_settings(IndexWeighting.Equal, 0, 100_000e6), _stocks(0, 3));

        _deposit(index, alice, 600e6);
        _round(index, 100);

        // Its share went to the other two
        assertEq(_held(index, 0), 299_100_000);
        assertEq(_held(index, 1), 299_100_000);
        assertEq(_held(index, 2), 0);
    }

    function test_aMarketCapIndexFollowsTheReadings() public {
        for (uint256 i = 0; i < 3; i++) _addStock(DEEP);
        readings.set(Channels.indicator(Indicator.MarketCap, 0, address(tokens[0])), 300e6);
        readings.set(Channels.indicator(Indicator.MarketCap, 0, address(tokens[1])), 100e6);
        // The third has no reading yet, so it is given nothing
        Index index = _make(_settings(IndexWeighting.MarketCap, 0, 0), _stocks(0, 3));

        _deposit(index, alice, 400e6);
        _round(index, 100);

        assertEq(_held(index, 0), 299_100_000);
        assertEq(_held(index, 1), 99_700_000);
        assertEq(_held(index, 2), 0);
    }

    // ---------------------------------------------------------------------------------------------------------------------------------- top N

    /// Five stocks worth 500, 400, 300, 200 and 100, and an index of the largest `size` of them, weighted by what they are worth
    function _marketCapTopN(uint16 size) private returns (Index index) {
        for (uint256 i = 0; i < 5; i++) _addStock(DEEP);
        _setCaps(500e6, 400e6, 300e6, 200e6, 100e6);
        IndexSettings memory settings = _settings(IndexWeighting.MarketCap, 0, 0);
        settings.topN = size;
        index = _make(settings, _stocks(0, 5));
    }

    function _setCaps(uint256 a, uint256 b, uint256 c, uint256 d, uint256 e) private {
        uint256[5] memory caps = [a, b, c, d, e];
        for (uint256 i = 0; i < 5; i++) {
            readings.set(Channels.indicator(Indicator.MarketCap, 0, address(tokens[i])), int256(caps[i]));
        }
    }

    function _topNRound(Index index, uint256 cutoff) private {
        vm.warp(block.timestamp + 1 days);
        vm.prank(keeper);
        index.startRound(cutoff);
        while (index.phase() != Index.Phase.Idle) {
            vm.prank(keeper);
            index.step(100);
        }
    }

    function test_aTopNHoldsOnlyTheLargestAndWeightsThemBySize() public {
        Index index = _marketCapTopN(3);

        _deposit(index, alice, 400e6);
        _topNRound(index, 300e6);

        // 500 : 400 : 300, and nothing in the two smallest
        assertGt(_held(index, 0), 0);
        assertApproxEqRel(_held(index, 0) * 400, _held(index, 1) * 500, 0.02e18);
        assertApproxEqRel(_held(index, 1) * 300, _held(index, 2) * 400, 0.02e18);
        assertEq(_held(index, 3), 0);
        assertEq(_held(index, 4), 0);
    }

    function test_aCutoffThatIsNotTheNthScoreStopsTheRoundAndTradesNothing() public {
        Index index = _marketCapTopN(3);
        _deposit(index, alice, 400e6);

        // Too high: it would leave out the third stock
        _topNRound(index, 400e6);
        assertEq(uint256(index.phase()), uint256(Index.Phase.Idle));
        assertEq(index.lastRoundAt(), 0);
        assertEq(_held(index, 0), 0);

        // Too low: it would let a fourth stock in
        _topNRound(index, 200e6);
        assertEq(index.lastRoundAt(), 0);
        assertEq(_held(index, 3), 0);

        // The right one goes through, and the deposit that waited is priced by it
        _topNRound(index, 300e6);
        assertGt(index.lastRoundAt(), 0);
        assertGt(_held(index, 0), 0);
        assertGt(_claim(index, alice, 0), 0);
    }

    function test_stocksTiedAtTheCutoffAreAllIn() public {
        Index index = _marketCapTopN(2);
        _setCaps(300e6, 300e6, 300e6, 100e6, 100e6);

        _deposit(index, alice, 300e6);
        _topNRound(index, 300e6);

        assertGt(_held(index, 0), 0);
        assertApproxEqRel(_held(index, 0), _held(index, 1), 0.02e18);
        assertApproxEqRel(_held(index, 1), _held(index, 2), 0.02e18);
        assertEq(_held(index, 3), 0);
    }

    function test_aTopNWithFewerStocksThanItsSizeTakesThemAll() public {
        Index index = _marketCapTopN(8);
        _setCaps(500e6, 400e6, 0, 0, 0);

        _deposit(index, alice, 400e6);
        // Only two have a score, so the cutoff is the lowest a score can be
        _topNRound(index, 1);

        assertGt(_held(index, 0), 0);
        assertGt(_held(index, 1), 0);
        assertEq(_held(index, 2), 0);
    }

    function test_aStockThatFallsOutOfTheIndexIsSoldAndOneThatRisesIsBought() public {
        Index index = _marketCapTopN(3);
        _deposit(index, alice, 400e6);
        _topNRound(index, 300e6);
        assertGt(_held(index, 2), 0);
        assertEq(_held(index, 3), 0);

        // The third stock collapses and the fourth overtakes it
        _setCaps(500e6, 400e6, 50e6, 450e6, 100e6);
        _topNRound(index, 400e6);

        assertEq(_held(index, 2), 0);
        assertGt(_held(index, 3), 0);
        assertApproxEqRel(_held(index, 3) * 400, _held(index, 1) * 450, 0.05e18);
    }

    function test_aTopNNeedsACutoffAndOtherIndexesRefuseOne() public {
        Index ranked = _marketCapTopN(3);
        vm.warp(block.timestamp + 1 days);
        vm.prank(keeper);
        vm.expectRevert(Index.NeedsCutoff.selector);
        ranked.startRound();
        vm.prank(keeper);
        vm.expectRevert(Index.ZeroAmount.selector);
        ranked.startRound(0);

        Index plain = _make(_settings(IndexWeighting.MarketCap, 0, 0), _stocks(0, 5));
        vm.prank(keeper);
        vm.expectRevert(Index.NoTopN.selector);
        plain.startRound(300e6);
    }

    function test_aTopNNeedsAScoreToRankBy() public {
        for (uint256 i = 0; i < 3; i++) _addStock(DEEP);
        IndexSettings memory settings = _settings(IndexWeighting.Equal, 0, 0);
        settings.topN = 2;
        address[] memory list = _stocks(0, 3);
        vm.prank(curator);
        vm.expectRevert(Index.TopNeedsRanking.selector);
        factory.create(settings, list, new uint256[](0));

        settings = _settings(IndexWeighting.Liquidity, 0, 0);
        settings.topN = 5_001;
        vm.prank(curator);
        vm.expectRevert(Index.TopTooBig.selector);
        factory.create(settings, list, new uint256[](0));
    }

    function test_anInverseIndexGivesMoreToTheSteadier() public {
        _addStock(DEEP);
        _addStock(DEEP);
        readings.set(Channels.indicator(Indicator.Volatility, 60, address(tokens[0])), 1e6);
        readings.set(Channels.indicator(Indicator.Volatility, 60, address(tokens[1])), 3e6);
        Index index = _make(_settings(IndexWeighting.Inverse, 0, 0), _stocks(0, 2));

        _deposit(index, alice, 400e6);
        _round(index, 100);

        assertApproxEqAbs(_held(index, 0), 299_100_000, 5);
        assertApproxEqAbs(_held(index, 1), 99_700_000, 5);
    }

    function _customIndex() private returns (Index index) {
        for (uint256 i = 0; i < 3; i++) _addStock(DEEP);
        // Made with a zero for each stock, which the tests then change
        index = _makeWith(_settings(IndexWeighting.Custom, 0, 0), _stocks(0, 3), new uint256[](3));
    }

    function _setCustom(Index index, uint256 a, uint256 b, uint256 c) private {
        address[] memory list = _stocks(0, 3);
        uint256[] memory weights = new uint256[](3);
        weights[0] = a;
        weights[1] = b;
        weights[2] = c;
        vm.prank(curator);
        index.setCustomWeights(list, weights);
    }

    function test_aCustomIndexFollowsTheNumbersTheCuratorSets() public {
        Index index = _customIndex();
        _setCustom(index, 300, 100, 0);

        _deposit(index, alice, 400e6);
        _round(index, 100);

        // 300 and 100 are three quarters and a quarter, and the stock with no number is given nothing
        assertEq(_held(index, 0), 299_100_000);
        assertEq(_held(index, 1), 99_700_000);
        assertEq(_held(index, 2), 0);
    }

    function test_aCustomIndexCanBeMadeWithItsNumbers() public {
        for (uint256 i = 0; i < 3; i++) _addStock(DEEP);
        uint256[] memory weights = new uint256[](3);
        weights[0] = 300;
        weights[1] = 100;
        weights[2] = 0;
        Index index = _makeWith(_settings(IndexWeighting.Custom, 0, 0), _stocks(0, 3), weights);

        // Nothing was set afterwards: the numbers came with the index
        assertEq(index.customWeight(address(tokens[0])), 300);
        assertEq(index.customWeight(address(tokens[1])), 100);

        _deposit(index, alice, 400e6);
        _round(index, 100);
        assertEq(_held(index, 0), 299_100_000);
        assertEq(_held(index, 1), 99_700_000);
        assertEq(_held(index, 2), 0);
    }

    function test_aCustomIndexMustBeMadeWithANumberForEachStock() public {
        for (uint256 i = 0; i < 3; i++) _addStock(DEEP);
        address[] memory list = _stocks(0, 3);
        IndexSettings memory settings = _settings(IndexWeighting.Custom, 0, 0);

        vm.prank(curator);
        vm.expectRevert(Index.LengthMismatch.selector);
        factory.create(settings, list, new uint256[](2));

        vm.prank(curator);
        vm.expectRevert(Index.LengthMismatch.selector);
        factory.create(settings, list, new uint256[](0));
    }

    function test_numbersAreRefusedForAnIndexThatIsNotCustom() public {
        for (uint256 i = 0; i < 3; i++) _addStock(DEEP);
        vm.prank(curator);
        vm.expectRevert(Index.NotACustomIndex.selector);
        factory.create(_settings(IndexWeighting.Equal, 0, 0), _stocks(0, 3), new uint256[](3));
    }

    function test_aStockWithNoCustomNumberIsGivenNothing() public {
        Index index = _customIndex();
        assertEq(index.scoreOf(address(tokens[0])), 0);

        _setCustom(index, 5, 0, 0);
        assertEq(index.scoreOf(address(tokens[0])), 5);
        assertEq(index.totalScore(0, 10), 5);
    }

    function test_changingTheNumbersMovesTheIndexAtTheNextRound() public {
        Index index = _customIndex();
        _setCustom(index, 300, 100, 0);
        _deposit(index, alice, 400e6);
        _round(index, 100);
        uint256 firstBefore = _held(index, 0);
        uint256 secondBefore = _held(index, 1);

        // Now they are to be equal: the first is sold down and the second bought up
        _setCustom(index, 100, 100, 0);
        _round(index, 100);

        assertLt(_held(index, 0), firstBefore);
        assertGt(_held(index, 1), secondBefore);
    }

    function test_aCustomNumberOfZeroSellsAStockOut() public {
        Index index = _customIndex();
        _setCustom(index, 1, 1, 1);
        _deposit(index, alice, 900e6);
        _round(index, 100);
        assertGt(_held(index, 2), 0);

        _setCustom(index, 1, 1, 0);
        _round(index, 100);
        assertEq(_held(index, 2), 0);
    }

    function test_onlyTheCuratorSetsNumbers_andOnlyForACustomIndex_andOnlyForStocksInIt() public {
        Index custom = _customIndex();
        address[] memory list = _stocks(0, 1);
        uint256[] memory weights = new uint256[](1);
        weights[0] = 7;

        vm.prank(stranger);
        vm.expectRevert(Index.NotCurator.selector);
        custom.setCustomWeights(list, weights);

        uint256[] memory two = new uint256[](2);
        vm.prank(curator);
        vm.expectRevert(Index.LengthMismatch.selector);
        custom.setCustomWeights(list, two);

        uint256 outside = _addStock(DEEP);
        address[] memory notIn = _stocks(outside, outside + 1);
        vm.prank(curator);
        vm.expectRevert(abi.encodeWithSelector(Index.NotInIndex.selector, notIn[0]));
        custom.setCustomWeights(notIn, weights);

        // An index of another type has no use for them
        Index equal = _make(_settings(IndexWeighting.Equal, 0, 0), _stocks(0, 3));
        vm.prank(curator);
        vm.expectRevert(Index.NotACustomIndex.selector);
        equal.setCustomWeights(list, weights);
    }

    function test_numbersCannotBeChangedWhileARoundIsOpen() public {
        Index index = _customIndex();
        _setCustom(index, 1, 1, 1);
        vm.warp(block.timestamp + 1 days);
        vm.prank(keeper);
        index.startRound();

        address[] memory list = _stocks(0, 1);
        uint256[] memory weights = new uint256[](1);
        vm.prank(curator);
        vm.expectRevert(abi.encodeWithSelector(Index.NotIdle.selector, Index.Phase.Valuing));
        index.setCustomWeights(list, weights);
    }

    function test_anIndexThatReadsNeedsSomewhereToRead() public {
        _addStock(DEEP);
        IndexSettings memory settings = _settings(IndexWeighting.MarketCap, 0, 0);
        settings.readings = MockReadings(address(0));
        address[] memory list = _stocks(0, 1);
        vm.prank(curator);
        vm.expectRevert(Index.NeedsReadings.selector);
        factory.create(settings, list, new uint256[](0));
    }

    function test_theScoresAreThereToReadOffChain() public {
        _addStock(500_000e6);
        _addStock(1_500_000e6);
        Index index = _make(_settings(IndexWeighting.Liquidity, 0, 0), _stocks(0, 2));

        assertEq(index.scoreOf(address(tokens[0])), 1_000_000e6);
        assertEq(index.scoreOf(address(tokens[1])), 3_000_000e6);
        assertEq(index.totalScore(0, 100), 4_000_000e6);
        // In pages, they add up to the same
        assertEq(index.totalScore(0, 1) + index.totalScore(1, 1), 4_000_000e6);
        assertEq(index.totalScore(2, 10), 0);
    }
}

/// @dev Money in, a price that moves, a rebalance, and leaving
contract IndexRoundsTest is IndexFixture {
    Index private index;

    function setUp() public override {
        super.setUp();
        for (uint256 i = 0; i < 4; i++) _addStock(DEEP);
        index = _make(_settings(IndexWeighting.Equal, 1000, 0), _stocks(0, 4));
    }

    // ---------------------------------------------------------------------------------------------------------- deposits
    function test_aDepositWaitsForTheRoundAndThenBuys() public {
        _deposit(index, alice, 1000e6);

        assertEq(index.totalSupply(), 0);
        assertEq(_held(index, 0), 0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IndexDeposits.NotPriced.selector, 0));
        index.claim(0);

        _round(index, 100);

        assertEq(_claim(index, alice, 0), 1000e6);
        assertEq(index.pendingUsdc(), 0);
    }

    function test_aLaterDepositPaysWhatTheIndexIsWorthThen() public {
        _deposit(index, alice, 600e6);
        _round(index, 100);
        _claim(index, alice, 0);

        // The first stock doubles, so a share is worth more than it was
        pools[0].setPrice(ROOT_200, TICK_200);
        _deposit(index, bob, 400e6);
        _round(index, 100);

        uint256 bobShares = _claim(index, bob, 1);
        // $600 less 10% cash is $135 a stock, 134.595 after the router's 0.3%: cash 60, the first stock at twice that, the other three at that
        assertApproxEqAbs(index.roundValue(), 60e6 + 5 * 134_595_000, 20);
        // Bob owns what he put in, as a share of what the index then was. Not exactly: the virtual shares that stop a first depositor from rounding
        // the next one to nothing leave it a hair off.
        assertApproxEqRel((bobShares * index.tradeBase()) / index.totalSupply(), 400e6, 1e15);
        assertLt(bobShares, 400e6);
    }

    function test_aDepositCanBeTakenBackUntilItIsPriced() public {
        _deposit(index, alice, 1000e6);

        vm.prank(alice);
        index.cancelDeposit(0, 400e6);
        assertEq(usdc.balanceOf(alice), 9_400e6);
        assertEq(index.pendingUsdc(), 600e6);

        _round(index, 100);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IndexDeposits.AlreadyPriced.selector, 0));
        index.cancelDeposit(0, 100e6);
    }

    function test_depositsHaveALeastAndAMost() public {
        vm.prank(alice);
        vm.expectRevert(IndexDeposits.DepositTooSmall.selector);
        index.requestDeposit(0.5e6);

        _deposit(index, alice, 1000e6);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(IndexDeposits.OverTheCeiling.selector, 1001e6, 1000e6));
        index.requestDeposit(1e6);
    }

    // ---------------------------------------------------------------------------------------------------------- rebalancing
    function test_aRoundSellsWhatGrewAndBuysWhatFell() public {
        _deposit(index, alice, 800e6);
        _round(index, 100);

        pools[0].setPrice(ROOT_200, TICK_200);
        uint256 before = _held(index, 0);
        _round(index, 100);

        // The first stock was 40% of what is invested and should be 25%: some was sold, and the others were topped up
        assertLt(_held(index, 0), before);
        uint256 total = usdc.balanceOf(address(index)) + (_held(index, 0) * 2) + _held(index, 1) + _held(index, 2) + _held(index, 3);
        uint256 invested = total - usdc.balanceOf(address(index));
        assertApproxEqAbs((_held(index, 0) * 2 * 10_000) / invested, 2500, 100);
        assertApproxEqAbs((_held(index, 1) * 10_000) / invested, 2500, 100);
    }

    function test_aDroppedStockIsSoldOutAndThenRemoved() public {
        _deposit(index, alice, 800e6);
        _round(index, 100);

        vm.prank(curator);
        vm.expectRevert(abi.encodeWithSelector(Index.NotDropped.selector, address(tokens[3])));
        index.removeStock(address(tokens[3]));

        address[] memory drop = new address[](1);
        drop[0] = address(tokens[3]);
        vm.prank(curator);
        index.dropStocks(drop);

        vm.prank(curator);
        vm.expectRevert(abi.encodeWithSelector(Index.StillHeld.selector, address(tokens[3])));
        index.removeStock(address(tokens[3]));

        _round(index, 100);
        assertEq(_held(index, 3), 0);
        // What it was given went to the other three
        assertGt(_held(index, 0), 199_000_000);

        vm.prank(curator);
        index.removeStock(address(tokens[3]));
        assertEq(index.stockCount(), 3);
        assertFalse(index.isStock(address(tokens[3])));
        assertEq(index.stockAt(0), address(tokens[0]));
        assertEq(index.stockAt(2), address(tokens[2]));
    }

    function test_aStockCanBeAddedLater() public {
        uint256 added = _addStock(DEEP);
        vm.prank(curator);
        index.addStocks(_stocks(added, added + 1));
        assertEq(index.stockCount(), 5);

        _deposit(index, alice, 900e6);
        _round(index, 100);
        // $900 less the 10% cash, over five stocks: $162 each, less the router's 0.3%
        assertEq(_held(index, added), 161_514_000);
    }

    function test_aRoundCannotStartBeforeItsTime() public {
        _round(index, 100);
        vm.prank(keeper);
        vm.expectRevert();
        index.startRound();
    }

    function test_onlyTheKeeperRunsARoundAndOnlyTheCuratorChangesTheStocks() public {
        vm.prank(stranger);
        vm.expectRevert(Index.NotKeeper.selector);
        index.startRound();

        uint256 added = _addStock(DEEP);
        vm.prank(stranger);
        vm.expectRevert(Index.NotCurator.selector);
        index.addStocks(_stocks(added, added + 1));
    }

    function test_aStockThatIsNotListedOrAlreadyInCannotJoin() public {
        address[] memory unlisted = new address[](1);
        unlisted[0] = makeAddr("not a listed stock");
        vm.prank(curator);
        vm.expectRevert(abi.encodeWithSelector(Index.NotListed.selector, unlisted[0]));
        index.addStocks(unlisted);

        vm.prank(curator);
        vm.expectRevert(abi.encodeWithSelector(Index.AlreadyInIndex.selector, address(tokens[0])));
        index.addStocks(_stocks(0, 1));
    }

    // ---------------------------------------------------------------------------------------------------------- bad prices
    function test_aStockWhosePriceCannotBeTrustedIsNotBought() public {
        pools[3].setTwapTick(500);
        _deposit(index, alice, 900e6);

        _round(index, 100);

        // Its share went to the other three: $270 each of the $810 invested
        assertEq(_held(index, 3), 0);
        assertEq(_held(index, 0), 269_190_000);
    }

    function test_aHeldStockWhosePriceCannotBeTrustedStopsTheValuationNotTheExit() public {
        _deposit(index, alice, 1000e6);
        _round(index, 100);
        _claim(index, alice, 0);

        pools[0].setTwapTick(500);
        vm.warp(block.timestamp + 1 days);
        vm.prank(keeper);
        index.startRound();

        // An index valued without a stock in it would sell shares too cheap
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(PoolPricing.PriceOutOfLine.selector, address(tokens[0])));
        index.step(100);

        // Nobody can leave while the round is open
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Index.NotIdle.selector, Index.Phase.Valuing));
        index.redeem(100e6, 10);

        // Anyone may close it once it has been open too long, and then everyone can leave
        vm.expectRevert();
        index.abortRound();
        vm.warp(block.timestamp + 1 days);
        vm.prank(stranger);
        index.abortRound();

        vm.prank(alice);
        index.redeem(1000e6, 10);
        assertEq(_held(index, 0), 0);
    }

    // ---------------------------------------------------------------------------------------------------------- leaving
    function test_aRedemptionIsPaidInPagesAndEachStockOnce() public {
        _deposit(index, alice, 1000e6);
        _round(index, 100);
        _claim(index, alice, 0);

        uint256 cashBefore = usdc.balanceOf(address(index));
        uint256[4] memory before = [_held(index, 0), _held(index, 1), _held(index, 2), _held(index, 3)];

        // 40% of the shares, two stocks at a time
        vm.prank(alice);
        index.redeem(400e6, 2);
        (,,, uint256 paidTo, bool isOpen) = index.redemption();
        assertTrue(isOpen);
        assertEq(paidTo, 2);
        assertEq(usdc.balanceOf(alice), 9_000e6 + (cashBefore * 400) / 1000);
        assertEq(tokens[0].balanceOf(alice), (before[0] * 400) / 1000);
        assertEq(tokens[2].balanceOf(alice), 0);

        // Someone else pays the rest
        vm.prank(stranger);
        index.payRedemption(2);
        (,,,, isOpen) = index.redemption();
        assertFalse(isOpen);
        assertEq(tokens[2].balanceOf(alice), (before[2] * 400) / 1000);
        assertEq(tokens[3].balanceOf(alice), (before[3] * 400) / 1000);

        // The 60% left still hold 60% of every stock
        assertEq(_held(index, 0), before[0] - (before[0] * 400) / 1000);
        assertEq(index.totalSupply(), 600e6);
    }

    function test_whileARedemptionIsOpenNothingElseMovesTheStocks() public {
        _deposit(index, alice, 900e6);
        _round(index, 100);
        _claim(index, alice, 0);

        vm.prank(alice);
        index.redeem(100e6, 1);

        vm.warp(block.timestamp + 1 days);
        vm.prank(keeper);
        vm.expectRevert(Index.RedemptionIsOpen.selector);
        index.startRound();

        vm.prank(alice);
        vm.expectRevert(Index.RedemptionIsOpen.selector);
        index.redeem(100e6, 1);

        // Money can still be asked to come in
        _deposit(index, bob, 10e6);

        index.payRedemption(10);
        vm.prank(keeper);
        index.startRound();
    }

    function test_aTokenThatWillNotBeSentDoesNotHoldTheOthersIn() public {
        _deposit(index, alice, 1000e6);
        _round(index, 100);
        _claim(index, alice, 0);

        vm.mockCallRevert(address(tokens[0]), abi.encodeWithSelector(MockToken.transfer.selector, alice), "blocked");
        vm.prank(alice);
        index.redeem(1000e6, 10);

        (,,,, bool isOpen) = index.redemption();
        assertFalse(isOpen);
        assertEq(tokens[0].balanceOf(alice), 0);
        assertGt(tokens[1].balanceOf(alice), 0);
    }

    // ---------------------------------------------------------------------------------------------------------- a token, and a block
    /// A stock that refuses every approval, once the index holds it, would be unsellable. It must not stop the round for the others.
    function test_aStockThatRefusesToBeApprovedDoesNotStopTheRound() public {
        _deposit(index, alice, 800e6);
        _round(index, 100);

        address[] memory drop = new address[](1);
        drop[0] = address(tokens[0]);
        vm.prank(curator);
        index.dropStocks(drop);
        vm.mockCallRevert(address(tokens[0]), abi.encodeWithSelector(MockToken.approve.selector), "paused");

        vm.warp(block.timestamp + 1 days);
        vm.prank(keeper);
        index.startRound();
        vm.prank(keeper);
        index.step(100); // valuing

        // The sale of the stock that will not be approved is what fails, and the rest goes on
        vm.expectEmit(true, false, false, false, address(index));
        emit Index.TradeFailed(address(tokens[0]));
        vm.prank(keeper);
        index.step(100); // selling
        vm.prank(keeper);
        index.step(100); // buying

        // It is still held, and the round finished
        assertGt(_held(index, 0), 0);
        assertEq(uint256(index.phase()), uint256(Index.Phase.Idle));
    }

    function test_theIndexIsAnErc20() public {
        _deposit(index, alice, 1000e6);
        _round(index, 100);
        _claim(index, alice, 0);

        assertEq(index.name(), "Sandworm Index");
        assertEq(index.symbol(), "SWF");
        assertEq(index.decimals(), 6);

        vm.prank(alice);
        index.transfer(bob, 250e6);
        assertEq(index.balanceOf(bob), 250e6);

        // And what the person who got it owns is a part of every stock, which they can take
        vm.prank(bob);
        index.redeem(250e6, 10);
        assertGt(tokens[0].balanceOf(bob), 0);
    }

    function test_aStrategyHoldsAnIndexThroughAnIndexBlock() public {
        Allocation[] memory held = new IndexBlock(address(index)).evaluate(readings);

        assertEq(held.length, 1);
        assertEq(held[0].stock, address(index));
        assertEq(held[0].weightBps, 10_000);
    }

    function test_anIndexBlockTakesAnIndexFromAnyFactory() public {
        // One made by another factory, as an older or newer version would be
        IndexFactory other = new IndexFactory(registry);
        address[] memory list = _stocks(0, 1);
        vm.prank(curator);
        Index fromOther = other.create(_settings(IndexWeighting.Equal, 0, 0), list, new uint256[](0));

        assertEq(new IndexBlock(address(fromOther)).index(), address(fromOther));
        assertEq(new IndexBlock(address(index)).index(), address(index));
    }

    function test_anIndexBlockRefusesWhatIsNotAnIndex() public {
        // A plain token, an address with no code, and nothing
        vm.expectRevert(abi.encodeWithSelector(NotAnIndex.selector, address(usdc)));
        new IndexBlock(address(usdc));

        vm.expectRevert(abi.encodeWithSelector(NotAnIndex.selector, alice));
        new IndexBlock(alice);

        vm.expectRevert(NoStock.selector);
        new IndexBlock(address(0));
    }

    function test_anIndexGoesInAStrategyThroughAnIndexBlock() public {
        address spy = makeAddr("SPY");
        bytes32 price = Channels.indicator(Indicator.Price, 0, spy);
        bytes32 average = Channels.indicator(Indicator.Sma, 200, spy);
        IfBlock strategy = new IfBlock(new ComparisonCondition(price, Op.Greater, average), new IndexBlock(address(index)), new CashBlock());

        readings.set(price, 510e6);
        readings.set(average, 480e6);
        Allocation[] memory up = strategy.evaluate(readings);
        assertEq(up.length, 1);
        assertEq(up[0].stock, address(index));

        readings.set(price, 450e6);
        assertEq(strategy.evaluate(readings).length, 0);
    }
}

contract IndexFactoryTest is IndexFixture {
    function test_aPersonMakesAnIndexAndIsItsCurator() public {
        for (uint256 i = 0; i < 3; i++) _addStock(DEEP);
        IndexSettings memory settings = _settings(IndexWeighting.Equal, 0, 0);
        settings.keeper = address(0);
        settings.curator = stranger;

        vm.prank(alice);
        Index index = factory.create(settings, _stocks(0, 3), new uint256[](0));

        // Whatever the settings said, the maker is the curator, and runs it unless they named a keeper
        assertEq(index.curator(), alice);
        assertEq(index.keeper(), alice);
        assertEq(index.stockCount(), 3);
        assertTrue(factory.isIndex(address(index)));
        assertEq(factory.count(), 1);
        assertEq(factory.madeByOf(alice)[0], address(index));
    }

    function test_anIndexIsAClone_andItsCopyAndItselfCannotBeSetUpAgain() public {
        for (uint256 i = 0; i < 3; i++) _addStock(DEEP);
        vm.prank(alice);
        Index index = factory.create(_settings(IndexWeighting.Equal, 0, 0), _stocks(0, 3), new uint256[](0));

        // 45 bytes of code that hands every call to the shared copy
        assertEq(address(index).code.length, 45);
        assertGt(factory.implementation().code.length, 10_000);

        address[] memory none = new address[](0);
        IndexSettings memory settings = _settings(IndexWeighting.Equal, 0, 0);
        settings.curator = stranger;
        vm.expectRevert(Index.AlreadyInitialized.selector);
        index.initialize(registry, settings, none, new uint256[](0));
        Index shared = Index(factory.implementation());
        vm.expectRevert(Index.AlreadyInitialized.selector);
        shared.initialize(registry, settings, none, new uint256[](0));
    }

    function test_twoClonesDoNotShareAnything() public {
        for (uint256 i = 0; i < 4; i++) _addStock(DEEP);
        Index first = _make(_settings(IndexWeighting.Equal, 0, 0), _stocks(0, 2));
        Index second = _make(_settings(IndexWeighting.Liquidity, 500, 0), _stocks(2, 4));

        assertEq(first.stockCount(), 2);
        assertEq(second.stockCount(), 2);
        assertEq(uint256(first.weighting()), uint256(IndexWeighting.Equal));
        assertEq(uint256(second.weighting()), uint256(IndexWeighting.Liquidity));
        assertEq(first.cashBps(), 0);
        assertEq(second.cashBps(), 500);
        assertEq(address(first.usdc()), address(usdc));
        assertTrue(first.isStock(address(tokens[0])));
        assertFalse(second.isStock(address(tokens[0])));
    }

    function test_anIndexNeedsAStock() public {
        address[] memory none = new address[](0);
        IndexSettings memory settings = _settings(IndexWeighting.Equal, 0, 0);
        vm.prank(alice);
        vm.expectRevert(IndexFactory.NoStocks.selector);
        factory.create(settings, none, new uint256[](0));
    }

    function test_twoIndexesFromTheSameRegistryHoldTheirOwnStocks() public {
        for (uint256 i = 0; i < 6; i++) _addStock(DEEP);
        Index first = _make(_settings(IndexWeighting.Equal, 0, 0), _stocks(0, 3));
        Index second = _make(_settings(IndexWeighting.Equal, 0, 0), _stocks(3, 6));

        _deposit(first, alice, 900e6);
        _round(first, 10);

        assertEq(_held(first, 0), 299_100_000);
        assertEq(_held(first, 3), 0);
        assertEq(_held(second, 3), 0);
        assertEq(second.totalSupply(), 0);
    }

    /// 1,200 stocks are in the index and 200 of them are deep enough to be given a share: $5 each. Every walk is done in pages, and no transaction
    /// touches more than a page.
    function test_thousandsOfStocksAreHeldInPages() public {
        // Setting up 1,200 pools is not what is being measured, and it is more gas than a test may use
        vm.pauseGasMetering();
        uint256 total = 1_200;
        uint256 deep = 200;
        for (uint256 i = 0; i < total; i++) {
            _addStock(i < deep ? DEEP : 1_000e6);
        }
        Index index = _make(_settings(IndexWeighting.Equal, 0, 100_000e6), _stocks(0, 300));
        for (uint256 start = 300; start < total; start += 300) {
            vm.prank(curator);
            index.addStocks(_stocks(start, start + 300));
        }
        assertEq(index.stockCount(), total);
        vm.resumeGasMetering();

        _deposit(index, alice, 1000e6);
        uint256 gasBefore = gasleft();
        _round(index, 300);
        console.log("a whole round of 1200 stocks, 4 pages each, gas:", gasBefore - gasleft());

        _claim(index, alice, 0);
        assertEq(index.balanceOf(alice), 1000e6);
        // $5 of a $100 stock with 8 decimals is 5,000,000 raw units, less the router's 0.3%
        assertEq(_held(index, 0), 4_985_000);
        assertEq(_held(index, 199), 4_985_000);
        assertEq(_held(index, 200), 0);

        // And she can leave, 400 stocks a transaction
        vm.prank(alice);
        gasBefore = gasleft();
        index.redeem(1000e6, 400);
        console.log("one page of 400 stocks leaving, gas:", gasBefore - gasleft());
        (,,, uint256 paidTo,) = index.redemption();
        assertEq(paidTo, 400);
        index.payRedemption(400);
        index.payRedemption(400);
        (,,,, bool isOpen) = index.redemption();
        assertFalse(isOpen);
        assertEq(tokens[0].balanceOf(alice), 4_985_000);
        assertEq(_held(index, 0), 0);
    }
}
