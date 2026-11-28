// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {StrategyVault} from "../src/vault/StrategyVault.sol";
import {VaultMath} from "../src/vault/VaultMath.sol";
import {MockCLPool} from "./mocks/MockCLPool.sol";
import {MockCLRouter} from "./mocks/MockCLRouter.sol";
import {MockToken} from "./mocks/MockToken.sol";

/// @dev Prices in these tests: USDC (6 decimals) is token0 and a stock (8 decimals) is token1, so a price of $100 is one raw stock unit per raw
/// USDC unit: sqrtPrice is exactly 2^96 and the tick is 0. The other prices used have their sqrtPrice and tick written out below.
abstract contract VaultFixture is Test {
    uint160 internal constant Q96 = uint160(VaultMath.Q96);
    // $100 is the base. $50 is twice the stock per USDC, so sqrt(2) times as much root; $200 is half, so sqrt(0.5).
    uint160 internal constant ROOT_100 = Q96;
    uint160 internal constant ROOT_50 = 112045541949572279837463876454; // 2^96 * sqrt(2)
    uint160 internal constant ROOT_200 = 56022770974786139918731938227; // 2^96 * sqrt(0.5)
    uint160 internal constant ROOT_75 = 91482292689414693395543078640; // 2^96 * sqrt(100/75)
    int24 internal constant TICK_100 = 0;
    int24 internal constant TICK_50 = 6931;
    int24 internal constant TICK_200 = -6932;
    int24 internal constant TICK_75 = 2877;

    address internal owner = address(this);
    address internal executor = makeAddr("executor");
    address internal callbackProxy = makeAddr("callbackProxy");
    address internal factory = makeAddr("factory");
    address internal stranger = makeAddr("stranger");

    MockToken internal usdc;
    MockToken internal nvda;
    MockToken internal aapl;
    MockCLPool internal nvdaPool;
    MockCLPool internal aaplPool;
    MockCLRouter internal router;
    StrategyVault internal vault;

    function baseRules() internal pure returns (StrategyVault.Rules memory) {
        return StrategyVault.Rules({
            budget: 500e6,
            maxWeightBps: 5000,
            minPoolDepth: 100_000e6,
            maxSlippageBps: 100,
            stopLossBps: 2000,
            takeProfitBps: 5000,
            portfolioStopBps: 2500,
            pauseSeconds: 90 days,
            approvalRequired: false
        });
    }

    function _deploy(StrategyVault.Rules memory rules) internal returns (StrategyVault) {
        StrategyVault.StockSetup[] memory setups = new StrategyVault.StockSetup[](2);
        setups[0] = StrategyVault.StockSetup(address(nvda), address(nvdaPool), address(router), 10);
        setups[1] = StrategyVault.StockSetup(address(aapl), address(aaplPool), address(router), 10);
        return new StrategyVault(callbackProxy, address(usdc), executor, rules, setups);
    }

    function setUp() public virtual {
        usdc = new MockToken(6);
        nvda = new MockToken(8);
        aapl = new MockToken(8);
        router = new MockCLRouter(factory);

        nvdaPool = new MockCLPool(address(usdc), address(nvda), factory);
        aaplPool = new MockCLPool(address(usdc), address(aapl), factory);
        router.setPool(address(usdc), address(nvda), nvdaPool);
        router.setPool(address(usdc), address(aapl), aaplPool);
        _setPrice(nvdaPool, ROOT_100, TICK_100);
        _setPrice(aaplPool, ROOT_100, TICK_100);

        // Each pool holds $500K of USDC and $500K of stock at $100 (5,000 stock, 8 decimals), so a trade can be up to 1% of $1M
        usdc.mint(address(nvdaPool), 500_000e6);
        nvda.mint(address(nvdaPool), 5_000e8);
        usdc.mint(address(aaplPool), 500_000e6);
        aapl.mint(address(aaplPool), 5_000e8);
        // The router pays out of the pools' balances in the mock, so they are what it trades against

        vault = _deploy(baseRules());

        usdc.mint(owner, 1_000_000e6);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _setPrice(MockCLPool pool, uint160 root, int24 tick) internal {
        pool.setPrice(root, tick);
    }

    function _deposit(uint256 amount) internal {
        vault.deposit(amount);
    }

    function _buy(MockToken stock, uint256 usdcIn) internal {
        // The price at $100 gives 1 raw stock per raw USDC; ask for the least the rules allow
        vm.prank(executor);
        vault.buy(address(stock), usdcIn, _floor(usdcIn));
    }

    function _floor(uint256 usdcIn) internal pure returns (uint256) {
        return ((usdcIn * 99) / 100); // 1% slippage allowed, at $100: usdcIn raw stock
    }
}

contract StrategyVaultSetupTest is VaultFixture {
    function test_startsEmptyWithTheRulesItWasGiven() public view {
        assertEq(vault.owner(), owner);
        assertEq(vault.executor(), executor);
        assertEq(vault.totalValue(), 0);
        (uint256 budget,,,,,,,,) = vault.rules();
        assertEq(budget, 500e6);
        assertEq(vault.stockCount(), 2);
    }

    function test_refusesRulesPastTheCeilings() public {
        StrategyVault.Rules memory rules = baseRules();
        rules.budget = 1_001e6;
        vm.expectPartialRevert(StrategyVault.BudgetOutOfRange.selector);
        _deploy(rules);

        rules = baseRules();
        rules.maxSlippageBps = 201;
        vm.expectPartialRevert(StrategyVault.SlippageOverCeiling.selector);
        _deploy(rules);

        rules = baseRules();
        rules.maxWeightBps = 0;
        vm.expectPartialRevert(StrategyVault.MaxWeightOutOfRange.selector);
        _deploy(rules);

        rules = baseRules();
        rules.portfolioStopBps = 10_000;
        vm.expectPartialRevert(StrategyVault.StopNeverFires.selector);
        _deploy(rules);

        rules = baseRules();
        rules.pauseSeconds = 366 days;
        vm.expectPartialRevert(StrategyVault.PauseTooLong.selector);
        _deploy(rules);
    }

    function test_refusesAPoolThatIsNotThisStockAgainstUsdc() public {
        MockToken other = new MockToken(8);
        StrategyVault.StockSetup[] memory setups = new StrategyVault.StockSetup[](1);
        setups[0] = StrategyVault.StockSetup(address(other), address(nvdaPool), address(router), 10);
        vm.expectPartialRevert(StrategyVault.PoolIsNotThisStock.selector);
        new StrategyVault(callbackProxy, address(usdc), executor, baseRules(), setups);
    }

    function test_refusesARouterThatIsNotForThePoolsFactory() public {
        MockCLRouter wrong = new MockCLRouter(makeAddr("otherFactory"));
        StrategyVault.StockSetup[] memory setups = new StrategyVault.StockSetup[](1);
        setups[0] = StrategyVault.StockSetup(address(nvda), address(nvdaPool), address(wrong), 10);
        vm.expectPartialRevert(StrategyVault.RouterIsNotForThisPool.selector);
        new StrategyVault(callbackProxy, address(usdc), executor, baseRules(), setups);
    }

    function test_refusesTheWrongTickSpacing() public {
        StrategyVault.StockSetup[] memory setups = new StrategyVault.StockSetup[](1);
        setups[0] = StrategyVault.StockSetup(address(nvda), address(nvdaPool), address(router), 100);
        vm.expectPartialRevert(StrategyVault.WrongTickSpacing.selector);
        new StrategyVault(callbackProxy, address(usdc), executor, baseRules(), setups);
    }

    function test_refusesAPoolWithTooLittleHistoryForTheAveragePrice() public {
        nvdaPool.setHistoryTooShort(true);
        vm.expectRevert(bytes("OLD"));
        _deploy(baseRules());
    }

    function test_refusesAStockListedTwiceOrNoStocksOrTooMany() public {
        StrategyVault.StockSetup[] memory twice = new StrategyVault.StockSetup[](2);
        twice[0] = StrategyVault.StockSetup(address(nvda), address(nvdaPool), address(router), 10);
        twice[1] = twice[0];
        vm.expectPartialRevert(StrategyVault.ListedTwice.selector);
        new StrategyVault(callbackProxy, address(usdc), executor, baseRules(), twice);

        StrategyVault.StockSetup[] memory none = new StrategyVault.StockSetup[](0);
        vm.expectPartialRevert(StrategyVault.StockCountOutOfRange.selector);
        new StrategyVault(callbackProxy, address(usdc), executor, baseRules(), none);
    }
}

contract StrategyVaultMoneyTest is VaultFixture {
    function test_depositsUsdcUpToTheBudget() public {
        _deposit(500e6);
        assertEq(vault.totalValue(), 500e6);
        assertEq(vault.highWatermark(), 500e6);
    }

    function test_refusesADepositThatWouldPassTheBudget() public {
        _deposit(400e6);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.OverBudget.selector, 501e6, 500e6));
        vault.deposit(101e6);
    }

    function test_onlyTheOwnerDeposits() public {
        vm.prank(stranger);
        vm.expectRevert(StrategyVault.NotOwner.selector);
        vault.deposit(1e6);
    }

    function test_theOwnerCanAlwaysWithdrawUsdc() public {
        _deposit(300e6);
        uint256 before = usdc.balanceOf(owner);
        vault.withdrawUsdc(100e6);
        assertEq(usdc.balanceOf(owner), before + 100e6);
        assertEq(vault.highWatermark(), 200e6);
    }

    function test_onlyTheOwnerWithdraws() public {
        _deposit(300e6);
        vm.prank(executor);
        vm.expectRevert(StrategyVault.NotOwner.selector);
        vault.withdrawUsdc(1e6);
    }

    function test_theOwnerCanWithdrawAStockEvenWhenItsPriceCantBeTrusted() public {
        _deposit(200e6);
        _buy(nvda, 100e6);
        uint256 held = nvda.balanceOf(address(vault));

        nvdaPool.setTwapTick(5000); // the price is now far from its average: totalValue() would refuse
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.PriceOutOfLine.selector, address(nvda)));
        vault.totalValue();

        vault.withdrawStock(address(nvda), held);
        assertEq(nvda.balanceOf(owner), held);
        assertEq(vault.costBasis(address(nvda)), 0);
    }

    function test_withdrawingStockTakesItsCostOutOfTheHigh() public {
        _deposit(400e6);
        _buy(nvda, 100e6);
        assertEq(vault.highWatermark(), 400e6);

        vault.withdrawStock(address(nvda), nvda.balanceOf(address(vault)) / 2);
        assertEq(vault.costBasis(address(nvda)), 50e6);
        assertEq(vault.highWatermark(), 350e6);
    }

    function test_rescueReturnsOtherTokensButNotUsdcOrStocks() public {
        MockToken stray = new MockToken(18);
        stray.mint(address(vault), 5e18);
        vault.rescue(address(stray), 5e18);
        assertEq(stray.balanceOf(owner), 5e18);

        vm.expectRevert(StrategyVault.UseTheWithdrawals.selector);
        vault.rescue(address(usdc), 1);
        vm.expectRevert(StrategyVault.UseTheWithdrawals.selector);
        vault.rescue(address(nvda), 1);
    }
}

contract StrategyVaultBuyTest is VaultFixture {
    function test_buysAStockWithinTheRulesAndRecordsWhatItCost() public {
        _deposit(500e6);
        _buy(nvda, 100e6);

        // $100 a stock, 8 decimals, less the 0.3% the pool takes: 1 USDC raw gives 1 raw stock, so 100e6 gives about 99.7e6
        assertApproxEqRel(nvda.balanceOf(address(vault)), 99_700_000, 0.001e18);
        assertEq(vault.costBasis(address(nvda)), 100e6);
        assertEq(usdc.balanceOf(address(vault)), 400e6);
    }

    function test_onlyTheExecutorBuys() public {
        _deposit(500e6);
        vm.expectRevert(StrategyVault.NotExecutor.selector);
        vault.buy(address(nvda), 10e6, 9e6);

        vm.prank(stranger);
        vm.expectRevert(StrategyVault.NotExecutor.selector);
        vault.buy(address(nvda), 10e6, 9e6);
    }

    function test_refusesAStockThatIsNotListed() public {
        _deposit(500e6);
        MockToken other = new MockToken(8);
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.NotListed.selector, address(other)));
        vault.buy(address(other), 10e6, 9e6);
    }

    function test_refusesATradeUnderAUsdOrOverAHundredthOfThePoolsDepth() public {
        _deposit(500e6);
        vm.prank(executor);
        vm.expectRevert(StrategyVault.TradeTooSmall.selector);
        vault.buy(address(nvda), 999_999, 0);

        // The pool holds $1M both sides, so 1% is $10,000: more than the $500 budget, so shrink the pool to test it
        usdc.mint(address(vault), 0);
        MockCLPool small = new MockCLPool(address(usdc), address(nvda), factory);
        small.setPrice(ROOT_100, TICK_100);
        usdc.mint(address(small), 20_000e6);
        nvda.mint(address(small), 200e8);
        router.setPool(address(usdc), address(nvda), small);
        StrategyVault.StockSetup[] memory setups = new StrategyVault.StockSetup[](1);
        setups[0] = StrategyVault.StockSetup(address(nvda), address(small), address(router), 10);
        StrategyVault.Rules memory rules = baseRules();
        rules.minPoolDepth = 10_000e6;
        StrategyVault tight = new StrategyVault(callbackProxy, address(usdc), executor, rules, setups);
        usdc.approve(address(tight), type(uint256).max);
        tight.deposit(500e6);

        // Depth is $40,000, so the most for one trade is $400
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.TradeTooLarge.selector, 401e6, 400e6));
        tight.buy(address(nvda), 401e6, 0);
    }

    function test_refusesAPoolThatHoldsLessThanTheFloor() public {
        StrategyVault.Rules memory rules = baseRules();
        rules.minPoolDepth = 2_000_000e6; // the pools hold $1M
        StrategyVault strict = _deploy(rules);
        usdc.approve(address(strict), type(uint256).max);
        strict.deposit(500e6);

        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.PoolTooShallow.selector, 1_000_000e6, 2_000_000e6));
        strict.buy(address(nvda), 10e6, 9e6);
    }

    function test_refusesALooserSlippageThanTheRulesAllow() public {
        _deposit(500e6);
        // Expected 100e6 raw stock for 100e6 USDC at $100; 1% off is 99e6, so asking for 90e6 is too loose
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.SlippageTooLoose.selector, 90e6, 99e6));
        vault.buy(address(nvda), 100e6, 90e6);
    }

    function test_theSwapItselfIsRefusedIfItBringsInLessThanAsked() public {
        _deposit(500e6);
        router.setTakeBps(500); // the pool takes 5%, so it can't give 99%
        vm.prank(executor);
        vm.expectRevert(bytes("Too little received"));
        vault.buy(address(nvda), 100e6, _floor(100e6));
    }

    function test_refusesABuyThatMakesOneStockMoreThanTheMaxWeight() public {
        StrategyVault.Rules memory rules = baseRules();
        rules.maxWeightBps = 2500; // 25%
        StrategyVault capped = _deploy(rules);
        usdc.approve(address(capped), type(uint256).max);
        capped.deposit(400e6);

        // $100 of $400 is exactly 25% less what the pool took: fine
        vm.prank(executor);
        capped.buy(address(nvda), 100e6, _floor(100e6));

        // Another $100 puts about half in the stock
        vm.prank(executor);
        vm.expectRevert();
        capped.buy(address(nvda), 100e6, _floor(100e6));
    }

    function test_refusesToBuyWhileThePriceIsFarFromItsAverage() public {
        _deposit(500e6);
        nvdaPool.setTwapTick(1000); // the price now is at tick 0, 1,000 ticks from its average: about 10%
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.PriceOutOfLine.selector, address(nvda)));
        vault.buy(address(nvda), 10e6, _floor(10e6));
    }

    function test_theBuyRaisesTheHighWhenTheVaultHasGrown() public {
        _deposit(500e6);
        _buy(nvda, 100e6);
        // The stock doubles in price, so the vault is worth more than the deposit
        _setPrice(nvdaPool, ROOT_200, TICK_200);
        _buy(aapl, 100e6);
        assertGt(vault.highWatermark(), 500e6);
    }

    function test_theOwnersOkIsNeededWhenTheRulesAskForIt() public {
        StrategyVault.Rules memory rules = baseRules();
        rules.approvalRequired = true;
        StrategyVault asking = _deploy(rules);
        usdc.approve(address(asking), type(uint256).max);
        asking.deposit(500e6);

        bytes32 id = asking.tradeId(0, address(nvda), 100e6);
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.NotApproved.selector, id));
        asking.buy(address(nvda), 100e6, _floor(100e6));

        asking.approveTrade(0, address(nvda), 100e6);
        vm.prank(executor);
        asking.buy(address(nvda), 100e6, _floor(100e6));

        // One OK is one trade
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.NotApproved.selector, id));
        asking.buy(address(nvda), 100e6, _floor(100e6));
    }

    function test_onlyTheOwnerGivesTheOk() public {
        vm.prank(executor);
        vm.expectRevert(StrategyVault.NotOwner.selector);
        vault.approveTrade(0, address(nvda), 1e6);
    }
}

contract StrategyVaultSellAndExitTest is VaultFixture {
    function setUp() public override {
        super.setUp();
        _deposit(500e6);
        _buy(nvda, 200e6);
        _buy(aapl, 200e6);
    }

    function test_theExecutorCanSellSomeAndTheCostGoesWithIt() public {
        uint256 held = nvda.balanceOf(address(vault));
        uint256 usdcBefore = usdc.balanceOf(address(vault));

        vm.prank(executor);
        vault.sell(address(nvda), held / 2, (held / 2 * 99) / 100);

        assertEq(nvda.balanceOf(address(vault)), held - held / 2);
        assertGt(usdc.balanceOf(address(vault)), usdcBefore);
        assertEq(vault.costBasis(address(nvda)), 100e6);
    }

    function test_aSellNeedsTheOkToo() public {
        StrategyVault.Rules memory rules = baseRules();
        rules.approvalRequired = true;
        StrategyVault asking = _deploy(rules);
        usdc.approve(address(asking), type(uint256).max);
        asking.deposit(100e6);
        asking.approveTrade(0, address(nvda), 50e6);
        vm.prank(executor);
        asking.buy(address(nvda), 50e6, _floor(50e6));

        uint256 held = nvda.balanceOf(address(asking));
        vm.prank(executor);
        vm.expectRevert();
        asking.sell(address(nvda), held, (held * 99) / 100);

        asking.approveTrade(1, address(nvda), held);
        vm.prank(executor);
        asking.sell(address(nvda), held, (held * 99) / 100);
        assertEq(nvda.balanceOf(address(asking)), 0);
    }

    function test_theStopLossSellsAStockThatHasFallenFarEnough() public {
        // Bought at $100; at $75 it is down 25%, past the 20% stop
        _setPrice(nvdaPool, ROOT_75, TICK_75);

        vm.prank(executor);
        vault.exitStock(address(nvda));

        assertEq(nvda.balanceOf(address(vault)), 0);
        assertEq(vault.costBasis(address(nvda)), 0);
        // The other stock is untouched
        assertGt(aapl.balanceOf(address(vault)), 0);
    }

    function test_theStopLossIsRefusedWhileTheStockIsNotDownFarEnough() public {
        vm.prank(executor);
        vm.expectRevert(StrategyVault.ConditionNotMet.selector);
        vault.exitStock(address(nvda));
    }

    function test_theTakeProfitSellsAStockThatHasRisenFarEnough() public {
        // At $200 it is up 100%, past the 50% target
        _setPrice(nvdaPool, ROOT_200, TICK_200);
        vm.prank(executor);
        vault.exitStock(address(nvda));
        assertEq(nvda.balanceOf(address(vault)), 0);
    }

    function test_anExitNeedsNoOkEvenWhenTradesDo() public {
        StrategyVault.Rules memory rules = baseRules();
        rules.approvalRequired = true;
        StrategyVault asking = _deploy(rules);
        usdc.approve(address(asking), type(uint256).max);
        asking.deposit(100e6);
        asking.approveTrade(0, address(nvda), 50e6);
        vm.prank(executor);
        asking.buy(address(nvda), 50e6, _floor(50e6));

        _setPrice(nvdaPool, ROOT_75, TICK_75);
        vm.prank(executor);
        asking.exitStock(address(nvda));
        assertEq(nvda.balanceOf(address(asking)), 0);
    }

    function test_anExitCanBeTriggeredByTheReactiveCallbackForTheOwner() public {
        _setPrice(nvdaPool, ROOT_75, TICK_75);

        vm.prank(callbackProxy);
        vault.triggerStockExit(owner, address(nvda));
        assertEq(nvda.balanceOf(address(vault)), 0);
    }

    function test_aReactiveTriggerCantSellWhenTheConditionIsNotMet() public {
        vm.prank(callbackProxy);
        vm.expectRevert(StrategyVault.ConditionNotMet.selector);
        vault.triggerStockExit(owner, address(nvda));
    }

    function test_onlyTheProxyForTheOwnersReactiveContractCanTrigger() public {
        _setPrice(nvdaPool, ROOT_75, TICK_75);

        vm.expectRevert("Authorized sender only");
        vault.triggerStockExit(owner, address(nvda));

        vm.prank(callbackProxy);
        vm.expectRevert("Authorized RVM ID only");
        vault.triggerStockExit(stranger, address(nvda));

        vm.prank(stranger);
        vm.expectRevert(StrategyVault.NotOwnerOrExecutor.selector);
        vault.exitStock(address(nvda));
    }

    function test_thePortfolioStopSellsEverythingAndPausesBuying() public {
        // The vault is worth $500 with a high of $500. Both stocks fall to $50: it is worth about $300 less than... check below 75% of the high
        _setPrice(nvdaPool, ROOT_50, TICK_50);
        _setPrice(aaplPool, ROOT_50, TICK_50);
        // 100 cash + 2 x ~$100 in stock = ~$300, under 75% of $500

        vm.prank(callbackProxy);
        vault.triggerPortfolioStop(owner);

        assertEq(nvda.balanceOf(address(vault)), 0);
        assertEq(aapl.balanceOf(address(vault)), 0);
        assertGt(vault.pausedUntil(), block.timestamp);
        assertEq(vault.pausedUntil(), block.timestamp + 90 days);
        // In cash, the high starts again from what is left
        assertEq(vault.highWatermark(), usdc.balanceOf(address(vault)));

        uint256 until = vault.pausedUntil();
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.Paused.selector, until));
        vault.buy(address(nvda), 10e6, _floor(10e6));
    }

    function test_buyingStartsAgainAfterThePause() public {
        _setPrice(nvdaPool, ROOT_50, TICK_50);
        _setPrice(aaplPool, ROOT_50, TICK_50);
        vault.exitAll();

        vm.warp(block.timestamp + 90 days + 1);
        // At $50 a USDC buys twice the stock it did at $100, so the least to accept (1% off) is twice as much
        vm.prank(executor);
        vault.buy(address(nvda), 10e6, (10e6 * 2 * 99) / 100);
        assertGt(nvda.balanceOf(address(vault)), 0);
    }

    function test_thePortfolioStopIsRefusedWhileTheVaultIsNotDownFarEnough() public {
        vm.prank(callbackProxy);
        vm.expectRevert(StrategyVault.ConditionNotMet.selector);
        vault.triggerPortfolioStop(owner);

        vm.expectRevert(StrategyVault.ConditionNotMet.selector);
        vault.exitAll();
    }

    function test_theOwnerStaysAbleToWithdrawWhilePaused() public {
        _setPrice(nvdaPool, ROOT_50, TICK_50);
        _setPrice(aaplPool, ROOT_50, TICK_50);
        vault.exitAll();

        uint256 cash = usdc.balanceOf(address(vault));
        vault.withdrawUsdc(cash);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_aManipulatedPriceCantTriggerAStop() public {
        // A sudden drop in the price now that the average has not caught up with: the vault does not trust it
        _setPrice(nvdaPool, ROOT_50, TICK_50);
        nvdaPool.setTwapTick(TICK_100);

        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(StrategyVault.PriceOutOfLine.selector, address(nvda)));
        vault.exitStock(address(nvda));
        assertGt(nvda.balanceOf(address(vault)), 0);
    }

    function test_theHighOnlyMovesUpAndPokeRecordsAGain() public {
        uint256 high = vault.highWatermark();
        _setPrice(nvdaPool, ROOT_200, TICK_200);
        _setPrice(aaplPool, ROOT_200, TICK_200);
        vm.prank(stranger);
        vault.poke();
        assertGt(vault.highWatermark(), high);

        uint256 raised = vault.highWatermark();
        _setPrice(nvdaPool, ROOT_100, TICK_100);
        _setPrice(aaplPool, ROOT_100, TICK_100);
        vault.poke();
        assertEq(vault.highWatermark(), raised);
    }
}

contract VaultMathTest is Test {
    uint160 private constant Q96 = uint160(VaultMath.Q96);

    function test_aStockIsWorthItsPriceWhenUsdcIsToken0() public pure {
        // sqrtPrice 2^96 is 1 raw stock per raw USDC: 100 raw stock units are worth 100 raw USDC units
        assertEq(VaultMath.usdcValue(100e6, Q96, true), 100e6);
        assertEq(VaultMath.stockFor(100e6, Q96, true), 100e6);
    }

    function test_aStockIsWorthItsPriceWhenUsdcIsToken1() public pure {
        assertEq(VaultMath.usdcValue(100e6, Q96, false), 100e6);
        assertEq(VaultMath.stockFor(100e6, Q96, false), 100e6);
    }

    function test_theTwoWaysAreInversesOfEachOther() public pure {
        uint160 root = Q96 * 3 / 2;
        uint256 stock = VaultMath.stockFor(1_000e6, root, true);
        assertApproxEqRel(VaultMath.usdcValue(stock, root, true), 1_000e6, 1e12);

        uint256 stock2 = VaultMath.stockFor(1_000e6, root, false);
        assertApproxEqRel(VaultMath.usdcValue(stock2, root, false), 1_000e6, 1e12);
    }

    function test_averageTickRoundsDownLikeUniswapDoes() public pure {
        assertEq(VaultMath.averageTick(0, 1800 * 5, 1800), 5);
        assertEq(VaultMath.averageTick(0, -1800 * 5, 1800), -5);
        // A negative total that does not divide evenly rounds toward negative infinity
        assertEq(VaultMath.averageTick(0, -1800 * 5 - 1, 1800), -6);
    }

    function test_distanceIsTheGapEitherWay() public pure {
        assertEq(VaultMath.distance(10, -5), 15);
        assertEq(VaultMath.distance(-5, 10), 15);
        assertEq(VaultMath.distance(7, 7), 0);
    }
}
