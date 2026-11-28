// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

import {StockFaucet} from "../src/testnet/StockFaucet.sol";

/// @notice Deploys the faucet to a test network, with no stocks in it: anyone makes the ones they want (see CreateStock.s.sol).
///   forge script script/DeployStockFaucet.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
/// Set RANDOM_STOCKS=5 to have it make five random ones as it is deployed.
contract DeployStockFaucet is Script {
    // 1,000 of a stock per claim, with the real tokens' 8 decimals
    uint256 private constant AMOUNT_PER_CLAIM = 1_000e8;

    function run() external {
        uint256 random = vm.envOr("RANDOM_STOCKS", uint256(0));

        vm.startBroadcast();
        StockFaucet faucet = new StockFaucet(AMOUNT_PER_CLAIM);
        for (uint256 i = 0; i < random; i++) {
            faucet.createRandomStock();
        }
        vm.stopBroadcast();

        console.log("StockFaucet:", address(faucet));
        for (uint256 i = 0; i < faucet.tokenCount(); i++) {
            console.log(faucet.tokens(i).symbol(), address(faucet.tokens(i)));
        }
    }
}
