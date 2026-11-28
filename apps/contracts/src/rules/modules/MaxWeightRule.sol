// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IGuardErrors} from "../../guards/IGuardErrors.sol";
import {Bps} from "../../libraries/Bps.sol";
import {Holdings} from "../../pricing/Portfolio.sol";
import {RuleIds} from "../RuleIds.sol";
import {RulePluginBase} from "./RulePluginBase.sol";

/// @notice No one stock may be more than a share of the account's value, in basis points, after an executor has acted: "never put more than 25% in
/// one stock, so one bad pick cannot sink it".
contract MaxWeightRule is RulePluginBase {
    function kind() external pure returns (bytes32) {
        return RuleIds.MAX_WEIGHT;
    }

    function configure(address account, uint256 value, bytes calldata) external override {
        if (value == 0 || value > Bps.DENOMINATOR) revert IGuardErrors.MaxWeightOutOfRange(value);
        _attach(account, value);
    }

    function checkPortfolio(address account, Holdings calldata holdings) external view override {
        uint256 most = _valueFor(account);
        for (uint256 i = 0; i < holdings.stocks.length; i++) {
            uint256 weight = Bps.shareOf(holdings.values[i], holdings.total);
            if (weight > most) revert IGuardErrors.OverWeight(holdings.stocks[i].token, weight, most);
        }
    }
}
