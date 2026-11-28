# Relayer

Copies the price state of Base mainnet pools onto Base Sepolia, for testing only.

**Why it exists.** Reactive's Lasna testnet reads testnet chains and does not carry events from a mainnet (tested: a reactive contract subscribed to a
Base mainnet pool was never called). So the relayer reads mainnet pools and writes their state to `MirrorBook` (`apps/contracts/src/testnet/MirrorBook.sol`)
on Base Sepolia, where Lasna can watch it. On Reactive mainnet none of this is needed: a reactive contract subscribes to Base directly.

**What it does not do.** It moves no funds and no balances, only prices. It is trusted: the mirror cannot prove a mainnet price. Use a throwaway key.

## Run

```
cp .env.example .env     # fill in MIRROR_ADDRESS and RELAYER_PRIVATE_KEY
pnpm install
pnpm start               # DRY_RUN=true reads and prints, sends nothing; set DRY_RUN=false to write
```

Deploy the mirror first, from `apps/contracts`, with the account whose key the relayer uses (only that account may write):

```
forge create src/testnet/MirrorBook.sol:MirrorBook --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
```

## How it works

Every `POLL_SECONDS` (2 by default, about a Base block) it reads the price and depth of every pool at one block, in a few Multicall3 requests, picks the pools that are new, have moved by at
least `MIN_TICK_MOVE` ticks (1 tick is 0.01%), have gone `MIN_LIQUIDITY_MOVE_PERCENT` (10) deeper or thinner, or have gone `MAX_AGE_SECONDS` without a write, and writes them in batches of `BATCH_SIZE` with one
`postMany` transaction each. A batch emits one event, so a reactive contract watching the mirror is charged once per batch, not once per pool.

With `DISCOVER_POOLS=true` it needs no `pools.json`: it asks the Stocks API (`GET /market/stocks`, with `STOCKS_API_URL` and `STOCKS_API_KEY`) for the stocks on offer, each with its token and the deepest pool the API found for it, and mirrors the pools it can read (`src/features/discovery/`). The API is the one place that finds stocks and their pools, so the relayer keeps no list of its own. Uniswap v3, Aerodrome Slipstream and Uniswap v4 pools are all read: a v4 pool is no contract but an id inside the pool manager, so it is read through the StateView contract, and the mirror keeps it under the last 20 bytes of its id. Other exchanges are skipped, and the log says which.

`pools.json` lists pools as `{ name, address, kind }`; `kind` is `uniswap-v3` or `aerodrome-cl` (their `slot0()` differ); a Uniswap v4 pool is `{ name, poolId, kind: "uniswap-v4" }`. On a restart every pool is
written once again, because what was already written is kept in memory.

## Layout

Laid out as the Sandworm API is: `core`, `common`, `infrastructure` (one folder per outside system) and `features` (the logic, one folder per job).

```
src/main.ts                    the relayer (pnpm start): boots, then loops
src/provision.ts               the provisioning script (pnpm provision): boots, plans, builds
src/deployments.ts             writes down what is deployed, after checking it is the right code (pnpm deployments)
src/scan-pools.ts              finds each stock's pools on the chain itself and writes them into deployments/base-mainnet/stocks.json (pnpm scan-pools)
src/core/config/               what is read from the environment: env schemas, relay and provision config
src/common/                    the pool types and keys, and the log
src/infrastructure/
  stocks-api/                  the stocks and their pools, from the Stocks API
  base-mainnet/                reading pool state from the mainnet (v3, Slipstream, v4 through StateView)
  base-sepolia/                writing to the test network: the mirror, the faucet, the pool factory
src/features/
  discovery/                   finding the pools to mirror, from the pools file or from the Stocks API
  scan/                        finding the pools of every stock from the chain's pool-creation events, and measuring them
  mirror/                      one round of the loop: what moved, and what to write
  deployments/                 reading the chain, checking the contracts, writing the deployments folder
  replay/                      the market maker: the mainnet's swaps, made again in the copies
  provision/                   the plan for each pool and the steps that build its copy
test/                          laid out as src/ is
```

## Replaying the swaps

With `REPLAY_SWAPS=true` the relayer is also a market maker. Each round, after the prices are written, it reads the swaps made in the mirrored pools on the mainnet since the last round (Uniswap v3 and Slipstream `Swap` events, and v4's from its pool manager), adds up the swaps in each pool and direction into one trade, and makes that trade in the pool's copy through the `MirrorRouter`, from the relayer's own wallet. A copy is priced from the mirror, so a trade does not move its price; what the replay keeps true is the flow: the copy's reserves and the maker's balances move as the mainnet's pools did. The maker is the account that owns the test tokens, so what it lacks it mints and the router is approved for what it pays in.

It starts from the block it is started at and does not replay the past, looks back at most 150 blocks in a round, and skips a pool that has no copy yet. A trade bigger than a copy's reserves fails and is logged, and the others go on. The log tells each round: `blocks 63352309-63352336: 2 swaps, 1 trades to replay`, then `trades: 1 of 1 done`. It needs `MIRROR_ROUTER_ADDRESS` as well as the faucet, test USDC and pool factory, and a `MAINNET_RPC_URL` that serves `eth_getLogs` (`https://base-rpc.publicnode.com` does, `https://mainnet.base.org` does not). `DRY_RUN=true` reads and logs the swaps and sends nothing.

## Copying the pools onto the test network

`pnpm provision` builds the test-network side: for each pool it can read it makes a test stock (`tNVDAc` for `NVDAc`) in the faucet, a copy of the pool (`MirrorPool`, see `apps/contracts`) in the same token order, and seeds the copy with half the mainnet pool's dollar depth in USDC and the same value in stock. `pnpm start` then keeps each copy's price and depth current, because a copy reads them from the mirror.

Deploy the faucet, the mirror and the market first (`apps/contracts`, "Mirroring Base pools"), fill in `FAUCET_ADDRESS`, `TEST_USDC_ADDRESS` and `POOL_FACTORY_ADDRESS`, and use the account that deployed them. `DRY_RUN=true` (the default) reads the mainnet pools and prints the plan.

It copies a pool only when it trades the stock against USDC and holds at least $100; the rest are logged and skipped. A v4 pool with hooks or a changing fee is read and mirrored but not copied, because its tick spacing cannot be found from its id. Run it again and it fills only what is missing, so a failed stock is picked up where it stopped. For addresses that look like the mainnet tokens', put salts from `apps/contracts/tools/mine-vanity.sh` in `vanity-salts.json` as `{ "tNVDAc": "0x..." }` before running it.

## Finding pools the indexes miss

`pnpm scan-pools` finds a stock's pools on the chain itself, because DexScreener lists only some of them. It reads every pool-creation event of the exchanges in
`src/infrastructure/base-mainnet/exchanges.ts` (Uniswap v3, Aerodrome Slipstream's three factories, Uniswap v4's pool manager) since the first stock was minted, keeps the pools that hold a stock,
reads each one's price and depth at one block, and writes them beside the stock in `deployments/base-mainnet/stocks.json` as `onchain`, deepest first (`deepestPool`).
By default it scans the stocks DexScreener found no pool for; `SCAN_ALL=true` scans all of them.

- **Depth is the active range, not the whole balance.** `depthUsd` is twice the quote token the pool holds across the prices it trades in now, which decides how far a trade moves the price. It does not match DexScreener's `liquidityUsd` (a pool's whole balance), and a v4 pool has no balance of its own to count.
- **A pool paired with a token it cannot price has no `depthUsd`.** It prices USDC, ETH and cbBTC. Most of the pools it finds that DexScreener lacks are Uniswap v4 pools against `wUSDC`, a wrapper that holds no USDC (`totalAssets()` is 0) and charges a 90% fee, or against a memecoin through a hooks contract; none is a market.
- **It needs an RPC that serves old blocks.** `https://base-rpc.publicnode.com` serves only about the last 23 days. The scan says so (`reachesStart: false` beside each stock, and a warning) rather than report no pool for a pool it could not see. Use an archive node as `MAINNET_RPC_URL` to scan from the first mint.
- **A new exchange is a new entry in `exchanges.ts`**; the scan knows no exchange by name.

## What is deployed

[`deployments/`](deployments/README.md) lists everything: the contracts on Base Sepolia, the test tokens, the pools that copy the mainnet's, the mainnet side they copy (tokens, pools, the contracts the relayer reads), and `markets.json`, which ties each mainnet pool to its copy. `pnpm deployments` writes it from what the chain and the Stocks API say, and checks first that each contract on the test network is the code `apps/contracts` compiles now (the constructor's immutables aside) and that the contracts are tied to each other, writing nothing if not. Run it after a deploy and after `pnpm provision`. It reads `CONTRACTS_OUT` (default `../contracts/out`, forge's output) and writes to `DEPLOYMENTS_DIR`.

## Cost (measured on Base Sepolia, about 0.006 gwei)

A first write is about 49k gas per pool and an update about 13k (estimated). Deploying the mirror and writing 5 pools cost under 4e-6 ETH. Run it on any
small always-on host (it makes a few RPC calls a minute); it is not for Vercel.

## Tests

`pnpm test` and `pnpm typecheck`. The pure parts (which pools to write, batching, config) are tested; reading and writing the chains are not mocked.
