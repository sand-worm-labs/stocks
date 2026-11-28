// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice The index's share token: a plain ERC-20 with 6 decimals, the same as USDC, so one share starts out as one dollar. Also holds the
/// reentrancy lock, since every function of the index that moves tokens needs it.
abstract contract IndexShares {
    string public name;
    string public symbol;
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bool private locked;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    error NotEnoughShares();
    error NotAllowed();
    error Reentered();

    modifier nonReentrant() {
        if (locked) revert Reentered();
        locked = true;
        _;
        locked = false;
    }

    /// @dev Called once, when the index is set up
    function _setNameAndSymbol(string memory name_, string memory symbol_) internal {
        name = name_;
        symbol = symbol_;
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
            if (allowed < amount) revert NotAllowed();
            allowance[from][msg.sender] = allowed - amount;
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal {
        if (balanceOf[from] < amount) revert NotEnoughShares();
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        if (balanceOf[from] < amount) revert NotEnoughShares();
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}
