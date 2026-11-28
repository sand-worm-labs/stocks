// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";
import {Vm} from "forge-std/Vm.sol";
import {VaultFixture} from "./StrategyVault.t.sol";
import {BlockBuilders} from "./support/BlockBuilders.sol";
import {RulePlugins} from "./support/RulePlugins.sol";
import {MockReadings} from "./mocks/MockReadings.sol";
import {MockToken} from "./mocks/MockToken.sol";

import {IERC7579Execution, IERC7579Module, MODULE_TYPE_EXECUTOR, MODULE_TYPE_HOOK} from "../src/erc7579/IERC7579.sol";
import {Execution, ExecutionLib} from "../src/erc7579/ExecutionLib.sol";
import {ModeLib} from "../src/erc7579/ModeLib.sol";
import {IERC7484} from "../src/erc7579/IERC7484.sol";
import {ModuleInit, StrategyAccount} from "../src/account/StrategyAccount.sol";
import {Allocation} from "../src/blocks/types/Allocation.sol";
import {IBlock} from "../src/blocks/interfaces/IBlock.sol";
import {IRebalancePolicy} from "../src/blocks/interfaces/IRebalancePolicy.sol";
import {Indicator, Pick, Schedule, Weighting} from "../src/blocks/types/Enums.sol";
import {Channels} from "../src/blocks/Channels.sol";
import {AssetBlock} from "../src/blocks/leaves/AssetBlock.sol";
import {EqualGroup} from "../src/blocks/groups/EqualGroup.sol";
import {FilterBlock} from "../src/blocks/logic/FilterBlock.sol";
import {RebalanceBlock} from "../src/blocks/logic/RebalanceBlock.sol";
import {StrategyExecutor} from "../src/executors/StrategyExecutor.sol";
import {StrategyVaultFactory, VaultParams} from "../src/factory/StrategyVaultFactory.sol";
import {IGuardErrors} from "../src/guards/IGuardErrors.sol";
import {TradeGuard} from "../src/guards/TradeGuard.sol";
import {IERC20Minimal} from "../src/interfaces/IERC20Minimal.sol";
import {ISlipstreamRouter} from "../src/interfaces/ISlipstreamRouter.sol";
import {IRulePlugin} from "../src/rules/IRulePlugin.sol";
import {OffChainRule} from "../src/rules/offchain/OffChainRule.sol";
import {OffChainFunctions} from "../src/rules/offchain/OffChainFunctions.sol";
import {MaxWeightRule} from "../src/rules/modules/MaxWeightRule.sol";
import {MinLiquidityRule} from "../src/rules/modules/MinLiquidityRule.sol";
import {SlippageRule} from "../src/rules/modules/SlippageRule.sol";
import {TradeSizeRule} from "../src/rules/modules/TradeSizeRule.sol";
import {StockRegistry} from "../src/registry/StockRegistry.sol";
import {StockSetup} from "../src/registry/StockTypes.sol";
import {Placement, Rule} from "../src/rules/RuleTypes.sol";
import {RuleBook} from "../src/rules/RuleBook.sol";
import {RuleIds} from "../src/rules/RuleIds.sol";

/// @dev An executor that does whatever it is told: what a compromised or buggy one would be. The guard is what stands between it and the account.
contract EvilExecutor is IERC7579Module {
    function onInstall(bytes calldata) external {}

    function onUninstall(bytes calldata) external {}

    function isModuleType(uint256 moduleTypeId) external pure returns (bool) {
        return moduleTypeId == MODULE_TYPE_EXECUTOR;
    }

    function run(address account, bytes32 mode, bytes calldata data) external {
        IERC7579Execution(account).executeFromExecutor(mode, data);
    }
}

/// @dev A module registry that has attested to the modules it was told about, and reverts for any other, as ERC-7484 asks
contract MockModuleRegistry is IERC7484 {
    error NotAttested(address module);

    mapping(address => bool) public attested;

    function attest(address module) external {
        attested[module] = true;
    }

    function checkForAccount(address, address module, uint256) external view {
        if (!attested[module]) revert NotAttested(module);
    }
}

/// @dev A vault deployed with rules, trading simulated stocks: mock USDC and stock tokens, mock Slipstream pools and a mock router, at $100 a share
contract StrategyVault7579Test is VaultFixture {
    StockRegistry private registry;
    TradeGuard private guard;
    StrategyExecutor private runner;
    StrategyVaultFactory private vaultFactory;
    IRulePlugin[] private rulePlugins;
    MockReadings private readings;

    address private keeper = makeAddr("keeper");
    address private attacker = makeAddr("attacker");

    bytes32 private constant BATCH = bytes32(0);
    uint64 private until;

    function setUp() public override {
        super.setUp();
        vm.warp(1_800_000_000);
        until = uint64(block.timestamp + 30 days);

        registry = new StockRegistry(address(usdc), address(this));
        registry.list(StockSetup(address(nvda), address(nvdaPool), address(router), 10));
        registry.list(StockSetup(address(aapl), address(aaplPool), address(router), 10));

        guard = new TradeGuard(registry, 6);
        runner = new StrategyExecutor(registry, 6, address(0));
        rulePlugins = RulePlugins.deploy();
        vaultFactory = new StrategyVaultFactory(registry, runner, guard, IERC7484(address(0)), rulePlugins);
        readings = new MockReadings();
    }

    // ---------------------------------------------------------------------------------------------------------- helpers
    function batchMode() private pure returns (bytes32) {
        return ModeLib.encode(ModeLib.CALLTYPE_BATCH, ModeLib.EXECTYPE_DEFAULT);
    }

    function stockList() private view returns (address[] memory list) {
        list = new address[](2);
        list[0] = address(nvda);
        list[1] = address(aapl);
    }

    /// 500 USDC at most, 55% in a stock, pools of $100K, 1% slippage: on-chain. A 20% stop-loss and asking before trading: off-chain.
    function rules() private pure returns (Rule[] memory list) {
        list = new Rule[](6);
        list[0] = Rule(RuleIds.BUDGET, Placement.OnChain, 500e6, "");
        list[1] = Rule(RuleIds.MAX_WEIGHT, Placement.OnChain, 5500, "");
        list[2] = Rule(RuleIds.MIN_LIQUIDITY, Placement.OnChain, 100_000e6, "");
        list[3] = Rule(RuleIds.SLIPPAGE, Placement.OnChain, 100, "");
        list[4] = Rule(RuleIds.STOP_LOSS, Placement.OffChain, 2000, "");
        list[5] = Rule(RuleIds.APPROVAL, Placement.OffChain, 0, "");
    }

    function equalStrategy() private returns (IBlock) {
        IBlock[] memory children = new IBlock[](2);
        children[0] = new AssetBlock(address(nvda));
        children[1] = new AssetBlock(address(aapl));
        return new EqualGroup(children);
    }

    function topOneStrategy() private returns (IBlock) {
        return BlockBuilders.filter(stockList(), Pick.Top, 1, Indicator.Return, 126, Weighting.Equal, 0);
    }

    function params(IBlock strategy, IRebalancePolicy policy, Rule[] memory ruleList)
        private
        view
        returns (VaultParams memory)
    {
        return VaultParams({
            strategy: strategy,
            readings: readings,
            policy: policy,
            keeper: keeper,
            keeperUntil: until,
            stocks: stockList(),
            rules: ruleList,
            extraModules: new ModuleInit[](0),
            extraRulePlugins: new IRulePlugin[](0)
        });
    }

    function make(IBlock strategy, IRebalancePolicy policy) private returns (StrategyAccount) {
        return StrategyAccount(payable(vaultFactory.create(params(strategy, policy, rules()))));
    }

    function funded(IBlock strategy, IRebalancePolicy policy, uint256 amount)
        private
        returns (StrategyAccount account)
    {
        account = make(strategy, policy);
        usdc.mint(address(account), amount);
    }

    function rebalance(StrategyAccount account) private {
        vm.prank(keeper);
        runner.rebalance(address(account));
    }

    function setReturns(int256 nvdaReturn, int256 aaplReturn) private {
        readings.set(Channels.indicator(Indicator.Return, 126, address(nvda)), nvdaReturn);
        readings.set(Channels.indicator(Indicator.Return, 126, address(aapl)), aaplReturn);
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address recipient)
        private
        view
        returns (Execution memory)
    {
        return Execution(
            address(router),
            0,
            abi.encodeCall(
                ISlipstreamRouter.exactInputSingle,
                (ISlipstreamRouter.ExactInputSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        tickSpacing: 10,
                        recipient: recipient,
                        deadline: block.timestamp,
                        amountIn: amountIn,
                        amountOutMinimum: minOut,
                        sqrtPriceLimitX96: 0
                    }))
            )
        );
    }

    function approve(address token, address spender, uint256 amount) private pure returns (Execution memory) {
        return Execution(token, 0, abi.encodeCall(IERC20Minimal.approve, (spender, amount)));
    }

    /// An evil executor, installed by the owner (the guard still applies to everything it asks)
    function evilOn(StrategyAccount account) private returns (EvilExecutor evil) {
        evil = new EvilExecutor();
        account.installModule(MODULE_TYPE_EXECUTOR, address(evil), "");
    }

    function attack(StrategyAccount account, EvilExecutor evil, Execution[] memory calls) private {
        evil.run(address(account), batchMode(), ExecutionLib.encodeBatch(calls));
    }

    function one(Execution memory call) private pure returns (Execution[] memory list) {
        list = new Execution[](1);
        list[0] = call;
    }

    // ---------------------------------------------------------------------------------------------------------- running a strategy
    function test_aVaultDeployedWithItsRulesRunsItsStrategyOnSimulatedStocks() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        rebalance(account);

        // 400 USDC split in two: 200 into each, less the pool's 0.3% take
        assertEq(nvda.balanceOf(address(account)), 199_400_000);
        assertEq(aapl.balanceOf(address(account)), 199_400_000);
        assertEq(usdc.balanceOf(address(account)), 0);
        // and no permission is left with the router
        assertEq(usdc.allowance(address(account), address(router)), 0);
    }

    function test_theStrategyRotatesWhenItsReadingsChange() public {
        StrategyAccount account = funded(topOneStrategy(), IRebalancePolicy(address(0)), 400e6);

        setReturns(100_000, 50_000); // NVDA leads
        rebalance(account);
        assertGt(nvda.balanceOf(address(account)), 0);
        assertEq(aapl.balanceOf(address(account)), 0);
        // One stock may only be 55% of the vault, so the rest stays in cash
        assertGt(usdc.balanceOf(address(account)), 150e6);

        setReturns(20_000, 90_000); // now AAPL leads
        rebalance(account);
        assertEq(nvda.balanceOf(address(account)), 0);
        assertGt(aapl.balanceOf(address(account)), 0);
    }

    function test_noStockGrowsPastItsShareOfTheVault() public {
        StrategyAccount account = funded(topOneStrategy(), IRebalancePolicy(address(0)), 400e6);
        setReturns(100_000, 50_000);
        rebalance(account);

        uint256 value = nvda.balanceOf(address(account)); // $100 a share: raw stock is raw USDC
        uint256 total = value + usdc.balanceOf(address(account));
        assertLe((value * 10_000) / total, 5500);
    }

    function test_aStrategyThatNamesAStockTheVaultMayNotTradeIsRefused() public {
        address stranger = makeAddr("some other stock");
        StrategyAccount account = funded(new AssetBlock(stranger), IRebalancePolicy(address(0)), 400e6);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.StockNotAllowed.selector, stranger));
        runner.rebalance(address(account));
    }

    function test_anEmptyVaultHasNothingToRunOn_andAnAlreadyRightOneHasNothingToDo() public {
        StrategyAccount account = make(equalStrategy(), IRebalancePolicy(address(0)));
        vm.prank(keeper);
        vm.expectRevert(StrategyExecutor.EmptyAccount.selector);
        runner.rebalance(address(account));

        usdc.mint(address(account), 400e6);
        rebalance(account);
        vm.prank(keeper);
        vm.expectRevert(StrategyExecutor.NothingToDo.selector);
        runner.rebalance(address(account));
    }

    function test_thePreviewSaysWhatItWouldDoSoTheAppCanCheckItsOwnRules() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        (Allocation[] memory current, Allocation[] memory target) = runner.preview(address(account));

        assertEq(current.length, 0);
        assertEq(target.length, 2);
        assertEq(target[0].weightBps, 5000);
        assertEq(target[1].weightBps, 5000);
    }

    function test_aVaultOnlyInvestsUpToItsBudget() public {
        // 900 USDC in a vault whose budget rule is 500: the rest stays as cash
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 900e6);
        rebalance(account);
        assertEq(nvda.balanceOf(address(account)), 249_250_000); // 250 less the take
        assertEq(usdc.balanceOf(address(account)), 400e6);
    }

    // ---------------------------------------------------------------------------------------------------------- the policy
    function test_theRebalancePolicyWaitsForTheScheduleAndForADrift() public {
        RebalanceBlock policy = new RebalanceBlock(equalStrategy(), 500, Schedule.Weekly);
        StrategyAccount account = funded(policy, IRebalancePolicy(address(policy)), 400e6);

        rebalance(account); // the first look is always due

        vm.prank(keeper);
        vm.expectRevert(StrategyExecutor.NotDue.selector);
        runner.rebalance(address(account)); // not a week on

        vm.warp(block.timestamp + 7 days);
        vm.prank(keeper);
        vm.expectRevert(StrategyExecutor.NotDue.selector);
        runner.rebalance(address(account)); // a week on, but nothing has drifted

        // NVDA doubles: it is now far above its share, and it is a week on
        nvdaPool.setPrice(ROOT_200, TICK_200);
        uint256 before = nvda.balanceOf(address(account));
        rebalance(account);
        assertLt(nvda.balanceOf(address(account)), before);
    }

    // ---------------------------------------------------------------------------------------------------------- the guard: an executor cannot do what the rules forbid
    function test_theGuardRefusesAnExecutorThatTriesToTakeTheMoney() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);

        vm.expectPartialRevert(IGuardErrors.NotAnApprovalOrSwap.selector);
        attack(
            account, evil, one(Execution(address(usdc), 0, abi.encodeCall(IERC20Minimal.transfer, (attacker, 100e6))))
        );
        assertEq(usdc.balanceOf(attacker), 0);
    }

    function test_theGuardRefusesASwapPaidToSomeoneElse() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);

        Execution[] memory calls = new Execution[](3);
        calls[0] = approve(address(usdc), address(router), 100e6);
        calls[1] = swap(address(usdc), address(nvda), 100e6, 99e6, attacker);
        calls[2] = approve(address(usdc), address(router), 0);
        vm.expectPartialRevert(IGuardErrors.SwapPaidToSomeoneElse.selector);
        attack(account, evil, calls);
    }

    function test_theGuardRefusesAnApprovalToAnyoneButTheRouter_andOneLeftOpen() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);

        vm.expectPartialRevert(IGuardErrors.ApprovalNotAllowed.selector);
        attack(account, evil, one(approve(address(usdc), attacker, 1)));

        // An approval to the router is not wrong in itself, but one left open afterwards is
        vm.expectRevert(abi.encodeWithSelector(IGuardErrors.AllowanceLeft.selector, address(usdc), address(router)));
        attack(account, evil, one(approve(address(usdc), address(router), 1_000e6)));
    }

    function test_theGuardRefusesASwapThatAcceptsAnyPrice() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);

        Execution[] memory calls = new Execution[](3);
        calls[0] = approve(address(usdc), address(router), 100e6);
        calls[1] = swap(address(usdc), address(nvda), 100e6, 0, address(account));
        calls[2] = approve(address(usdc), address(router), 0);
        // The default slippage is 2% on 100 USDC at $100: at least 98 USDC's worth must come back
        vm.expectRevert(abi.encodeWithSelector(IGuardErrors.SlippageTooLoose.selector, address(nvda), 0, 98e6));
        attack(account, evil, calls);
    }

    function test_theGuardRefusesABuyLargerThanAPercentOfThePool() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        usdc.mint(address(account), 50_000e6);
        EvilExecutor evil = evilOn(account);

        Execution[] memory calls = new Execution[](3);
        calls[0] = approve(address(usdc), address(router), 20_000e6);
        calls[1] = swap(address(usdc), address(nvda), 20_000e6, 19_800e6, address(account));
        calls[2] = approve(address(usdc), address(router), 0);
        // The pool holds $1M, so one buy is at most $10K
        vm.expectRevert(abi.encodeWithSelector(IGuardErrors.TradeTooLarge.selector, address(nvda), 20_000e6, 10_000e6));
        attack(account, evil, calls);
    }

    function test_theGuardRefusesAStockThatIsNotOnTheVaultsList() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);
        MockToken other = new MockToken(8);

        Execution[] memory calls = new Execution[](1);
        calls[0] = swap(address(usdc), address(other), 100e6, 99e6, address(account));
        vm.expectPartialRevert(IGuardErrors.StockNotTradable.selector);
        attack(account, evil, calls);
    }

    function test_theGuardRefusesAnythingButABatchThatRevertsOnFailure() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);
        bytes memory single =
            ExecutionLib.encodeSingle(address(usdc), 0, abi.encodeCall(IERC20Minimal.approve, (address(router), 1)));

        vm.expectPartialRevert(IGuardErrors.NotARevertingBatch.selector);
        evil.run(address(account), ModeLib.encode(ModeLib.CALLTYPE_SINGLE, ModeLib.EXECTYPE_DEFAULT), single);

        vm.expectPartialRevert(IGuardErrors.NotARevertingBatch.selector);
        evil.run(
            address(account),
            ModeLib.encode(ModeLib.CALLTYPE_BATCH, ModeLib.EXECTYPE_TRY),
            ExecutionLib.encodeBatch(one(approve(address(usdc), address(router), 1)))
        );
    }

    function test_theGuardRefusesNativeValue() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);
        vm.expectPartialRevert(IGuardErrors.NoNativeValue.selector);
        attack(account, evil, one(Execution(attacker, 1, "")));
    }

    function test_theGuardUndoesATradeThatLeavesAStockOverItsShare() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);

        // A fair swap in every way, but 300 of 400 USDC into one stock is 75% of the vault, and the rule is 55%
        Execution[] memory calls = new Execution[](3);
        calls[0] = approve(address(usdc), address(router), 300e6);
        calls[1] = swap(address(usdc), address(nvda), 300e6, 297e6, address(account));
        calls[2] = approve(address(usdc), address(router), 0);
        vm.expectPartialRevert(IGuardErrors.OverWeight.selector);
        attack(account, evil, calls);
        assertEq(nvda.balanceOf(address(account)), 0);
    }

    function test_aFairTradeByAnExecutorIsLetThrough() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        EvilExecutor evil = evilOn(account);

        Execution[] memory calls = new Execution[](3);
        calls[0] = approve(address(usdc), address(router), 200e6);
        calls[1] = swap(address(usdc), address(nvda), 200e6, 198e6, address(account));
        calls[2] = approve(address(usdc), address(router), 0);
        attack(account, evil, calls);
        assertEq(nvda.balanceOf(address(account)), 199_400_000);
    }

    // ---------------------------------------------------------------------------------------------------------- the owner always has a way out
    function test_theOwnerIsNotLimitedByTheGuard() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        account.execute(
            ModeLib.encode(ModeLib.CALLTYPE_SINGLE, ModeLib.EXECTYPE_DEFAULT),
            ExecutionLib.encodeSingle(address(usdc), 0, abi.encodeCall(IERC20Minimal.transfer, (stranger, 100e6)))
        );
        assertEq(usdc.balanceOf(stranger), 100e6);
    }

    function test_theOwnerCanTakeMoneyOutWithoutAnyModule() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        account.emergencyWithdraw(address(usdc), 400e6);
        assertEq(usdc.balanceOf(address(this)), 1_000_000e6 + 400e6);
    }

    function test_theOwnerCanDropAGuardWithoutItsHelp() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        account.forceUninstall(MODULE_TYPE_HOOK, address(guard));
        assertEq(account.hook(), address(0));

        // Without the guard an executor is free: which is why the owner, and only the owner, can do this
        EvilExecutor evil = evilOn(account);
        attack(
            account, evil, one(Execution(address(usdc), 0, abi.encodeCall(IERC20Minimal.transfer, (attacker, 100e6))))
        );
        assertEq(usdc.balanceOf(attacker), 100e6);
    }

    function test_nobodyButTheOwnerChangesWhatIsInstalledOrWithdraws() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        vm.startPrank(attacker);
        vm.expectRevert(StrategyAccount.NotOwner.selector);
        account.forceUninstall(MODULE_TYPE_HOOK, address(guard));
        vm.expectRevert(StrategyAccount.NotOwner.selector);
        account.emergencyWithdraw(address(usdc), 1);
        vm.expectRevert(StrategyAccount.NotOwner.selector);
        account.execute(batchMode(), ExecutionLib.encodeBatch(new Execution[](0)));
        vm.expectRevert(StrategyAccount.NotExecutor.selector);
        account.executeFromExecutor(batchMode(), ExecutionLib.encodeBatch(new Execution[](0)));
        vm.stopPrank();
    }

    // ---------------------------------------------------------------------------------------------------------- the keeper
    function test_onlyTheKeeperOrTheOwnerCanAskForARebalance() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.NotAllowedToAsk.selector, attacker));
        runner.rebalance(address(account));

        runner.rebalance(address(account)); // the owner (this test) may
        assertGt(nvda.balanceOf(address(account)), 0);
    }

    function test_theKeeperExpires() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        vm.warp(until + 1);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.NotAllowedToAsk.selector, keeper));
        runner.rebalance(address(account));
    }

    function test_theOwnerRevokesTheKeeperAtOnce_andNobodyElseCan() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);

        vm.prank(attacker);
        vm.expectRevert(StrategyExecutor.NotOwner.selector);
        runner.revokeKeeper(address(account));
        vm.prank(attacker);
        vm.expectRevert(StrategyExecutor.NotOwner.selector);
        runner.setKeeper(address(account), attacker, until);

        runner.revokeKeeper(address(account));
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.NotAllowedToAsk.selector, keeper));
        runner.rebalance(address(account));
    }

    // ---------------------------------------------------------------------------------------------------------- rules: on-chain or off-chain
    function test_aRuleThatNothingCanEnforceOnChainCannotBePlacedThere() public {
        Rule[] memory list = new Rule[](1);
        list[0] = Rule(RuleIds.STOP_LOSS, Placement.OnChain, 2000, "");
        VaultParams memory p = params(equalStrategy(), IRebalancePolicy(address(0)), list);
        vm.expectRevert(abi.encodeWithSelector(RuleBook.NotEnforceableOnChain.selector, RuleIds.STOP_LOSS));
        vaultFactory.create(p);

        list[0] = Rule(RuleIds.APPROVAL, Placement.OnChain, 0, "");
        p = params(equalStrategy(), IRebalancePolicy(address(0)), list);
        vm.expectRevert(abi.encodeWithSelector(RuleBook.NotEnforceableOnChain.selector, RuleIds.APPROVAL));
        vaultFactory.create(p);
    }

    function test_aRulesetWithARuleTwiceOrOutOfRangeIsRefused() public {
        Rule[] memory twice = new Rule[](2);
        twice[0] = Rule(RuleIds.MAX_WEIGHT, Placement.OnChain, 5000, "");
        twice[1] = Rule(RuleIds.MAX_WEIGHT, Placement.OffChain, 4000, "");
        VaultParams memory p = params(equalStrategy(), IRebalancePolicy(address(0)), twice);
        vm.expectRevert(abi.encodeWithSelector(RuleBook.DuplicateRule.selector, RuleIds.MAX_WEIGHT));
        vaultFactory.create(p);

        Rule[] memory loose = new Rule[](1);
        loose[0] = Rule(RuleIds.SLIPPAGE, Placement.OnChain, 201, "");
        p = params(equalStrategy(), IRebalancePolicy(address(0)), loose);
        vm.expectPartialRevert(RuleBook.ValueOutOfRange.selector);
        vaultFactory.create(p);
    }

    function test_aRulePlacedOffChainLeavesItsOnChainLimitOpen() public {
        Rule[] memory list = new Rule[](2);
        list[0] = Rule(RuleIds.MAX_WEIGHT, Placement.OffChain, 3000, "");
        list[1] = Rule(RuleIds.BUDGET, Placement.OnChain, 500e6, "");
        StrategyAccount account =
            StrategyAccount(payable(vaultFactory.create(params(equalStrategy(), IRebalancePolicy(address(0)), list))));

        // A rule is onchain exactly when its module is attached: the max weight was kept off-chain, so its module is not attached to this vault
        assertFalse(MaxWeightRule(address(rulePlugins[0])).isAttached(address(guard), address(account)));
        assertFalse(MinLiquidityRule(address(rulePlugins[1])).isAttached(address(guard), address(account)));
        // The slippage and the size of a trade keep a vault safe whether or not it was asked to, so they are attached with their defaults
        SlippageRule slippage = SlippageRule(address(rulePlugins[2]));
        assertTrue(slippage.isAttached(address(guard), address(account)));
        assertEq(slippage.valueOf(address(guard), address(account)), 200);
        assertEq(TradeSizeRule(address(rulePlugins[3])).valueOf(address(guard), address(account)), 100);
        assertEq(runner.configOf(address(account)).limits.budget, 500e6);
    }

    // ---------------------------------------------------------------------------------------------------------- what it costs
    /// @dev Gas for the main steps, with the real contracts and two mock pools. Run with `forge test --match-test test_gas -vv`: the numbers are printed,
    /// and copied into the docs. A rule's cost is the difference between the same step with and without it.
    function test_gasOfTheMainSteps() public {
        IBlock strategy = equalStrategy();
        Rule[] memory budgetOnly = new Rule[](1);
        budgetOnly[0] = Rule(RuleIds.BUDGET, Placement.OnChain, 500e6, "");
        VaultParams memory bare = params(strategy, IRebalancePolicy(address(0)), budgetOnly);
        VaultParams memory full = params(strategy, IRebalancePolicy(address(0)), rules());

        uint256 gasBare = gasOfCreate(bare);
        uint256 gasFull = gasOfCreate(full);

        OffChainRule marketOpen = new OffChainRule(OffChainFunctions.marketOpen(), readings);
        StrategyAccount withOffChain = offChainRuleVault(marketOpen, Placement.OnChain);
        postMarketOpen(marketOpen, withOffChain);

        // The first trade in a test pays for the mock pools' first use, which is not a cost of the vault
        rebalance(funded(strategy, IRebalancePolicy(address(0)), 400e6));

        StrategyAccount plain = StrategyAccount(payable(vaultFactory.create(bare)));
        usdc.mint(address(plain), 400e6);
        StrategyAccount fourRules = StrategyAccount(payable(vaultFactory.create(full)));
        usdc.mint(address(fourRules), 400e6);

        console.log("create vault, default rules only      ", gasBare);
        console.log("create vault, 4 rules on-chain        ", gasFull);
        console.log("rebalance, 2 buys, 4 rules on-chain   ", gasOfRebalance(fourRules));
        console.log("rebalance, 2 buys, + 1 off-chain rule ", gasOfRebalance(withOffChain));
        console.log("rebalance, 2 buys, default rules only ", gasOfRebalance(plain));

        usdc.mint(address(plain), 100e6);
        uint256 before = gasleft();
        plain.emergencyWithdraw(address(usdc), 100e6);
        console.log("owner takes funds out (emergency)     ", before - gasleft());
    }

    function gasOfCreate(VaultParams memory p) private returns (uint256) {
        uint256 before = gasleft();
        vaultFactory.create(p);
        return before - gasleft();
    }

    function gasOfRebalance(StrategyAccount account) private returns (uint256) {
        vm.prank(keeper);
        uint256 before = gasleft();
        runner.rebalance(address(account));
        return before - gasleft();
    }

    // ---------------------------------------------------------------------------------------------------------- an off-chain rule, enforced onchain
    function offChainRuleVault(OffChainRule marketOpen, Placement placement) private returns (StrategyAccount) {
        Rule[] memory list = new Rule[](2);
        list[0] = Rule(RuleIds.BUDGET, Placement.OnChain, 500e6, "");
        list[1] = Rule(marketOpen.kind(), placement, 1, abi.encode(marketOpen.functionHash()));
        VaultParams memory p = params(equalStrategy(), IRebalancePolicy(address(0)), list);
        p.extraRulePlugins = new IRulePlugin[](1);
        p.extraRulePlugins[0] = marketOpen;
        StrategyAccount account = StrategyAccount(payable(vaultFactory.create(p)));
        usdc.mint(address(account), 400e6);
        return account;
    }

    function postMarketOpen(OffChainRule marketOpen, StrategyAccount account) private {
        readings.set(marketOpen.channelFor(address(account), address(nvda)), 1);
        readings.set(marketOpen.channelFor(address(account), address(aapl)), 1);
    }

    function test_anOffChainRulePlacedOnChainRefusesABuyUntilTheAppPostsItsResult() public {
        OffChainRule marketOpen = new OffChainRule(OffChainFunctions.marketOpen(), readings);
        StrategyAccount account = offChainRuleVault(marketOpen, Placement.OnChain);
        assertTrue(marketOpen.isAttached(address(guard), address(account)));

        // The app has posted nothing: the chain does not guess, so nothing is bought
        vm.prank(keeper);
        vm.expectPartialRevert(IGuardErrors.NoOffChainResult.selector);
        runner.rebalance(address(account));
        assertEq(nvda.balanceOf(address(account)), 0);

        // The app posts that the market is closed: the result is there, and it says no
        readings.set(marketOpen.channelFor(address(account), address(nvda)), 0);
        readings.set(marketOpen.channelFor(address(account), address(aapl)), 0);
        vm.prank(keeper);
        vm.expectPartialRevert(IGuardErrors.OffChainRuleRefuses.selector);
        runner.rebalance(address(account));

        // Open: it trades
        postMarketOpen(marketOpen, account);
        rebalance(account);
        assertGt(nvda.balanceOf(address(account)), 0);
    }

    function test_theSameRulePlacedOffChainIsNotAskedOfTheChain_butItsHashIsOnTheRecord() public {
        OffChainRule marketOpen = new OffChainRule(OffChainFunctions.marketOpen(), readings);
        StrategyAccount account = offChainRuleVault(marketOpen, Placement.OffChain);
        assertFalse(marketOpen.isAttached(address(guard), address(account)));

        // Nothing posted, and it trades: the app keeps this one
        rebalance(account);
        assertGt(nvda.balanceOf(address(account)), 0);

        // Still, what the vault promised is on the record: the rule, where it is kept, and the hash of the function it runs
        Rule[] memory list = new Rule[](2);
        list[0] = Rule(RuleIds.BUDGET, Placement.OnChain, 500e6, "");
        list[1] = Rule(marketOpen.kind(), Placement.OffChain, 1, abi.encode(marketOpen.functionHash()));
        assertEq(vaultFactory.rulesHashOf(address(account)), RuleBook.hashOf(list));
    }

    function test_aRulePlacedOnBothIsKeptByTheAppAndByTheChain() public {
        OffChainRule marketOpen = new OffChainRule(OffChainFunctions.marketOpen(), readings);
        StrategyAccount account = offChainRuleVault(marketOpen, Placement.Both);
        assertTrue(marketOpen.isAttached(address(guard), address(account)));
        vm.prank(keeper);
        vm.expectPartialRevert(IGuardErrors.NoOffChainResult.selector);
        runner.rebalance(address(account));
    }

    function test_theVaultsRecordHoldsEveryRuleAndWhereItIsKept() public {
        Rule[] memory list = rules();
        VaultParams memory p = params(equalStrategy(), IRebalancePolicy(address(0)), list);

        vm.recordLogs();
        address account = vaultFactory.create(p);
        assertEq(vaultFactory.rulesHashOf(account), keccak256(abi.encode(list)));
        // One event for the vault, and it carries all six rules, on-chain and off-chain
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == StrategyVaultFactory.VaultCreated.selector) {
                found = true;
                (address strategy, bytes32 rulesHash, Rule[] memory recorded) =
                    abi.decode(logs[i].data, (address, bytes32, Rule[]));
                assertEq(strategy, address(p.strategy));
                assertEq(rulesHash, keccak256(abi.encode(list)));
                assertEq(recorded.length, 6);
                assertEq(uint8(recorded[4].placement), uint8(Placement.OffChain));
            }
        }
        assertTrue(found);
    }

    function test_aVaultCannotBeMadeForAStockNotOnTheRegistry() public {
        address other = makeAddr("unlisted");
        VaultParams memory p = params(equalStrategy(), IRebalancePolicy(address(0)), rules());
        p.stocks = new address[](1);
        p.stocks[0] = other;
        vm.expectRevert(abi.encodeWithSelector(StockRegistry.NotListed.selector, other));
        vaultFactory.create(p);
    }

    // ---------------------------------------------------------------------------------------------------------- the account follows the standard
    function test_theAccountSaysWhatItIsAndWhatItSupports() public {
        StrategyAccount account = make(equalStrategy(), IRebalancePolicy(address(0)));
        assertEq(account.accountId(), "sandworm.strategy-account.0.1.0");
        assertTrue(account.supportsModule(MODULE_TYPE_EXECUTOR));
        assertTrue(account.supportsModule(MODULE_TYPE_HOOK));
        assertFalse(account.supportsModule(1)); // no validators yet
        assertFalse(account.supportsModule(3));
        assertTrue(account.supportsExecutionMode(batchMode()));
        assertFalse(account.supportsExecutionMode(bytes32(uint256(0xff) << 248))); // delegatecall is not supported
        assertTrue(account.isModuleInstalled(MODULE_TYPE_EXECUTOR, address(runner), ""));
        assertTrue(account.isModuleInstalled(MODULE_TYPE_HOOK, address(guard), ""));
        assertEq(account.owner(), address(this));
    }

    function test_aModuleCannotBeInstalledTwiceOrAsTheWrongTypeOrInASecondHookSlot() public {
        StrategyAccount account = make(equalStrategy(), IRebalancePolicy(address(0)));
        vm.expectRevert(
            abi.encodeWithSelector(StrategyAccount.AlreadyInstalled.selector, MODULE_TYPE_EXECUTOR, address(runner))
        );
        account.installModule(MODULE_TYPE_EXECUTOR, address(runner), "");

        vm.expectRevert(
            abi.encodeWithSelector(StrategyAccount.NotThisModuleType.selector, address(guard), MODULE_TYPE_EXECUTOR)
        );
        account.installModule(MODULE_TYPE_EXECUTOR, address(guard), "");

        TradeGuard second = new TradeGuard(registry, 6);
        vm.expectRevert(abi.encodeWithSelector(StrategyAccount.HookSlotTaken.selector, address(guard)));
        account.installModule(MODULE_TYPE_HOOK, address(second), "");

        vm.expectRevert(abi.encodeWithSelector(StrategyAccount.UnsupportedModuleType.selector, uint256(1)));
        account.installModule(1, address(runner), "");

        vm.expectRevert(
            abi.encodeWithSelector(StrategyAccount.NotInstalled.selector, MODULE_TYPE_EXECUTOR, address(second))
        );
        account.uninstallModule(MODULE_TYPE_EXECUTOR, address(second), "");
    }

    function test_uninstallingTheGuardTellsItSoItForgetsTheAccount() public {
        StrategyAccount account = make(equalStrategy(), IRebalancePolicy(address(0)));
        account.uninstallModule(MODULE_TYPE_HOOK, address(guard), "");
        assertEq(guard.configOf(address(account)).owner, address(0));
        assertFalse(account.isModuleInstalled(MODULE_TYPE_HOOK, address(guard), ""));
    }

    function test_theAccountVouchesForItsOwnersSignatureOnly() public {
        (address signer, uint256 key) = makeAddrAndKey("signer");
        StrategyAccount account = new StrategyAccount(signer, new ModuleInit[](0), IERC7484(address(0)));
        bytes32 hash = keccak256("hello");

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, hash);
        assertEq(account.isValidSignature(hash, abi.encodePacked(r, s, v)), bytes4(0x1626ba7e));

        (, uint256 otherKey) = makeAddrAndKey("someone else");
        (v, r, s) = vm.sign(otherKey, hash);
        assertEq(account.isValidSignature(hash, abi.encodePacked(r, s, v)), bytes4(0xffffffff));
        assertEq(account.isValidSignature(hash, hex"1234"), bytes4(0xffffffff));
    }

    // ---------------------------------------------------------------------------------------------------------- the registry
    function test_onlyTheCuratorListsStocks_andOnlyRealOnes() public {
        MockToken other = new MockToken(8);
        StockSetup memory setup = StockSetup(address(other), address(nvdaPool), address(router), 10);

        vm.prank(attacker);
        vm.expectRevert(StockRegistry.NotCurator.selector);
        registry.list(setup);

        // The pool is NVDA against USDC, not this token against USDC
        vm.expectPartialRevert(StockRegistry.PoolIsNotThisStock.selector);
        registry.list(setup);

        vm.expectRevert(abi.encodeWithSelector(StockRegistry.AlreadyListed.selector, address(nvda)));
        registry.list(StockSetup(address(nvda), address(nvdaPool), address(router), 10));

        registry.unlist(address(nvda));
        vm.expectPartialRevert(StockRegistry.WrongTickSpacing.selector);
        registry.list(StockSetup(address(nvda), address(nvdaPool), address(router), 60));
    }

    function test_aStockCanBeUnlistedWithoutRedeployingAnything() public {
        StrategyAccount account = funded(equalStrategy(), IRebalancePolicy(address(0)), 400e6);
        registry.unlist(address(nvda));
        assertFalse(registry.isListed(address(nvda)));
        assertEq(registry.all().length, 1);

        // A vault that holds it can no longer value or trade it: nothing is traded on a stock that is not on the list
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(StockRegistry.NotListed.selector, address(nvda)));
        runner.rebalance(address(account));
    }

    // ---------------------------------------------------------------------------------------------------------- the module registry (ERC-7484)
    function test_aVaultOnlyTakesModulesTheRegistryHasAttestedTo() public {
        MockModuleRegistry attesters = new MockModuleRegistry();
        attesters.attest(address(runner));
        attesters.attest(address(guard));
        StrategyVaultFactory careful =
            new StrategyVaultFactory(registry, runner, guard, IERC7484(address(attesters)), rulePlugins);

        // The suite's own modules are attested to, so a vault can be made
        StrategyAccount account =
            StrategyAccount(payable(careful.create(params(equalStrategy(), IRebalancePolicy(address(0)), rules()))));
        assertTrue(account.isModuleInstalled(MODULE_TYPE_EXECUTOR, address(runner), ""));

        // One nobody vouched for is refused, wherever it comes from
        EvilExecutor evil = new EvilExecutor();
        vm.expectRevert(abi.encodeWithSelector(MockModuleRegistry.NotAttested.selector, address(evil)));
        account.installModule(MODULE_TYPE_EXECUTOR, address(evil), "");

        attesters.attest(address(evil));
        account.installModule(MODULE_TYPE_EXECUTOR, address(evil), "");
        assertTrue(account.isModuleInstalled(MODULE_TYPE_EXECUTOR, address(evil), ""));
    }

    function test_aVaultMadeWithoutARegistryTakesAnyModuleTheOwnerChooses() public {
        StrategyAccount account = make(equalStrategy(), IRebalancePolicy(address(0)));
        assertEq(address(account.registry()), address(0));
        evilOn(account);
    }

    // ---------------------------------------------------------------------------------------------------------- modules say who they are
    function test_modulesSayTheirNameAndVersion_andWhetherTheyAreSetUpForAnAccount() public {
        StrategyAccount account = make(equalStrategy(), IRebalancePolicy(address(0)));

        assertEq(guard.name(), "sandworm.trade-guard");
        assertEq(runner.name(), "sandworm.strategy-executor");
        assertEq(guard.version(), "0.2.0");
        assertTrue(guard.isInitialized(address(account)));
        assertTrue(runner.isInitialized(address(account)));

        account.uninstallModule(MODULE_TYPE_HOOK, address(guard), "");
        assertFalse(guard.isInitialized(address(account)));
        assertFalse(runner.isInitialized(makeAddr("not an account of ours")));
    }
}
