# Stocks contracts

Foundry project for the onchain side of Sandworm Stocks, built on [Reactive Network](https://dev.reactive.network) reactive contracts: a reactive contract watches events on one chain and, when one matches, asks the Reactive Network to call a contract on another chain.

```
src/    the contracts (ExampleReactive and ExampleCallback are a placeholder for the pattern: replace them)
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

## How a reactive contract works

There are always two contracts:

| | Lives on | Does |
|---|---|---|
| **Reactive contract** (`ExampleReactive`) | The Reactive Network (Lasna for testing) | Subscribes to an event on an origin chain. For each match its `react` runs and emits a `Callback`. |
| **Callback contract** (`ExampleCallback`) | The destination chain, such as Base | Receives the call the Network makes for that `Callback`, and does the work. |

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

Base has no tokenized stocks on its test networks, so `src/testnet/` makes stand-ins: seven `TestStock` tokens (tAAPLc, tNVDAc, tAMZNc, tGOOGLc, tMSFTc, tTSLAc, tMETAc, with the real tokens' **8 decimals**) and a `StockFaucet` that gives out 1,000 of each, once a day per account. The faucet refuses to deploy on Base mainnet or Ethereum.

```bash
forge script script/DeployStockFaucet.s.sol --rpc-url base_sepolia --private-key $PRIVATE_KEY --broadcast
```

It prints the faucet and each token's address. Anyone then calls `claim()` on the faucet (a block explorer's "Write contract" tab works) to get the test stocks. Test USDC comes from Circle's or Coinbase's faucet, not from here. These tokens have no pools yet: a mock pool and router come next, for testing the stop-loss end to end.

## Deploying

Fill in `.env` first. The commands below are the shape of it, not a tested recipe: check the current network addresses, chain ids and callback proxies on [dev.reactive.network](https://dev.reactive.network) before using real keys, because they have changed between testnets.

```bash
# 1. The callback contract, on the destination chain
forge create src/ExampleCallback.sol:ExampleCallback --rpc-url base_sepolia --private-key $PRIVATE_KEY \
  --constructor-args <callback proxy on that chain>

# 2. The reactive contract, on the Reactive Network, pointing at the first
forge create src/ExampleReactive.sol:ExampleReactive --rpc-url lasna --private-key $PRIVATE_KEY --value 0.1ether \
  --constructor-args <origin chain id> <origin contract> <destination chain id> <callback contract from step 1>
```

## Writing the real contracts

Stocks' rules (a portfolio stop, a stop-loss, ask-before-buying) are described in `apps/web/src/lib/rules/spec.ts`. Contracts that enforce them onchain should keep the same meaning: a limit is a fraction, and a stop sells everything and then waits `pause` trading days.
