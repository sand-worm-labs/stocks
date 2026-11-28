import { describe, expect, it } from "vitest"
import { aggregateSwaps } from "../../../src/features/replay/trades.js"
import { addressOf } from "../../support/addresses.js"

describe("aggregateSwaps", () => {
  it("makes one trade of the swaps in one pool going one way", () => {
    const trades = aggregateSwaps([
      { pool: addressOf(1), isToken0In: true, amountIn: 100n },
      { pool: addressOf(1), isToken0In: true, amountIn: 50n },
    ])
    expect(trades).toEqual([{ pool: addressOf(1), isToken0In: true, amountIn: 150n }])
  })

  it("keeps the two directions of a pool, and different pools, apart", () => {
    const trades = aggregateSwaps([
      { pool: addressOf(1), isToken0In: true, amountIn: 100n },
      { pool: addressOf(1), isToken0In: false, amountIn: 7n },
      { pool: addressOf(2), isToken0In: true, amountIn: 3n },
    ])
    expect(trades).toHaveLength(3)
  })

  it("makes no trade of no swaps", () => {
    expect(aggregateSwaps([])).toEqual([])
  })
})
