// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IGuardErrors} from "../../guards/IGuardErrors.sol";
import {Bps} from "../../libraries/Bps.sol";
import {SwapCheck} from "../IRulePlugin.sol";
import {RuleBook} from "../RuleBook.sol";
import {RuleIds} from "../RuleIds.sol";
import {RulePluginBase} from "./RulePluginBase.sol";

/// @notice A swap must ask for at least what it is worth at the pool's price, less this much, in basis points. A vault has it whether or not it was
/// asked to, at the loosest the suite accepts.
contract SlippageRule is RulePluginBase {
    function kind() external pure returns (bytes32) {
        return RuleIds.SLIPPAGE;
    }

    function defaultValue() external pure override returns (bool, uint256) {
        return (true, RuleBook.MAX_SLIPPAGE_CEILING_BPS);
    }

    function configure(address account, uint256 value, bytes calldata) external override {
        if (value == 0 || value > RuleBook.MAX_SLIPPAGE_CEILING_BPS) {
            revert IGuardErrors.SlippageOverCeiling(value, RuleBook.MAX_SLIPPAGE_CEILING_BPS);
        }
        _attach(account, value);
    }

    function checkSwap(SwapCheck calldata swap) external view override {
        uint256 floor = Bps.lessSlippage(swap.expectedOut, _valueFor(swap.account));
        if (swap.minOut < floor) revert IGuardErrors.SlippageTooLoose(swap.stock.token, swap.minOut, floor);
    }
}
