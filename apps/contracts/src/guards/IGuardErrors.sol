// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The errors a guard raises, and the rule modules attached to it. One list, so the same refusal looks the same whoever makes it.
interface IGuardErrors {
    error NotInstalled(address account);
    error AlreadyInstalled(address account);
    error NeedsAStock();
    // A guard or a rule module set up wrongly
    error NoOwner();
    error StockCountOutOfRange(uint256 count, uint256 most);
    error TooManyRules(uint256 count, uint256 most);
    error ValueForEachRule();
    error MaxWeightOutOfRange(uint256 weightBps);
    error SlippageOverCeiling(uint256 slippageBps, uint256 ceiling);
    error TradeSizeOverCeiling(uint256 tradeBps, uint256 ceiling);
    error PortfolioRuleNotAboutAStock();
    error NotTheFunctionTheRuleNames(bytes32 given, bytes32 expected);
    error LimitTooLarge(uint256 limit);
    // What an executor may not ask an account to do
    error NotAnExecution();
    error NotARevertingBatch();
    error NoNativeValue();
    error NotAnApprovalOrSwap();
    error ApprovalNotAllowed();
    error SwapPaidToSomeoneElse();
    error SwapNotAgainstUsdc();
    error StockNotTradable(address token);
    error WrongRouterOrPool(address token);
    error PoolTooShallow(address stock, uint256 depth, uint256 least);
    error TradeTooLarge(address stock, uint256 amount, uint256 most);
    error SlippageTooLoose(address stock, uint256 minOut, uint256 floor);
    error OverWeight(address stock, uint256 weightBps, uint256 most);
    error AllowanceLeft(address token, address spender);
    /// @dev An off-chain rule has no result yet, or its result is too old, so it refuses (it never lets a trade through on a number that is not there)
    error NoOffChainResult(bytes32 functionHash, bytes32 channel);
    error OffChainRuleRefuses(bytes32 functionHash, int256 result, int256 limit);
}
