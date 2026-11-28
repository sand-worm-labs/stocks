// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Op} from "../../blocks/types/Enums.sol";
import {About, Applies, OffChainFunction} from "./OffChainRule.sol";

/// @notice Ten rules that only make sense off-chain, because the data they need (a sector, an earnings date, a market's hours, a correlation) is not on a
/// chain. Each is a name, the **full text of the function** the app computes, and how its result is held against a vault's limit. The hash of the text is
/// what an `OffChainRule` commits to, so a vault can be shown to run exactly this function and nothing else; change one word and the hash, the rule's kind
/// and the channel the result is posted to all change.
/// @dev Units: `bps` is basis points (10,000 = 100%), `1e6` is a fixed-point number with six decimals, `flag` is 1 or 0. The app's copy of each text is in
/// docs/offchain-rules.md; the contract is the source and the doc is generated from it (script/PrintOffChainFunctions.s.sol).
library OffChainFunctions {
    uint256 internal constant COUNT = 10;

    function all() internal pure returns (OffChainFunction[] memory list) {
        list = new OffChainFunction[](COUNT);
        list[0] = sectorCap();
        list[1] = earningsBlackout();
        list[2] = marketOpen();
        list[3] = portfolioBeta();
        list[4] = volatilityRegime();
        list[5] = correlationCap();
        list[6] = realDrawdown();
        list[7] = tradingHalt();
        list[8] = holdingPeriod();
        list[9] = compliance();
    }

    // ------------------------------------------------------------------------------------------------------------------------ about a vault's whole portfolio
    /// @dev Pool prices can be pushed for a block; a sector cannot. Limits how much of a vault rides on one industry.
    function sectorCap() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "sector-cap",
            spec: "sector-cap/1: the largest share of the vault's value held in one sector, in bps. Inputs: the vault's holdings valued at the pools' trusted prices; each stock's sector from Yahoo Finance assetProfile. Cash belongs to no sector. Result: max over sectors of sector value / total value * 10000, rounded down. Holds when result <= limit.",
            op: Op.LessOrEqual,
            applies: Applies.Portfolio,
            about: About.Account
        });
    }

    /// @dev The market's risk, as the stocks the vault holds move together with it
    function portfolioBeta() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "portfolio-beta",
            spec: "portfolio-beta/1: the vault's beta against the S&P 500, 1e6. Inputs: daily closes of each held stock's underlying and of SPY for the last 252 trading days (Yahoo Finance chart). Result: sum over stocks of weight * beta, where beta = cov(stock daily return, SPY daily return) / var(SPY daily return) and weight = stock value / total value (cash is beta 0). Holds when result <= limit.",
            op: Op.LessOrEqual,
            applies: Applies.Portfolio,
            about: About.Account
        });
    }

    /// @dev Diversification that counts: two stocks in different sectors that still move as one are one bet
    function correlationCap() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "correlation-cap",
            spec: "correlation-cap/1: the highest correlation between any two stocks the vault holds, 1e6. Inputs: daily closes of each held stock's underlying for the last 90 trading days (Yahoo Finance chart). Result: max over pairs of the Pearson correlation of the daily returns; 0 when fewer than two stocks are held. Holds when result <= limit.",
            op: Op.LessOrEqual,
            applies: Applies.Portfolio,
            about: About.Account
        });
    }

    /// @dev A loss measured at the real market's prices, which a manipulated pool cannot hide
    function realDrawdown() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "real-drawdown",
            spec: "real-drawdown/1: how far the vault's value is below its high, in bps, at the underlying market's prices and not the pools'. Inputs: the vault's balances after each block it changed in; the underlying's last close from Yahoo Finance; USDC at 1. Result: (high - now) / high * 10000, rounded down, where high is the largest value since the vault was made. Holds when result <= limit.",
            op: Op.LessOrEqual,
            applies: Applies.Portfolio,
            about: About.Account
        });
    }

    // ------------------------------------------------------------------------------------------------------------------------ about the market
    /// @dev When fear is high, buying is paused
    function volatilityRegime() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "volatility-regime",
            spec: "volatility-regime/1: the level of the VIX, 1e6. Inputs: the last close of ^VIX from Yahoo Finance. Result: the close * 1e6, rounded down. Judges buys only. Holds when result <= limit.",
            op: Op.LessOrEqual,
            applies: Applies.Buys,
            about: About.Market
        });
    }

    // ------------------------------------------------------------------------------------------------------------------------ about one stock, for everyone
    /// @dev Buying into an earnings report is a coin toss the vault's owner may not want
    function earningsBlackout() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "earnings-blackout",
            spec: "earnings-blackout/1: whole days until the stock's underlying next reports earnings. Inputs: Yahoo Finance calendarEvents for the underlying. Result: days from now to the next earnings date, rounded down; 365 when none is scheduled. Judges buys only. Holds when result >= limit.",
            op: Op.GreaterOrEqual,
            applies: Applies.Buys,
            about: About.Stock
        });
    }

    /// @dev A tokenized stock trades all hours; its price is only real while its market is open
    function marketOpen() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "market-open",
            spec: "market-open/1: 1 when the stock's underlying market is open now, otherwise 0. Inputs: the exchange's regular session for the underlying (Yahoo Finance marketState = REGULAR). Result: 1 or 0. Judges buys only. Holds when result >= limit.",
            op: Op.GreaterOrEqual,
            applies: Applies.Buys,
            about: About.Stock
        });
    }

    /// @dev A halted stock has no real price to trade against
    function tradingHalt() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "trading-halt",
            spec: "trading-halt/1: 1 when trading in the stock's underlying is halted, otherwise 0. Inputs: the exchange's halt list for the underlying. Result: 1 or 0. Judges buys only. Holds when result <= limit.",
            op: Op.LessOrEqual,
            applies: Applies.Buys,
            about: About.Stock
        });
    }

    // ------------------------------------------------------------------------------------------------------------------------ about one stock in one vault
    /// @dev The vault's own history of a stock
    function holdingPeriod() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "holding-period",
            spec: "holding-period/1: whole days since the vault last bought the stock. Inputs: the vault's swap events for the stock. Result: days from the vault's most recent buy of the stock to now, rounded down. Judges sells only. Holds when result >= limit.",
            op: Op.GreaterOrEqual,
            applies: Applies.Sells,
            about: About.AccountAndStock
        });
    }

    /// @dev What the owner may hold depends on where the owner is, which only the owner can say
    function compliance() internal pure returns (OffChainFunction memory) {
        return OffChainFunction({
            name: "compliance",
            spec: "compliance/1: 1 when the vault's owner may hold the stock, otherwise 0. Inputs: the jurisdiction the owner declared in the app, and Coinbase's tokenized-stocks eligibility list for it. Result: 1 or 0. Judges buys only. Holds when result >= limit.",
            op: Op.GreaterOrEqual,
            applies: Applies.Buys,
            about: About.AccountAndStock
        });
    }
}
