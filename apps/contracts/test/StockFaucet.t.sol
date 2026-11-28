// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {StockFaucet} from "../src/testnet/StockFaucet.sol";
import {TestStock} from "../src/testnet/TestStock.sol";

contract StockFaucetTest is Test {
    uint256 private constant AMOUNT = 1_000e8;
    uint256 private constant BASE_SEPOLIA = 84532;

    address private person = makeAddr("person");
    address private other = makeAddr("other");
    StockFaucet private faucet;

    function setUp() public {
        vm.chainId(BASE_SEPOLIA);
        vm.warp(1_000_000);
        faucet = new StockFaucet(AMOUNT);
    }

    function make(string memory name, string memory symbol, address maker) private returns (TestStock) {
        vm.prank(maker);
        return faucet.createStock(name, symbol);
    }

    // ---------------------------------------------------------------------------------------------------------- it starts with nothing
    function test_startsWithNoStocksAtAll() public view {
        assertEq(faucet.tokenCount(), 0);
    }

    // ---------------------------------------------------------------------------------------------------------- a stock with a name of your own
    function test_makesAStockWithTheNameAndSymbolGiven_andTheRealDecimals() public {
        TestStock token = make("Test Acme Foods", "tACMEc", person);

        assertEq(token.name(), "Test Acme Foods");
        assertEq(token.symbol(), "tACMEc");
        assertEq(token.decimals(), 8);
        assertEq(faucet.tokenCount(), 1);
        assertEq(address(faucet.tokens(0)), address(token));
        assertTrue(faucet.isStock(address(token)));
        assertEq(faucet.stockBySymbol(keccak256("tACMEc")), address(token));
    }

    function test_theMakerGetsTheFirstClaim_andThenWaitsADay() public {
        TestStock token = make("Test Acme Foods", "tACMEc", person);
        assertEq(token.balanceOf(person), AMOUNT);

        vm.prank(person);
        vm.expectRevert(abi.encodeWithSelector(StockFaucet.ComeBackLater.selector, block.timestamp + 1 days));
        faucet.claim(token);
    }

    function test_announcesTheStock() public {
        vm.expectEmit(false, true, false, true);
        emit StockFaucet.StockCreated(address(0), person, "Test Acme Foods", "tACMEc");
        make("Test Acme Foods", "tACMEc", person);
    }

    function test_refusesABadNameOrSymbol() public {
        vm.startPrank(person);
        vm.expectRevert(StockFaucet.BadName.selector);
        faucet.createStock("", "tACMEc");
        vm.expectRevert(StockFaucet.BadName.selector);
        faucet.createStock("A name that is far too long to be the name of any one test stock", "tACMEc");

        vm.expectRevert(StockFaucet.BadSymbol.selector);
        faucet.createStock("Test Acme", "ab");
        vm.expectRevert(StockFaucet.BadSymbol.selector);
        faucet.createStock("Test Acme", "has space");
        vm.expectRevert(StockFaucet.BadSymbol.selector);
        faucet.createStock("Test Acme", "waytoolongasymbol");
        vm.expectRevert(StockFaucet.BadSymbol.selector);
        faucet.createStock("Test Acme", "t$ymbol");
        vm.stopPrank();
    }

    function test_aSymbolIsUsedOnce() public {
        make("Test Acme Foods", "tACMEc", person);
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StockFaucet.SymbolTaken.selector, "tACMEc"));
        faucet.createStock("Another Acme", "tACMEc");
    }

    function test_therAreAtMostSoManyStocks() public {
        for (uint256 i = 0; i < faucet.MOST_STOCKS(); i++) {
            make("Test Stock", string.concat("tS", vm.toString(i)), person);
        }
        vm.prank(person);
        vm.expectRevert(StockFaucet.TooManyStocks.selector);
        faucet.createStock("One more", "tMORE");
    }

    // ---------------------------------------------------------------------------------------------------------- a random stock
    function test_makesARandomStockWithANameAndASymbol() public {
        vm.prank(person);
        TestStock token = faucet.createRandomStock();

        bytes memory name = bytes(token.name());
        bytes memory symbol = bytes(token.symbol());
        assertEq(string(abi.encodePacked(name[0], name[1], name[2], name[3], name[4])), "Test ");
        assertEq(symbol.length, 6); // t + four letters + c
        assertEq(symbol[0], bytes1("t"));
        assertEq(symbol[5], bytes1("c"));
        assertTrue(faucet.isStock(address(token)));
        assertEq(token.balanceOf(person), AMOUNT);
    }

    function test_randomStocksAreDifferentFromEachOther() public {
        for (uint256 i = 0; i < 30; i++) {
            vm.prevrandao(bytes32(uint256(keccak256(abi.encode("round", i)))));
            vm.prank(person);
            faucet.createRandomStock();
        }
        assertEq(faucet.tokenCount(), 30);
        // No two share a symbol: the faucet would have refused it
        for (uint256 i = 0; i < 30; i++) {
            for (uint256 j = i + 1; j < 30; j++) {
                assertNotEq(faucet.tokens(i).symbol(), faucet.tokens(j).symbol());
            }
        }
    }

    // ---------------------------------------------------------------------------------------------------------- claiming
    function test_aClaimGivesAnAmountOfThatStock() public {
        TestStock token = make("Test Acme Foods", "tACMEc", other);
        vm.prank(person);
        faucet.claim(token);
        assertEq(token.balanceOf(person), AMOUNT);
        assertEq(faucet.lastClaim(person, address(token)), block.timestamp);
    }

    function test_oneClaimADayPerAccountPerStock() public {
        TestStock token = make("Test Acme Foods", "tACMEc", other);
        vm.startPrank(person);
        faucet.claim(token);
        vm.expectRevert(abi.encodeWithSelector(StockFaucet.ComeBackLater.selector, block.timestamp + 1 days));
        faucet.claim(token);

        vm.warp(block.timestamp + 1 days - 1);
        vm.expectRevert();
        faucet.claim(token);

        vm.warp(block.timestamp + 1);
        faucet.claim(token);
        assertEq(token.balanceOf(person), 2 * AMOUNT);
        vm.stopPrank();
    }

    function test_eachStockAndEachAccountHasItsOwnCooldown() public {
        TestStock acme = make("Test Acme Foods", "tACMEc", other);
        TestStock bolt = make("Test Bolt Motors", "tBOLTc", other);

        vm.prank(person);
        faucet.claim(acme);
        // Another stock is not held up by the first
        vm.prank(person);
        faucet.claim(bolt);
        // Nor is another account
        address third = makeAddr("third");
        vm.prank(third);
        faucet.claim(acme);

        assertEq(acme.balanceOf(person), AMOUNT);
        assertEq(bolt.balanceOf(person), AMOUNT);
        assertEq(acme.balanceOf(third), AMOUNT);
    }

    function test_claimManyTakesSeveralAtOnce() public {
        TestStock acme = make("Test Acme Foods", "tACMEc", other);
        TestStock bolt = make("Test Bolt Motors", "tBOLTc", other);
        TestStock[] memory list = new TestStock[](2);
        list[0] = acme;
        list[1] = bolt;

        vm.prank(person);
        faucet.claimMany(list);
        assertEq(acme.balanceOf(person), AMOUNT);
        assertEq(bolt.balanceOf(person), AMOUNT);
    }

    function test_nextClaimSaysWhenAnAccountMayClaimAgain() public {
        TestStock token = make("Test Acme Foods", "tACMEc", other);
        assertEq(faucet.nextClaim(person, address(token)), block.timestamp);

        vm.prank(person);
        faucet.claim(token);
        assertEq(faucet.nextClaim(person, address(token)), block.timestamp + 1 days);

        vm.warp(block.timestamp + 2 days);
        assertEq(faucet.nextClaim(person, address(token)), block.timestamp);
    }

    function test_aTokenThatIsNotOursCannotBeClaimed() public {
        TestStock stranger = new TestStock("Stranger", "tSTRG");
        vm.prank(person);
        vm.expectRevert(abi.encodeWithSelector(StockFaucet.NotOurStock.selector, address(stranger)));
        faucet.claim(stranger);
    }

    // ---------------------------------------------------------------------------------------------------------- the rest
    function test_onlyTheFaucetCanMint() public {
        TestStock token = make("Test Acme Foods", "tACMEc", person);
        vm.prank(person);
        vm.expectRevert(TestStock.NotMinter.selector);
        token.mint(person, 1);
    }

    function test_ownerCanChangeTheAmountAndNobodyElse() public {
        vm.prank(person);
        vm.expectRevert(StockFaucet.OwnerOnly.selector);
        faucet.setAmountPerToken(1);

        faucet.setAmountPerToken(5e8);
        TestStock token = make("Test Acme Foods", "tACMEc", person);
        assertEq(token.balanceOf(person), 5e8);
    }

    function test_refusesToExistOnBaseMainnetOrEthereum() public {
        vm.chainId(8453);
        vm.expectRevert(StockFaucet.TestNetworksOnly.selector);
        new StockFaucet(AMOUNT);

        vm.chainId(1);
        vm.expectRevert(StockFaucet.TestNetworksOnly.selector);
        new StockFaucet(AMOUNT);
    }

    function test_tokensMoveLikeAnyErc20() public {
        TestStock token = make("Test Acme Foods", "tACMEc", person);

        vm.prank(person);
        token.transfer(other, 100e8);
        assertEq(token.balanceOf(other), 100e8);

        vm.prank(other);
        token.approve(person, 40e8);
        vm.prank(person);
        token.transferFrom(other, person, 40e8);
        assertEq(token.balanceOf(other), 60e8);
        assertEq(token.balanceOf(person), AMOUNT - 100e8 + 40e8);
    }
}
