import type { PublicClient } from "viem"

export type FoundBlock = {
  block: bigint
  // False when the node no longer serves blocks as old as the moment, so `block` is the oldest it does serve
  reachesMoment: boolean
}

// The first block made at or after a moment. The chain's block time has changed more than once, so it is searched for, not worked out from a block time.
// A node that keeps only recent blocks refuses the old ones, and that is read as "older than the moment": the search then ends at the oldest block it serves.
export async function findBlockAt(client: PublicClient, moment: Date, head: bigint): Promise<FoundBlock> {
  const seconds = BigInt(Math.floor(moment.getTime() / 1000))
  let low = 0n
  let high = head
  while (low < high) {
    const middle = (low + high) / 2n
    const timestamp = await timestampOf(client, middle)
    const isBefore = timestamp === undefined || timestamp < seconds
    if (isBefore) low = middle + 1n
    else high = middle
  }
  const timestamp = await timestampOf(client, low)
  return { block: low, reachesMoment: timestamp !== undefined && timestamp - seconds < ONE_DAY }
}

const ONE_DAY = 86_400n

async function timestampOf(client: PublicClient, blockNumber: bigint): Promise<bigint | undefined> {
  try {
    const { timestamp } = await client.getBlock({ blockNumber })
    return timestamp
  } catch {
    return undefined
  }
}
