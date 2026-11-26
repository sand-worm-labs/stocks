// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";

/// @notice ERC-20 calls that revert when the token says no, including the tokens that answer with nothing (USDT-style)
library SafeToken {
    error TokenCallFailed(address token);

    function safeTransferFrom(IERC20Minimal token, address from, address to, uint256 amount) internal {
        _call(address(token), abi.encodeCall(IERC20Minimal.transferFrom, (from, to, amount)));
    }

    function safeTransfer(IERC20Minimal token, address to, uint256 amount) internal {
        _call(address(token), abi.encodeCall(IERC20Minimal.transfer, (to, amount)));
    }

    function safeApprove(IERC20Minimal token, address spender, uint256 amount) internal {
        _call(address(token), abi.encodeCall(IERC20Minimal.approve, (spender, amount)));
    }

    function _call(address token, bytes memory data) private {
        (bool ok, bytes memory answer) = token.call(data);
        if (!ok || (answer.length != 0 && !abi.decode(answer, (bool)))) revert TokenCallFailed(token);
    }
}
