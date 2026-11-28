// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {ISlipstreamRouter} from "../src/interfaces/ISlipstreamRouter.sol";
import {PoolPricing} from "../src/pricing/PoolPricing.sol";
import {Stock} from "../src/registry/StockTypes.sol";
import {VaultMath} from "../src/vault/VaultMath.sol";
import {MirrorBook} from "../src/testnet/MirrorBook.sol";
import {MirrorPool} from "../src/testnet/MirrorPool.sol";
import {MirrorPoolFactory} from "../src/testnet/MirrorPoolFactory.sol";
import {MirrorRouter} from "../src/testnet/MirrorRouter.sol";
import {StockFaucet} from "../src/testnet/StockFaucet.sol";
import {TestStock} from "../src/testnet/TestStock.sol";
import {TestUSDC} from "../src/testnet/TestUSDC.sol";

/// @dev PoolPricing is an internal library, so it is called through this
contract PricingProbe {
    function trusted(Stock memory stock) external view returns (uint160) {
        return PoolPricing.trustedPrice(stock);
    }
}

contract MirrorPoolTest is Test {
    uint256 private constant BASE_SEPOLIA = 84532;
    address private constant MAINNET_POOL = address(0xBA5E);
    uint16 private constant FEE_BPS = 30;
    int24 private constant TICK_SPACING = 100;

    MirrorBook private book;
    StockFaucet private faucet;
    TestUSDC private usdc;
    TestStock private stock;
    MirrorPoolFactory private factory;
    MirrorRouter private router;
    MirrorPool private pool;
    address private trader = makeAddr("trader");

    // USDC is token0 on this pool and the stock token1, as on some mainnet pools. The price is token1 per token0 in raw units: 1 USDC buys 1/150 of
    // a stock, so the stock costs $150.
    uint160 private root;

    function setUp() public {
        vm.chainId(BASE_SEPOLIA);
        vm.warp(10_000_000);
        book = new MirrorBook();
        faucet = new StockFaucet(1_000e8);
        usdc = new TestUSDC();
        stock = faucet.createStock("Test NVIDIA", "tNVDAc");
        factory = new MirrorPoolFactory(book);
        router = new MirrorRouter(factory);
        factory.setRouter(address(router));

        // Raw price = stock units per USDC unit = 1e8 / 150 / 1e6, held with 18 decimals so the square root keeps 9
        uint256 stockUnitsPerUsdcUnit = (1e8 * 1e18) / uint256(150 * 1e6);
        root = uint160((_sqrt(stockUnitsPerUsdcUnit) * VaultMath.Q96) / 1e9);
        pool = MirrorPool(factory.createPool(MAINNET_POOL, address(usdc), address(stock), TICK_SPACING, FEE_BPS));
    }

    function _sqrt(uint256 x) private pure returns (uint256 z) {
        if (x == 0) return 0;
        z = x;
        uint256 y = (x + 1) / 2;
        while (y < z) {
            z = y;
            y = (x / y + y) / 2;
        }
    }

    function _post(uint128 depth) private {
        address[] memory pools = new address[](1);
        pools[0] = MAINNET_POOL;
        MirrorBook.PoolState[] memory states = new MirrorBook.PoolState[](1);
        states[0] = MirrorBook.PoolState(root, -4054, 1, depth);
        book.postMany(pools, states, 1);
    }

    /// @dev What a pool of $1M on each side holds
    function _seed(uint256 usdcAmount, uint256 stockAmount) private {
        usdc.mint(address(pool), usdcAmount);
        faucet.ownerMint(stock, address(pool), stockAmount);
    }

    function _swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut) private returns (uint256) {
        vm.startPrank(trader);
        TestStock(tokenIn).approve(address(router), amountIn);
        uint256 out = router.exactInputSingle(
            ISlipstreamRouter.ExactInputSingleParams(tokenIn, tokenOut, TICK_SPACING, trader, block.timestamp + 60, amountIn, minOut, 0)
        );
        vm.stopPrank();
        return out;
    }

    // ------------------------------------------------------------------------------------------------------ it looks like the mainnet pool
    function test_answersWithTheMainnetPoolsPriceAndDepth() public {
        _post(5e12);
        (uint160 price, int24 tick,,,, bool unlocked) = pool.slot0();
        assertEq(price, root);
        assertEq(tick, -4054);
        assertTrue(unlocked);
        assertEq(pool.liquidity(), 5e12);
        assertEq(pool.token0(), address(usdc));
        assertEq(pool.token1(), address(stock));
        assertEq(pool.tickSpacing(), TICK_SPACING);
        assertEq(address(pool.factory()), address(factory));
        assertEq(router.factory(), address(factory));
    }

    function test_hasNoPriceUntilTheRelayerHasWrittenOne() public {
        vm.expectRevert(MirrorPool.NoPriceYet.selector);
        pool.slot0();
    }

    function test_followsTheMirrorWhenThePriceMoves() public {
        _post(5e12);
        root = root * 2;
        _post(5e12);
        (uint160 price,,,,,) = pool.slot0();
        assertEq(price, root);
    }

    function test_theVaultsOwnPriceCheckTrustsIt() public {
        _post(5e12);
        Stock memory listed = Stock(address(stock), address(pool), address(router), TICK_SPACING, true, true);
        assertEq(new PricingProbe().trusted(listed), root);
    }

    // ------------------------------------------------------------------------------------------------------ the factory
    function test_findsAPoolFromEitherOrderOfTokens_andMakesOneCopyOfEachMainnetPool() public {
        assertEq(factory.getPool(address(usdc), address(stock), TICK_SPACING), address(pool));
        assertEq(factory.getPool(address(stock), address(usdc), TICK_SPACING), address(pool));
        assertEq(factory.copyOf(MAINNET_POOL), address(pool));
        assertEq(factory.poolCount(), 1);

        vm.expectRevert(abi.encodeWithSelector(MirrorPoolFactory.AlreadyMirrored.selector, MAINNET_POOL));
        factory.createPool(MAINNET_POOL, address(usdc), address(stock), TICK_SPACING, FEE_BPS);
    }

    function test_onlyTheOwnerMakesPoolsOrSetsTheRouter() public {
        vm.startPrank(trader);
        vm.expectRevert(MirrorPoolFactory.OwnerOnly.selector);
        factory.createPool(address(1), address(usdc), address(stock), 1, 1);
        vm.expectRevert(MirrorPoolFactory.OwnerOnly.selector);
        factory.setRouter(trader);
        vm.stopPrank();
    }

    function test_onlyTheOwnerSeedsAFaucetStock() public {
        vm.prank(trader);
        vm.expectRevert(StockFaucet.OwnerOnly.selector);
        faucet.ownerMint(stock, trader, 1);
    }

    // ------------------------------------------------------------------------------------------------------ swapping
    function test_buysAStockAtThePriceLessTheFee_whenTheTradeIsSmallNextToTheDepth() public {
        _post(1e14);
        _seed(1_000_000e6, 6_666e8);
        usdc.mint(trader, 1_000e6);

        uint256 got = _swap(address(usdc), address(stock), 1_000e6, 0);

        // $1,000 buys 1000 / 150 = 6.667 stocks, less the 0.30% fee and a sliver of price impact
        uint256 atThePrice = VaultMath.stockFor(1_000e6, root, true);
        assertLt(got, (atThePrice * uint256(10_000 - FEE_BPS)) / 10_000);
        assertGt(got, (atThePrice * 9_900) / 10_000);
        assertEq(stock.balanceOf(trader), got);
        assertEq(usdc.balanceOf(address(pool)), 1_000_000e6 + 1_000e6);
    }

    function test_aThinPoolMovesMoreThanADeepOne() public {
        _post(1e14);
        _seed(1_000_000e6, 6_666e8);
        usdc.mint(trader, 20_000e6);
        uint256 deep = _swap(address(usdc), address(stock), 10_000e6, 0);

        _post(1e12);
        uint256 thin = _swap(address(usdc), address(stock), 10_000e6, 0);

        assertLt(thin, deep);
    }

    function test_sellsAStockBackForUsdc() public {
        _post(1e14);
        _seed(1_000_000e6, 6_666e8);
        faucet.ownerMint(stock, trader, 10e8);

        uint256 got = _swap(address(stock), address(usdc), 10e8, 0);

        // 10 stocks at $150 is $1,500, less the fee and a sliver of impact
        assertLt(got, (1_500e6 * uint256(10_000 - FEE_BPS)) / 10_000);
        assertGt(got, 1_450e6);
        assertEq(usdc.balanceOf(trader), got);
    }

    function test_refusesAFillBelowTheMinimum() public {
        _post(1e14);
        _seed(1_000_000e6, 6_666e8);
        usdc.mint(trader, 1_000e6);
        vm.startPrank(trader);
        usdc.approve(address(router), 1_000e6);
        vm.expectRevert();
        router.exactInputSingle(
            ISlipstreamRouter.ExactInputSingleParams(address(usdc), address(stock), TICK_SPACING, trader, block.timestamp + 60, 1_000e6, 7e8, 0)
        );
        vm.stopPrank();
    }

    function test_cannotPayOutMoreThanTheReservesHold() public {
        _post(1e14);
        _seed(1_000_000e6, 1e8);
        usdc.mint(trader, 1_000e6);
        vm.startPrank(trader);
        usdc.approve(address(router), 1_000e6);
        vm.expectRevert(TestStock.BalanceTooLow.selector);
        router.exactInputSingle(
            ISlipstreamRouter.ExactInputSingleParams(address(usdc), address(stock), TICK_SPACING, trader, block.timestamp + 60, 1_000e6, 0, 0)
        );
        vm.stopPrank();
    }

    function test_refusesAnExpiredSwapAndAPoolThatDoesNotExist() public {
        _post(1e14);
        vm.startPrank(trader);
        vm.expectRevert(MirrorRouter.TooLate.selector);
        router.exactInputSingle(
            ISlipstreamRouter.ExactInputSingleParams(address(usdc), address(stock), TICK_SPACING, trader, block.timestamp - 1, 1, 0, 0)
        );
        vm.expectRevert(MirrorRouter.NoPool.selector);
        router.exactInputSingle(
            ISlipstreamRouter.ExactInputSingleParams(address(usdc), address(stock), 1, trader, block.timestamp + 60, 1, 0, 0)
        );
        vm.stopPrank();
    }

    function test_theReservesCannotBeTakenAnyOtherWay() public {
        _seed(1e6, 1e8);
        vm.prank(trader);
        vm.expectRevert(MirrorPool.RouterOnly.selector);
        pool.pay(address(usdc), trader, 1e6);
    }
}
