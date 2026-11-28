import type { Address, PublicClient } from "viem"
import { inBatches } from "../../common/batches.js"
import type { Pool } from "../../common/pool.type.js"
import { LOG_FILTER_SIZE, UNISWAP_V4_POOL_MANAGER } from "./base-mainnet.constants.js"
import { poolManagerSwapEvent, poolSwapEvent } from "./mainnet.abis.js"

// One swap in a mainnet pool: which of its two tokens came in, and how much. The pool is the key its state is kept under in the mirror.
export type Swap = { pool: Address; isToken0In: boolean; amountIn: bigint }

type Amounts = { amount0: bigint; amount1: bigint }

// Every swap in these pools from `fromBlock` to `toBlock`, oldest first. A request for each few pools, all at once.
export async function readSwaps(client: PublicClient, pools: Pool[], fromBlock: bigint, toBlock: bigint): Promise<Swap[]> {
  const contracts = pools.filter((pool) => pool.kind !== "uniswap-v4")
  const v4Pools = pools.filter((pool) => pool.kind === "uniswap-v4")
  const range = { fromBlock, toBlock }

  const [contractLogs, v4Logs] = await Promise.all([
    Promise.all(
      inBatches(contracts, LOG_FILTER_SIZE).map((some) => client.getLogs({ ...range, address: some.map(({ address }) => address), event: poolSwapEvent })),
    ),
    Promise.all(
      inBatches(v4Pools, LOG_FILTER_SIZE).map((some) =>
        client.getLogs({ ...range, address: UNISWAP_V4_POOL_MANAGER, event: poolManagerSwapEvent, args: { id: some.map(({ poolId }) => poolId) } }),
      ),
    ),
  ])

  const poolOfAddress = new Map(contracts.map((pool) => [pool.address.toLowerCase(), pool.address]))
  const poolOfId = new Map(v4Pools.map((pool) => [pool.poolId.toLowerCase(), pool.address]))

  const swaps = [
    ...contractLogs.flat().map((log) => ({ at: orderOf(log), pool: poolOfAddress.get(log.address.toLowerCase()), swap: paidIn(log.args as Amounts) })),
    ...v4Logs.flat().map((log) => ({ at: orderOf(log), pool: poolOfId.get(log.args.id?.toLowerCase() ?? ""), swap: paidIn(negated(log.args as Amounts)) })),
  ]
  return swaps
    .sort((a, b) => a.at - b.at)
    .flatMap(({ pool, swap }) => (pool && swap ? [{ pool, ...swap }] : []))
}

function orderOf(log: { blockNumber: bigint | null; logIndex: number | null }): number {
  return Number(log.blockNumber ?? 0n) * 100_000 + (log.logIndex ?? 0)
}

// The pool is paid in the token whose amount is positive. A swap that paid in nothing is no swap.
function paidIn({ amount0, amount1 }: Amounts): { isToken0In: boolean; amountIn: bigint } | undefined {
  if (amount0 > 0n) return { isToken0In: true, amountIn: amount0 }
  if (amount1 > 0n) return { isToken0In: false, amountIn: amount1 }
  return undefined
}

// v4 says it from the swapper's side, which is the pool's with the signs turned
function negated({ amount0, amount1 }: Amounts): Amounts {
  return { amount0: -amount0, amount1: -amount1 }
}
