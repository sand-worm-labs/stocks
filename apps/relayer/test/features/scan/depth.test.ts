import { describe, expect, it } from "vitest"
import { depthOf } from "../../../src/features/scan/depth.js"

const Q96 = 2n ** 96n

describe("depthOf", () => {
  it("reads a stock that is token0 as quote per stock, and counts both sides of the quote", () => {
    // sqrt price 2 in raw units: 4 raw quote per raw stock; the same decimals on both sides
    const depth = depthOf({ sqrtPriceX96: 2n * Q96, liquidity: 1_000_000n }, { isStockToken0: true, stockDecimals: 6, quoteDecimals: 6 })
    expect(depth?.priceInQuote).toBeCloseTo(4)
    // token1 held in range is L * sqrt(price) = 2,000,000 raw = 2 quote, counted twice
    expect(depth?.depthInQuote).toBeCloseTo(4)
  })

  it("reads a stock that is token1 from the other side", () => {
    const depth = depthOf({ sqrtPriceX96: Q96 / 2n, liquidity: 1_000_000n }, { isStockToken0: false, stockDecimals: 6, quoteDecimals: 6 })
    expect(depth?.priceInQuote).toBeCloseTo(4)
    expect(depth?.depthInQuote).toBeCloseTo(4)
  })

  it("moves the decimal point when the two tokens count in different decimals", () => {
    const depth = depthOf({ sqrtPriceX96: Q96, liquidity: 10n ** 12n }, { isStockToken0: true, stockDecimals: 18, quoteDecimals: 6 })
    expect(depth?.priceInQuote).toBeCloseTo(1e12)
  })

  it("says nothing of a pool that has no price yet", () => {
    expect(depthOf({ sqrtPriceX96: 0n, liquidity: 5n }, { isStockToken0: true, stockDecimals: 8, quoteDecimals: 6 })).toBeUndefined()
  })
})
