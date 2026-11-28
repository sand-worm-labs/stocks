// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {TestStock} from "./TestStock.sol";

/// @notice Makes test stocks on a test network and hands them out, so a strategy can be tried with something to buy and sell. It starts with none:
/// anyone can make a stock with a name of their own (`createStock`) or have one made at random (`createRandomStock`), and then claim it, once a day.
/// It is the only thing that can mint the tokens it makes. It refuses to exist on Base mainnet (or Ethereum), where free tokens would mean nothing
/// and confuse people.
contract StockFaucet {
    event StockCreated(address indexed token, address indexed creator, string name, string symbol);
    event Claimed(address indexed account, address indexed token, uint256 at);
    event AmountChanged(uint256 amountPerToken);

    uint256 public constant COOLDOWN = 1 days;
    /// @notice The most stocks the faucet will make, so a list of them stays something a wallet or an app can read
    uint256 public constant MOST_STOCKS = 200;
    uint256 private constant ETHEREUM = 1;
    uint256 private constant BASE = 8453;

    address public immutable owner;
    TestStock[] public tokens;
    /// @notice What one claim gives of a stock, in the token's smallest unit (8 decimals)
    uint256 public amountPerToken;
    mapping(address token => bool) public isStock;
    mapping(bytes32 symbolHash => address token) public stockBySymbol;
    /// @notice When an account last claimed a stock; each stock has its own cooldown for each account
    mapping(address account => mapping(address token => uint256)) public lastClaim;

    error TestNetworksOnly();
    error TooManyStocks();
    error BadName();
    error BadSymbol();
    error SymbolTaken(string symbol);
    error NotOurStock(address token);
    error ComeBackLater(uint256 at);
    error TryAgain();
    error OwnerOnly();

    constructor(uint256 amountPerToken_) {
        if (block.chainid == BASE || block.chainid == ETHEREUM) revert TestNetworksOnly();
        owner = msg.sender;
        amountPerToken = amountPerToken_;
    }

    // ------------------------------------------------------------------------------------------------------------------------ making stocks
    function tokenCount() external view returns (uint256) {
        return tokens.length;
    }

    /// @notice Makes a stock with a name and a symbol you choose, such as "Test Acme Foods" and "tACMEc". A "t" on the front and a "c" on the end
    /// follow the real tokens' naming (NVDAc) and say it is a test token, but nothing forces them: the symbol is yours. The maker gets the first claim.
    function createStock(string calldata name, string calldata symbol) external returns (TestStock) {
        return _create(name, symbol);
    }

    /// @notice Makes a stock with a name and a symbol made up here, such as "Test Nova Dynamics" and "tNODYc", so there is something to try without
    /// choosing. The maker gets the first claim. The randomness is the chain's own, which is fine for a test token and nothing else.
    function createRandomStock() external returns (TestStock) {
        // A made-up symbol may already be taken, so a few are tried
        for (uint256 attempt = 0; attempt < 8; attempt++) {
            (string memory name, string memory symbol) = _randomListing(attempt);
            if (stockBySymbol[keccak256(bytes(symbol))] == address(0)) return _create(name, symbol);
        }
        revert TryAgain();
    }

    function _create(string memory name, string memory symbol) private returns (TestStock token) {
        if (tokens.length >= MOST_STOCKS) revert TooManyStocks();
        if (bytes(name).length == 0 || bytes(name).length > 48) revert BadName();
        if (!_isSymbol(bytes(symbol))) revert BadSymbol();
        bytes32 symbolHash = keccak256(bytes(symbol));
        if (stockBySymbol[symbolHash] != address(0)) revert SymbolTaken(symbol);

        token = new TestStock(name, symbol);
        tokens.push(token);
        isStock[address(token)] = true;
        stockBySymbol[symbolHash] = address(token);
        emit StockCreated(address(token), msg.sender, name, symbol);

        _give(token, msg.sender);
    }

    // ------------------------------------------------------------------------------------------------------------------------ claiming
    /// @notice When an account may claim a stock again (now, if it can)
    function nextClaim(address account, address token) public view returns (uint256) {
        uint256 last = lastClaim[account][token];
        // forge-lint: disable-next-line(block-timestamp)
        return last == 0 ? block.timestamp : _max(block.timestamp, last + COOLDOWN);
    }

    /// @notice Gives the caller an amount of a stock, once a day for each stock
    function claim(TestStock token) public {
        if (!isStock[address(token)]) revert NotOurStock(address(token));
        uint256 at = nextClaim(msg.sender, address(token));
        // A day's cooldown is what the time is for here, and a validator nudging it by seconds changes nothing
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < at) revert ComeBackLater(at);
        _give(token, msg.sender);
    }

    /// @notice Claims several stocks in one go, each under its own cooldown
    function claimMany(TestStock[] calldata list) external {
        for (uint256 i = 0; i < list.length; i++) {
            claim(list[i]);
        }
    }

    function _give(TestStock token, address to) private {
        lastClaim[to][address(token)] = block.timestamp;
        token.mint(to, amountPerToken);
        emit Claimed(to, address(token), block.timestamp);
    }

    function setAmountPerToken(uint256 amount) external {
        if (msg.sender != owner) revert OwnerOnly();
        amountPerToken = amount;
        emit AmountChanged(amount);
    }

    // ------------------------------------------------------------------------------------------------------------------------ made-up names
    function _firstWords() private pure returns (string[16] memory words) {
        words = [
            "Nova",
            "Apex",
            "Orbit",
            "Quantum",
            "Vertex",
            "Helix",
            "Zenith",
            "Cobalt",
            "Ember",
            "Lumen",
            "Atlas",
            "Borealis",
            "Cinder",
            "Delta",
            "Echo",
            "Fable"
        ];
    }

    function _secondWords() private pure returns (string[16] memory words) {
        words = [
            "Dynamics",
            "Labs",
            "Robotics",
            "Foods",
            "Energy",
            "Biotech",
            "Systems",
            "Motors",
            "Networks",
            "Capital",
            "Aerospace",
            "Logistics",
            "Pharma",
            "Software",
            "Materials",
            "Media"
        ];
    }

    /// @dev A name from two words and a symbol from their first letters and a letter to tell it from another: "Test Nova Dynamics" and "tNODYc"
    function _randomListing(uint256 attempt) private view returns (string memory name, string memory symbol) {
        // forge-lint: disable-next-line(asm-keccak256)
        uint256 r =
            uint256(keccak256(abi.encode(block.prevrandao, block.timestamp, msg.sender, tokens.length, attempt)));
        string memory first = _firstWords()[r % 16];
        string memory second = _secondWords()[(r >> 8) % 16];
        name = string.concat("Test ", first, " ", second);

        bytes memory a = bytes(first);
        bytes memory b = bytes(second);
        bytes memory ticker = new bytes(4);
        ticker[0] = _upper(a[0]);
        ticker[1] = _upper(a[1]);
        ticker[2] = _upper(b[0]);
        // forge-lint: disable-next-line(unsafe-typecast)
        ticker[3] = bytes1(uint8(65 + ((r >> 16) % 26)));
        symbol = string.concat("t", string(ticker), "c");
    }

    function _upper(bytes1 letter) private pure returns (bytes1) {
        return letter >= 0x61 && letter <= 0x7a ? bytes1(uint8(letter) - 32) : letter;
    }

    /// @dev 3 to 12 letters and digits
    function _isSymbol(bytes memory symbol) private pure returns (bool) {
        if (symbol.length < 3 || symbol.length > 12) return false;
        for (uint256 i = 0; i < symbol.length; i++) {
            bytes1 c = symbol[i];
            bool isDigit = c >= 0x30 && c <= 0x39;
            bool isUpper = c >= 0x41 && c <= 0x5a;
            bool isLower = c >= 0x61 && c <= 0x7a;
            if (!isDigit && !isUpper && !isLower) return false;
        }
        return true;
    }

    function _max(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a : b;
    }
}
