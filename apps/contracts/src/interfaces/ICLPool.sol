// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The part of an Aerodrome Slipstream (concentrated-liquidity) pool the vault reads. Copied from aerodrome-finance/slipstream
/// (`core/interfaces/pool/`); the shapes must match the deployed pools exactly.
interface ICLPool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function factory() external view returns (address);
    function tickSpacing() external view returns (int24);

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            bool unlocked
        );

    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}
