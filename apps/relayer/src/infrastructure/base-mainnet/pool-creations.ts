import type { PublicClient } from "viem"
import { mapInBatches } from "../../common/batches.js"
import { LOG_RANGE } from "./base-mainnet.constants.js"
import { EXCHANGES, type Creation } from "./exchanges.js"

// A few at a time, so the public RPC is not asked for the whole history at once
const RANGES_AT_ONCE = 3
const ATTEMPTS = 4

// Every pool made on any listed exchange between two blocks
export async function readPoolCreations(client: PublicClient, fromBlock: bigint, toBlock: bigint, onRange?: (done: number, total: number) => void): Promise<Creation[]> {
  const ranges = rangesBetween(fromBlock, toBlock)
  let done = 0
  const found = await mapInBatches(ranges, RANGES_AT_ONCE, async ([from, to]) => {
    const creations = await readRange(client, from, to)
    onRange?.(++done, ranges.length)
    return creations
  })
  return found.flat()
}

export function rangesBetween(fromBlock: bigint, toBlock: bigint): [bigint, bigint][] {
  const ranges: [bigint, bigint][] = []
  for (let from = fromBlock; from <= toBlock; from += LOG_RANGE) {
    const to = from + LOG_RANGE - 1n
    ranges.push([from, to < toBlock ? to : toBlock])
  }
  return ranges
}

async function readRange(client: PublicClient, fromBlock: bigint, toBlock: bigint): Promise<Creation[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const perExchange = await Promise.all(EXCHANGES.map((exchange) => exchange.creationsBetween(client, fromBlock, toBlock)))
      return perExchange.flat()
    } catch (error) {
      if (attempt === ATTEMPTS) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
}
