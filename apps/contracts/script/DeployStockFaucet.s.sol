// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

import {StockFaucet} from "../src/testnet/StockFaucet.sol";

/// @notice Deploys the test stocks and their faucet to a test network:
///   forge script script/DeployStockFaucet.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
contract DeployStockFaucet is Script {
    struct Listing {
        string name;
        string symbol;
    }

    // 1,000 of each per claim, with the real tokens' 8 decimals
    uint256 private constant AMOUNT_PER_CLAIM = 1_000e8;

    function run() external {
        Listing[] memory listings = stocks();
        (string[] memory names, string[] memory symbols) = split(listings);

        vm.startBroadcast();
        StockFaucet faucet = new StockFaucet(names, symbols, AMOUNT_PER_CLAIM);
        vm.stopBroadcast();

        report(faucet, symbols);
    }

    /// @dev The stocks the app can research, as test tokens. A "t" on the front says it is a test token.
    function stocks() private pure returns (Listing[] memory list) {
        list = new Listing[](7);
        list[0] = Listing("Test Apple", "tAAPLc");
        list[1] = Listing("Test NVIDIA", "tNVDAc");
        list[2] = Listing("Test Amazon", "tAMZNc");
        list[3] = Listing("Test Alphabet", "tGOOGLc");
        list[4] = Listing("Test Microsoft", "tMSFTc");
        list[5] = Listing("Test Tesla", "tTSLAc");
        list[6] = Listing("Test Meta", "tMETAc");
    }

    /// @dev The faucet takes the names and the symbols as two lists, in the same order
    function split(Listing[] memory listings) private pure returns (string[] memory names, string[] memory symbols) {
        names = new string[](listings.length);
        symbols = new string[](listings.length);
        for (uint256 i = 0; i < listings.length; i++) {
            names[i] = listings[i].name;
            symbols[i] = listings[i].symbol;
        }
    }

    /// @dev What to copy into the app's testnet list and into a wallet
    function report(StockFaucet faucet, string[] memory symbols) private view {
        console.log("StockFaucet:", address(faucet));
        for (uint256 i = 0; i < symbols.length; i++) {
            console.log(symbols[i], address(faucet.tokens(i)));
        }
    }
}
