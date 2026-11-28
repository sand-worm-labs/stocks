// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

import {MirrorBook} from "../src/testnet/MirrorBook.sol";
import {MirrorPoolFactory} from "../src/testnet/MirrorPoolFactory.sol";
import {MirrorRouter} from "../src/testnet/MirrorRouter.sol";
import {TestUSDC} from "../src/testnet/TestUSDC.sol";

/// @notice Deploys what a test network needs to trade stocks in copies of the Base mainnet pools: a test USDC, the factory that makes the copies, and
/// the router that swaps in them. The copies read their price from the MirrorBook the relayer writes to, so deploy that first
/// (README: "Mirroring Base pools"). Use the account that deployed the StockFaucet and the MirrorBook: it owns the test USDC and the factory, and
/// the relayer's `pnpm provision` needs its key.
///   MIRROR_BOOK=0x... forge script script/DeployMirrorMarket.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
contract DeployMirrorMarket is Script {
    function run() external {
        MirrorBook book = MirrorBook(vm.envAddress("MIRROR_BOOK"));

        vm.startBroadcast();
        TestUSDC usdc = new TestUSDC();
        MirrorPoolFactory factory = new MirrorPoolFactory(book);
        MirrorRouter router = new MirrorRouter(factory);
        factory.setRouter(address(router));
        vm.stopBroadcast();

        console.log("TestUSDC:", address(usdc));
        console.log("MirrorPoolFactory:", address(factory));
        console.log("MirrorRouter:", address(router));
    }
}
