// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IGuardErrors} from "../../guards/IGuardErrors.sol";
import {SwapCheck} from "../IRulePlugin.sol";
import {RuleIds} from "../RuleIds.sol";
import {RulePluginBase} from "./RulePluginBase.sol";

/// @notice The account only buys in a pool that holds at least this much USDC, so it can always get out
contract MinLiquidityRule is RulePluginBase {
    function kind() external pure returns (bytes32) {
        return RuleIds.MIN_LIQUIDITY;
    }

    function checkSwap(SwapCheck calldata swap) external view override {
        if (!swap.isBuy) return;
        uint256 least = _valueFor(swap.account);
        if (swap.poolDepth < least) revert IGuardErrors.PoolTooShallow(swap.stock.token, swap.poolDepth, least);
    }
}
