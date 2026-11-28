import type { Address } from "viem"
import { describe, expect, it } from "vitest"
import type { Pool, PoolDetail } from "../../../src/common/pool.type.js"
import { feeBpsOf, planPool, seedAmounts, testSymbolOf, type Shape } from "../../../src/features/provision/plan.js"
import { BASE_USDC } from "../../../src/features/provision/provision.constants.js"

const stock = "0xb200000000000000000000000d3176ee4af1102d"
const address = (byte: string) => `0x${byte.repeat(20)}` as Address

const pool = (detail: Partial<PoolDetail> = {}): Pool => ({
  name: "NVDAc",
  address: address("ab"),
  kind: "aerodrome-cl",
  detail: { stock: stock as Address, quote: BASE_USDC as Address, liquidityUsd: 1_000_000, priceUsd: 150, ...detail },
})
const shape = (token0: string, token1: string): Shape => ({ token0: token0 as Address, token1: token1 as Address, tickSpacing: 100, fee: 500 })

describe("the numbers", () => {
  it("names a test token the way the faucet allows", () => {
    expect(testSymbolOf("NVDAc")).toBe("tNVDAc")
    expect(testSymbolOf("BRK.Bc")).toBe("tBRKBc")
  })

  it("turns a fee in hundredths of a basis point into basis points, never to nothing", () => {
    expect(feeBpsOf(500)).toBe(5)
    expect(feeBpsOf(525)).toBe(5)
    expect(feeBpsOf(3000)).toBe(30)
    expect(feeBpsOf(10)).toBe(1)
  })

  it("puts half the depth on each side at the pool's price", () => {
    // $1M deep: $500,000 of USDC (6 decimals) and 500000 / 150 = 3333.33 stocks (8 decimals)
    expect(seedAmounts(1_000_000, 150)).toEqual({ usdc: 500_000_000_000n, stock: 333_333_333_333n })
  })
})

describe("planPool", () => {
  it("plans a copy with the pool's token order", () => {
    const stockFirst = planPool(pool(), shape(stock, BASE_USDC))
    const usdcFirst = planPool(pool(), shape(BASE_USDC, stock))

    expect(stockFirst).toMatchObject({ plan: { stockIsToken0: true, testSymbol: "tNVDAc", feeBps: 5, tickSpacing: 100 } })
    expect(usdcFirst).toMatchObject({ plan: { stockIsToken0: false } })
  })

  it("skips what it cannot copy faithfully, and says why", () => {
    const other = address("99")
    expect(planPool(pool({ quote: other }), shape(stock, BASE_USDC))).toEqual({ skipped: expect.stringContaining("not USDC") })
    expect(planPool(pool({ liquidityUsd: 5 }), shape(stock, BASE_USDC))).toEqual({ skipped: expect.stringContaining("5 dollars deep") })
    expect(planPool(pool(), shape(stock, address("77")))).toEqual({ skipped: expect.stringContaining("not the stock and USDC") })
    expect(planPool({ ...pool(), detail: undefined }, shape(stock, BASE_USDC))).toEqual({ skipped: expect.stringContaining("nothing is known") })
  })
})
