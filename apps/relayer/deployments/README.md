# Deployments

What is deployed, on the Base mainnet the relayer reads and on the Base Sepolia test network it writes. Written by `pnpm deployments` in `apps/relayer`, from what the
chain and the Stocks API say, so run it again after a deploy or after `pnpm provision`. It writes nothing unless every contract on the test network is the code
`apps/contracts` compiles now and the contracts are tied to each other.

## Base Sepolia contracts

Deployed and owned by `0x7eB6F37C3665637E237d8221592EfC98F5A72ac3`.

| Contract | Address |
| --- | --- |
| StockFaucet | `0xB10277F2E8e0f5B7f33C3f2336d066c7f3fDd842` |
| MirrorBook | `0xc94E63986B37e5592254c287863aE672aE02C568` |
| TestUSDC | `0xf0c0df2210F349837823896debC20D7f38551DF6` |
| MirrorPoolFactory | `0x783D7A94954f2Db73E9931fB0382953F8Bb55232` |
| MirrorRouter | `0xB2d0556CF32c1a34a56D39d044Aec5d3D930ad3D` |

## Files

| File | What it lists |
| --- | --- |
| `markets.json` | each stock that has a copy: its mainnet token and pool, and its test token and the pool that copies it |
| `base-mainnet/tokens.json`, `pools.json` | the stock tokens and the 65 pools the relayer mirrors, each marked as copied or not (47 are) |
| `base-mainnet/contracts.json` | the mainnet contracts the relayer reads: USDC, Multicall3, Uniswap v4's pool manager and StateView |
| `base-sepolia/contracts.json` | the contracts above, each checked against the compiled code |
| `base-sepolia/tokens.json`, `pools.json` | the 47 test tokens, and the pools that copy mainnet pools |

A Uniswap v4 pool has no address, only an id, so it appears by `poolId` and by the `mirrorKey` (the last 20 bytes of its id) the mirror keeps its price under.
