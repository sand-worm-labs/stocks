// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

import {StockFaucet} from "../src/testnet/StockFaucet.sol";
import {TestStock} from "../src/testnet/TestStock.sol";

/// @notice Makes one test stock in a faucet. With a name and a symbol of your choosing, or at random when they are left out:
///   FAUCET=0x... STOCK_NAME="Test Acme Foods" STOCK_SYMBOL=tACMEc forge script script/CreateStock.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
///   FAUCET=0x... forge script script/CreateStock.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
contract CreateStock is Script {
    function run() external {
        StockFaucet faucet = StockFaucet(vm.envAddress("FAUCET"));
        string memory name = vm.envOr("STOCK_NAME", string(""));
        string memory symbol = vm.envOr("STOCK_SYMBOL", string(""));

        vm.startBroadcast();
        TestStock token = bytes(name).length != 0 && bytes(symbol).length != 0
            ? faucet.createStock(name, symbol)
            : faucet.createRandomStock();
        vm.stopBroadcast();

        console.log(token.name(), token.symbol(), address(token));
    }
}
