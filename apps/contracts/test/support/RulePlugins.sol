// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IRulePlugin} from "../../src/rules/IRulePlugin.sol";
import {MaxWeightRule} from "../../src/rules/modules/MaxWeightRule.sol";
import {MinLiquidityRule} from "../../src/rules/modules/MinLiquidityRule.sol";
import {SlippageRule} from "../../src/rules/modules/SlippageRule.sol";
import {TradeSizeRule} from "../../src/rules/modules/TradeSizeRule.sol";

/// @notice The rule modules of the suite, deployed together, as a factory is given them
library RulePlugins {
    function deploy() internal returns (IRulePlugin[] memory list) {
        list = new IRulePlugin[](4);
        list[0] = new MaxWeightRule();
        list[1] = new MinLiquidityRule();
        list[2] = new SlippageRule();
        list[3] = new TradeSizeRule();
    }
}
