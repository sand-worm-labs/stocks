// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {Op} from "../src/blocks/types/Enums.sol";
import {IGuardErrors} from "../src/guards/IGuardErrors.sol";
import {Holdings} from "../src/pricing/Portfolio.sol";
import {Stock} from "../src/registry/StockTypes.sol";
import {IRulePlugin, SwapCheck} from "../src/rules/IRulePlugin.sol";
import {AllOfRule} from "../src/rules/modules/AllOfRule.sol";
import {AnyOfRule} from "../src/rules/modules/AnyOfRule.sol";
import {About, Applies, OffChainFunction, OffChainRule} from "../src/rules/offchain/OffChainRule.sol";
import {OffChainFunctions} from "../src/rules/offchain/OffChainFunctions.sol";
import {OffChainRuleSet} from "../src/rules/offchain/OffChainRuleSet.sol";
import {FreshReadings} from "../src/signals/FreshReadings.sol";
import {SignalBoard} from "../src/signals/SignalBoard.sol";

contract OffChainRulesTest is Test {
    uint64 private constant MAX_AGE = 1 hours;

    address private publisher = makeAddr("publisher");
    address private guard = makeAddr("guard");
    address private account = makeAddr("account");
    address private other = makeAddr("other");
    address private stock = makeAddr("stock");
    address private otherStock = makeAddr("otherStock");

    SignalBoard private board;
    FreshReadings private readings;
    IRulePlugin[] private rules;

    function setUp() public {
        vm.warp(1_000_000);
        board = new SignalBoard(publisher);
        readings = new FreshReadings(board, MAX_AGE);
        rules = OffChainRuleSet.deploy(readings);
    }

    // ---------------------------------------------------------------------------------------------------------- helpers
    function rule(uint256 index) private view returns (OffChainRule) {
        return OffChainRule(address(rules[index]));
    }

    function attach(uint256 index, uint256 limit) private {
        vm.prank(guard);
        rules[index].configure(account, limit, "");
    }

    function post(bytes32 channel, int256 result) private {
        vm.prank(publisher);
        board.postValue(channel, result, uint64(block.timestamp), keccak256("evidence"));
    }

    function swapOf(address token, bool isBuy) private view returns (SwapCheck memory) {
        Stock memory stockInfo = Stock(token, address(0), address(0), 0, true, true);
        return SwapCheck(account, stockInfo, isBuy, 1, 1, 1, 1);
    }

    function empty() private pure returns (Holdings memory) {
        return Holdings(new Stock[](0), new uint256[](0), new uint256[](0), 0, 0);
    }

    /// @dev Asks the rule the way the guard does: as the guard, about one account
    function judge(uint256 index, bool isBuy) private {
        OffChainRule one = rule(index);
        vm.startPrank(guard);
        if (one.applies() == Applies.Portfolio) {
            one.checkPortfolio(account, empty());
        } else {
            one.checkSwap(swapOf(stock, isBuy));
        }
        vm.stopPrank();
    }

    function sideOf(uint256 index) private view returns (bool) {
        return rule(index).applies() != Applies.Sells;
    }

    // ---------------------------------------------------------------------------------------------------------- the hash is the function
    function test_aRuleHoldsItsFunctionAndTheHashOfIt() public view {
        for (uint256 i = 0; i < rules.length; i++) {
            (string memory name, string memory spec, bytes32 functionHash,,,) = rule(i).describe();
            assertGt(bytes(name).length, 0);
            assertEq(functionHash, keccak256(bytes(spec)));
            assertEq(rule(i).functionHash(), functionHash);
        }
    }

    function test_tenFunctionsEachWithItsOwnHashKindAndChannel() public view {
        assertEq(rules.length, 10);
        for (uint256 i = 0; i < rules.length; i++) {
            for (uint256 j = i + 1; j < rules.length; j++) {
                assertNotEq(rule(i).functionHash(), rule(j).functionHash());
                assertNotEq(rules[i].kind(), rules[j].kind());
                assertNotEq(rule(i).channelFor(account, stock), rule(j).channelFor(account, stock));
            }
        }
    }

    function test_theSpecSaysWhatTheRuleDoes() public view {
        // Each text starts with its own name and version, so the text and the module cannot be mixed up
        for (uint256 i = 0; i < rules.length; i++) {
            bytes memory name = bytes(rule(i).name());
            bytes memory spec = bytes(rule(i).spec());
            for (uint256 c = 0; c < name.length; c++) {
                assertEq(spec[c], name[c]);
            }
            assertEq(spec[name.length], bytes1("/"));
        }
    }

    function test_changingOneWordChangesTheHashTheKindAndTheChannel() public {
        OffChainFunction memory same = OffChainFunctions.sectorCap();
        assertEq(new OffChainRule(same, readings).functionHash(), rule(0).functionHash());

        OffChainFunction memory edited = OffChainFunctions.sectorCap();
        edited.spec = string.concat(edited.spec, " ");
        OffChainRule changed = new OffChainRule(edited, readings);
        assertNotEq(changed.functionHash(), rule(0).functionHash());
        assertNotEq(changed.kind(), rules[0].kind());
        assertNotEq(changed.channelFor(account, stock), rule(0).channelFor(account, stock));
    }

    function test_aVaultThatNamesAHashCanOnlyUseThatFunction() public {
        bytes memory right = abi.encode(rule(0).functionHash());
        vm.prank(guard);
        rules[0].configure(account, 4000, right);
        assertTrue(rule(0).isAttached(guard, account));

        vm.prank(guard);
        vm.expectPartialRevert(IGuardErrors.NotTheFunctionTheRuleNames.selector);
        rules[1].configure(account, 4000, right);
    }

    // ---------------------------------------------------------------------------------------------------------- the ten, one by one
    struct Case {
        uint256 index;
        int256 limit;
        int256 passes;
        int256 fails;
    }

    function cases() private pure returns (Case[10] memory c) {
        c[0] = Case(0, 4000, 3500, 4500); // sector-cap, bps
        c[1] = Case(1, 3, 10, 1); // earnings-blackout, days
        c[2] = Case(2, 1, 1, 0); // market-open, flag
        c[3] = Case(3, 1.2e6, 1.0e6, 1.5e6); // portfolio-beta
        c[4] = Case(4, 30e6, 18e6, 40e6); // volatility-regime
        c[5] = Case(5, 0.8e6, 0.5e6, 0.9e6); // correlation-cap
        c[6] = Case(6, 1500, 500, 2000); // real-drawdown, bps
        c[7] = Case(7, 0, 0, 1); // trading-halt, flag
        c[8] = Case(8, 30, 45, 5); // holding-period, days
        c[9] = Case(9, 1, 1, 0); // compliance, flag
    }

    function channelOf(uint256 index) private view returns (bytes32) {
        return rule(index).channelFor(account, stock);
    }

    function test_eachFunctionLetsAGoodResultThrough() public {
        Case[10] memory all = cases();
        for (uint256 i = 0; i < all.length; i++) {
            attach(all[i].index, uint256(all[i].limit));
            post(channelOf(all[i].index), all[i].passes);
            judge(all[i].index, sideOf(all[i].index));
        }
    }

    function test_eachFunctionRefusesABadResult() public {
        Case[10] memory all = cases();
        for (uint256 i = 0; i < all.length; i++) {
            attach(all[i].index, uint256(all[i].limit));
            post(channelOf(all[i].index), all[i].fails);
            bytes memory refusal = abi.encodeWithSelector(
                IGuardErrors.OffChainRuleRefuses.selector, rule(all[i].index).functionHash(), all[i].fails, all[i].limit
            );
            bool isBuy = sideOf(all[i].index);
            vm.expectRevert(refusal);
            this.judgeExternal(all[i].index, isBuy);
        }
    }

    /// @dev `expectRevert` needs the failing call to be an external one
    function judgeExternal(uint256 index, bool isBuy) external {
        judge(index, isBuy);
    }

    function test_aResultExactlyAtTheLimitHolds() public {
        Case[10] memory all = cases();
        for (uint256 i = 0; i < all.length; i++) {
            attach(all[i].index, uint256(all[i].limit));
            post(channelOf(all[i].index), all[i].limit);
            judge(all[i].index, sideOf(all[i].index));
        }
    }

    // ---------------------------------------------------------------------------------------------------------- it fails closed
    function test_noResultYetRefuses() public {
        attach(2, 1);
        vm.expectRevert(
            abi.encodeWithSelector(IGuardErrors.NoOffChainResult.selector, rule(2).functionHash(), channelOf(2))
        );
        this.judgeExternal(2, true);
    }

    function test_aStaleResultRefuses() public {
        attach(2, 1);
        post(channelOf(2), 1);
        judge(2, true);

        vm.warp(block.timestamp + MAX_AGE + 1);
        vm.expectRevert(
            abi.encodeWithSelector(IGuardErrors.NoOffChainResult.selector, rule(2).functionHash(), channelOf(2))
        );
        this.judgeExternal(2, true);
    }

    function test_aResultAboutAnotherStockOrVaultDoesNotCount() public {
        attach(2, 1); // market-open is about one stock
        post(rule(2).channelFor(account, otherStock), 1);
        vm.expectRevert();
        this.judgeExternal(2, true);

        attach(9, 1); // compliance is about one vault's stock
        post(rule(9).channelFor(other, stock), 1);
        vm.expectRevert();
        this.judgeExternal(9, true);
    }

    function test_aVolatilityNumberIsOneForTheWholeMarket() public {
        attach(4, 30e6);
        post(rule(4).functionHash(), 18e6); // the channel is the hash itself: nothing else to name
        judge(4, true);
        assertEq(rule(4).channelFor(other, otherStock), rule(4).channelFor(account, stock));
    }

    // ---------------------------------------------------------------------------------------------------------- what each one judges
    function test_aBuyRuleLeavesASellAlone_andASellRuleLeavesABuyAlone() public {
        attach(2, 1); // buys only, and no result posted
        judge(2, false);

        attach(8, 30); // sells only, and no result posted
        judge(8, true);
    }

    function test_aPortfolioRuleJudgesNoSwap() public {
        attach(0, 4000);
        judge2Swap(0);
        vm.expectRevert();
        this.judgeExternal(0, true);
    }

    function judge2Swap(uint256 index) private {
        vm.prank(guard);
        rule(index).checkSwap(swapOf(stock, true));
    }

    // ---------------------------------------------------------------------------------------------------------- reading both ways, and chaining
    function test_aRuleReadsBackWhatTheAppPosted_andWhatItWasAskedToHold() public {
        attach(3, 1.2e6);
        assertEq(rule(3).valueOf(guard, account), 1.2e6);
        post(channelOf(3), 1.0e6);
        (bool isSet, int256 result) = readings.tryRead(channelOf(3));
        assertTrue(isSet);
        assertEq(result, 1.0e6);
    }

    function test_offChainRulesChainWithAnd_andOr() public {
        AllOfRule both = new AllOfRule(keccak256("market-calm"));
        AnyOfRule either = new AnyOfRule(keccak256("market-calm-or-hedged"));

        // Buy only while the market is open AND it is calm
        address[] memory list = new address[](2);
        list[0] = address(rules[2]);
        list[1] = address(rules[4]);
        uint256[] memory values = new uint256[](2);
        values[0] = 1;
        values[1] = 30e6;
        bytes[] memory extra = new bytes[](2);
        vm.prank(guard);
        both.configure(account, 0, abi.encode(list, values, extra));

        post(channelOf(2), 1);
        post(rule(4).channelFor(account, stock), 40e6); // a calm market is not what was posted
        vm.prank(guard);
        vm.expectRevert();
        both.checkSwap(swapOf(stock, true));

        vm.warp(block.timestamp + 1);
        post(rule(4).channelFor(account, stock), 18e6);
        vm.prank(guard);
        both.checkSwap(swapOf(stock, true));

        // The same two, as OR: either is enough
        vm.prank(guard);
        either.configure(account, 0, abi.encode(list, values, extra));
        vm.warp(block.timestamp + 1);
        post(rule(4).channelFor(account, stock), 40e6);
        vm.prank(guard);
        either.checkSwap(swapOf(stock, true)); // the market is open
    }
}
