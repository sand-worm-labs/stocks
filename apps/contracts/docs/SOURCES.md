# Sources

For each piece of this suite, who else has built it, what was read, and what was taken. Nothing was copied: the code here is written from the patterns, and where a source's licence is stricter than ours (AGPL) that matters if anyone is ever tempted to paste.

How much was read matters, so each source says. **Read** means the page or source file itself was fetched and read. **Seen** means only a search result or a directory listing, so what is said about it comes from a summary. **Failed** means the page did not load.

## By piece

| Piece of ours | Built before by | What was taken | Read? |
|---|---|---|---|
| **The account: typed modules, install and remove, hooks around every execution** (`erc7579/`, `account/`) | [ERC-7579](https://eips.ethereum.org/EIPS/eip-7579) | Its interfaces and execution mode, as written | Read |
| | [Rhinestone Safe7579](https://github.com/rhinestonewtf/safe7579), [OpenZeppelin `AccountERC7579`](https://docs.openzeppelin.com/community-contracts/account-modules), [thirdweb modular account](https://github.com/thirdweb-dev/contracts-modular-account) | Named as the audited replacements for our reference account | Seen |
| **Refusing a module nobody vouched for** (`IERC7484`, the account's registry check) | [ERC-7484 module registry](https://eips.ethereum.org/EIPS/eip-7484) and [`RegistryHook`](https://github.com/rhinestonewtf/core-modules/tree/main/src/RegistryHook) | The registry interface (`checkForAccount(account, module, type)`), and checking at install time. Their hook also checks the executor on each execution; ours does not yet. | Read both |
| **Module identity** (`name`, `version`, `isInitialized`) | every module in [Rhinestone core-modules](https://github.com/rhinestonewtf/core-modules) | The three functions, and keeping each account's config under its own address | Read (four modules) |
| **Several hooks in one slot** (not built) | [`HookMultiPlexer`](https://github.com/rhinestonewtf/core-modules/tree/main/src/HookMultiPlexer) | How it keeps global and per-selector hooks per account, sorts and dedupes them, and hands each sub-hook's context from `preCheck` to `postCheck`. This is the design to follow for our single hook slot. | Read in full |
| **A strategy executor that acts for an account** (`StrategyExecutor`) | [`ScheduledOrders`](https://github.com/rhinestonewtf/core-modules/tree/main/src/ScheduledOrders), [`OwnableExecutor`](https://github.com/rhinestonewtf/core-modules/tree/main/src/OwnableExecutor) | Per-account config, building the calls as a batch and handing them to `executeFromExecutor`, updating state before the external call. Their order takes the caller's slippage on each execution; ours pins it in the vault's rules. | Read `ScheduledOrders`; `OwnableExecutor` seen |
| **A keeper that is scoped, expiring and limited** | [Smart Sessions policies](https://github.com/erc7579/smartsessions/tree/main/contracts/external/policies): `TimeFramePolicy`, `UsageLimitPolicy`, `UniActionPolicy`, and `ERC20SpendingLimitPolicy`, `ContractWhitelistPolicy`, `ValueLimitPolicy`, `SudoPolicy`, `SimpleGasPolicy` | A time window (`validAfter` and `validUntil`), a cap on how many times it may act (counted only when a check passes), and rules on a call's arguments. **We have the expiry only.** A start time and a use limit are the next step for the keeper. | Read three; the rest seen as names |
| **A guard that checks each call's address, function and values** (`TradeGuard`) | [Zyfai's executor module and target registry](https://docs.zyf.ai/docs/product/control/proxy), and `UniActionPolicy` for the parameter checks | Check the contract, the function and the parameters; nothing off-list passes | Read Zyfai; `UniActionPolicy` read |
| **A hook that blocks everything but a vetted flow** | [`ColdStorageHook`](https://github.com/rhinestonewtf/core-modules/tree/main/src/ColdStorageHook) | Hashing the exact call to bind it, and blocking by default. Its time-delayed withdrawal is a different product from ours. | Read |
| **Tiers as risk budgets, a soft limit and a hard one, exits without approval** | [Zyfai](http://zyf.ai/) and its [risk framework](https://docs.zyf.ai/docs/product/overview/risk-framework) | The shape of the limits and the incident rule: exit and stay out | Read |
| **Roles: which calls, to whom, with which arguments, as a tree of conditions with AND / OR / NOR** (our gates) | [Zodiac Roles modifier](https://github.com/gnosisguild/zodiac-modifier-roles) | The idea of conditions that combine. Its `core/` and `types/` folders were not read, so what we know of its operators is from a summary. | **Seen only** (its `Types.sol` failed to load) |
| **Vault of extensions: policies, adapters, fees** | [Enzyme](https://docs.enzyme.finance/enzyme-blue-protocol/architecture/release) | A stack of policies that all must pass, adapters per protocol, fees as a plugin | Seen |
| **Rebalancing a portfolio toward target weights with trade-size limits** | [Set Protocol v2 modules](https://github.com/SetProtocol/set-protocol-v2/tree/master/contracts/protocol/modules) (an index-rebalancing module with a maximum trade size and a cool-off) | Only that it exists: our limit on one buy against a pool's depth and our policy between rebalances are the same ideas | **Seen only** (the folder shows `v1` and `v2`; the module file was not read) |
| **A stop-loss, take-profit and scheduled actions driven by chain events** | [Reactive demos](https://github.com/Reactive-Network/reactive-smart-contract-demos): `uniswap-v2-stop-order`, `uniswap-v2-stop-take-profit-order`, `cron`, `aave-liquidation-protection`; and [Reactive's debugging page](https://dev.reactive.network/debugging) | How a Reactive contract watches a pool's `Sync` and asks for a callback; callbacks need an address first argument; debt and reserves | Read the page; demos seen as a list |
| **Blocks: asset, group, weight, if/else, filter, rebalance** | [Composer symphonies](https://help.composer.trade/article/214-6-how-composer-symphonies-work) | The vocabulary, and the threshold-rebalance idea | Seen (search results) |
| **The stocks on offer** (`StockRegistry`, the universe in the API) | [Base's tokenized stocks docs](https://docs.base.org/sdks/tokenized-stocks/overview) and Coinbase's public `GET /v1/tokenized-stocks` | The list of 435 tokens, with address, ISIN and supply | Read, and called live |
| **A price that is only trusted near its average** (`PoolPricing`) | The pattern of Uniswap v3's oracle library: a time-weighted average tick from `observe` | The window and the gap check. Our constants are our own. | Not read for this work; from knowledge of the pattern |
| **Prices, sectors and depth** (the API's market data) | Yahoo Finance's chart and search endpoints; [DexScreener](https://docs.dexscreener.com/) pools | Daily closes, sector and industry, pool liquidity | Called live |
| **A faucet for test tokens** (`StockFaucet`) | Aave's testnet faucet pattern | Per-account, per-token cooldowns | Not read; from knowledge of the pattern |

## Whole projects close to ours

| Project | How close | Why it is not enough |
|---|---|---|
| [Zyfai](http://zyf.ai/) | The closest: a self-custodial account where an agent proposes and an onchain policy decides. It lists tokenized stocks among its assets. | It rebalances between yield pools, and has no strategy language or placement of rules. Its docs do not say how the agent's key is revoked or what the user can always do. |
| [Rhinestone core-modules and Smart Sessions](https://github.com/rhinestonewtf) | Everything underneath: accounts, modules, hooks, sessions, registry | They are building blocks. No strategy, no rules model, nothing about stocks. |
| [Composer](https://www.composer.trade/) | The strategy language | A brokerage, not onchain |
| [Enzyme](https://enzyme.finance/) | Vaults with policies and adapters | Fund management for managers and depositors, not a person's own rules |
| [Reactor and ReacDEFI](https://blog.reactive.network/reacdefi-for-on-chain-stop-orders-and-beyond/) | Stop orders on Reactive | Single orders, not strategies |

## What was tried and did not load

- Zodiac Roles `Types.sol` (404), so its operator list was not read.
- Set Protocol's rebalancing module (404 on the raw file; the folder listing shows only `v1` and `v2`).
- The Smart Sessions interface file `IPolicy.sol`: the policies were read, and their return values (`VALIDATION_SUCCESS` and `VALIDATION_FAILED`) are known only by name.
- Chainlink's tokenized-equity feeds page (404), so nothing here relies on those feeds.

## Licences

`HookMultiPlexer`, `ColdStorageHook` and `ScheduledOrders` are AGPL-3.0, `UsageLimitPolicy` is MIT, and ERC-7579 and ERC-7484 are CC0. Nothing was copied, and the patterns are ideas, not code. If code is ever taken from an AGPL module, this repository takes on AGPL's terms for that code.

## What to do next with these

1. **Hook multiplexer**, following `HookMultiPlexer`: one slot, several guards, each sub-hook's context carried from `preCheck` to `postCheck`. This also lets more rule plugins in.
2. **A fuller keeper**, following `TimeFramePolicy` and `UsageLimitPolicy`: a start time and a cap on how many rebalances.
3. **The registry check on each execution**, as `RegistryHook` does, so an executor that is later flagged is refused.
4. **Move to an audited account** (Safe7579). Every module here is written to ERC-7579, so it moves.
