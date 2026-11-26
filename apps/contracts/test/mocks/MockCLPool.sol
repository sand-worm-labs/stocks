// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @dev A Slipstream pool with a price the test sets. Its balances are real token balances, so its depth is whatever the test minted to it.
contract MockCLPool {
    address public token0;
    address public token1;
    address public factory;
    int24 public tickSpacing = 10;

    uint160 public sqrtPriceX96;
    int24 public tick;
    int24 public twapTick;
    bool public historyTooShort;

    constructor(address token0_, address token1_, address factory_) {
        token0 = token0_;
        token1 = token1_;
        factory = factory_;
    }

    function setPrice(uint160 sqrtPriceX96_, int24 tick_) external {
        sqrtPriceX96 = sqrtPriceX96_;
        tick = tick_;
        twapTick = tick_;
    }

    /// @dev Makes the pool's recent average differ from its price now, as it does after a sudden move
    function setTwapTick(int24 twapTick_) external {
        twapTick = twapTick_;
    }

    function setHistoryTooShort(bool value) external {
        historyTooShort = value;
    }

    function setTickSpacing(int24 spacing) external {
        tickSpacing = spacing;
    }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, bool) {
        return (sqrtPriceX96, tick, 0, 100, 100, true);
    }

    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory cumulatives, uint160[] memory perLiquidity)
    {
        require(!historyTooShort, "OLD");
        cumulatives = new int56[](2);
        perLiquidity = new uint160[](2);
        uint256 window = secondsAgos[0] - secondsAgos[1];
        cumulatives[0] = 0;
        // forge-lint: disable-next-line(unsafe-typecast)
        cumulatives[1] = int56(twapTick) * int56(uint56(window));
    }
}
