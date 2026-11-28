// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Holdings} from "../../pricing/Portfolio.sol";
import {IRulePlugin, SwapCheck} from "../IRulePlugin.sol";
import {CompositeRule} from "./CompositeRule.sol";

/// @notice NOT: the rule inside must NOT hold. It refuses what the rule inside would allow, so "not in a pool this shallow" is a NOT around a
/// minimum liquidity. With more than one child it is a NOR: it refuses what any of them allows.
contract NotRule is CompositeRule {
    error RuleHolds(address rule);

    constructor(bytes32 kindId_) CompositeRule(kindId_) {}

    function checkSwap(SwapCheck calldata swap) external view override {
        address[] storage list = children[msg.sender][swap.account];
        for (uint256 i = 0; i < list.length; i++) {
            try IRulePlugin(list[i]).checkSwap(swap) {
                revert RuleHolds(list[i]);
            } catch (bytes memory reason) {
                // The rule inside refused, which is what this wants; but a failure to reach it is not that
                if (bytes4(reason) == RuleHolds.selector) revert RuleHolds(list[i]);
            }
        }
    }

    function checkPortfolio(address account, Holdings calldata holdings) external view override {
        address[] storage list = children[msg.sender][account];
        for (uint256 i = 0; i < list.length; i++) {
            try IRulePlugin(list[i]).checkPortfolio(account, holdings) {
                revert RuleHolds(list[i]);
            } catch (bytes memory reason) {
                if (bytes4(reason) == RuleHolds.selector) revert RuleHolds(list[i]);
            }
        }
    }
}
