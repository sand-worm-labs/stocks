# Contracts architecture

The onchain side of Sandworm Stocks: a strategy that holds tokenized stocks for a person, runs by itself, and can never be made to do something the person did not allow. Every decision below says what was chosen, why, and what was turned down.

## What it is for

Composer ([help.composer.trade](https://help.composer.trade/article/214-6-how-composer-symphonies-work)) lets people build a strategy from blocks (assets, weights, groups, if/else, filters, rebalance rules) and trades it for them in a brokerage account. This suite does that onchain, on Base, and adds what a brokerage can't: the person keeps custody, the rules are enforced by code and not by a company, a stop-loss works around the clock because it is triggered by the chain itself (Reactive), and what a strategy wants at any moment can be checked by anyone.

## What we took from similar projects

| Project | What it is | What we took |
|---|---|---|
| [Zyfai](http://zyf.ai/) | A yield agent on a Safe smart account with ERC-7579 modules (per its site and docs) | The agent only **proposes**; an onchain gateway module checks every call against a curator-managed registry (contract, function, parameter bounds). A scoped session key. Tiers as risk budgets. A soft limit that stops new deposits and a hard one that exits. Exits go to the user's own account with no approval, and never rebalance into something new during an incident. |
| [ERC-7579](https://eips.ethereum.org/EIPS/eip-7579) | A standard for modular smart accounts: validators, executors, fallbacks, hooks | Typed plugins that are installed and removed by the owner, and hooks that run before and after an action. |
| [Zodiac / Safe modules](https://gnosisguild.github.io/zodiac-wiki/index.php%3Ftitle=Introduction:_Zodiac_Protocol.html) | An avatar account, modules that decide, modifiers between them, guards that check | Guards as a separate kind from whatever decides. |
| [Enzyme](https://docs.enzyme.finance/enzyme-blue-protocol/architecture/release) | A vault split into extensions: a stack of policies, adapters per protocol, a fee manager | Venues as adapters, a stack of policies that all have to pass, fees as a plugin. |
| [Reactive Network](https://dev.reactive.network) apps (ReacDEFI, Coinstancy) | Stop-loss and rebalancing driven by chain events | Event-driven triggers, as in `src/aerodrome/`. |

What the sources do not say, and we had to decide ourselves: how an agent's key is revoked, what the owner can always do, and how a bad plugin is contained. Zyfai's docs leave those open. We fix them below.

## Layers

```
 off-chain      the app: research, picking stocks, indicators        proposes
 ─────────────────────────────────────────────────────────────────────────────
 signals        SignalBoard                                          keeps what the app posted, refuses the stale and the wild
 strategy       blocks/  (asset, cash, groups, if, filter, rebalance)  turns readings into target weights; reads only
 guards         budget, max weight, depth, slippage, approval, pause   each can refuse a trade
 core           the vault: holds money, owner exits, ceilings        small, fixed, the same for everyone
 venue          Aerodrome Slipstream swaps                           executes a trade
 triggers       Reactive contracts                                   start an exit or a rebalance from a chain event
```

## Decisions

### 1. The app proposes; the chain disposes
**Chosen:** the app (research, Yahoo history, indicators) never moves money by its own authority. It posts signals and calls the vault, and the vault checks what it is asked against its rules.
**Why:** Zyfai's central lesson. A compromised or mistaken app must not be able to lose the person's funds, and a company that can move your money is the thing this suite exists to remove. The app is clever and the chain is strict.
**Turned down:** an executor with free rein (what `StrategyVault` could drift into), because the safety would rest on our server's keys.

### 2. One contract for each block type
**Chosen:** `AssetBlock`, `CashBlock`, `EqualGroup`, `SpecifiedGroup`, `InverseVolatilityGroup`, `IfBlock`, `FilterBlock`, `RebalanceBlock`, and the conditions `ComparisonCondition`, `AllCondition`, `AnyCondition`. Each is a tiny contract with one `evaluate`, and a strategy is a tree of their addresses.
**Why:** a block is a plugin. It can be audited alone, reused by any strategy that points at it, and added later without touching the vault. A tree of addresses is a strategy anyone can read, fork by pointing at the same leaves, and verify: the same readings give the same answer for everyone. It mirrors the app's strategy language one for one, so the app and the chain cannot disagree about what a node means.
**Turned down:** a single interpreter contract that reads an encoded tree. That is one big contract to audit, every new block type changes it, and its gas grows with the tree. Also turned down: evaluating in the app and sending the result, because then nothing onchain says why the strategy wants what it wants.

### 3. Blocks only read
**Chosen:** `evaluate` is a view. It returns target weights and never touches funds.
**Why:** a block can then do no harm whatever it contains. The worst a bad block can do is ask for a bad allocation, and the guards and the vault's rules decide whether that is acceptable. This is what makes it safe to let people install blocks other people wrote.

### 4. Numbers come from a board, not from the blocks
**Chosen:** `SignalBoard` keeps values (prices, indicators, flags) and target lists the publisher posted. Blocks read them through `IReadings`; `FreshReadings` makes a stale number revert the whole evaluation.
**Why:** Reactive and the chain cannot see Yahoo or 126 days of history for every stock, and computing it onchain is too costly. The board is the narrowest door for off-chain data: it refuses numbers that are old, out of order, from the future, or move too far at once, and it records what each number was worked out from (`evidence`).
**Turned down:** an oracle per indicator (cost, and there are none for most stocks: only 13 of 435 tokens had a NAV price in Coinbase's list), and computing indicators in the blocks (needs history storage the chain does not have).
**Cost we accept:** the publisher can be wrong. That is why decision 1 holds: whatever it posts, the rules still apply.

### 5. The vault core is small and fixed
**Chosen:** the core does four things and nothing else: it holds USDC and stocks, lets the **owner always withdraw with no price needed**, enforces a **deposit ceiling no plugin can raise**, and lets only the owner add or remove plugins.
**Why:** this is the part we can promise never to be affected by a plugin. ERC-7579 and Zodiac warn that a module can execute anything; so the guarantee has to live in the host, not in the plugin. Zyfai does not document what the user can always do; we decide it up front.
**Turned down:** letting a plugin hold keys or approvals. Plugins get no allowance beyond what the core hands to one trade at a time.

### 6. Guards are plugins that can only say no
**Chosen:** budget, max weight, minimum pool depth, slippage, approval, pause, and later more, each a guard checked before every trade. All must pass.
**Why:** a stack of independent checks is easy to read and to add to (Enzyme's policies, Zodiac's guards, ERC-7579's hooks). One that can only refuse cannot cause a loss by itself, and a rule the person gave maps to one guard.
**Turned down:** the rules as fields inside one vault contract (today's `StrategyVault`), because every new rule then changes the contract that holds the money.

### 7. A registry says which stocks may be traded
**Chosen:** a curated `TargetRegistry` lists the tokens, pools and routers a vault may use, with the conditions that got them there (a pool's minimum depth and history). The vault trades only what is on it.
**Why:** Zyfai's three-level check. A stock's token and pool are what an attacker would swap in; today the vault proves them when it is deployed (`_listStock`), and a registry lets the list grow without redeploying while keeping the same check on every trade. It is also where "tiers" live: a Conservative registry holds only deep, old pools, an Advanced one more.
**Turned down:** letting the strategy name any token. A block that says `AssetBlock(0x…)` would otherwise buy it.

### 8. The executor is a scoped key, not an owner
**Chosen:** the account that triggers rebalances can only call the vault's rebalance and trade functions, can be revoked by the owner at once, and expires. What it asks for still has to pass the guards.
**Why:** Zyfai uses a session key scoped to its registry, but its docs do not say how it is revoked or when it expires. We write those in.

### 9. Triggers are plugins that call exits, and the vault re-checks
**Chosen:** a Reactive contract watches events and asks the vault to exit; the vault checks the condition itself from the pool's price before it sells. It is already like this for the stop-loss and the portfolio stop (`triggerStockExit`, `triggerPortfolioStop`).
**Why:** Reactive only sees events and can only call contracts, and a false trigger must do nothing. Because the vault re-checks, a trigger can never sell a stock that is not at its stop. Two levels, as Zyfai does: a soft one that stops new buys, and a hard one that sells.
**Turned down:** trusting the reactive contract's payload. A late or replayed relay would act on old news.

### 9b. In an incident, exit and stay out
**Chosen:** an exit goes to USDC in the vault, which the owner can take out at any time, with no approval and no re-entry until the owner or the pause says so.
**Why:** the same reasoning as Zyfai's: during an incident, speed matters more than yield.

### 10. Venues are adapters
**Chosen:** swaps go through a venue plugin (Aerodrome Slipstream first). The vault gives a venue one trade's worth of allowance, and takes it back.
**Why:** the Enzyme adapter model. Another DEX or another chain is one more adapter, and the vault's rules do not change.

### 11. Simulated stocks first
**Chosen:** everything is built and tested against mock tokens, pools and a router (`test/mocks/`), then against the testnet stand-ins (`src/testnet/TestStock`, `StockFaucet`), then a fork of Base.
**Why:** real tokenized stocks have a few pools and real money. The mocks let a test put a stock at $100, then $50, move a pool's price in the middle of a trade, or make a pool shallow, which no real market would do on cue. Nothing has run against the real Base contracts yet, and nothing here should be trusted with real funds until it has been, and audited.

## Plugin kinds at a glance

| Kind | Interface | Can | Cannot |
|---|---|---|---|
| Strategy (blocks) | `IBlock.evaluate(readings)` | say what to hold | touch funds |
| Reading | `IReadings.read(channel)` | give a number, or revert | give a stale number |
| Guard | refuses a trade | veto | approve what another vetoed |
| Registry | lists stocks, pools, routers | narrow what is tradable | add anything on its own |
| Trigger | a reactive contract | ask for an exit | make the vault sell off its condition |
| Venue | swaps one trade | execute | keep an allowance |
| Fee | takes a cut | charge on profit | touch principal or block a withdrawal |

## Status

| Piece | State |
|---|---|
| ERC-7579 interfaces and a reference account (`src/erc7579/`, `src/account/`) | built and tested; not audited, no ERC-4337, one hook slot |
| Strategy blocks (12) and `SignalBoard` with `FreshReadings` | built and tested |
| `StockRegistry`, `PoolPricing` | built and tested |
| `TradeGuard` (hook) and `StrategyExecutor` (executor) | built and tested |
| Rules: open ids, three placements (on-chain, off-chain, both), `IRuleEnforcer`, `StrategyVaultFactory` | built and tested |
| 100 traced flows (`test/FlowTraces.t.sol`) | passing; 161 contract tests in all |
| `StrategyVault` (the older single contract) and `AerodromeStopLoss` | built and tested; superseded for new work, kept working |
| On-chain triggers for stop-loss, take-profit and portfolio stop in the new vault | not built (a Slipstream watcher is needed) |
| Ask-before-trading on-chain, ERC-4337 and validators, a hook multiplexer, venue adapters, fee plugin, strategy registry and copy-following | designed, not built |
| Real Base contracts, and an audit | not done |

The whole thing, drawn: [docs/architecture.html](docs/architecture.html).

## Open questions

1. Follow ERC-7579's install/uninstall interface exactly, or a lighter interface of our own? It buys reuse with other tools, and costs the weight of a smart-account model the vault does not need.
2. Does a follower vault take targets from someone else's board (copy trading)? The board is keyed by vault today; keying by strategy would allow it.
3. Does a performance fee belong at all? It is the most dangerous plugin: it touches profit accounting.
