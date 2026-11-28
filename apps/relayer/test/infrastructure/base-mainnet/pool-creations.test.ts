import { describe, expect, it } from "vitest"
import { rangesBetween } from "../../../src/infrastructure/base-mainnet/pool-creations.js"
import { LOG_RANGE } from "../../../src/infrastructure/base-mainnet/base-mainnet.constants.js"

describe("rangesBetween", () => {
  it("covers every block once, in ranges the RPC will answer", () => {
    const ranges = rangesBetween(100n, 100n + LOG_RANGE * 2n + 5n)
    expect(ranges).toHaveLength(3)
    expect(ranges[0]).toEqual([100n, 100n + LOG_RANGE - 1n])
    expect(ranges[1]?.[0]).toBe((ranges[0]?.[1] ?? 0n) + 1n)
    expect(ranges[2]?.[1]).toBe(100n + LOG_RANGE * 2n + 5n)
  })

  it("is one range when the blocks are few, and none when the end is before the start", () => {
    expect(rangesBetween(10n, 20n)).toEqual([[10n, 20n]])
    expect(rangesBetween(20n, 10n)).toEqual([])
  })
})
