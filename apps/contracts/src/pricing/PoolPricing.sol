// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Stock} from "../registry/StockTypes.sol";
import {ICLPool} from "../interfaces/ICLPool.sol";
import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {VaultMath} from "../vault/VaultMath.sol";

/// @notice What a stock is worth, from its Slipstream pool, and only when the pool's price can be trusted: the price now has to be close to the
/// pool's own average over the last half hour. A trade that moves the price a long way inside one transaction, to make a rule pass, is refused.
/// @dev The same check the vault makes (`StrategyVault._price`), here for every module that needs a price.
library PoolPricing {
    uint32 internal constant TWAP_WINDOW = 30 minutes;
    /// @dev About 2%: how far the price may be from its recent average before it is not trusted
    uint256 internal constant MAX_TICK_GAP = 200;

    error PriceOutOfLine(address stock);

    function trustedPrice(Stock memory stock) internal view returns (uint160 sqrtPriceX96) {
        int24 tick;
        (sqrtPriceX96, tick,,,,) = ICLPool(stock.pool).slot0();

        uint32[] memory ago = new uint32[](2);
        ago[0] = TWAP_WINDOW;
        ago[1] = 0;
        (int56[] memory cumulatives,) = ICLPool(stock.pool).observe(ago);

        int24 average = VaultMath.averageTick(cumulatives[0], cumulatives[1], TWAP_WINDOW);
        if (VaultMath.distance(tick, average) > MAX_TICK_GAP) revert PriceOutOfLine(stock.token);
    }

    /// @notice What an amount of the stock is worth in USDC at the pool's trusted price
    function valueOf(Stock memory stock, uint256 amount) internal view returns (uint256) {
        if (amount == 0) return 0;
        return VaultMath.usdcValue(amount, trustedPrice(stock), stock.usdcIsToken0);
    }

    /// @notice How much USDC the pool holds, both sides counted: the stock side at the pool's price
    function depthOf(address usdc, Stock memory stock, uint160 sqrtPrice) internal view returns (uint256) {
        uint256 usdcSide = IERC20Minimal(usdc).balanceOf(stock.pool);
        uint256 stockSide = IERC20Minimal(stock.token).balanceOf(stock.pool);
        return usdcSide + VaultMath.usdcValue(stockSide, sqrtPrice, stock.usdcIsToken0);
    }
}
