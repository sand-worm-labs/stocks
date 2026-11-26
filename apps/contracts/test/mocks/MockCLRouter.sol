// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ISlipstreamRouter} from "../../src/interfaces/ISlipstreamRouter.sol";
import {VaultMath} from "../../src/vault/VaultMath.sol";
import {MockCLPool} from "./MockCLPool.sol";
import {MockToken} from "./MockToken.sol";

/// @dev Fills a swap at its pool's price less a fee, and refuses one that brings in less than it was told to expect
contract MockCLRouter is ISlipstreamRouter {
    address public factory;
    /// @dev What the pool takes, in basis points, on top of the price; a test raises it to make a bad fill
    uint256 public takeBps = 30;
    mapping(address => mapping(address => MockCLPool)) public poolOf;

    constructor(address factory_) {
        factory = factory_;
    }

    function setPool(address a, address b, MockCLPool pool) external {
        poolOf[a][b] = pool;
        poolOf[b][a] = pool;
    }

    function setTakeBps(uint256 bps) external {
        takeBps = bps;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        MockCLPool pool = poolOf[params.tokenIn][params.tokenOut];
        uint160 root = pool.sqrtPriceX96();
        bool inIsToken0 = pool.token0() == params.tokenIn;

        // Token0 in gives token1 at price = (root / 2^96)^2, and the other way round
        uint256 gross = inIsToken0
            // forge-lint: disable-next-line(divide-before-multiply)
            ? (((params.amountIn * root) / VaultMath.Q96) * root) / VaultMath.Q96
            // forge-lint: disable-next-line(divide-before-multiply)
            : (((params.amountIn * VaultMath.Q96) / root) * VaultMath.Q96) / root;
        amountOut = (gross * (10_000 - takeBps)) / 10_000;
        require(amountOut >= params.amountOutMinimum, "Too little received");

        // The input goes to the pool; the output is made for the recipient, as the mock has no real reserves to pay from
        require(MockToken(params.tokenIn).transferFrom(msg.sender, address(pool), params.amountIn), "in failed");
        MockToken(params.tokenOut).mint(params.recipient, amountOut);
    }
}
