# Signals

A small oracle for what only the app can work out. Reactive contracts can only react to events on a chain, so anything computed off-chain (a share's price from Yahoo, the 126-day winners, volatility weights, research) has to be put on a chain first. `SignalBoard` is where it is put.

It moves no money. It keeps what the app's **publisher** posted, refuses what is stale, out of order, too far from the last value, or badly formed, and says it in events a reactive contract can watch.

```
 app executor ──post──▶ SignalBoard ──event──▶ reactive contract ──callback──▶ vault
 (off-chain)           (keeps it,             (a trigger only)                 (re-checks the board,
                        checks it)                                              then its own rules)
```

The reactive contract is only a **trigger**. What it relays is never trusted: the vault asks the board `targetsAreCurrent(...)` and acts only if that is the newest, unexpired, unrevoked thing posted. A late or replayed relay cannot make a vault act on an old list.

## What can be posted

| Signal | Posted with | Kept as | Event (topic 0) |
|---|---|---|---|
| **A value** for a channel: a price, an indicator, a flag (0 or 1) | `postValue(channel, value, asOf, evidence)` | the last value per channel, with a count | `ValuePosted` `0x200f13d6…a63f` |
| **Targets** for a vault: stocks and the share of the vault's value for each, in basis points; the rest is cash | `postTargets(vault, stocks, weightsBps, asOf, expiresAt, evidence)` | a hash of the list, its count and its times (the list itself is in the event) | `TargetsPosted` `0xa2ed4212…958a` |
| **A revocation** by the owner | `revokeTargets(vault)` | the targets expire at once | `TargetsRevoked` `0x7f68b6a7…0d16` |

`vault` is an indexed topic, so a reactive contract subscribes to one vault's targets and no one else's. `channelId("price", "METAc")` names a channel. `evidence` is a hash of what the number came from (a data snapshot, a research notebook), so it can be audited later.

A flag is a value with a channel of its own, such as `channelId("flag", "buys-allowed")`, 1 or 0. That is how a condition worked out off-chain (an `if` over indicators the chain can't see) reaches a vault.

## Rules can be split and combined

Nothing here fixes where a rule runs. Each rule of the strategy may run in one place, or in several for cover. What decides is what the rule needs to read and how fast it has to act.

| Rule or block | In the vault (checked when a trade happens) | By Reactive (event-driven) | Off-chain, as a signal |
|---|---|---|---|
| `budget`, `max-weight`, `min-liquidity`, `approval`, slippage | **yes**: the hard limits; keep them here whatever else is used | no: nothing to react to | no |
| `stop-loss`, `take-profit` | the exit itself (`exitStock`) | **yes**: the pool's price event | yes: the executor can post a share-price based exit as a flag |
| `portfolio-stop` | the exit and the pause | **yes**: any pool event asks for it; the vault re-checks the fall | yes, as a flag |
| `rebalance` | the trades, and the drift check | **yes**: a cron tick asks for it | yes: targets posted when the executor decides |
| `filter`, `inverse-volatility`, `if`, `condition` over history | no | too heavy to compute | **yes**: computed off-chain, posted as targets or flags |
| Research, picking stocks | no | no | **yes** (the app) |

The ways they combine, from the ones to start with:

1. **Decide off-chain, enforce on-chain.** The executor works out targets and posts them; the vault takes them only within `budget`, `max-weight`, `min-liquidity` and slippage. This is the default: the app is clever, the vault is strict.
2. **Trigger on-chain, decide in the vault.** An exit like the portfolio stop is started by a pool event through Reactive, and the vault re-checks the numbers itself, so a false trigger does nothing.
3. **Cover twice.** A stop-loss can run through Reactive (fast, on the pool's price) and through the executor (on the share's price, when the market is open). Whichever sees it first exits; the other finds nothing to sell. The vault accepts either.
4. **Reactive as a relay.** Off-chain work posted to the board, a reactive contract carrying it to the vault, so it keeps working when the app's server is down. Only worth it when that matters; otherwise the executor calls the vault directly.

Which of these a strategy uses is a setting of the strategy, in the app, not something in this contract: the board takes whatever is posted, and the vault and the reactive contracts are the ones that choose what to listen to.

## Trust

- The **publisher** is one address, set by the owner, who can change it. It can post wrong numbers; the board cannot tell. What it does is limit the harm: a value may not be older than the last, ahead of the clock, or move more than the channel's limit (`setMaxMove`) in one post; targets may not hold more stocks than a vault can, repeat a stock, add up to over 100%, or be good for more than 7 days.
- The **owner** is whoever deployed it, and can switch targets off at once.
- A **vault** must never act on a signal alone. It calls `targetsAreCurrent` and `valueIfFresh(channel, mostAge)` (which reverts on a stale value), and then enforces its own rules. A signal narrows what the vault may be asked, never what it will allow.
- A personal deployment, like the vault's: one board per person. A shared board for everyone would make one publisher's mistake everyone's.

## What it does not do

- It does not know what is true. It keeps what was posted.
- It has no vault in this folder yet that reads it (`StrategyVault` takes its orders from the executor and the owner today), and no reactive contract that watches it. The board is the piece both will use.
- Values are integers with no decimals of their own: each channel's convention (8 decimals for a price, say) belongs to whoever posts and reads it.
- Nothing has run against a real chain. The tests (`test/SignalBoard.t.sol`) cover the checks, the events and the vault-side check.

## Next

1. A reactive contract that watches `TargetsPosted` for one vault and calls the vault's new `applyTargets` callback.
2. `applyTargets` on the vault: checks the board, then trades toward the weights through the same `buy` and `sell` paths, within every rule.
3. The app's executor posting targets after a rebalance decision, and flags for off-chain conditions.
4. A per-strategy setting for which rules run where (above), kept with the strategy's other rules.
