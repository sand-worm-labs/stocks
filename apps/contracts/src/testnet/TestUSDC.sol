// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice A stand-in for USDC on a test network, with USDC's 6 decimals. Only its owner mints it: the mirror pools are seeded from it, and a test
/// account is given some, so a strategy has something to buy stocks with.
contract TestUSDC {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    error OwnerOnly();
    error AllowanceTooLow();
    error BalanceTooLow();

    string public constant name = "Test USDC";
    string public constant symbol = "tUSDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    address public immutable owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) revert OwnerOnly();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert AllowanceTooLow();
            allowance[from][msg.sender] = allowed - amount;
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) private {
        if (balanceOf[from] < amount) revert BalanceTooLow();
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
