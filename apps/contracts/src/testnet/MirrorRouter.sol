// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ISlipstreamRouter} from "../interfaces/ISlipstreamRouter.sol";
import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {VaultMath} from "../vault/VaultMath.sol";
import {MirrorPool} from "./MirrorPool.sol";
import {MirrorPoolFactory} from "./MirrorPoolFactory.sol";

/// @notice Swaps in the test-network copies of mainnet pools, shaped like Slipstream's `SwapRouter.exactInputSingle`. A swap is priced as it would be
/// in the mainnet pool, inside its current price range: the depth the relayer mirrored decides how far a trade moves the price (thin pools slip
/// more), the pool's fee is kept, and what it pays out comes from the copy's real reserves, so a trade bigger than the reserves fails.
/// @dev The copy's price is the mainnet pool's, not this pool's own: a swap here does not move it, so trades on the test network never drift from
/// the market they imitate. Price ranges beyond the current one are not modelled.
contract MirrorRouter is ISlipstreamRouter {
    error NoPool();
    error TooLate();
    error TooLittleReceived(uint256 got, uint256 wanted);
    error PriceLimit();
    error TransferFailed();

    MirrorPoolFactory public immutable mirrorFactory;

    constructor(MirrorPoolFactory factory_) {
        mirrorFactory = factory_;
    }

    function factory() external view returns (address) {
        return address(mirrorFactory);
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        // forge-lint: disable-next-line(block-timestamp)
        if (params.deadline != 0 && block.timestamp > params.deadline) revert TooLate();
        MirrorPool pool = MirrorPool(mirrorFactory.getPool(params.tokenIn, params.tokenOut, params.tickSpacing));
        if (address(pool) == address(0)) revert NoPool();

        bool isToken0In = pool.token0() == params.tokenIn;
        uint256 afterFee = (params.amountIn * (10_000 - pool.feeBps())) / 10_000;
        uint256 depth = pool.liquidity();
        (uint160 root,,,,,) = pool.slot0();

        (uint256 out, uint256 newRoot) = isToken0In ? _token0In(afterFee, root, depth) : _token1In(afterFee, root, depth);
        if (params.sqrtPriceLimitX96 != 0 && _pastLimit(isToken0In, newRoot, params.sqrtPriceLimitX96)) revert PriceLimit();
        if (out < params.amountOutMinimum) revert TooLittleReceived(out, params.amountOutMinimum);

        if (!IERC20Minimal(params.tokenIn).transferFrom(msg.sender, address(pool), params.amountIn)) revert TransferFailed();
        pool.pay(params.tokenOut, params.recipient, out);
        return out;
    }

    /// @dev Token0 in pushes the price down: the new root is L * root / (L + in * root), and token1 out is L * (root - new root)
    function _token0In(uint256 amountIn, uint160 root, uint256 depth) private pure returns (uint256 out, uint256 newRoot) {
        newRoot = (depth * root) / (depth + (amountIn * root) / VaultMath.Q96);
        out = (depth * (root - newRoot)) / VaultMath.Q96;
    }

    /// @dev Token1 in pushes the price up: the new root is root + in / L, and token0 out is in / (root * new root)
    function _token1In(uint256 amountIn, uint160 root, uint256 depth) private pure returns (uint256 out, uint256 newRoot) {
        newRoot = root + (amountIn * VaultMath.Q96) / depth;
        out = (((amountIn * VaultMath.Q96) / root) * VaultMath.Q96) / newRoot;
    }

    function _pastLimit(bool isToken0In, uint256 newRoot, uint160 limit) private pure returns (bool) {
        return isToken0In ? newRoot < limit : newRoot > limit;
    }
}
