import type { Address, Hex, PublicClient } from "viem"
import type { Pool } from "../../common/pool.type.js"
import type { PoolState } from "../../features/mirror/state.type.js"
import { MULTICALL3, UNISWAP_V4_STATE_VIEW } from "./base-mainnet.constants.js"
import { slipstreamPoolAbi, uniswapV3PoolAbi, uniswapV4StateViewAbi } from "./mainnet.abis.js"

export type MainnetReading = {
  mainnetBlock: bigint
  states: Map<Address, PoolState>
  unreadable: Pool[]
}

type Price = Pick<PoolState, "sqrtPriceX96" | "tick" | "liquidity">

// What a multicall says about one call: its answer, or that it failed
type Answer<T> = { status: "success"; result: T } | { status: "failure" }

// All three kinds answer a price as (sqrtPriceX96, tick, ...) and a depth as one number
type Slot0 = readonly [bigint, number, ...unknown[]]

type V4Pool = Pool & { kind: "uniswap-v4"; poolId: Hex }

// Every pool is read at one block, so the prices in a batch belong together. The whole book is a few requests, not two for each pool,
// so the copies on the test network trail the mainnet by a block or two.
export async function readMainnet(client: PublicClient, pools: Pool[]): Promise<MainnetReading> {
  const mainnetBlock = await client.getBlockNumber()
  const uniswapV3 = pools.filter((pool) => pool.kind === "uniswap-v3")
  const slipstream = pools.filter((pool) => pool.kind === "aerodrome-cl")
  const uniswapV4 = pools.filter((pool): pool is V4Pool => pool.kind === "uniswap-v4")

  const [pricesV3, pricesSlipstream, pricesV4] = await Promise.all([
    readUniswapV3(client, uniswapV3, mainnetBlock),
    readSlipstream(client, slipstream, mainnetBlock),
    readUniswapV4(client, uniswapV4, mainnetBlock),
  ])

  const states = new Map<Address, PoolState>()
  const unreadable: Pool[] = []
  const readings = [
    ...pair(uniswapV3, pricesV3),
    ...pair(slipstream, pricesSlipstream),
    ...pair(uniswapV4, pricesV4),
  ]
  for (const [pool, price] of readings) {
    // One broken pool must not stop the others from being mirrored
    if (!price) unreadable.push(pool)
    else states.set(pool.address, { ...price, mainnetBlock })
  }
  return { mainnetBlock, states, unreadable }
}

function pair<T extends Pool>(pools: T[], prices: (Price | undefined)[]): [Pool, Price | undefined][] {
  return pools.map((pool, index) => [pool, prices[index]])
}

function toPrice(slot0: Answer<Slot0> | undefined, liquidity: Answer<bigint> | undefined): Price | undefined {
  if (slot0?.status !== "success" || liquidity?.status !== "success") return undefined
  const [sqrtPriceX96, tick] = slot0.result
  return { sqrtPriceX96, tick, liquidity: liquidity.result }
}

// Uniswap v3: each pool is a contract that answers slot0() and liquidity()
async function readUniswapV3(client: PublicClient, pools: Pool[], blockNumber: bigint): Promise<(Price | undefined)[]> {
  if (pools.length === 0) return []
  const abi = uniswapV3PoolAbi
  const options = { multicallAddress: MULTICALL3, blockNumber, batchSize: 0 }
  const [slot0, liquidity] = await Promise.all([
    client.multicall({ ...options, contracts: pools.map(({ address }) => ({ address, abi, functionName: "slot0" as const })) }),
    client.multicall({ ...options, contracts: pools.map(({ address }) => ({ address, abi, functionName: "liquidity" as const })) }),
  ])
  return pools.map((_, index) => toPrice(slot0[index], liquidity[index]))
}

// Aerodrome Slipstream: the same two calls, with a slot0() of fewer fields
async function readSlipstream(client: PublicClient, pools: Pool[], blockNumber: bigint): Promise<(Price | undefined)[]> {
  if (pools.length === 0) return []
  const abi = slipstreamPoolAbi
  const options = { multicallAddress: MULTICALL3, blockNumber, batchSize: 0 }
  const [slot0, liquidity] = await Promise.all([
    client.multicall({ ...options, contracts: pools.map(({ address }) => ({ address, abi, functionName: "slot0" as const })) }),
    client.multicall({ ...options, contracts: pools.map(({ address }) => ({ address, abi, functionName: "liquidity" as const })) }),
  ])
  return pools.map((_, index) => toPrice(slot0[index], liquidity[index]))
}

// Uniswap v4: a pool is an id, read through the StateView contract
async function readUniswapV4(client: PublicClient, pools: V4Pool[], blockNumber: bigint): Promise<(Price | undefined)[]> {
  if (pools.length === 0) return []
  const address = UNISWAP_V4_STATE_VIEW
  const abi = uniswapV4StateViewAbi
  const options = { multicallAddress: MULTICALL3, blockNumber, batchSize: 0 }
  const [slot0, liquidity] = await Promise.all([
    client.multicall({ ...options, contracts: pools.map(({ poolId }) => ({ address, abi, functionName: "getSlot0" as const, args: [poolId] as const })) }),
    client.multicall({ ...options, contracts: pools.map(({ poolId }) => ({ address, abi, functionName: "getLiquidity" as const, args: [poolId] as const })) }),
  ])
  return pools.map((_, index) => toPrice(slot0[index], liquidity[index]))
}
