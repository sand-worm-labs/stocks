// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ICondition} from "../../src/blocks/interfaces/ICondition.sol";
import {Channels} from "../../src/blocks/Channels.sol";
import {ComparisonCondition} from "../../src/blocks/conditions/ComparisonCondition.sol";
import {ValueCondition} from "../../src/blocks/conditions/ValueCondition.sol";
import {FilterBlock} from "../../src/blocks/logic/FilterBlock.sol";
import {Indicator, Op, Pick, Weighting} from "../../src/blocks/types/Enums.sol";

/// @notice The blocks as the app means them, an indicator of a stock over a window, made from the channels the blocks really read
library BlockBuilders {
    /// @dev Out of some stocks, the best `count` by an indicator. When they are weighted (`Proportional` or `Inverse`), it is by the volatility over
    /// `weightWindow`.
    function filter(
        address[] memory stocks,
        Pick pick,
        uint8 count,
        Indicator by,
        uint16 window,
        Weighting weighting,
        uint16 weightWindow
    ) internal returns (FilterBlock) {
        bytes32[] memory scores = new bytes32[](stocks.length);
        bytes32[] memory weights = new bytes32[](weighting == Weighting.Equal ? 0 : stocks.length);
        for (uint256 i = 0; i < stocks.length; i++) {
            scores[i] = Channels.indicator(by, window, stocks[i]);
            if (weighting != Weighting.Equal) {
                weights[i] = Channels.indicator(Indicator.Volatility, weightWindow, stocks[i]);
            }
        }
        return new FilterBlock(stocks, scores, pick, count, weighting, weights);
    }

    /// @dev An indicator of a stock against a number: "RSI of this stock is above 70"
    function compare(Indicator kind, uint16 window, address stock, Op op, int256 value) internal returns (ICondition) {
        return new ValueCondition(Channels.indicator(kind, window, stock), op, value);
    }

    /// @dev An indicator of one stock against an indicator of another, or the same: "price is above its 200-day average"
    function compareReadings(
        Indicator leftKind,
        uint16 leftWindow,
        address left,
        Op op,
        Indicator rightKind,
        uint16 rightWindow,
        address right
    ) internal returns (ICondition) {
        return new ComparisonCondition(
            Channels.indicator(leftKind, leftWindow, left), op, Channels.indicator(rightKind, rightWindow, right)
        );
    }
}
