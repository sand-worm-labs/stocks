// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The part of Aerodrome Slipstream's SwapRouter the vault uses. Copied from aerodrome-finance/slipstream
/// (`periphery/interfaces/ISwapRouter.sol`). Each Slipstream deployment has its own router and pool factory; a router only trades pools of its own
/// factory, which is why `factory()` is read and checked against the pool's.
interface ISlipstreamRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        int24 tickSpacing;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function factory() external view returns (address);

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
