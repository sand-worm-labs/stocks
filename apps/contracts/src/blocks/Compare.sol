// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Op} from "./types/Enums.sol";

library Compare {
    function holds(int256 left, Op op, int256 right) internal pure returns (bool) {
        if (op == Op.Greater) return left > right;
        if (op == Op.Less) return left < right;
        if (op == Op.GreaterOrEqual) return left >= right;
        if (op == Op.LessOrEqual) return left <= right;
        if (op == Op.Equal) return left == right;
        return left != right;
    }
}
