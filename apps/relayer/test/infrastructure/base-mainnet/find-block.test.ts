import type { PublicClient } from "viem"
import { describe, expect, it } from "vitest"
import { findBlockAt } from "../../../src/infrastructure/base-mainnet/find-block.js"

// A chain with a block every `seconds` from block 0 at time 0, whose node serves only the last `served` blocks
function fakeChain(head: bigint, seconds: bigint, served: bigint): PublicClient {
  const getBlock = async ({ blockNumber }: { blockNumber: bigint }) => {
    if (blockNumber < head - served) throw new Error("Archive requests require a personal token")
    return { timestamp: blockNumber * seconds }
  }
  return { getBlock } as unknown as PublicClient
}

describe("findBlockAt", () => {
  it("finds the first block made at or after the moment, whatever the block time", async () => {
    const found = await findBlockAt(fakeChain(1_000_000n, 2n, 1_000_000n), new Date(200_000 * 1000), 1_000_000n)
    expect(found).toEqual({ block: 100_000n, reachesMoment: true })
  })

  it("ends at the oldest block the node serves, and says it does not reach the moment", async () => {
    const found = await findBlockAt(fakeChain(1_000_000n, 10n, 1000n), new Date(1000 * 1000), 1_000_000n)
    expect(found.reachesMoment).toBe(false)
    expect(found.block).toBe(999_000n)
  })
})
