// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @notice Where a rule is kept. A vault is deployed with its rules, and each rule is placed on its own: some onchain, some off-chain, some both, in
/// any mix, and that includes the limits (a budget, a max weight, a minimum liquidity, a slippage).
///  OnChain   a module in the account refuses what breaks it, whoever asks, the app included. A guarantee.
///  OffChain  the app keeps it: it will not ask for what breaks it. It is written into the vault's record so it can be checked, but nothing onchain
///            stops a breach. A promise.
///  Both      a module refuses a breach, and the app keeps it too. The app can stop short of the chain's limit, and the chain catches the app if it
///            ever does not.
enum Placement {
    OnChain,
    OffChain,
    Both
}

struct Rule {
    // What the rule is: one of RuleIds, or an id of a kind a module of the vault enforces
    bytes32 kind;
    Placement placement;
    // The limit: USDC for a budget or a minimum liquidity (6 decimals), basis points for most of the rest, unused for approval
    uint256 value;
    // Anything else a kind needs. The suite's modules read none of it except a portfolio stop's pause; a module of another kind reads its own.
    bytes data;
}

/// @notice What the onchain modules are configured with, from the rules placed onchain or on both. A rule placed off-chain, or not given, leaves its
/// limit open, except the slippage and the size of a trade, which have ceilings no rule can raise.
struct Limits {
    uint256 budget;
    uint16 maxWeightBps;
    uint256 minPoolDepth;
    uint16 maxSlippageBps;
    uint16 maxTradeOfDepthBps;
}
