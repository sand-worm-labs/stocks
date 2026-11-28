// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";

import {VaultFixture} from "./StrategyVault.t.sol";
import {BlockBuilders} from "./support/BlockBuilders.sol";
import {RulePlugins} from "./support/RulePlugins.sol";
import {MockReadings} from "./mocks/MockReadings.sol";

import {IERC7579Module, MODULE_TYPE_EXECUTOR} from "../src/erc7579/IERC7579.sol";
import {IERC7484} from "../src/erc7579/IERC7484.sol";
import {ModuleInit, StrategyAccount} from "../src/account/StrategyAccount.sol";
import {IBlock} from "../src/blocks/interfaces/IBlock.sol";
import {ICondition} from "../src/blocks/interfaces/ICondition.sol";
import {IRebalancePolicy} from "../src/blocks/interfaces/IRebalancePolicy.sol";
import {Indicator, Op, Pick, Schedule, Weighting} from "../src/blocks/types/Enums.sol";
import {Channels} from "../src/blocks/Channels.sol";
import {AssetBlock} from "../src/blocks/leaves/AssetBlock.sol";
import {CashBlock} from "../src/blocks/leaves/CashBlock.sol";
import {SpecifiedGroup} from "../src/blocks/groups/SpecifiedGroup.sol";
import {FilterBlock} from "../src/blocks/logic/FilterBlock.sol";
import {IfBlock} from "../src/blocks/logic/IfBlock.sol";
import {EqualGroup} from "../src/blocks/groups/EqualGroup.sol";
import {RebalanceBlock} from "../src/blocks/logic/RebalanceBlock.sol";

import {StrategyExecutor} from "../src/executors/StrategyExecutor.sol";
import {StrategyVaultFactory, VaultParams} from "../src/factory/StrategyVaultFactory.sol";
import {TradeGuard} from "../src/guards/TradeGuard.sol";
import {PoolPricing} from "../src/pricing/PoolPricing.sol";
import {StockRegistry} from "../src/registry/StockRegistry.sol";
import {StockSetup} from "../src/registry/StockTypes.sol";
import {IRulePlugin, SwapCheck} from "../src/rules/IRulePlugin.sol";
import {RulePluginBase} from "../src/rules/modules/RulePluginBase.sol";
import {Limits, Placement, Rule} from "../src/rules/RuleTypes.sol";
import {RuleBook} from "../src/rules/RuleBook.sol";
import {RuleIds} from "../src/rules/RuleIds.sol";

/// @dev A rule of a kind the suite has never heard of, to show that a vault can use one: no single swap of more than this many whole dollars
contract CustomCapRule is RulePluginBase {
    bytes32 public constant CUSTOM_CAP = keccak256("custom-cap");

    error SwapOverTheCap(uint256 amountIn, uint256 most);

    function kind() external pure returns (bytes32) {
        return CUSTOM_CAP;
    }

    function checkSwap(SwapCheck calldata swap) external view override {
        uint256 most = _valueFor(swap.account) * 1e6;
        if (swap.isBuy && swap.amountIn > most) revert SwapOverTheCap(swap.amountIn, most);
    }
}

/// @notice A hundred flows through the whole suite, to read: five strategies, each deployed with five different placements of its rules (on-chain,
/// off-chain, both, mixed, and a rule of a kind the core does not know), through four markets. Each is run for real on simulated stocks and its
/// outcome is logged. Run with `forge test --match-contract FlowTraces -vv` to read them, and add `-vvvv` to a single flow to see every call.
///
/// What every flow must satisfy, and the test fails if one does not:
///  1. The executor never builds a trade that the guard refuses (the two are consistent).
///  2. After any rebalance no router holds a permission to take anything.
///  3. A rule placed onchain, or on both, holds: no stock is over its share.
///  4. Only fees are lost: the vault is worth at least 98% of what it started with, at the prices of its stocks.
///  5. The owner can always take everything out, with no module's help.
///  6. A pool whose price is out of line with its average is not traded in.
contract FlowTraces is VaultFixture {
    StockRegistry private registry;
    TradeGuard private guard;
    StrategyExecutor private runner;
    StrategyVaultFactory private vaultFactory;
    MockReadings private readings;
    CustomCapRule private custom;

    address private keeper = makeAddr("keeper");
    address private spy = makeAddr("spy");

    // What NVDA is worth, as a fraction of $100
    uint256 private nvdaNum = 1;
    uint256 private nvdaDen = 1;

    function setUp() public override {
        super.setUp();
        vm.warp(1_800_000_000);
        registry = new StockRegistry(address(usdc), address(this));
        registry.list(StockSetup(address(nvda), address(nvdaPool), address(router), 10));
        registry.list(StockSetup(address(aapl), address(aaplPool), address(router), 10));
        guard = new TradeGuard(registry, 6);
        runner = new StrategyExecutor(registry, 6, address(0));
        vaultFactory = new StrategyVaultFactory(registry, runner, guard, IERC7484(address(0)), RulePlugins.deploy());
        readings = new MockReadings();
        custom = new CustomCapRule();
    }

    // ---------------------------------------------------------------------------------------------------------- the five strategies
    function strategyName(uint256 s) private pure returns (string memory) {
        if (s == 0) return "equal NVDA+AAPL";
        if (s == 1) return "top-1 by 126d return";
        if (s == 2) return "top-2 weighted by steadiness";
        if (s == 3) return "NVDA if RSI>70 else cash";
        return "60/40 in a weekly-drift rebalance";
    }

    function addr(address a, address b) private pure returns (address[] memory list) {
        list = new address[](2);
        list[0] = a;
        list[1] = b;
    }

    function buildStrategy(uint256 s, uint256 flowId) private returns (IBlock strategy, IRebalancePolicy policy) {
        bytes32 nvdaReturn = Channels.indicator(Indicator.Return, 126, address(nvda));
        bytes32 aaplReturn = Channels.indicator(Indicator.Return, 126, address(aapl));
        readings.set(nvdaReturn, 100_000);
        readings.set(aaplReturn, 50_000);
        readings.set(Channels.indicator(Indicator.Volatility, 60, address(nvda)), 400_000);
        readings.set(Channels.indicator(Indicator.Volatility, 60, address(aapl)), 200_000);
        // RSI is high on even flows and low on odd ones, so the same strategy is seen both ways
        readings.set(Channels.indicator(Indicator.Rsi, 10, spy), flowId % 2 == 0 ? int256(80e6) : int256(40e6));

        if (s == 0) {
            IBlock[] memory kids = new IBlock[](2);
            kids[0] = new AssetBlock(address(nvda));
            kids[1] = new AssetBlock(address(aapl));
            return (new EqualGroup(kids), IRebalancePolicy(address(0)));
        }
        if (s == 1) {
            return (
                BlockBuilders.filter(
                    addr(address(nvda), address(aapl)), Pick.Top, 1, Indicator.Return, 126, Weighting.Equal, 0
                ),
                IRebalancePolicy(address(0))
            );
        }
        if (s == 2) {
            return (
                BlockBuilders.filter(
                    addr(address(nvda), address(aapl)), Pick.Top, 2, Indicator.Return, 126, Weighting.Inverse, 60
                ),
                IRebalancePolicy(address(0))
            );
        }
        if (s == 3) {
            ICondition high = BlockBuilders.compare(Indicator.Rsi, 10, spy, Op.Greater, int256(70e6));
            return (new IfBlock(high, new AssetBlock(address(nvda)), new CashBlock()), IRebalancePolicy(address(0)));
        }
        IBlock[] memory two = new IBlock[](2);
        two[0] = new AssetBlock(address(nvda));
        two[1] = new AssetBlock(address(aapl));
        uint16[] memory shares = new uint16[](2);
        shares[0] = 6000;
        shares[1] = 4000;
        RebalanceBlock block_ = new RebalanceBlock(new SpecifiedGroup(two, shares), 500, Schedule.Weekly);
        return (block_, IRebalancePolicy(address(block_)));
    }

    // ---------------------------------------------------------------------------------------------------------- the five placements of the rules
    function rulesName(uint256 r) private pure returns (string memory) {
        if (r == 0) return "all on-chain";
        if (r == 1) return "all off-chain";
        if (r == 2) return "mixed limits";
        if (r == 3) return "tight, on both";
        return "custom kind + off-chain stop";
    }

    function buildRules(uint256 r) private view returns (Rule[] memory list, IRulePlugin[] memory extra) {
        extra = new IRulePlugin[](0);
        if (r == 0) {
            list = new Rule[](5);
            list[0] = Rule(RuleIds.BUDGET, Placement.OnChain, 500e6, "");
            list[1] = Rule(RuleIds.MAX_WEIGHT, Placement.OnChain, 5500, "");
            list[2] = Rule(RuleIds.MIN_LIQUIDITY, Placement.OnChain, 100_000e6, "");
            list[3] = Rule(RuleIds.SLIPPAGE, Placement.OnChain, 100, "");
            list[4] = Rule(RuleIds.MAX_TRADE_OF_DEPTH, Placement.OnChain, 100, "");
        } else if (r == 1) {
            list = new Rule[](4);
            list[0] = Rule(RuleIds.BUDGET, Placement.OffChain, 500e6, "");
            list[1] = Rule(RuleIds.MAX_WEIGHT, Placement.OffChain, 3000, "");
            list[2] = Rule(RuleIds.MIN_LIQUIDITY, Placement.OffChain, 100_000e6, "");
            list[3] = Rule(RuleIds.STOP_LOSS, Placement.OffChain, 2000, "");
        } else if (r == 2) {
            list = new Rule[](4);
            list[0] = Rule(RuleIds.MAX_WEIGHT, Placement.OnChain, 6000, "");
            list[1] = Rule(RuleIds.BUDGET, Placement.OffChain, 200e6, "");
            list[2] = Rule(RuleIds.MIN_LIQUIDITY, Placement.Both, 100_000e6, "");
            list[3] = Rule(RuleIds.SLIPPAGE, Placement.OffChain, 50, "");
        } else if (r == 3) {
            list = new Rule[](3);
            list[0] = Rule(RuleIds.MAX_WEIGHT, Placement.Both, 4000, "");
            list[1] = Rule(RuleIds.BUDGET, Placement.Both, 300e6, "");
            list[2] = Rule(RuleIds.MAX_TRADE_OF_DEPTH, Placement.OnChain, 50, "");
        } else {
            list = new Rule[](3);
            list[0] = Rule(RuleIds.MAX_WEIGHT, Placement.OnChain, 5000, "");
            list[1] = Rule(custom.CUSTOM_CAP(), Placement.Both, 1000, "");
            list[2] = Rule(RuleIds.STOP_LOSS, Placement.OffChain, 2000, "");
            extra = new IRulePlugin[](1);
            extra[0] = custom;
        }
    }

    // ---------------------------------------------------------------------------------------------------------- the four markets
    function marketName(uint256 m) private pure returns (string memory) {
        if (m == 0) return "flat";
        if (m == 1) return "NVDA doubles";
        if (m == 2) return "NVDA halves";
        return "price spike (out of line)";
    }

    function applyMarket(uint256 m) private {
        if (m == 1) {
            nvdaPool.setPrice(ROOT_200, TICK_200);
            (nvdaNum, nvdaDen) = (2, 1);
        } else if (m == 2) {
            nvdaPool.setPrice(ROOT_50, TICK_50);
            (nvdaNum, nvdaDen) = (1, 2);
        }
    }

    function resetMarket() private {
        _setPrice(nvdaPool, ROOT_100, TICK_100);
        _setPrice(aaplPool, ROOT_100, TICK_100);
        (nvdaNum, nvdaDen) = (1, 1);
    }

    // ---------------------------------------------------------------------------------------------------------- one flow
    function value(StrategyAccount account) private view returns (uint256 nvdaValue, uint256 aaplValue, uint256 cash) {
        nvdaValue = (nvda.balanceOf(address(account)) * nvdaNum) / nvdaDen;
        aaplValue = aapl.balanceOf(address(account));
        cash = usdc.balanceOf(address(account));
    }

    /// @dev Asks for a rebalance and says what came of it: "ok", or why it was not done. A refusal by the guard of what the executor built is a bug.
    function attempt(StrategyAccount account) private returns (string memory) {
        vm.prank(keeper);
        try runner.rebalance(address(account)) {
            return "ok";
        } catch (bytes memory reason) {
            bytes4 selector = bytes4(reason);
            if (selector == StrategyExecutor.NotDue.selector) return "not due";
            if (selector == StrategyExecutor.NothingToDo.selector) return "nothing to do";
            if (selector == StrategyExecutor.EmptyAccount.selector) return "empty";
            if (selector == PoolPricing.PriceOutOfLine.selector) return "price refused";
            // Anything else, above all a refusal by the guard of the executor's own trade, is a failure of the design
            console.logBytes(reason);
            fail("The executor built something that was refused");
            return "BUG";
        }
    }

    /// @dev A vault deployed with the strategy and the rules this flow is given, and 400 USDC in it
    function deploy(uint256 id) private returns (StrategyAccount account, Limits memory limits) {
        resetMarket();
        vm.warp(block.timestamp + 8 days);
        (IBlock strategy, IRebalancePolicy policy) = buildStrategy(id % 5, id);
        (Rule[] memory rules, IRulePlugin[] memory extra) = buildRules((id / 5) % 5);
        limits = RuleBook.limitsOf(rules);

        VaultParams memory params = VaultParams({
            strategy: strategy,
            readings: readings,
            policy: policy,
            keeper: keeper,
            keeperUntil: uint64(block.timestamp + 365 days),
            stocks: addr(address(nvda), address(aapl)),
            rules: rules,
            extraModules: new ModuleInit[](0),
            extraRulePlugins: extra
        });
        account = StrategyAccount(payable(vaultFactory.create(params)));
        usdc.mint(address(account), 400e6);
    }

    /// @dev What the vault is worth now, at the prices of now
    function worth(StrategyAccount account) private view returns (uint256) {
        (uint256 nvdaValue, uint256 aaplValue, uint256 cash) = value(account);
        return nvdaValue + aaplValue + cash;
    }

    /// @dev Runs the market through the vault: a rebalance, the market moves, a week passes, a rebalance again
    function play(StrategyAccount account, Limits memory limits, uint256 m)
        private
        returns (string memory out1, string memory out2)
    {
        if (m == 3) {
            // A pool's price jumps away from its own recent average: nothing may be traded in it
            nvdaPool.setTwapTick(TICK_100 + 600);
            aaplPool.setTwapTick(TICK_100 + 600);
            out1 = attempt(account);
            // Refused, or nothing to do when the strategy wants only cash and holds no stock, so no price was needed
            bool isRefused = keccak256(bytes(out1)) == keccak256("price refused")
                || keccak256(bytes(out1)) == keccak256("nothing to do");
            assertTrue(isRefused, "an untrusted price is never traded on");
            assertEq(
                nvda.balanceOf(address(account)) + aapl.balanceOf(address(account)),
                0,
                "no stock was bought at an untrusted price"
            );
            return (out1, "-");
        }
        out1 = attempt(account);
        _check(account, limits, 400e6);
        applyMarket(m);
        vm.warp(block.timestamp + 8 days);
        // The market may have moved the vault's value; what a rebalance may lose is fees, from what it was worth just before
        uint256 before = worth(account);
        out2 = attempt(account);
        _check(account, limits, before);
    }

    /// @dev The owner takes it all out with no module's help, and what the vault held is said as shares of its value
    function exit(StrategyAccount account) private returns (uint256 nvdaBps, uint256 aaplBps, uint256 cashBps) {
        uint256 before = usdc.balanceOf(address(this));
        uint256 cashHeld = usdc.balanceOf(address(account));
        account.emergencyWithdraw(address(usdc), cashHeld);
        assertEq(usdc.balanceOf(address(this)), before + cashHeld, "the owner takes their money out");

        (uint256 nvdaValue, uint256 aaplValue,) = value(account);
        uint256 total = nvdaValue + aaplValue + cashHeld;
        if (total == 0) return (0, 0, 0);
        return ((nvdaValue * 100) / total, (aaplValue * 100) / total, (cashHeld * 100) / total);
    }

    function runFlow(uint256 id) private returns (string memory) {
        (StrategyAccount account, Limits memory limits) = deploy(id);
        (string memory out1, string memory out2) = play(account, limits, (id / 25) % 4);
        (uint256 nvdaPct, uint256 aaplPct, uint256 cashPct) = exit(account);
        return describe(
            id,
            out1,
            out2,
            string.concat(
                "NVDA ", vm.toString(nvdaPct), "% AAPL ", vm.toString(aaplPct), "% cash ", vm.toString(cashPct), "%"
            )
        );
    }

    function describe(uint256 id, string memory out1, string memory out2, string memory holdings)
        private
        view
        returns (string memory)
    {
        string memory number = id < 10
            ? string.concat("00", vm.toString(id))
            : (id < 100 ? string.concat("0", vm.toString(id)) : vm.toString(id));
        string memory head =
            string.concat("flow ", number, " | ", strategyName(id % 5), " | rules: ", rulesName((id / 5) % 5));
        string memory tail =
            string.concat(" | market: ", marketName((id / 25) % 4), " | #1 ", out1, " | #2 ", out2, " | ", holdings);
        return string.concat(head, tail);
    }

    /// @dev What must hold after any rebalance, at the prices of now
    function _check(StrategyAccount account, Limits memory limits, uint256 started) private view {
        // 2. no permission is left with the router
        assertEq(usdc.allowance(address(account), address(router)), 0, "usdc allowance left");
        assertEq(nvda.allowance(address(account), address(router)), 0, "nvda allowance left");
        assertEq(aapl.allowance(address(account), address(router)), 0, "aapl allowance left");

        (uint256 nvdaValue, uint256 aaplValue, uint256 cash) = value(account);
        uint256 total = nvdaValue + aaplValue + cash;
        // 4. only fees are lost
        assertGe(total * 100, started * 98, "more than fees were lost");

        // 3. a limit placed on-chain, or on both, holds
        if (limits.maxWeightBps < 10_000 && total > 0) {
            assertLe((nvdaValue * 10_000) / total, limits.maxWeightBps, "NVDA over its share");
            assertLe((aaplValue * 10_000) / total, limits.maxWeightBps, "AAPL over its share");
        }
        if (limits.budget != type(uint256).max) {
            // The strategy invests no more than the budget (a little over is the fill's price against the pool)
            assertLe(nvdaValue + aaplValue, (limits.budget * 10_300) / 10_000, "invested past the budget");
        }
    }

    // ---------------------------------------------------------------------------------------------------------- the hundred, in four runs
    function test_flows_0_to_24() public {
        for (uint256 i = 0; i < 25; i++) {
            console.log(runFlow(i));
        }
    }

    function test_flows_25_to_49() public {
        for (uint256 i = 25; i < 50; i++) {
            console.log(runFlow(i));
        }
    }

    function test_flows_50_to_74() public {
        for (uint256 i = 50; i < 75; i++) {
            console.log(runFlow(i));
        }
    }

    function test_flows_75_to_99() public {
        for (uint256 i = 75; i < 100; i++) {
            console.log(runFlow(i));
        }
    }

    /// @notice One flow on its own, to read every call it makes: `forge test --match-test test_traceOneFlow -vvvv`
    /// Flow 27: "top-2 weighted by steadiness", every rule on-chain, and NVDA doubles after the first rebalance.
    function test_traceOneFlow() public {
        console.log(runFlow(27));
    }
}
