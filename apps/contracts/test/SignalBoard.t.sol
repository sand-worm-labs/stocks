// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {SignalBoard} from "../src/signals/SignalBoard.sol";

contract SignalBoardTest is Test {
    SignalBoard private board;

    address private owner = makeAddr("owner");
    address private publisher = makeAddr("publisher");
    address private vault = makeAddr("vault");
    address private meta = makeAddr("META");
    address private nvda = makeAddr("NVDA");
    address private tsla = makeAddr("TSLA");

    bytes32 private constant EVIDENCE = keccak256("notebook-1");

    function setUp() public {
        vm.warp(1_800_000_000);
        vm.prank(owner);
        board = new SignalBoard(publisher);
    }

    function stocks(address a, address b) private pure returns (address[] memory list) {
        list = new address[](2);
        list[0] = a;
        list[1] = b;
    }

    function weights(uint16 a, uint16 b) private pure returns (uint16[] memory list) {
        list = new uint16[](2);
        list[0] = a;
        list[1] = b;
    }

    // ------------------------------------------------------------------------------------------------------------ who may do what
    function test_onlyThePublisherPosts() public {
        vm.expectRevert(SignalBoard.NotPublisher.selector);
        board.postValue(bytes32("price"), 1, uint64(block.timestamp), EVIDENCE);

        vm.expectRevert(SignalBoard.NotPublisher.selector);
        board.postTargets(
            vault,
            stocks(meta, nvda),
            weights(5000, 5000),
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            EVIDENCE
        );
    }

    function test_onlyTheOwnerChangesThings() public {
        vm.expectRevert(SignalBoard.NotOwner.selector);
        board.setPublisher(makeAddr("other"));
        vm.expectRevert(SignalBoard.NotOwner.selector);
        board.setMaxMove(bytes32("price"), 500);
        vm.expectRevert(SignalBoard.NotOwner.selector);
        board.revokeTargets(vault);

        vm.prank(owner);
        board.setPublisher(makeAddr("other"));
        assertEq(board.publisher(), makeAddr("other"));
    }

    function test_aBoardNeedsAPublisher() public {
        vm.expectRevert(SignalBoard.ZeroAddress.selector);
        new SignalBoard(address(0));
        vm.prank(owner);
        vm.expectRevert(SignalBoard.ZeroAddress.selector);
        board.setPublisher(address(0));
    }

    // ------------------------------------------------------------------------------------------------------------ values
    function test_aValueIsKeptAndAnnounced() public {
        bytes32 channel = board.channelId("price", "METAc");
        uint64 asOf = uint64(block.timestamp);

        vm.expectEmit(true, true, false, true);
        emit SignalBoard.ValuePosted(channel, 1, 600e8, asOf, EVIDENCE);
        vm.prank(publisher);
        board.postValue(channel, 600e8, asOf, EVIDENCE);

        (int256 value, uint64 at, uint64 seq) = board.latestValue(channel);
        assertEq(value, 600e8);
        assertEq(at, asOf);
        assertEq(seq, 1);
    }

    function test_aValueMustBeNewerThanTheLast() public {
        bytes32 channel = board.channelId("price", "METAc");
        uint64 asOf = uint64(block.timestamp);
        vm.startPrank(publisher);
        board.postValue(channel, 600e8, asOf, EVIDENCE);

        vm.expectRevert(abi.encodeWithSelector(SignalBoard.NotNewer.selector, asOf, asOf));
        board.postValue(channel, 601e8, asOf, EVIDENCE);

        vm.warp(block.timestamp + 60);
        board.postValue(channel, 601e8, uint64(block.timestamp), EVIDENCE);
        (,, uint64 seq) = board.latestValue(channel);
        assertEq(seq, 2);
        vm.stopPrank();
    }

    function test_aValueCannotComeFromTheFuture() public {
        uint64 future = uint64(block.timestamp + board.MAX_FUTURE_SKEW() + 1);
        vm.prank(publisher);
        vm.expectRevert(abi.encodeWithSelector(SignalBoard.FromTheFuture.selector, future, block.timestamp));
        board.postValue(bytes32("price"), 1, future, EVIDENCE);
    }

    function test_aChannelCanLimitHowFarOnePostMovesIt() public {
        bytes32 channel = board.channelId("price", "METAc");
        vm.prank(owner);
        board.setMaxMove(channel, 1000); // 10%

        vm.startPrank(publisher);
        board.postValue(channel, 600e8, uint64(block.timestamp), EVIDENCE);
        vm.warp(block.timestamp + 60);
        // 10% up is fine; a typo that doubles the price is not
        board.postValue(channel, 660e8, uint64(block.timestamp), EVIDENCE);
        vm.warp(block.timestamp + 60);
        vm.expectRevert(
            abi.encodeWithSelector(SignalBoard.MoveTooLarge.selector, int256(660e8), int256(1320e8), uint16(1000))
        );
        board.postValue(channel, 1320e8, uint64(block.timestamp), EVIDENCE);
        // and a fall as far counts the same
        vm.expectRevert(
            abi.encodeWithSelector(SignalBoard.MoveTooLarge.selector, int256(660e8), int256(500e8), uint16(1000))
        );
        board.postValue(channel, 500e8, uint64(block.timestamp), EVIDENCE);
        vm.stopPrank();
    }

    function test_theFirstValueHasNothingToMoveFrom() public {
        bytes32 channel = board.channelId("price", "METAc");
        vm.prank(owner);
        board.setMaxMove(channel, 1);
        vm.prank(publisher);
        board.postValue(channel, 600e8, uint64(block.timestamp), EVIDENCE);
    }

    function test_aStaleValueIsRefusedWhenReadWithAnAge() public {
        bytes32 channel = board.channelId("price", "METAc");
        vm.prank(publisher);
        board.postValue(channel, 600e8, uint64(block.timestamp), EVIDENCE);

        assertEq(board.valueIfFresh(channel, 120), 600e8);
        vm.warp(block.timestamp + 121);
        vm.expectRevert(abi.encodeWithSelector(SignalBoard.Stale.selector, uint64(block.timestamp - 121), uint64(120)));
        board.valueIfFresh(channel, 120);

        bytes32 neverPosted = board.channelId("price", "SNAPc");
        vm.expectRevert(SignalBoard.NothingPosted.selector);
        board.valueIfFresh(neverPosted, 120);
    }

    // ------------------------------------------------------------------------------------------------------------ targets
    function test_targetsAreKeptAndTheListIsInTheEvent() public {
        uint64 asOf = uint64(block.timestamp);
        uint64 expiresAt = asOf + 1 days;
        address[] memory list = stocks(meta, nvda);
        uint16[] memory shares = weights(3500, 3000);

        vm.expectEmit(true, true, false, true);
        emit SignalBoard.TargetsPosted(vault, 1, list, shares, asOf, expiresAt, EVIDENCE);
        vm.prank(publisher);
        board.postTargets(vault, list, shares, asOf, expiresAt, EVIDENCE);

        (uint64 seq, uint64 at, uint64 expires, bytes32 hash) = board.latestTargets(vault);
        assertEq(seq, 1);
        assertEq(at, asOf);
        assertEq(expires, expiresAt);
        assertEq(hash, keccak256(abi.encode(list, shares)));
    }

    function test_whatAVaultWasToldIsCheckedAgainstTheBoard() public {
        uint64 asOf = uint64(block.timestamp);
        address[] memory list = stocks(meta, nvda);
        uint16[] memory shares = weights(3500, 3000);
        vm.prank(publisher);
        board.postTargets(vault, list, shares, asOf, asOf + 1 days, EVIDENCE);

        assertTrue(board.targetsAreCurrent(vault, 1, list, shares));
        // a different list, a different weight, an old or invented seq, another vault: none of them is what was posted
        assertFalse(board.targetsAreCurrent(vault, 1, stocks(meta, tsla), shares));
        assertFalse(board.targetsAreCurrent(vault, 1, list, weights(3500, 3100)));
        assertFalse(board.targetsAreCurrent(vault, 2, list, shares));
        assertFalse(board.targetsAreCurrent(makeAddr("other"), 1, list, shares));
    }

    function test_oldTargetsStopBeingCurrentWhenNewOnesArePosted() public {
        uint64 asOf = uint64(block.timestamp);
        address[] memory first = stocks(meta, nvda);
        uint16[] memory firstShares = weights(3500, 3000);
        vm.startPrank(publisher);
        board.postTargets(vault, first, firstShares, asOf, asOf + 1 days, EVIDENCE);

        vm.warp(block.timestamp + 60);
        board.postTargets(
            vault,
            stocks(meta, tsla),
            weights(2000, 2000),
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            EVIDENCE
        );
        vm.stopPrank();

        // A reactive contract that relays the first list late cannot make a vault act on it
        assertFalse(board.targetsAreCurrent(vault, 1, first, firstShares));
    }

    function test_targetsExpire() public {
        uint64 asOf = uint64(block.timestamp);
        address[] memory list = stocks(meta, nvda);
        uint16[] memory shares = weights(3500, 3000);
        vm.prank(publisher);
        board.postTargets(vault, list, shares, asOf, asOf + 1 hours, EVIDENCE);

        vm.warp(asOf + 1 hours - 1);
        assertTrue(board.targetsAreCurrent(vault, 1, list, shares));
        vm.warp(asOf + 1 hours);
        assertFalse(board.targetsAreCurrent(vault, 1, list, shares));
    }

    function test_theOwnerCanSwitchTargetsOffAtOnce() public {
        uint64 asOf = uint64(block.timestamp);
        address[] memory list = stocks(meta, nvda);
        uint16[] memory shares = weights(3500, 3000);
        vm.prank(publisher);
        board.postTargets(vault, list, shares, asOf, asOf + 1 days, EVIDENCE);

        vm.expectEmit(true, true, false, false);
        emit SignalBoard.TargetsRevoked(vault, 1);
        vm.prank(owner);
        board.revokeTargets(vault);
        assertFalse(board.targetsAreCurrent(vault, 1, list, shares));

        vm.prank(owner);
        vm.expectRevert(SignalBoard.NothingPosted.selector);
        board.revokeTargets(makeAddr("never posted"));
    }

    function test_noStocksMeansAllCash() public {
        uint64 asOf = uint64(block.timestamp);
        vm.prank(publisher);
        board.postTargets(vault, new address[](0), new uint16[](0), asOf, asOf + 1 days, EVIDENCE);
        assertTrue(board.targetsAreCurrent(vault, 1, new address[](0), new uint16[](0)));
    }

    function test_badTargetsAreRefused() public {
        uint64 asOf = uint64(block.timestamp);
        uint64 expires = asOf + 1 days;
        vm.startPrank(publisher);

        vm.expectPartialRevert(SignalBoard.WeightForEachStock.selector);
        board.postTargets(vault, stocks(meta, nvda), new uint16[](1), asOf, expires, EVIDENCE);

        vm.expectPartialRevert(SignalBoard.StockTwice.selector);
        board.postTargets(vault, stocks(meta, meta), weights(2000, 2000), asOf, expires, EVIDENCE);

        vm.expectPartialRevert(SignalBoard.WeightOfZero.selector);
        board.postTargets(vault, stocks(meta, nvda), weights(0, 2000), asOf, expires, EVIDENCE);

        vm.expectPartialRevert(SignalBoard.ZeroStock.selector);
        board.postTargets(vault, stocks(meta, address(0)), weights(2000, 2000), asOf, expires, EVIDENCE);

        vm.expectPartialRevert(SignalBoard.WeightsOver100.selector);
        board.postTargets(vault, stocks(meta, nvda), weights(6000, 4001), asOf, expires, EVIDENCE);

        vm.expectPartialRevert(SignalBoard.AlreadyExpired.selector);
        board.postTargets(vault, stocks(meta, nvda), weights(2000, 2000), asOf, uint64(block.timestamp), EVIDENCE);

        vm.expectPartialRevert(SignalBoard.ValidForTooLong.selector);
        board.postTargets(vault, stocks(meta, nvda), weights(2000, 2000), asOf, asOf + 7 days + 1, EVIDENCE);

        vm.expectRevert(SignalBoard.ZeroAddress.selector);
        board.postTargets(address(0), stocks(meta, nvda), weights(2000, 2000), asOf, expires, EVIDENCE);
        vm.stopPrank();
    }

    function test_noMoreStocksThanAVaultCanHold() public {
        address[] memory list = new address[](7);
        uint16[] memory shares = new uint16[](7);
        for (uint256 i = 0; i < 7; i++) {
            list[i] = address(uint160(i + 1));
            shares[i] = 1000;
        }
        vm.prank(publisher);
        vm.expectPartialRevert(SignalBoard.TooManyStocks.selector);
        board.postTargets(vault, list, shares, uint64(block.timestamp), uint64(block.timestamp + 1 days), EVIDENCE);
    }

    function test_targetsMustBeNewerToo() public {
        uint64 asOf = uint64(block.timestamp);
        vm.startPrank(publisher);
        board.postTargets(vault, stocks(meta, nvda), weights(2000, 2000), asOf, asOf + 1 days, EVIDENCE);
        vm.expectRevert(abi.encodeWithSelector(SignalBoard.NotNewer.selector, asOf, asOf));
        board.postTargets(vault, stocks(meta, nvda), weights(2500, 2500), asOf, asOf + 1 days, EVIDENCE);
        vm.stopPrank();
    }

    function test_theHashIsTheSameWhereverItIsWorkedOut() public view {
        address[] memory list = stocks(meta, nvda);
        uint16[] memory shares = weights(3500, 3000);
        assertEq(board.targetsHash(list, shares), keccak256(abi.encode(list, shares)));
    }
}
