// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IReadings} from "../../blocks/interfaces/IReadings.sol";
import {ICondition} from "../../blocks/interfaces/ICondition.sol";
import {Holdings} from "../../pricing/Portfolio.sol";
import {IRulePlugin, SwapCheck} from "../IRulePlugin.sol";
import {CompositeRule} from "./CompositeRule.sol";

/// @notice A rule that applies only while a condition holds: the same conditions and gates the strategy's blocks use, read from the same readings. "No
/// more than 20% in a stock, but only while the market is down" is this around a max weight. While the condition is false it allows everything.
contract WhenRule is CompositeRule {
    ICondition public immutable condition;
    IReadings public immutable readings;

    constructor(bytes32 kindId_, ICondition condition_, IReadings readings_) CompositeRule(kindId_) {
        condition = condition_;
        readings = readings_;
    }

    function checkSwap(SwapCheck calldata swap) external view override {
        if (!condition.holds(readings)) return;
        address[] storage list = children[msg.sender][swap.account];
        for (uint256 i = 0; i < list.length; i++) {
            IRulePlugin(list[i]).checkSwap(swap);
        }
    }

    function checkPortfolio(address account, Holdings calldata holdings) external view override {
        if (!condition.holds(readings)) return;
        address[] storage list = children[msg.sender][account];
        for (uint256 i = 0; i < list.length; i++) {
            IRulePlugin(list[i]).checkPortfolio(account, holdings);
        }
    }
}
