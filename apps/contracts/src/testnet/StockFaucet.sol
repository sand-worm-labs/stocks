// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {TestStock} from "./TestStock.sol";

/// @notice Hands out test stock tokens on a test network, so a strategy can be tried with something to buy and sell. It makes the tokens itself
/// and is the only thing that can mint them. It refuses to exist on Base mainnet (or Ethereum), where free tokens would mean nothing and
/// confuse people.
contract StockFaucet {
    event Claimed(address indexed account, uint256 at);
    event AmountChanged(uint256 amountPerToken);

    uint256 public constant COOLDOWN = 1 days;
    uint256 private constant ETHEREUM = 1;
    uint256 private constant BASE = 8453;

    address public immutable owner;
    TestStock[] public tokens;
    /// @notice What one claim gives of each token, in the token's smallest unit (8 decimals)
    uint256 public amountPerToken;
    mapping(address => uint256) public lastClaim;

    /// @param names_ and @param symbols_ one per token, in the same order, such as "Test NVIDIA" and "tNVDAc"
    constructor(string[] memory names_, string[] memory symbols_, uint256 amountPerToken_) {
        require(block.chainid != BASE && block.chainid != ETHEREUM, "Test networks only");
        require(names_.length == symbols_.length && names_.length > 0, "Give a name and symbol for each token");
        owner = msg.sender;
        amountPerToken = amountPerToken_;
        for (uint256 i = 0; i < names_.length; i++) {
            tokens.push(new TestStock(names_[i], symbols_[i]));
        }
    }

    function tokenCount() external view returns (uint256) {
        return tokens.length;
    }

    /// @notice When this account may claim again (now, if it can)
    function nextClaim(address account) public view returns (uint256) {
        uint256 last = lastClaim[account];
        // forge-lint: disable-next-line(block-timestamp)
        return last == 0 ? block.timestamp : _max(block.timestamp, last + COOLDOWN);
    }

    /// @notice Gives the caller an amount of every test stock, once a day
    function claim() external {
        // A day's cooldown is what the time is for here, and a validator nudging it by seconds changes nothing
        // forge-lint: disable-next-line(block-timestamp)
        require(block.timestamp >= lastClaim[msg.sender] + COOLDOWN || lastClaim[msg.sender] == 0, "Come back tomorrow");
        lastClaim[msg.sender] = block.timestamp;
        for (uint256 i = 0; i < tokens.length; i++) {
            tokens[i].mint(msg.sender, amountPerToken);
        }
        emit Claimed(msg.sender, block.timestamp);
    }

    function setAmountPerToken(uint256 amount) external {
        require(msg.sender == owner, "Owner only");
        amountPerToken = amount;
        emit AmountChanged(amount);
    }

    function _max(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a : b;
    }
}
