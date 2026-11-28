import type { Address, PublicClient } from "viem"
import { describe, expect, it } from "vitest"
import type { Pool } from "../../../src/common/pool.type.js"
import type { RelayConfig } from "../../../src/core/config/relay.config.js"
import { createReplay, replayRound } from "../../../src/features/replay/replay.js"
import { addressOf } from "../../support/addresses.js"

const pools: Pool[] = [{ name: "A", address: addressOf(1), kind: "uniswap-v3" }]
const dryRun = { isDryRun: true } as RelayConfig

// A mainnet that gives one swap in the pool for any range asked, and writes down the ranges
function fakeMainnet() {
  const ranges: [bigint, bigint][] = []
  const client = {
    getLogs: async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) => {
      ranges.push([fromBlock, toBlock])
      return [{ address: addressOf(1), args: { amount0: 5n, amount1: -5n }, blockNumber: toBlock, logIndex: 0 }]
    },
  }
  return { client: client as unknown as PublicClient, ranges }
}

describe("replayRound", () => {
  it("starts from now: the first round replays nothing and says where it will begin", async () => {
    const { client, ranges } = fakeMainnet()
    const replay = createReplay()
    await replayRound(dryRun, client, pools, 1000n, replay)

    expect(ranges).toEqual([])
    expect(replay.nextBlock).toBe(1001n)
  })

  it("reads each later round from where the last one stopped", async () => {
    const { client, ranges } = fakeMainnet()
    const replay = createReplay()
    await replayRound(dryRun, client, pools, 1000n, replay)
    await replayRound(dryRun, client, pools, 1003n, replay)
    await replayRound(dryRun, client, pools, 1004n, replay)

    expect(ranges).toEqual([
      [1001n, 1003n],
      [1004n, 1004n],
    ])
    expect(replay.nextBlock).toBe(1005n)
  })

  it("reads nothing when the mainnet has not moved on", async () => {
    const { client, ranges } = fakeMainnet()
    const replay = createReplay()
    await replayRound(dryRun, client, pools, 1000n, replay)
    await replayRound(dryRun, client, pools, 1000n, replay)
    expect(ranges).toEqual([])
  })

  it("looks back a limited way, so a relayer that was stopped does not replay an hour at once", async () => {
    const { client, ranges } = fakeMainnet()
    const replay = createReplay()
    await replayRound(dryRun, client, pools, 1000n, replay)
    await replayRound(dryRun, client, pools, 5000n, replay)
    expect(ranges).toEqual([[4851n, 5000n]])
  })

  it("keeps its place when the mainnet cannot be read, so the swaps are read again next round", async () => {
    const replay = createReplay()
    await replayRound(dryRun, { getLogs: async () => [] } as unknown as PublicClient, pools, 1000n, replay)
    const broken = { getLogs: async () => Promise.reject(new Error("rate limited")) } as unknown as PublicClient

    await expect(replayRound(dryRun, broken, pools, 1010n, replay)).rejects.toThrow("rate limited")
    expect(replay.nextBlock).toBe(1001n)
  })

  it("sends nothing on a dry run", async () => {
    const { client } = fakeMainnet()
    const replay = createReplay()
    await replayRound(dryRun, client, pools, 1000n, replay)
    await expect(replayRound(dryRun, client, pools, 1002n, replay)).resolves.toBeUndefined()
    expect(replay.copies.size).toBe(0)
  })
})
