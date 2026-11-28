// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Holdings} from "../../pricing/Portfolio.sol";
import {IRulePlugin} from "../IRulePlugin.sol";
import {RulePluginBase} from "./RulePluginBase.sol";

/// @notice A rule made of other rules. Attached with `abi.encode(address[] children, uint256[] values, bytes[] extra)`, it attaches each child to the
/// account with its own value, and judges through them in the way its kind says. A child may itself be a composite, so rules chain to any depth.
/// @dev Safe because a rule module keeps a value for each caller (see RulePluginBase): the children are attached by this composite, under its own
/// address, so nothing it does can change what the guard or any other caller gave them.
abstract contract CompositeRule is RulePluginBase {
    uint256 public constant MOST_CHILDREN = 8;

    bytes32 public immutable kindId;
    mapping(address caller => mapping(address account => address[])) internal children;

    error ChainTooWide();
    error EachChildNeedsAValue();

    constructor(bytes32 kindId_) {
        kindId = kindId_;
    }

    function kind() external view returns (bytes32) {
        return kindId;
    }

    function configure(address account, uint256, bytes calldata data) external virtual override {
        (address[] memory list, uint256[] memory values, bytes[] memory extra) =
            abi.decode(data, (address[], uint256[], bytes[]));
        if (list.length == 0 || list.length > MOST_CHILDREN) revert ChainTooWide();
        if (list.length != values.length || list.length != extra.length) revert EachChildNeedsAValue();

        // Anything attached before is taken off first, so attaching twice does not stack children
        _clearChildren(account);
        for (uint256 i = 0; i < list.length; i++) {
            children[msg.sender][account].push(list[i]);
            IRulePlugin(list[i]).configure(account, values[i], extra[i]);
        }
        _attach(account, 0);
    }

    function clear(address account) external virtual override {
        _clearChildren(account);
        delete valueOf[msg.sender][account];
        delete isAttached[msg.sender][account];
    }

    function childrenOf(address caller, address account) external view returns (address[] memory) {
        return children[caller][account];
    }

    function _clearChildren(address account) private {
        address[] storage list = children[msg.sender][account];
        for (uint256 i = 0; i < list.length; i++) {
            IRulePlugin(list[i]).clear(account);
        }
        delete children[msg.sender][account];
    }
}
