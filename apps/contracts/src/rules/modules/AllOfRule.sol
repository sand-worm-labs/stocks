// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Holdings} from "../../pricing/Portfolio.sol";
import {IRulePlugin, SwapCheck} from "../IRulePlugin.sol";
import {CompositeRule} from "./CompositeRule.sol";

/// @notice AND: every rule inside must hold. A swap or a portfolio that any one of them refuses is refused.
contract AllOfRule is CompositeRule {
    constructor(bytes32 kindId_) CompositeRule(kindId_) {}

    function checkSwap(SwapCheck calldata swap) external view override {
        address[] storage list = children[msg.sender][swap.account];
        for (uint256 i = 0; i < list.length; i++) {
            IRulePlugin(list[i]).checkSwap(swap);
        }
    }

    function checkPortfolio(address account, Holdings calldata holdings) external view override {
        address[] storage list = children[msg.sender][account];
        for (uint256 i = 0; i < list.length; i++) {
            IRulePlugin(list[i]).checkPortfolio(account, holdings);
        }
    }
}
