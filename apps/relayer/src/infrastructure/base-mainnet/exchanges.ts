import { parseAbiItem, type Address, type Hex, type PublicClient } from "viem"
import type { ContractKind, Pool, PoolKind } from "../../common/pool.type.js"
import { mirrorKeyOf } from "../../common/pool-key.js"
import { AERODROME_CL_FACTORIES, UNISWAP_V3_FACTORY, UNISWAP_V4_POOL_MANAGER } from "./base-mainnet.constants.js"

// Where each exchange says a pool was made, and how. This is the one place that ties an exchange to its contracts and events; the scan reads whatever is
// listed in `EXCHANGES` and knows no exchange by name, so a new one is a new entry here.
export type Creation = {
  kind: PoolKind
  // A contract's address, or for a v4 pool its id
  id: Hex
  token0: Address
  token1: Address
  tickSpacing: number
  // The fee the pool started with, in hundredths of a basis point. Slipstream does not say it; a v4 pool's may change.
  fee: number | undefined
  // A v4 pool's hooks contract
  hooks: Address | undefined
  block: bigint
  // The contract that made the pool: a factory, or for a v4 pool the pool manager
  createdBy: Address
  // The contract to look up to check the pool: the pool itself, or for a v4 pool (which has no address) the pool manager that holds it
  contract: Address
  asPool: (name: string) => Pool
}

export type Exchange = {
  kind: PoolKind
  creationsBetween: (client: PublicClient, fromBlock: bigint, toBlock: bigint) => Promise<Creation[]>
}

// What an exchange's event says, before it is given the exchange's kind and the way to read the pool
type Made = Omit<Creation, "kind" | "asPool" | "contract">

function contractExchange(kind: ContractKind, read: (client: PublicClient, fromBlock: bigint, toBlock: bigint) => Promise<Made[]>): Exchange {
  const asPool = (id: Hex) => (name: string): Pool => ({ name, address: id as Address, kind })
  return {
    kind,
    creationsBetween: async (client, from, to) => (await read(client, from, to)).map((made) => ({ ...made, kind, contract: made.id as Address, asPool: asPool(made.id) })),
  }
}

const uniswapV3Created = parseAbiItem(
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
)
const slipstreamCreated = parseAbiItem(
  "event PoolCreated(address indexed token0, address indexed token1, int24 indexed tickSpacing, address pool)",
)
const uniswapV4Initialized = parseAbiItem(
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
)

// `strict` leaves out an event that does not decode, so every field of the ones kept is there
export const uniswapV3 = contractExchange("uniswap-v3", async (client, fromBlock, toBlock) => {
  const logs = await client.getLogs({ address: UNISWAP_V3_FACTORY, event: uniswapV3Created, fromBlock, toBlock, strict: true })
  return logs.map(({ args, blockNumber, address }) => ({ id: args.pool, token0: args.token0, token1: args.token1, tickSpacing: args.tickSpacing, fee: args.fee, hooks: undefined, block: blockNumber, createdBy: address }))
})

export const slipstream = contractExchange("aerodrome-cl", async (client, fromBlock, toBlock) => {
  const logs = await client.getLogs({ address: AERODROME_CL_FACTORIES, event: slipstreamCreated, fromBlock, toBlock, strict: true })
  return logs.map(({ args, blockNumber, address }) => ({ id: args.pool, token0: args.token0, token1: args.token1, tickSpacing: args.tickSpacing, fee: undefined, hooks: undefined, block: blockNumber, createdBy: address }))
})

// A v4 pool is no contract: its id is read through the pool manager, and the mirror keeps it under the end of the id
const V4_KIND = "uniswap-v4" as const

export const uniswapV4: Exchange = {
  kind: V4_KIND,
  creationsBetween: async (client, fromBlock, toBlock) => {
    const logs = await client.getLogs({ address: UNISWAP_V4_POOL_MANAGER, event: uniswapV4Initialized, fromBlock, toBlock, strict: true })
    return logs.map(({ args, blockNumber, address }): Creation => ({
      kind: V4_KIND,
      id: args.id,
      token0: args.currency0,
      token1: args.currency1,
      tickSpacing: args.tickSpacing,
      fee: args.fee,
      hooks: args.hooks,
      block: blockNumber,
      createdBy: address,
      contract: address,
      asPool: (name) => ({ name, address: mirrorKeyOf(args.id), kind: V4_KIND, poolId: args.id }),
    }))
  },
}

export const EXCHANGES: Exchange[] = [uniswapV3, slipstream, uniswapV4]
