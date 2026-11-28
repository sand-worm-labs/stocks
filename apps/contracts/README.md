# Stocks contracts

Foundry project for the onchain side of Sandworm Stocks, built on [Reactive Network](https://dev.reactive.network) reactive contracts: a reactive contract watches events on one chain and, when one matches, asks the Reactive Network to call a contract on another chain.

The design, and the reason for every decision in it, is in [ARCHITECTURE.md](ARCHITECTURE.md), and drawn in [docs/architecture.html](docs/architecture.html) (open it in a browser).

```
src/    the contracts: aerodrome/ (stop-loss), vault/ (a strategy's money and rules), signals/ (what the app tells the vault), blocks/ (a strategy as a tree of contracts), erc7579/ + account/ (the plugin host), guards/ + executors/ (its modules), registry/, pricing/, rules/, factory/, testnet/
test/   forge tests
script/ deploy scripts, when there are some
lib/    forge-std and reactive-lib, as git submodules
```

## Setup

Needs [Foundry](https://getfoundry.sh). From the repo root, once:

```bash
git submodule update --init --recursive
cd apps/contracts
cp .env.example .env     # then fill it in
```

```bash
forge build
forge test
forge fmt
```

## Debugging off-chain

`tools/reactive.sh` does everything the [debugging page](https://dev.reactive.network/debugging) does with `cast`: `callbacks <reactive tx>` (did the callback arrive, and why not), `status`/`debt`/`reserves` for a reactive or callback contract, `fund` (`depositTo`), `cover-debt` and `nonce`. What only reads runs at once; what spends funds needs `--yes`. `tools/reactive.sh --help` lists them.

## How a reactive contract works

There are always two contracts:

| | Lives on | Does |
|---|---|---|
| **Reactive contract** (`AerodromeStopLossReactive`) | The Reactive Network (Lasna for testing) | Subscribes to an event on an origin chain. For each match its `react` runs and emits a `Callback`. |
| **Callback contract** (`AerodromeStopLossCallback`, or `StrategyVault`) | The destination chain, such as Base | Receives the call the Network makes for that `Callback`, and does the work. |

Things that are easy to get wrong:

- A reactive contract exists twice, once on the Network, where it subscribes, and once in a ReactVM, where `react` runs. `AbstractReactive` sets `vm` to say which copy this is; subscribe only when `!vm`, and mark `react` `vmOnly`.
- The first argument of the callback's function is overwritten by the Network with the reactive contract owner's address. Keep it as the first argument and check it with `rvmIdOnly`, or anyone's reactive contract could call yours.
- Only the chain's Reactive callback proxy may call a callback contract (`authorizedSenderOnly`). Take its address as a constructor argument: it is different on every chain.
- Both sides pay for what they do. A reactive contract needs a balance on the Network, and a callback contract needs a balance on the destination chain to cover its callbacks.

## Aerodrome stop-loss

`src/aerodrome/` holds a stop-loss for one stock token, watched from its Aerodrome pool. It is the contracts side of the app's `stop-loss` rule (sell a stock that has fallen a fraction below what was paid for it).

| Contract | Lives on | Does |
|---|---|---|
| `AerodromeStopLossReactive` | Reactive Network | Subscribes to the pool's `Sync` event, works out the stock's price in USDC from the reserves, and when it is at or below the stop price asks for one callback. |
| `AerodromeStopLossCallback` | Base | Sells the owner's stock for USDC on Aerodrome and sends the USDC straight back to them. |

Both are **personal deployments**: the person deploys them both, from the same account. The callback only ever moves the deployer's tokens, only to the deployer, and only accepts calls from the Reactive callback proxy for that same deployer.

To use one:

1. Work out the stop price: **entry price × (1 − the rule's limit)**, in USDC per whole stock token with 18 decimals. A stock bought at 100 with a 10% stop is `90e18`.
2. Deploy the callback on Base, then the reactive contract on the Reactive Network pointing at it (constructor arguments are in the contracts' doc comments).
3. From the wallet, **approve the callback** to spend the stock token. The amount approved is the most that can be sold; it sells that or what the wallet holds, whichever is less.

What it does not cover, on purpose:

- **Classic pools only.** It reads `Sync(uint256,uint256)`, which classic (non-stable, V2-style) Aerodrome pools emit. A Slipstream (concentrated-liquidity) pool emits `Swap` with a price field and needs its own contract. Check which kind a stock's pool is first.
- **Spot price.** A big trade can move the pool's price for a moment. The callback refuses a sale that brings in less than the price the stop saw, less the slippage given at deploy, which limits the damage but not the trigger.
- **Once.** After it fires, `triggered` stays set. A new stop is a new deployment.
- **Only tested against stand-ins.** The tests use mock tokens and a mock router. The event, the route format and the router call were checked against Aerodrome's source on GitHub, but nothing has run against the real Base contracts yet. Add a fork test (`forge test --fork-url $BASE_RPC_URL`) before a real key goes near it.

## Test stocks and their faucet (test networks only)

Base has no tokenized stocks on its test networks, so `src/testnet/` makes stand-ins. The `StockFaucet` starts with none: anyone makes a stock, with a name of their own or a random one, and then claims it. Each is a `TestStock` with the real tokens' **8 decimals**, and only the faucet can mint it. The faucet refuses to deploy on Base mainnet or Ethereum.

| Call | Does |
|---|---|
| `createStock(name, symbol)` | makes a stock with that name and symbol (3 to 12 letters and digits, used once), and gives the maker the first claim |
| `createRandomStock()` | makes one with a name and symbol made up from two words, such as "Test Nova Dynamics" and `tNODYc` |
| `claim(token)` / `claimMany(tokens)` | gives 1,000 of a stock, once a day for each stock and account |

```bash
# the faucet, with nothing in it (RANDOM_STOCKS=5 makes five random ones as it deploys)
forge script script/DeployStockFaucet.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast

# a stock of your own, or a random one when the name and symbol are left out
FAUCET=0x... STOCK_NAME="Test Acme Foods" STOCK_SYMBOL=tACMEc forge script script/CreateStock.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
FAUCET=0x... forge script script/CreateStock.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
```

**An address like the real token's.** Stocks are made with CREATE2, so a salt can pick the address. `tools/mine-vanity.sh` finds a salt that makes a test stock start and end like its mainnet twin (the real NVDAc is `0xb200…108c`), and `createStockAt` (or `SALT=` on `CreateStock.s.sol`) uses it:

```
tools/mine-vanity.sh $FAUCET "Test NVIDIA" tNVDAc 0xb20000000000000000000078ee7ce2fe4908108c    # 4 digits at the start, 4 at the end
FAUCET=$FAUCET STOCK_NAME="Test NVIDIA" STOCK_SYMBOL=tNVDAc SALT=0x... forge script script/CreateStock.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
```

Every extra digit takes 16 times longer. On an 8-core Mac 7 digits took about 6 seconds, so 4 + 4 takes about a minute and a half; 6 + 4 would take days. The salt belongs to the faucet, the name and the symbol: change any of them and it must be mined again.

At most 200 stocks are made, so a list of them stays readable. The randomness is the chain's own, fine for a test token and for nothing else. The next section gives these tokens pools.

## Mirroring Base pools (test networks only)

The strategies trade in Aerodrome Slipstream pools, which only exist on Base mainnet. To try them end to end on Base Sepolia, each mainnet stock pool gets a copy there:

- `MirrorPool` answers like a Slipstream pool (`slot0`, `observe`, `token0`, `token1`, `factory`, `tickSpacing`), so the vault and the rule modules read it unchanged. Its price and depth are the mainnet pool's, as the relayer (`apps/relayer`) last wrote them to the `MirrorBook`. Its reserves are real test tokens, which the vault reads as depth.
- `MirrorPoolFactory` makes the copies, one per mainnet pool, and keeps them in the mainnet pool's token order so a mirrored price means the same.
- `MirrorRouter` swaps like Slipstream's `exactInputSingle`. A trade is priced as in the mainnet pool, inside its current price range: the mirrored depth decides how far it moves the price, the fee is kept, and the output is paid from the copy's reserves, so a trade larger than the reserves fails.
- `TestUSDC` is the quote token (6 decimals). The faucet's `ownerMint` seeds a copy with stock.

**What is not the same as mainnet.** A swap here does not move the pool's price: the price is the mainnet pool's, so test trades never drift from the market they imitate. Price ranges beyond the current one are not modelled. `observe` returns the mirrored price as its own average, because a copy has no history, so the vault's check against a sudden move cannot fire on a test network. Everything is trusted to the relayer's key.

```bash
# the mirror, the faucet and the market (the same account for all three)
forge create src/testnet/MirrorBook.sol:MirrorBook --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
forge script script/DeployStockFaucet.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
MIRROR_BOOK=0x... forge script script/DeployMirrorMarket.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
```

Then, in `apps/relayer`, `pnpm provision` makes a test stock and a copy of each pool, seeds it, and writes `testnet-market.json`; `pnpm start` with `DISCOVER_POOLS=true` keeps the copies' prices current.

## Deploying

Fill in `.env` first. The commands below are the shape of it, not a tested recipe: check the current network addresses, chain ids and callback proxies on [dev.reactive.network](https://dev.reactive.network) before using real keys, because they have changed between testnets.

```bash
# 1. The callback contract, on the destination chain
forge create src/aerodrome/AerodromeStopLossCallback.sol:AerodromeStopLossCallback --rpc-url base_sepolia --private-key $PRIVATE_KEY \
  --constructor-args <callback proxy on that chain> <router> <pool factory> <stock token> <quote token> <stock decimals> <quote decimals> <max slippage bps>

# 2. The reactive contract, on the Reactive Network, pointing at the first
forge create src/aerodrome/AerodromeStopLossReactive.sol:AerodromeStopLossReactive --rpc-url lasna --private-key $PRIVATE_KEY --value 0.1ether \
  --constructor-args <chain id> <pool> <callback contract from step 1> <stock is token0> <stock decimals> <quote decimals> <stop price>
```

When something does not arrive, `tools/reactive.sh` (above) shows why.

## Adding contracts

Stocks' rules (a portfolio stop, a stop-loss, ask-before-buying) are described in `apps/web/src/lib/rules/spec.ts`. Contracts that enforce them onchain should keep the same meaning: a limit is a fraction, and a stop sells everything and then waits `pause` trading days.
