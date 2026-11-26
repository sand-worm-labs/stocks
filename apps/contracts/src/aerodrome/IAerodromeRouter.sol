// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The part of Aerodrome's router these contracts use. Copied from aerodrome-finance/contracts (`interfaces/IRouter.sol`); the struct
/// and the function must match the deployed router exactly, so check them against the router on the chain before deploying.
interface IAerodromeRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}
