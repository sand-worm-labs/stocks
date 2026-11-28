// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Holdings} from "../pricing/Portfolio.sol";
import {Stock} from "../registry/StockTypes.sol";

/// @notice One swap an executor asked an account to make, with what the guard worked out about it, for a rule to judge
struct SwapCheck {
    address account;
    Stock stock;
    bool isBuy;
    uint256 amountIn;
    uint256 minOut;
    // What the swap is worth at the pool's trusted price, in the other token: the most it should bring back
    uint256 expectedOut;
    // How much USDC the stock's pool holds. Only worked out for a buy; zero for a sell.
    uint256 poolDepth;
}

/// @notice A rule, as a module. One contract is one kind of rule: it keeps a value for each account it is attached to, and judges what an executor is
/// about to do (a swap) or has done (the portfolio) against that value, reverting to refuse. A vault has a rule onchain exactly when its module is
/// attached to it. A module can only refuse: it moves nothing and holds nothing.
interface IRulePlugin {
    /// @notice The kind of rule this is, one of `RuleIds` or an id of its own
    function kind() external view returns (bytes32);

    /// @notice Whether it is attached with a value of its own when a vault's rules do not give one, and that value. For the rules that keep a vault safe
    /// whether or not it was asked to: a slippage and the size of a trade.
    function defaultValue() external view returns (bool isOnByDefault, uint256 value);

    /// @notice Attaches the rule to an account with its value (and anything else it needs). Only the guard may call it.
    function configure(address account, uint256 value, bytes calldata data) external;

    /// @notice Takes the rule off an account. Only the guard may call it.
    function clear(address account) external;

    /// @notice Judges a swap before it is made. Reverts to refuse it.
    function checkSwap(SwapCheck calldata swap) external view;

    /// @notice Judges what the account holds after an executor has acted. Reverts to undo it all.
    function checkPortfolio(address account, Holdings calldata holdings) external view;
}
