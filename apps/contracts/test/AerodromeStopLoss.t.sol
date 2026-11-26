// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IReactive} from "reactive-lib/interfaces/IReactive.sol";

import {AerodromeStopLossCallback} from "../src/aerodrome/AerodromeStopLossCallback.sol";
import {AerodromeStopLossReactive} from "../src/aerodrome/AerodromeStopLossReactive.sol";
import {SafeToken} from "../src/libraries/SafeToken.sol";
import {MockAerodromeRouter} from "./mocks/MockAerodromeRouter.sol";
import {MockToken} from "./mocks/MockToken.sol";

contract AerodromeStopLossReactiveTest is Test {
    uint256 private constant BASE = 8453;
    uint256 private constant SYNC_TOPIC_0 = uint256(keccak256("Sync(uint256,uint256)"));
    // The stock has 18 decimals and USDC 6, as the real tokens do; the stop is 90 USDC
    uint256 private constant STOP = 90e18;

    address private pool = makeAddr("pool");
    address private callback = makeAddr("callback");

    AerodromeStopLossReactive private reactive;

    function setUp() public {
        reactive = new AerodromeStopLossReactive(BASE, pool, callback, true, 18, 6, STOP);
    }

    function sync(uint256 reserve0, uint256 reserve1) private view returns (IReactive.LogRecord memory) {
        return IReactive.LogRecord({
            chain_id: BASE,
            _contract: pool,
            topic_0: SYNC_TOPIC_0,
            topic_1: 0,
            topic_2: 0,
            topic_3: 0,
            data: abi.encode(reserve0, reserve1),
            block_number: block.number,
            op_code: 0,
            block_hash: 0,
            tx_hash: 0,
            log_index: 0
        });
    }

    // 1,000 stock against 100,000 USDC is 100 USDC each; against 89,000 it is 89
    function test_staysQuietWhileThePriceIsAboveTheStop() public {
        vm.recordLogs();
        reactive.react(sync(1_000e18, 100_000e6));
        assertEq(vm.getRecordedLogs().length, 0);
        assertFalse(reactive.triggered());
    }

    function test_firesWhenThePriceFallsToTheStop() public {
        bytes memory payload = abi.encodeWithSignature("stopLoss(address,uint256)", address(0), 89e18);

        vm.expectEmit(true, true, true, true, address(reactive));
        emit AerodromeStopLossReactive.StopLossTriggered(89e18);
        vm.expectEmit(true, true, true, true, address(reactive));
        emit IReactive.Callback(BASE, callback, 1_000_000, payload);

        reactive.react(sync(1_000e18, 89_000e6));
        assertTrue(reactive.triggered());
    }

    function test_firesAtExactlyTheStop() public {
        reactive.react(sync(1_000e18, 90_000e6));
        assertTrue(reactive.triggered());
    }

    function test_firesOnlyOnce() public {
        reactive.react(sync(1_000e18, 89_000e6));

        vm.recordLogs();
        reactive.react(sync(1_000e18, 50_000e6));
        assertEq(vm.getRecordedLogs().length, 0);
    }

    function test_readsThePriceTheRightWayRoundWhenTheStockIsToken1() public {
        AerodromeStopLossReactive flipped = new AerodromeStopLossReactive(BASE, pool, callback, false, 18, 6, STOP);

        // token0 is USDC, token1 is the stock: 89,000 USDC against 1,000 stock
        flipped.react(sync(89_000e6, 1_000e18));
        assertTrue(flipped.triggered());
    }

    function test_ignoresOtherPoolsOtherChainsAndOtherEvents() public {
        IReactive.LogRecord memory otherPool = sync(1_000e18, 50_000e6);
        otherPool._contract = makeAddr("otherPool");
        reactive.react(otherPool);

        IReactive.LogRecord memory otherChain = sync(1_000e18, 50_000e6);
        otherChain.chain_id = 1;
        reactive.react(otherChain);

        IReactive.LogRecord memory otherEvent = sync(1_000e18, 50_000e6);
        otherEvent.topic_0 = uint256(keccak256("Swap(address,address,uint256,uint256,uint256,uint256)"));
        reactive.react(otherEvent);

        assertFalse(reactive.triggered());
    }

    function test_ignoresAnEmptyPool() public {
        reactive.react(sync(0, 0));
        reactive.react(sync(1_000e18, 0));
        assertFalse(reactive.triggered());
    }

    function test_refusesAStopPriceOfZero() public {
        vm.expectRevert("Stop price is zero");
        new AerodromeStopLossReactive(BASE, pool, callback, true, 18, 6, 0);
    }
}

contract AerodromeStopLossCallbackTest is Test {
    uint256 private constant ONE_STOCK = 1e18;

    address private callbackProxy = makeAddr("callbackProxy");
    address private factory = makeAddr("factory");
    address private stranger = makeAddr("stranger");

    MockToken private stock;
    MockToken private usdc;
    MockAerodromeRouter private router;
    AerodromeStopLossCallback private callback;

    // This test contract is the person: it deploys the callback, so it is the owner and the reactive owner
    function setUp() public {
        stock = new MockToken(18);
        usdc = new MockToken(6);
        router = new MockAerodromeRouter();
        // A sale at 88.5 USDC a stock, which is inside the 1% below the 89 the stop will have seen (88.11)
        router.setRate(88_500_000);
        usdc.mint(address(router), 1_000_000e6);

        // Slippage allowed: 1%
        callback = new AerodromeStopLossCallback(
            callbackProxy, address(router), factory, address(stock), address(usdc), 18, 6, 100
        );

        stock.mint(address(this), 10 * ONE_STOCK);
    }

    function test_sellsWhatTheOwnerApprovedAndSendsTheUsdcToThem() public {
        stock.approve(address(callback), 4 * ONE_STOCK);

        vm.expectEmit(true, false, false, true, address(callback));
        emit AerodromeStopLossCallback.Sold(address(this), 4 * ONE_STOCK, 89e18);

        vm.prank(callbackProxy);
        callback.stopLoss(address(this), 89e18);

        // Four stock sold, six kept, and 4 x 88.5 USDC received; nothing left in the contract
        assertEq(stock.balanceOf(address(this)), 6 * ONE_STOCK);
        assertEq(usdc.balanceOf(address(this)), 354e6);
        assertEq(stock.balanceOf(address(callback)), 0);
        assertEq(usdc.balanceOf(address(callback)), 0);
        // The approval to the router is taken back
        assertEq(stock.allowance(address(callback), address(router)), 0);
    }

    function test_sellsOnlyWhatTheOwnerHoldsWhenTheyApprovedMore() public {
        stock.approve(address(callback), 100 * ONE_STOCK);

        vm.prank(callbackProxy);
        callback.stopLoss(address(this), 89e18);

        assertEq(stock.balanceOf(address(this)), 0);
        assertEq(usdc.balanceOf(address(this)), 885e6);
    }

    function test_usesTheRouteItWasBuiltFor() public {
        stock.approve(address(callback), ONE_STOCK);
        vm.prank(callbackProxy);
        callback.stopLoss(address(this), 89e18);

        (address from, address to, bool stable, address routeFactory) = router.lastRoute();
        assertEq(from, address(stock));
        assertEq(to, address(usdc));
        assertFalse(stable);
        assertEq(routeFactory, factory);
    }

    function test_doesNothingButSayWhenThereIsNothingApproved() public {
        vm.expectEmit(true, false, false, false, address(callback));
        emit AerodromeStopLossCallback.NothingToSell(address(this));

        vm.prank(callbackProxy);
        callback.stopLoss(address(this), 89e18);

        assertEq(stock.balanceOf(address(this)), 10 * ONE_STOCK);
    }

    function test_refusesASaleThatBringsInTooLittle() public {
        stock.approve(address(callback), ONE_STOCK);
        // The stop saw 89, so at least 89 less 1% = 88.11 USDC is needed; the router would pay 80
        router.setRate(80e6);

        vm.prank(callbackProxy);
        vm.expectRevert("INSUFFICIENT_OUTPUT_AMOUNT");
        callback.stopLoss(address(this), 89e18);

        // Nothing moved
        assertEq(stock.balanceOf(address(this)), 10 * ONE_STOCK);
    }

    function test_acceptsASaleWithinTheSlippage() public {
        stock.approve(address(callback), ONE_STOCK);
        // 88.2 USDC is above 88.11
        router.setRate(88_200_000);

        vm.prank(callbackProxy);
        callback.stopLoss(address(this), 89e18);

        assertEq(usdc.balanceOf(address(this)), 88_200_000);
    }

    function test_onlyTheCallbackProxyCanCall() public {
        stock.approve(address(callback), ONE_STOCK);
        vm.expectRevert("Authorized sender only");
        callback.stopLoss(address(this), 89e18);

        vm.prank(stranger);
        vm.expectRevert("Authorized sender only");
        callback.stopLoss(address(this), 89e18);
    }

    function test_onlyTheOwnersReactiveContractCanCall() public {
        stock.approve(address(callback), ONE_STOCK);
        vm.prank(callbackProxy);
        vm.expectRevert("Authorized RVM ID only");
        callback.stopLoss(stranger, 89e18);
    }

    function test_neverMovesAnyoneElsesTokens() public {
        // Someone else holds stock and has approved this contract, but the callback only ever acts for its owner
        stock.mint(stranger, 5 * ONE_STOCK);
        vm.prank(stranger);
        stock.approve(address(callback), 5 * ONE_STOCK);

        vm.prank(callbackProxy);
        callback.stopLoss(address(this), 89e18);

        assertEq(stock.balanceOf(stranger), 5 * ONE_STOCK);
    }

    function test_refusesSlippageOfOneHundredPercentOrMore() public {
        vm.expectRevert("Slippage is over 100%");
        new AerodromeStopLossCallback(
            callbackProxy, address(router), factory, address(stock), address(usdc), 18, 6, 10_000
        );
    }

    function test_safeTokenReverts_whenTheTokenSaysNo() public {
        MockRefusingToken refusing = new MockRefusingToken();
        AerodromeStopLossCallback refusingCallback = new AerodromeStopLossCallback(
            callbackProxy, address(router), factory, address(refusing), address(usdc), 18, 6, 100
        );
        refusing.setHolder(address(this));

        vm.prank(callbackProxy);
        vm.expectRevert(abi.encodeWithSelector(SafeToken.TokenCallFailed.selector, address(refusing)));
        refusingCallback.stopLoss(address(this), 89e18);
    }
}

/// @dev A token that has a balance and an allowance but refuses to move: what a paused or blocklisted token does
contract MockRefusingToken {
    address private holder;

    function setHolder(address holder_) external {
        holder = holder_;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 1e18;
    }

    function allowance(address, address) external pure returns (uint256) {
        return 1e18;
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }
}
