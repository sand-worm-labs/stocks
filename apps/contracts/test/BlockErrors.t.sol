// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {
    AllValuesZero,
    CountOutOfRange,
    DriftOver100,
    NeededOutOfRange,
    NeedsAllThree,
    NeedsTwoConditions,
    NoChild,
    NoCondition,
    NoStock,
    ScoreChannelForEachStock
} from "../src/blocks/BlockErrors.sol";
import {IBlock} from "../src/blocks/interfaces/IBlock.sol";
import {ICondition} from "../src/blocks/interfaces/ICondition.sol";
import {Pick, Schedule, Weighting} from "../src/blocks/types/Enums.sol";
import {AllCondition} from "../src/blocks/conditions/AllCondition.sol";
import {AnyCondition} from "../src/blocks/conditions/AnyCondition.sol";
import {FlagCondition} from "../src/blocks/conditions/FlagCondition.sol";
import {NotCondition} from "../src/blocks/conditions/NotCondition.sol";
import {QuorumCondition} from "../src/blocks/conditions/QuorumCondition.sol";
import {XorCondition} from "../src/blocks/conditions/XorCondition.sol";
import {ChannelWeightedGroup} from "../src/blocks/groups/ChannelWeightedGroup.sol";
import {EqualGroup} from "../src/blocks/groups/EqualGroup.sol";
import {SpecifiedGroup} from "../src/blocks/groups/SpecifiedGroup.sol";
import {AssetBlock} from "../src/blocks/leaves/AssetBlock.sol";
import {CashBlock} from "../src/blocks/leaves/CashBlock.sol";
import {FilterBlock} from "../src/blocks/logic/FilterBlock.sol";
import {IfBlock} from "../src/blocks/logic/IfBlock.sol";
import {RebalanceBlock} from "../src/blocks/logic/RebalanceBlock.sol";
import {MockReadings} from "./mocks/MockReadings.sol";

/// @dev A block that is made with something it cannot work with says why, with the error that names it. One test for each way, for each block that
/// has it, so that a refusal that goes missing is noticed.
contract BlockErrorsTest is Test {
    uint256 private constant MOST = 16;

    // ---------------------------------------------------------------------------------------------------------- helpers
    function _blocks(uint256 n) private returns (IBlock[] memory list) {
        list = new IBlock[](n);
        for (uint256 i = 0; i < n; i++) {
            list[i] = new CashBlock();
        }
    }

    function _conditions(uint256 n) private returns (ICondition[] memory list) {
        list = new ICondition[](n);
        for (uint256 i = 0; i < n; i++) {
            list[i] = new FlagCondition(bytes32(i + 1));
        }
    }

    function _stocks(uint256 n) private pure returns (address[] memory list) {
        list = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            list[i] = address(uint160(0x1000 + i));
        }
    }

    function _channels(uint256 n) private pure returns (bytes32[] memory list) {
        list = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            list[i] = bytes32(i + 1);
        }
    }

    function _shares(uint256 n) private pure returns (uint16[] memory list) {
        list = new uint16[](n);
        for (uint256 i = 0; i < n; i++) {
            list[i] = 100;
        }
    }

    // ---------------------------------------------------------------------------------------------------------- a stock that is not there
    function test_anAssetNeedsAStock() public {
        vm.expectRevert(NoStock.selector);
        new AssetBlock(address(0));
    }

    // ---------------------------------------------------------------------------------------------------------- how many children
    function test_aGroupNeedsOneToSixteenChildren() public {
        IBlock[] memory none = _blocks(0);
        IBlock[] memory tooMany = _blocks(MOST + 1);
        uint16[] memory noShares = _shares(0);
        uint16[] memory tooManyShares = _shares(MOST + 1);
        bytes32[] memory noChannels = _channels(0);
        bytes32[] memory tooManyChannels = _channels(MOST + 1);

        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, 0, MOST));
        new EqualGroup(none);
        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, MOST + 1, MOST));
        new EqualGroup(tooMany);

        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, 0, MOST));
        new SpecifiedGroup(none, noShares);
        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, MOST + 1, MOST));
        new SpecifiedGroup(tooMany, tooManyShares);

        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, 0, MOST));
        new ChannelWeightedGroup(none, noChannels, Weighting.Proportional);
        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, MOST + 1, MOST));
        new ChannelWeightedGroup(tooMany, tooManyChannels, Weighting.Proportional);
    }

    function test_aGroupOfExactlyOneOrSixteenIsFine() public {
        new EqualGroup(_blocks(1));
        new EqualGroup(_blocks(MOST));
        new SpecifiedGroup(_blocks(MOST), _shares(MOST));
        new ChannelWeightedGroup(_blocks(MOST), _channels(MOST), Weighting.Inverse);
    }

    function test_aGroupCannotHaveAChildThatIsNotThere() public {
        IBlock[] memory withHole = _blocks(3);
        withHole[1] = IBlock(address(0));

        vm.expectRevert(NoChild.selector);
        new EqualGroup(withHole);
        vm.expectRevert(NoChild.selector);
        new SpecifiedGroup(withHole, _shares(3));
        vm.expectRevert(NoChild.selector);
        new ChannelWeightedGroup(withHole, _channels(3), Weighting.Proportional);
    }

    // ---------------------------------------------------------------------------------------------------------- how many conditions
    function test_allAnyAndQuorumNeedOneToSixteenConditions() public {
        ICondition[] memory none = _conditions(0);
        ICondition[] memory tooMany = _conditions(MOST + 1);

        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, 0, MOST));
        new AllCondition(none);
        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, MOST + 1, MOST));
        new AllCondition(tooMany);

        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, 0, MOST));
        new AnyCondition(none);
        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, MOST + 1, MOST));
        new AnyCondition(tooMany);

        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, 0, MOST));
        new QuorumCondition(none, 1);
        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, MOST + 1, MOST));
        new QuorumCondition(tooMany, 1);
    }

    function test_aConditionListCannotHaveAHole() public {
        ICondition[] memory withHole = _conditions(3);
        withHole[2] = ICondition(address(0));

        vm.expectRevert(NoCondition.selector);
        new AllCondition(withHole);
        vm.expectRevert(NoCondition.selector);
        new AnyCondition(withHole);
        vm.expectRevert(NoCondition.selector);
        new QuorumCondition(withHole, 1);
    }

    function test_aNotNeedsACondition() public {
        vm.expectRevert(NoCondition.selector);
        new NotCondition(ICondition(address(0)));
    }

    function test_aXorNeedsBothConditions() public {
        ICondition real = new FlagCondition(bytes32(uint256(1)));

        vm.expectRevert(NeedsTwoConditions.selector);
        new XorCondition(ICondition(address(0)), real);
        vm.expectRevert(NeedsTwoConditions.selector);
        new XorCondition(real, ICondition(address(0)));
    }

    function test_aQuorumNeedsAtLeastOneAndNoMoreThanItHas() public {
        ICondition[] memory three = _conditions(3);

        vm.expectRevert(NeededOutOfRange.selector);
        new QuorumCondition(three, 0);
        vm.expectRevert(NeededOutOfRange.selector);
        new QuorumCondition(three, 4);

        new QuorumCondition(three, 1);
        new QuorumCondition(three, 3);
    }

    // ---------------------------------------------------------------------------------------------------------- if, rebalance and filter
    function test_anIfNeedsAllThreeParts() public {
        ICondition condition = new FlagCondition(bytes32(uint256(1)));
        IBlock block_ = new CashBlock();

        vm.expectRevert(NeedsAllThree.selector);
        new IfBlock(ICondition(address(0)), block_, block_);
        vm.expectRevert(NeedsAllThree.selector);
        new IfBlock(condition, IBlock(address(0)), block_);
        vm.expectRevert(NeedsAllThree.selector);
        new IfBlock(condition, block_, IBlock(address(0)));
    }

    function test_aRebalanceNeedsAChildAndADriftOfNoMoreThanAll() public {
        IBlock child = new CashBlock();

        vm.expectRevert(NoChild.selector);
        new RebalanceBlock(IBlock(address(0)), 500, Schedule.Weekly);
        vm.expectRevert(DriftOver100.selector);
        new RebalanceBlock(child, 10_001, Schedule.Weekly);

        // Exactly 100% is allowed: it never trades on drift
        new RebalanceBlock(child, 10_000, Schedule.Weekly);
    }

    function test_aFilterNeedsOneToSixteenStocksAndAScoreChannelForEach() public {
        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, 0, MOST));
        new FilterBlock(_stocks(0), _channels(0), Pick.Top, 1, Weighting.Equal, _channels(0));
        vm.expectRevert(abi.encodeWithSelector(CountOutOfRange.selector, MOST + 1, MOST));
        new FilterBlock(_stocks(MOST + 1), _channels(MOST + 1), Pick.Top, 1, Weighting.Equal, _channels(0));

        vm.expectRevert(ScoreChannelForEachStock.selector);
        new FilterBlock(_stocks(4), _channels(3), Pick.Top, 2, Weighting.Equal, _channels(0));
    }

    // ---------------------------------------------------------------------------------------------------------- a weighting with nothing to weigh by
    function test_valuesThatAreAllZeroCannotWeightAnything() public {
        MockReadings readings = new MockReadings();
        bytes32[] memory channels = _channels(2);
        readings.set(channels[0], 0);
        readings.set(channels[1], 0);
        ChannelWeightedGroup group = new ChannelWeightedGroup(_blocks(2), channels, Weighting.Proportional);

        vm.expectRevert(AllValuesZero.selector);
        group.evaluate(readings);
    }
}
