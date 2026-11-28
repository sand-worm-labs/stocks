// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The ids of the rules the suite knows, which are the app's rule types (apps/api/src/features/strategies/rules/spec.ts) and one more. A rule's
/// kind is an id and not a fixed list, so anyone can add a kind of rule: a module says which ids it enforces (IRuleEnforcer), and a vault may use any
/// id that one of its modules enforces, or that is kept off-chain. The core never changes for a new kind.
library RuleIds {
    /// @dev Most USDC the strategy invests (value in USDC, 6 decimals)
    bytes32 internal constant BUDGET = keccak256("budget");
    /// @dev Most one stock may be of the strategy's value (basis points)
    bytes32 internal constant MAX_WEIGHT = keccak256("max-weight");
    /// @dev Least USDC a stock's pool must hold to be traded in (USDC)
    bytes32 internal constant MIN_LIQUIDITY = keccak256("min-liquidity");
    /// @dev How far below the price a trade may land (basis points)
    bytes32 internal constant SLIPPAGE = keccak256("slippage");
    /// @dev Most one buy may be of its pool's depth (basis points)
    bytes32 internal constant MAX_TRADE_OF_DEPTH = keccak256("max-trade-of-depth");
    /// @dev Wait for the owner's OK before buying or selling
    bytes32 internal constant APPROVAL = keccak256("approval");
    /// @dev Sell a stock that has fallen this far below what was paid for it (basis points)
    bytes32 internal constant STOP_LOSS = keccak256("stop-loss");
    /// @dev Sell a stock that has risen this far above what was paid for it (basis points)
    bytes32 internal constant TAKE_PROFIT = keccak256("take-profit");
    /// @dev Sell everything when the strategy has fallen this far from its high (basis points); `data` is the pause in seconds, abi-encoded
    bytes32 internal constant PORTFOLIO_STOP = keccak256("portfolio-stop");
}
