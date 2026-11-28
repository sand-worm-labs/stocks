// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {MirrorBook} from "./MirrorBook.sol";
import {MirrorPoolFactory} from "./MirrorPoolFactory.sol";
import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";

/// @notice A test-network copy of one Base mainnet pool. It answers like an Aerodrome Slipstream pool (`slot0`, `observe`, `token0`, `token1`,
/// `factory`, `tickSpacing`), so the vault and the rule modules read it unchanged, but its price and depth are the mainnet pool's, as the relayer last
/// wrote them to the `MirrorBook`. Its reserves are real test tokens (the vault reads them as depth), and only the factory's router takes them out.
/// @dev `token0` and `token1` are in the mainnet pool's order, not address order, so a mirrored `sqrtPriceX96` keeps its meaning. The average price
/// `observe` gives is the mirrored price itself: a testnet pool has no history of its own, so the vault's check against a sudden move cannot fire here.
contract MirrorPool {
    error NoPriceYet();
    error RouterOnly();
    error TransferFailed();

    MirrorBook public immutable book;
    MirrorPoolFactory public immutable factory;
    /// @notice The mainnet pool this one copies, and the key its state is kept under in the book
    address public immutable mainnetPool;
    address public immutable token0;
    address public immutable token1;
    int24 public immutable tickSpacing;
    /// @notice What the pool keeps of each swap, in basis points; it stays in the reserves
    uint16 public immutable feeBps;

    constructor(
        MirrorBook book_,
        address mainnetPool_,
        address token0_,
        address token1_,
        int24 tickSpacing_,
        uint16 feeBps_
    ) {
        book = book_;
        factory = MirrorPoolFactory(msg.sender);
        mainnetPool = mainnetPool_;
        token0 = token0_;
        token1 = token1_;
        tickSpacing = tickSpacing_;
        feeBps = feeBps_;
    }

    function slot0() public view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, bool) {
        (sqrtPriceX96, tick,,) = book.pool(mainnetPool);
        if (sqrtPriceX96 == 0) revert NoPriceYet();
        return (sqrtPriceX96, tick, 0, 100, 100, true);
    }

    /// @notice The mainnet pool's depth in range, as the relayer last wrote it
    function liquidity() external view returns (uint128 depth) {
        (,,, depth) = book.pool(mainnetPool);
    }

    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s)
    {
        (, int24 tick,,,,) = slot0();
        tickCumulatives = new int56[](secondsAgos.length);
        secondsPerLiquidityCumulativeX128s = new uint160[](secondsAgos.length);

        // A running total that grows by `tick` every second, ending now at the last reading's total: every average over any window is `tick`
        for (uint256 i; i < secondsAgos.length; ++i) {
            // forge-lint: disable-next-line(unsafe-typecast)
            tickCumulatives[i] = int56(tick) * (int56(uint56(block.timestamp)) - int56(uint56(secondsAgos[i])));
        }
    }

    /// @notice Pays a swap's output out of the reserves. Only the factory's router calls it.
    function pay(address token, address to, uint256 amount) external {
        if (msg.sender != factory.router()) revert RouterOnly();
        if (!IERC20Minimal(token).transfer(to, amount)) revert TransferFailed();
    }
}
