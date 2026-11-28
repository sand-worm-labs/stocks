// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";

import {VaultFixture} from "./StrategyVault.t.sol";
import {MockCLPool} from "./mocks/MockCLPool.sol";
import {BlockBuilders} from "./support/BlockBuilders.sol";
import {RulePlugins} from "./support/RulePlugins.sol";
import {MockReadings} from "./mocks/MockReadings.sol";
import {MockToken} from "./mocks/MockToken.sol";

import {IERC7484} from "../src/erc7579/IERC7484.sol";
import {ModuleInit, StrategyAccount} from "../src/account/StrategyAccount.sol";
import {IBlock} from "../src/blocks/interfaces/IBlock.sol";
import {ICondition} from "../src/blocks/interfaces/ICondition.sol";
import {IRebalancePolicy} from "../src/blocks/interfaces/IRebalancePolicy.sol";
import {Indicator, Op, Pick, Schedule, Weighting} from "../src/blocks/types/Enums.sol";
import {Channels} from "../src/blocks/Channels.sol";
import {CashBlock} from "../src/blocks/leaves/CashBlock.sol";
import {SpecifiedGroup} from "../src/blocks/groups/SpecifiedGroup.sol";
import {FilterBlock} from "../src/blocks/logic/FilterBlock.sol";
import {IfBlock} from "../src/blocks/logic/IfBlock.sol";
import {RebalanceBlock} from "../src/blocks/logic/RebalanceBlock.sol";
import {AnyCondition} from "../src/blocks/conditions/AnyCondition.sol";
import {StrategyExecutor} from "../src/executors/StrategyExecutor.sol";
import {StrategyVaultFactory, VaultParams} from "../src/factory/StrategyVaultFactory.sol";
import {TradeGuard} from "../src/guards/TradeGuard.sol";
import {PoolPricing} from "../src/pricing/PoolPricing.sol";
import {IRulePlugin} from "../src/rules/IRulePlugin.sol";
import {StockRegistry} from "../src/registry/StockRegistry.sol";
import {StockSetup} from "../src/registry/StockTypes.sol";
import {Placement, Rule} from "../src/rules/RuleTypes.sol";
import {RuleIds} from "../src/rules/RuleIds.sol";

/// @notice Five strategies built from the blocks, each in its own vault with the same rules, run through five weeks of a simulated market of five
/// stocks: a launch, a rally, a crash, a rebound and a steady climb. Run it with `forge test --match-contract FiveStrategies -vv` to see what each
/// one holds after every week.
///
/// The rules are the same for all five, and are kept on-chain: a budget of $500, no stock over half the vault, pools of at least $100K, 1% slippage.
/// So what differs is only what each strategy decides, and what the rules make of it.
contract FiveStrategies is VaultFixture {
    uint256 private constant N = 5;

    StockRegistry private registry;
    TradeGuard private guard;
    StrategyExecutor private runner;
    StrategyVaultFactory private vaultFactory;
    MockReadings private readings;

    MockToken private msft;
    MockToken private tsla;
    MockToken private meta;
    MockCLPool private msftPool;
    MockCLPool private tslaPool;
    MockCLPool private metaPool;

    address private keeper = makeAddr("keeper");
    // Stands for "the market": a reading that is not a stock of this vault
    address private spy = makeAddr("market");

    address[] private stocks;
    MockCLPool[] private pools;
    string[5] private tickers = ["NVDA", "AAPL", "MSFT", "TSLA", "META"];
    // What each stock is worth now, as a fraction of $100
    uint256[5] private priceNum = [uint256(1), 1, 1, 1, 1];
    uint256[5] private priceDen = [uint256(1), 1, 1, 1, 1];

    StrategyAccount[5] private vaults;
    string[5] private names =
        ["Momentum rotation", "Risk-on / risk-off", "Low-volatility core", "Oversold dip buyer", "Barbell"];

    /// One week of the market: where each stock's price is, and the numbers the strategies read
    struct Week {
        string label;
        // Price levels: 0 is $100, 1 is $200, 2 is $50, 3 is $75
        uint8[5] level;
        // 126-day return, 60-day volatility and 10-day RSI of each stock, with 6 decimals (100_000 is 10%)
        int256[5] ret;
        int256[5] vol;
        int256[5] rsi;
        // Whether the market is above its 200-day average
        bool riskOn;
    }

    // ---------------------------------------------------------------------------------------------------------- setup
    function setUp() public override {
        super.setUp();
        vm.warp(1_800_000_000);

        msft = new MockToken(8);
        tsla = new MockToken(8);
        meta = new MockToken(8);
        msftPool = _pool(msft);
        tslaPool = _pool(tsla);
        metaPool = _pool(meta);

        stocks = [address(nvda), address(aapl), address(msft), address(tsla), address(meta)];
        pools = [nvdaPool, aaplPool, msftPool, tslaPool, metaPool];

        registry = new StockRegistry(address(usdc), address(this));
        for (uint256 i = 0; i < N; i++) {
            registry.list(StockSetup(stocks[i], address(pools[i]), address(router), 10));
        }
        guard = new TradeGuard(registry, 6);
        runner = new StrategyExecutor(registry, 6, address(0));
        vaultFactory = new StrategyVaultFactory(registry, runner, guard, IERC7484(address(0)), RulePlugins.deploy());
        readings = new MockReadings();

        IBlock[5] memory strategies = [momentum(), riskOnOff(), lowVolatility(), dipBuyer(), barbell()];
        for (uint256 i = 0; i < N; i++) {
            vaults[i] = _vault(strategies[i]);
        }
    }

    function _pool(MockToken stock) private returns (MockCLPool pool) {
        pool = new MockCLPool(address(usdc), address(stock), factory);
        router.setPool(address(usdc), address(stock), pool);
        pool.setPrice(ROOT_100, TICK_100);
        usdc.mint(address(pool), 500_000e6);
        stock.mint(address(pool), 5_000e8);
    }

    function _vault(IBlock strategy) private returns (StrategyAccount account) {
        // Every vault is deployed with the same rules, all kept on-chain
        Rule[] memory rules = new Rule[](5);
        rules[0] = Rule(RuleIds.BUDGET, Placement.OnChain, 500e6, "");
        rules[1] = Rule(RuleIds.MAX_WEIGHT, Placement.OnChain, 5000, "");
        rules[2] = Rule(RuleIds.MIN_LIQUIDITY, Placement.OnChain, 100_000e6, "");
        rules[3] = Rule(RuleIds.SLIPPAGE, Placement.OnChain, 100, "");
        rules[4] = Rule(RuleIds.STOP_LOSS, Placement.OffChain, 2000, "");

        VaultParams memory params = VaultParams({
            strategy: strategy,
            readings: readings,
            // A RebalanceBlock is its own policy; any other strategy rebalances whenever it is asked
            policy: IRebalancePolicy(address(0)),
            keeper: keeper,
            keeperUntil: uint64(block.timestamp + 365 days),
            stocks: stocks,
            rules: rules,
            extraModules: new ModuleInit[](0),
            extraRulePlugins: new IRulePlugin[](0)
        });
        account = StrategyAccount(payable(vaultFactory.create(params)));
        usdc.mint(address(account), 500e6);
    }

    // ---------------------------------------------------------------------------------------------------------- the five strategies
    function filter(Pick pick, uint8 count, Indicator by, uint16 window, Weighting weighting)
        private
        returns (FilterBlock)
    {
        return BlockBuilders.filter(stocks, pick, count, by, window, weighting, 60);
    }

    /// 1. The two stocks that have gone up most over 6 months, the steadier of them getting more, looked at weekly and traded only on a 5% drift.
    function momentum() private returns (IBlock) {
        return new RebalanceBlock(filter(Pick.Top, 2, Indicator.Return, 126, Weighting.Inverse), 500, Schedule.Weekly);
    }

    /// 2. While the market is above its 200-day average, the three best performers equally; when it is not, all cash.
    function riskOnOff() private returns (IBlock) {
        ICondition marketUp =
            BlockBuilders.compareReadings(Indicator.Price, 0, spy, Op.Greater, Indicator.Sma, 200, spy);
        return new IfBlock(marketUp, filter(Pick.Top, 3, Indicator.Return, 126, Weighting.Equal), new CashBlock());
    }

    /// 3. The three calmest stocks, equally: whatever has moved least over 60 days.
    function lowVolatility() private returns (IBlock) {
        return filter(Pick.Bottom, 3, Indicator.Volatility, 60, Weighting.Equal);
    }

    /// 4. If any stock is oversold (a 10-day RSI under 30), buy the two most oversold; if none is, hold cash.
    function dipBuyer() private returns (IBlock) {
        ICondition[] memory oversold = new ICondition[](N);
        for (uint256 i = 0; i < N; i++) {
            oversold[i] = BlockBuilders.compare(Indicator.Rsi, 10, stocks[i], Op.Less, int256(30e6));
        }
        return new IfBlock(
            new AnyCondition(oversold), filter(Pick.Bottom, 2, Indicator.Rsi, 10, Weighting.Equal), new CashBlock()
        );
    }

    /// 5. Half on the single best performer, half on the three calmest: a bet and a floor.
    function barbell() private returns (IBlock) {
        IBlock[] memory parts = new IBlock[](2);
        parts[0] = filter(Pick.Top, 1, Indicator.Return, 126, Weighting.Equal);
        parts[1] = filter(Pick.Bottom, 3, Indicator.Volatility, 60, Weighting.Equal);
        uint16[] memory shares = new uint16[](2);
        shares[0] = 5000;
        shares[1] = 5000;
        return new RebalanceBlock(new SpecifiedGroup(parts, shares), 500, Schedule.Weekly);
    }

    // ---------------------------------------------------------------------------------------------------------- the five weeks
    function marketPath() private pure returns (Week[5] memory w) {
        w[0] = Week(
            "week 1: launch, everything at $100, market up",
            [0, 0, 0, 0, 0],
            [int256(300_000), 100_000, 150_000, -50_000, 200_000],
            [int256(450_000), 200_000, 220_000, 550_000, 350_000],
            [int256(65e6), 50e6, 55e6, 25e6, 60e6],
            true
        );
        w[1] = Week(
            "week 2: NVDA rallies to $200, market up",
            [1, 0, 0, 0, 0],
            [int256(1_200_000), 100_000, 150_000, -50_000, 200_000],
            [int256(500_000), 200_000, 220_000, 550_000, 350_000],
            [int256(85e6), 50e6, 55e6, 25e6, 60e6],
            true
        );
        w[2] = Week(
            "week 3: crash. TSLA and META halve, MSFT -25%, market down",
            [0, 0, 3, 2, 2],
            [int256(-100_000), -50_000, -250_000, -500_000, -500_000],
            [int256(700_000), 300_000, 450_000, 900_000, 800_000],
            [int256(28e6), 40e6, 25e6, 15e6, 18e6],
            false
        );
        w[3] = Week(
            "week 4: rebound. TSLA and META recover to $75 and $75, market up",
            [0, 0, 0, 3, 3],
            [int256(50_000), 20_000, 100_000, 150_000, 200_000],
            [int256(500_000), 250_000, 300_000, 600_000, 450_000],
            [int256(55e6), 48e6, 52e6, 45e6, 50e6],
            true
        );
        w[4] = Week(
            "week 5: steady climb, NVDA back to $200, market up",
            [1, 0, 0, 0, 0],
            [int256(400_000), 100_000, 150_000, 100_000, 250_000],
            [int256(400_000), 180_000, 200_000, 500_000, 300_000],
            [int256(70e6), 52e6, 55e6, 50e6, 58e6],
            true
        );
    }

    function applyWeek(Week memory week) private {
        uint160[4] memory roots = [uint160(ROOT_100), ROOT_200, ROOT_50, ROOT_75];
        int24[4] memory ticks = [TICK_100, TICK_200, TICK_50, TICK_75];
        uint256[4] memory nums = [uint256(1), 2, 1, 3];
        uint256[4] memory dens = [uint256(1), 1, 2, 4];

        for (uint256 i = 0; i < N; i++) {
            uint8 level = week.level[i];
            pools[i].setPrice(roots[level], ticks[level]);
            (priceNum[i], priceDen[i]) = (nums[level], dens[level]);
            readings.set(Channels.indicator(Indicator.Return, 126, stocks[i]), week.ret[i]);
            readings.set(Channels.indicator(Indicator.Volatility, 60, stocks[i]), week.vol[i]);
            readings.set(Channels.indicator(Indicator.Rsi, 10, stocks[i]), week.rsi[i]);
        }
        readings.set(Channels.indicator(Indicator.Price, 0, spy), week.riskOn ? int256(500e6) : int256(400e6));
        readings.set(Channels.indicator(Indicator.Sma, 200, spy), int256(450e6));
    }

    // ---------------------------------------------------------------------------------------------------------- reading a vault
    function attempt(StrategyAccount account) private returns (string memory) {
        vm.prank(keeper);
        try runner.rebalance(address(account)) {
            return "rebalanced";
        } catch (bytes memory reason) {
            bytes4 selector = bytes4(reason);
            if (selector == StrategyExecutor.NotDue.selector) return "not due";
            if (selector == StrategyExecutor.NothingToDo.selector) return "already right";
            if (selector == PoolPricing.PriceOutOfLine.selector) return "price refused";
            console.logBytes(reason);
            fail("The executor built something the guard refused");
            return "BUG";
        }
    }

    function holdings(StrategyAccount account) private view returns (string memory text, uint256 total) {
        uint256[5] memory values;
        for (uint256 i = 0; i < N; i++) {
            values[i] = (MockToken(stocks[i]).balanceOf(address(account)) * priceNum[i]) / priceDen[i];
            total += values[i];
        }
        uint256 cash = usdc.balanceOf(address(account));
        total += cash;

        for (uint256 i = 0; i < N; i++) {
            if (values[i] * 100 >= total) {
                text = string.concat(text, tickers[i], " ", vm.toString((values[i] * 100) / total), "%  ");
            }
        }
        text = string.concat(text, "cash ", vm.toString((cash * 100) / total), "%");
    }

    function pad(string memory text, uint256 width) private pure returns (string memory) {
        while (bytes(text).length < width) text = string.concat(text, " ");
        return text;
    }

    // ---------------------------------------------------------------------------------------------------------- the run
    function test_fiveStrategiesThroughFiveWeeks() public {
        Week[5] memory market = marketPath();
        console.log("");
        console.log(
            "Five strategies, the same $500 and the same on-chain rules each (a stock at most 50%, $100K pools, 1% slippage)"
        );
        console.log("");

        for (uint256 w = 0; w < market.length; w++) {
            applyWeek(market[w]);
            vm.warp(block.timestamp + 8 days);
            console.log(market[w].label);
            for (uint256 v = 0; v < N; v++) {
                string memory result = attempt(vaults[v]);
                (string memory held, uint256 total) = holdings(vaults[v]);
                console.log(
                    string.concat(
                        "   ", pad(names[v], 20), pad(result, 15), held, "   (worth $", vm.toString(total / 1e6), ")"
                    )
                );
            }
            console.log("");
        }
    }
}
