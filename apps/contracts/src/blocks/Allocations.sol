// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {AllValuesZero, ValueBelowZero, VolatilityNotAboveZero} from "./BlockErrors.sol";
import {Allocation} from "./types/Allocation.sol";
import {IBlock} from "./interfaces/IBlock.sol";
import {IReadings} from "./interfaces/IReadings.sol";
import {Weighting} from "./types/Enums.sol";
import {Bps} from "../libraries/Bps.sol";
import {SafeCast} from "../libraries/SafeCast.sol";

library Allocations {
    /// @notice A list of allocations, each cut to `shareBps` of what it was
    function scale(Allocation[] memory list, uint256 shareBps) internal pure returns (Allocation[] memory out) {
        out = new Allocation[](list.length);
        for (uint256 i = 0; i < list.length; i++) {
            out[i] = Allocation(list[i].stock, SafeCast.toUint16(Bps.portion(list[i].weightBps, shareBps)));
        }
    }

    /// @notice Lists put into one: a stock that is in more than one has its shares added
    function merge(Allocation[][] memory parts) internal pure returns (Allocation[] memory out) {
        uint256 size;
        for (uint256 p = 0; p < parts.length; p++) {
            size += parts[p].length;
        }
        Allocation[] memory seen = new Allocation[](size);
        uint256 count;
        for (uint256 p = 0; p < parts.length; p++) {
            for (uint256 i = 0; i < parts[p].length; i++) {
                Allocation memory item = parts[p][i];
                uint256 at = indexOf(seen, count, item.stock);
                if (at == type(uint256).max) {
                    seen[count++] = item;
                } else {
                    seen[at].weightBps += item.weightBps;
                }
            }
        }
        out = new Allocation[](count);
        for (uint256 i = 0; i < count; i++) {
            out[i] = seen[i];
        }
    }

    function total(Allocation[] memory list) internal pure returns (uint256 sum) {
        for (uint256 i = 0; i < list.length; i++) {
            sum += list[i].weightBps;
        }
    }

    function weightOf(Allocation[] memory list, address stock) internal pure returns (uint256) {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].stock == stock) return list[i].weightBps;
        }
        return 0;
    }

    /// @notice How far apart two lists are for the stock they differ most on, in basis points
    function maxDrift(Allocation[] memory a, Allocation[] memory b) internal pure returns (uint256 most) {
        for (uint256 i = 0; i < a.length; i++) {
            most = _max(most, _distance(a[i].weightBps, weightOf(b, a[i].stock)));
        }
        for (uint256 i = 0; i < b.length; i++) {
            most = _max(most, _distance(b[i].weightBps, weightOf(a, b[i].stock)));
        }
    }

    /// @notice `n` equal shares of 10,000 that add up to all of it: the first few get one basis point more when it does not divide
    function equalShares(uint256 n) internal pure returns (uint16[] memory shares) {
        shares = new uint16[](n);
        uint256 base = Bps.DENOMINATOR / n;
        uint256 extra = Bps.DENOMINATOR - base * n;
        for (uint256 i = 0; i < n; i++) {
            shares[i] = SafeCast.toUint16(base + (i < extra ? 1 : 0));
        }
    }

    /// @notice Shares of 10,000 in proportion to 1 over each volatility: the steadier gets more. A volatility must be above zero.
    function inverseShares(int256[] memory volatilities) internal pure returns (uint16[] memory shares) {
        uint256 n = volatilities.length;
        uint256[] memory inverse = new uint256[](n);
        uint256 sum;
        for (uint256 i = 0; i < n; i++) {
            if (volatilities[i] <= 0) revert VolatilityNotAboveZero();
            inverse[i] = 1e30 / uint256(volatilities[i]);
            sum += inverse[i];
        }
        shares = new uint16[](n);
        for (uint256 i = 0; i < n; i++) {
            shares[i] = SafeCast.toUint16(Bps.shareOf(inverse[i], sum));
        }
    }

    /// @notice Shares of 10,000 in proportion to each value: the bigger gets more. A value must not be negative, and they must not all be zero.
    function proportionalShares(int256[] memory values) internal pure returns (uint16[] memory shares) {
        uint256 sum;
        for (uint256 i = 0; i < values.length; i++) {
            if (values[i] < 0) revert ValueBelowZero();
            sum += SafeCast.abs(values[i]);
        }
        if (sum == 0) revert AllValuesZero();

        shares = new uint16[](values.length);
        for (uint256 i = 0; i < values.length; i++) {
            shares[i] = SafeCast.toUint16(Bps.shareOf(SafeCast.abs(values[i]), sum));
        }
    }

    /// @notice Shares of 10,000 by a way of weighting and a value for each. `Equal` looks only at how many values there are.
    function sharesFor(Weighting weighting, int256[] memory values) internal pure returns (uint16[] memory) {
        if (weighting == Weighting.Proportional) return proportionalShares(values);
        if (weighting == Weighting.Inverse) return inverseShares(values);
        return equalShares(values.length);
    }

    /// @notice What the children hold, each at its share, put into one list
    function combine(IReadings readings, IBlock[] memory children, uint16[] memory shares)
        internal
        view
        returns (Allocation[] memory)
    {
        Allocation[][] memory parts = new Allocation[][](children.length);
        for (uint256 i = 0; i < children.length; i++) {
            parts[i] = scale(children[i].evaluate(readings), shares[i]);
        }
        return merge(parts);
    }

    function indexOf(Allocation[] memory list, uint256 length, address stock) private pure returns (uint256) {
        for (uint256 i = 0; i < length; i++) {
            if (list[i].stock == stock) return i;
        }
        return type(uint256).max;
    }

    function _max(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a : b;
    }

    function _distance(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
}
