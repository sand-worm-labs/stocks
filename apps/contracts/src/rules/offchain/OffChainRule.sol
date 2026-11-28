// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Op} from "../../blocks/types/Enums.sol";
import {Compare} from "../../blocks/Compare.sol";
import {IReadings} from "../../blocks/interfaces/IReadings.sol";
import {IGuardErrors} from "../../guards/IGuardErrors.sol";
import {Holdings} from "../../pricing/Portfolio.sol";
import {SwapCheck} from "../IRulePlugin.sol";
import {RulePluginBase} from "../modules/RulePluginBase.sol";

/// @notice What an off-chain rule judges
enum Applies {
    Buys,
    Sells,
    Portfolio
}

/// @notice Who an off-chain result is about, which is what decides how many numbers the app has to post: one for the whole market, one for a stock, one
/// for a vault, or one for a vault's stock
enum About {
    Market,
    Stock,
    Account,
    AccountAndStock
}

/// @notice The definition of an off-chain function
struct OffChainFunction {
    string name;
    // The whole text of what the app computes: inputs, formula, unit. It is the function, and its hash is what the chain commits to.
    string spec;
    // How a result is held against the vault's limit: "result <= limit", "result >= limit"
    Op op;
    Applies applies;
    About about;
}

/// @title OffChainRule
/// @notice A rule whose number is worked out off-chain, where the data is, and still refused onchain. One contract is one function: it holds the function's
/// full text (`spec`) and the hash of it (`functionHash`). The app computes the function and posts the result to the signal board, to a channel that is
/// derived from the hash; this rule reads that channel and holds the result against the vault's limit with the function's comparison. It reads both
/// ways: the app reads the vault's rules from the chain, and the chain reads the app's results back from the board.
/// @dev What the chain can know is that **a number for this function's channel was posted by the board's publisher, in time, within the board's limits, and
/// that it passes the vault's limit**. It cannot know the number is right: that is the publisher's honesty, which is why the hash exists. Anyone can take
/// `spec`, recompute the result, and compare it with what was posted (the board's `evidence` field carries the data's own hash). A rule that has no
/// result, or only a stale one, refuses: it fails closed.
contract OffChainRule is RulePluginBase {
    bytes32 public immutable functionHash;
    bytes32 public immutable kindId;
    IReadings public immutable readings;
    Op public immutable op;
    Applies public immutable applies;
    About public immutable about;
    string public name;
    string public spec;

    constructor(OffChainFunction memory function_, IReadings readings_) {
        // A portfolio is judged for one account, never for a stock
        if (function_.applies == Applies.Portfolio && function_.about == About.AccountAndStock) {
            revert IGuardErrors.PortfolioRuleNotAboutAStock();
        }
        functionHash = keccak256(bytes(function_.spec));
        kindId = keccak256(abi.encode("offchain-rule", functionHash));
        readings = readings_;
        op = function_.op;
        applies = function_.applies;
        about = function_.about;
        name = function_.name;
        spec = function_.spec;
    }

    function kind() external view returns (bytes32) {
        return kindId;
    }

    /// @param value The limit the vault holds the result against, in the function's own unit
    /// @param data Empty, or the hash of the function the vault's rule names. A vault whose rules record a hash can pass it here, and a module that is
    /// not that function refuses to be attached.
    function configure(address account, uint256 value, bytes calldata data) external override {
        if (data.length != 0) {
            bytes32 named = abi.decode(data, (bytes32));
            if (named != functionHash) revert IGuardErrors.NotTheFunctionTheRuleNames(named, functionHash);
        }
        if (value > uint256(type(int256).max)) revert IGuardErrors.LimitTooLarge(value);
        _attach(account, value);
    }

    /// @notice Where the app posts this function's result: the same on the chain and in the app
    function channelFor(address account, address stock) public view returns (bytes32) {
        if (about == About.Market) return functionHash;
        if (about == About.Stock) return keccak256(abi.encode(functionHash, stock));
        if (about == About.Account) return keccak256(abi.encode(functionHash, account));
        return keccak256(abi.encode(functionHash, account, stock));
    }

    function checkSwap(SwapCheck calldata swap) external view override {
        if (applies == Applies.Portfolio) return;
        bool isForThisSide = (applies == Applies.Buys) == swap.isBuy;
        if (!isForThisSide) return;
        _judge(msg.sender, swap.account, swap.stock.token);
    }

    function checkPortfolio(address account, Holdings calldata) external view override {
        if (applies != Applies.Portfolio) return;
        _judge(msg.sender, account, address(0));
    }

    /// @notice What a reader needs to recompute the rule: its name, the text of the function, and the hash that stands for it
    function describe()
        external
        view
        returns (
            string memory name_,
            string memory spec_,
            bytes32 functionHash_,
            Op op_,
            Applies applies_,
            About about_
        )
    {
        return (name, spec, functionHash, op, applies, about);
    }

    function _judge(address caller, address account, address stock) private view {
        bytes32 channel = channelFor(account, stock);
        (bool isSet, int256 result) = readings.tryRead(channel);
        if (!isSet) revert IGuardErrors.NoOffChainResult(functionHash, channel);

        // Fits: `configure` refused a limit above the largest signed number
        // forge-lint: disable-next-line(unsafe-typecast)
        int256 limit = int256(valueOf[caller][account]);
        if (!Compare.holds(result, op, limit)) revert IGuardErrors.OffChainRuleRefuses(functionHash, result, limit);
    }
}
