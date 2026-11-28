// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IGuardErrors} from "../../guards/IGuardErrors.sol";
import {Bps} from "../../libraries/Bps.sol";
import {SwapCheck} from "../IRulePlugin.sol";
import {RuleBook} from "../RuleBook.sol";
import {RuleIds} from "../RuleIds.sol";
import {RulePluginBase} from "./RulePluginBase.sol";

/// @notice One buy may be at most this share of its pool's depth, in basis points, so no trade of the account's moves a pool much. A vault has it
/// whether or not it was asked to, at 1%.
contract TradeSizeRule is RulePluginBase {
    function kind() external pure returns (bytes32) {
        return RuleIds.MAX_TRADE_OF_DEPTH;
    }

    function defaultValue() external pure override returns (bool, uint256) {
        return (true, RuleBook.DEFAULT_TRADE_OF_DEPTH_BPS);
    }

    function configure(address account, uint256 value, bytes calldata) external override {
        if (value == 0 || value > RuleBook.MAX_TRADE_OF_DEPTH_CEILING_BPS) {
            revert IGuardErrors.TradeSizeOverCeiling(value, RuleBook.MAX_TRADE_OF_DEPTH_CEILING_BPS);
        }
        _attach(account, value);
    }

    function checkSwap(SwapCheck calldata swap) external view override {
        // Only a buy is sized: an exit is always allowed to be as large as what is held
        if (!swap.isBuy) return;
        uint256 most = Bps.portion(swap.poolDepth, _valueFor(swap.account));
        if (swap.amountIn > most) revert IGuardErrors.TradeTooLarge(swap.stock.token, swap.amountIn, most);
    }
}
