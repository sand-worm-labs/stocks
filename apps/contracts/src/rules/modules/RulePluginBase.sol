// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Holdings} from "../../pricing/Portfolio.sol";
import {IRulePlugin, SwapCheck} from "../IRulePlugin.sol";

/// @notice What every rule module shares. It keeps one value for each account, **for each caller that attached it**: the guard that attached it to a
/// vault, or a composite rule that attached it as a child. A caller can only set, read and clear what it set itself, so nobody can change the value
/// another caller gave, and rules chain to any depth with no extra trust. A module judges nothing until a rule overrides what it judges.
abstract contract RulePluginBase is IRulePlugin {
    mapping(address caller => mapping(address account => uint256)) public valueOf;
    mapping(address caller => mapping(address account => bool)) public isAttached;

    function defaultValue() external view virtual returns (bool, uint256) {
        return (false, 0);
    }

    function configure(address account, uint256 value, bytes calldata) external virtual {
        _attach(account, value);
    }

    function clear(address account) external virtual {
        delete valueOf[msg.sender][account];
        delete isAttached[msg.sender][account];
    }

    function checkSwap(SwapCheck calldata) external view virtual {}

    function checkPortfolio(address, Holdings calldata) external view virtual {}

    function _attach(address account, uint256 value) internal {
        valueOf[msg.sender][account] = value;
        isAttached[msg.sender][account] = true;
    }

    /// @dev The value the caller gave this account
    function _valueFor(address account) internal view returns (uint256) {
        return valueOf[msg.sender][account];
    }
}
