// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Bps} from "../libraries/Bps.sol";
import {SafeCast} from "../libraries/SafeCast.sol";
import {Limits, Placement, Rule} from "./RuleTypes.sol";
import {RuleIds} from "./RuleIds.sol";

/// @notice The checks on a set of rules before a vault is made with them, and what the modules are configured with
library RuleBook {
    /// @notice One stock may be all of the vault: how open the max weight is left
    uint16 internal constant FULL_WEIGHT_BPS = 10_000;
    /// @notice The loosest slippage anything onchain accepts, whatever the rules say or leave out
    uint16 internal constant MAX_SLIPPAGE_CEILING_BPS = 200;
    /// @notice What one buy may be of its pool's depth when no rule says: 1%
    uint16 internal constant DEFAULT_TRADE_OF_DEPTH_BPS = 100;
    /// @notice The most a rule may raise it to: 10%
    uint16 internal constant MAX_TRADE_OF_DEPTH_CEILING_BPS = 1000;
    uint256 internal constant MAX_PAUSE = 365 days;

    error DuplicateRule(bytes32 kind);
    error LimitIsZero(bytes32 kind);
    error ValueOutOfRange(bytes32 kind, uint256 value, uint256 most);
    error StopOutOfRange(bytes32 kind, uint256 value);
    error PauseOverAYear(bytes32 kind, uint256 pause);
    error NotEnforceableOnChain(bytes32 kind);

    /// @notice Refuses a set of rules that has one twice, one out of range, or one placed onchain that none of the vault's modules can enforce there.
    /// `enforced` lists the ids some installed module enforces (IRuleEnforcer). A rule placed off-chain needs nothing.
    function check(Rule[] memory rules, bytes32[] memory enforced) internal pure {
        for (uint256 i = 0; i < rules.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                if (rules[j].kind == rules[i].kind) revert DuplicateRule(rules[i].kind);
            }
            if (rules[i].placement != Placement.OffChain && !_contains(enforced, rules[i].kind)) {
                revert NotEnforceableOnChain(rules[i].kind);
            }
            _checkRange(rules[i]);
        }
    }

    function limitsOf(Rule[] memory rules) internal pure returns (Limits memory limits) {
        limits = Limits({
            budget: type(uint256).max,
            maxWeightBps: FULL_WEIGHT_BPS,
            minPoolDepth: 0,
            maxSlippageBps: MAX_SLIPPAGE_CEILING_BPS,
            maxTradeOfDepthBps: DEFAULT_TRADE_OF_DEPTH_BPS
        });
        for (uint256 i = 0; i < rules.length; i++) {
            Rule memory rule = rules[i];
            if (rule.placement == Placement.OffChain) continue;
            if (rule.kind == RuleIds.BUDGET) limits.budget = rule.value;
            else if (rule.kind == RuleIds.MAX_WEIGHT) limits.maxWeightBps = SafeCast.toUint16(rule.value);
            else if (rule.kind == RuleIds.MIN_LIQUIDITY) limits.minPoolDepth = rule.value;
            else if (rule.kind == RuleIds.SLIPPAGE) limits.maxSlippageBps = SafeCast.toUint16(rule.value);
            else if (rule.kind == RuleIds.MAX_TRADE_OF_DEPTH) limits.maxTradeOfDepthBps = SafeCast.toUint16(rule.value);
        }
    }

    /// @notice What stands for a set of rules, so the app and anyone else can check that the rules a vault was deployed with are the ones they are shown
    function hashOf(Rule[] memory rules) internal pure returns (bytes32) {
        return keccak256(abi.encode(rules));
    }

    function _contains(bytes32[] memory list, bytes32 id) private pure returns (bool) {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == id) return true;
        }
        return false;
    }

    /// @dev Only the ids the suite knows are checked here. A kind of another module is checked by that module when it is installed.
    function _checkRange(Rule memory rule) private pure {
        bytes32 kind = rule.kind;
        uint256 value = rule.value;
        if (kind == RuleIds.BUDGET || kind == RuleIds.MIN_LIQUIDITY || kind == RuleIds.TAKE_PROFIT) {
            if (value == 0) revert LimitIsZero(kind);
        } else if (kind == RuleIds.MAX_WEIGHT) {
            if (value == 0 || value > Bps.DENOMINATOR) revert ValueOutOfRange(kind, value, Bps.DENOMINATOR);
        } else if (kind == RuleIds.SLIPPAGE) {
            if (value == 0 || value > MAX_SLIPPAGE_CEILING_BPS) revert ValueOutOfRange(kind, value, MAX_SLIPPAGE_CEILING_BPS);
        } else if (kind == RuleIds.MAX_TRADE_OF_DEPTH) {
            if (value == 0 || value > MAX_TRADE_OF_DEPTH_CEILING_BPS) {
                revert ValueOutOfRange(kind, value, MAX_TRADE_OF_DEPTH_CEILING_BPS);
            }
        } else if (kind == RuleIds.STOP_LOSS || kind == RuleIds.PORTFOLIO_STOP) {
            if (value == 0 || value >= Bps.DENOMINATOR) revert StopOutOfRange(kind, value);
            if (kind == RuleIds.PORTFOLIO_STOP && rule.data.length != 0) {
                uint256 pause = abi.decode(rule.data, (uint256));
                if (pause > MAX_PAUSE) revert PauseOverAYear(kind, pause);
            }
        }
    }
}
