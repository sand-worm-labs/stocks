// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IReadings} from "../../blocks/interfaces/IReadings.sol";
import {IRulePlugin} from "../IRulePlugin.sol";
import {OffChainFunctions} from "./OffChainFunctions.sol";
import {OffChainRule} from "./OffChainRule.sol";
import {OffChainFunction} from "./OffChainRule.sol";

/// @notice Deploys one `OffChainRule` for each of the suite's off-chain functions, all reading the same board, so a factory can be given them as rule modules
library OffChainRuleSet {
    function deploy(IReadings readings) internal returns (IRulePlugin[] memory rules) {
        OffChainFunction[] memory functions = OffChainFunctions.all();
        rules = new IRulePlugin[](functions.length);
        for (uint256 i = 0; i < functions.length; i++) {
            rules[i] = new OffChainRule(functions[i], readings);
        }
    }
}
