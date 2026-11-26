// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {StockFaucet} from "../src/testnet/StockFaucet.sol";
import {TestStock} from "../src/testnet/TestStock.sol";

contract StockFaucetTest is Test {
    uint256 private constant AMOUNT = 1_000e8;
    uint256 private constant BASE_SEPOLIA = 84532;

    address private person = makeAddr("person");
    StockFaucet private faucet;

    function setUp() public {
        vm.chainId(BASE_SEPOLIA);
        vm.warp(1_000_000);
        faucet = new StockFaucet(names(), symbols(), AMOUNT);
    }

    function names() private pure returns (string[] memory list) {
        list = new string[](2);
        list[0] = "Test NVIDIA";
        list[1] = "Test Apple";
    }

    function symbols() private pure returns (string[] memory list) {
        list = new string[](2);
        list[0] = "tNVDAc";
        list[1] = "tAAPLc";
    }

    function test_makesATokenForEachNameWithTheRealDecimals() public view {
        assertEq(faucet.tokenCount(), 2);
        assertEq(faucet.tokens(0).symbol(), "tNVDAc");
        assertEq(faucet.tokens(1).symbol(), "tAAPLc");
        assertEq(faucet.tokens(0).decimals(), 8);
    }

    function test_aClaimGivesAnAmountOfEveryToken() public {
        vm.prank(person);
        faucet.claim();

        assertEq(faucet.tokens(0).balanceOf(person), AMOUNT);
        assertEq(faucet.tokens(1).balanceOf(person), AMOUNT);
        assertEq(faucet.tokens(0).totalSupply(), AMOUNT);
    }

    function test_oneClaimADayPerAccount() public {
        vm.startPrank(person);
        faucet.claim();

        vm.expectRevert("Come back tomorrow");
        faucet.claim();

        vm.warp(block.timestamp + 1 days - 1);
        vm.expectRevert("Come back tomorrow");
        faucet.claim();

        vm.warp(block.timestamp + 1);
        faucet.claim();
        vm.stopPrank();

        assertEq(faucet.tokens(0).balanceOf(person), 2 * AMOUNT);
    }

    function test_eachAccountHasItsOwnCooldown() public {
        vm.prank(person);
        faucet.claim();

        address other = makeAddr("other");
        vm.prank(other);
        faucet.claim();

        assertEq(faucet.tokens(0).balanceOf(other), AMOUNT);
    }

    function test_nextClaimSaysWhenAnAccountMayClaimAgain() public {
        assertEq(faucet.nextClaim(person), block.timestamp);

        vm.prank(person);
        faucet.claim();
        assertEq(faucet.nextClaim(person), block.timestamp + 1 days);
    }

    function test_onlyTheFaucetCanMint() public {
        TestStock token = faucet.tokens(0);
        vm.prank(person);
        vm.expectRevert("Minter only");
        token.mint(person, 1);
    }

    function test_ownerCanChangeTheAmountAndNobodyElse() public {
        faucet.setAmountPerToken(5e8);
        assertEq(faucet.amountPerToken(), 5e8);

        vm.prank(person);
        vm.expectRevert("Owner only");
        faucet.setAmountPerToken(1);
    }

    function test_refusesToExistOnBaseMainnetOrEthereum() public {
        vm.chainId(8453);
        vm.expectRevert("Test networks only");
        new StockFaucet(names(), symbols(), AMOUNT);

        vm.chainId(1);
        vm.expectRevert("Test networks only");
        new StockFaucet(names(), symbols(), AMOUNT);
    }

    function test_tokensMoveLikeAnyErc20() public {
        vm.prank(person);
        faucet.claim();

        TestStock token = faucet.tokens(0);
        address friend = makeAddr("friend");

        vm.prank(person);
        assertTrue(token.transfer(friend, 10e8));
        assertEq(token.balanceOf(friend), 10e8);

        vm.prank(person);
        assertTrue(token.approve(friend, 5e8));
        vm.prank(friend);
        assertTrue(token.transferFrom(person, friend, 5e8));
        assertEq(token.balanceOf(friend), 15e8);

        vm.prank(friend);
        vm.expectRevert("Allowance too low");
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transferFrom(person, friend, 1);
    }
}
