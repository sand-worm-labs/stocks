// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Holdings} from "../../pricing/Portfolio.sol";
import {IRulePlugin, SwapCheck} from "../IRulePlugin.sol";
import {CompositeRule} from "./CompositeRule.sol";

/// @notice OR: at least one rule inside must hold. It refuses only what every one of them refuses, so a swap may be small OR priced tightly.
contract AnyOfRule is CompositeRule {
    error NoRuleHolds();

    constructor(bytes32 kindId_) CompositeRule(kindId_) {}

    function checkSwap(SwapCheck calldata swap) external view override {
        address[] storage list = children[msg.sender][swap.account];
        for (uint256 i = 0; i < list.length; i++) {
            try IRulePlugin(list[i]).checkSwap(swap) {
                return;
            } catch {}
        }
        revert NoRuleHolds();
    }

    function checkPortfolio(address account, Holdings calldata holdings) external view override {
        address[] storage list = children[msg.sender][account];
        for (uint256 i = 0; i < list.length; i++) {
            try IRulePlugin(list[i]).checkPortfolio(account, holdings) {
                return;
            } catch {}
        }
        revert NoRuleHolds();
    }
}
