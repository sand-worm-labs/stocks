// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IAerodromeRouter} from "../../src/aerodrome/IAerodromeRouter.sol";
import {MockToken} from "./MockToken.sol";

/// @dev Sells at a price the test sets, out of USDC it has been given, and refuses a sale that brings in less than it was told to expect
contract MockAerodromeRouter is IAerodromeRouter {
    /// @dev Quote base units out per stock base unit in, with 18 decimals of precision
    uint256 public rate;
    Route public lastRoute;

    function setRate(uint256 rate_) external {
        rate = rate_;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        lastRoute = routes[0];
        uint256 amountOut = (amountIn * rate) / 1e18;
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        require(MockToken(routes[0].from).transferFrom(msg.sender, address(this), amountIn), "TRANSFER_IN_FAILED");
        require(MockToken(routes[0].to).transfer(to, amountOut), "TRANSFER_OUT_FAILED");

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
    }
}
