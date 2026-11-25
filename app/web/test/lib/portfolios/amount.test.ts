import { describe, expect, it } from "vitest"

import { readAmount } from "@/lib/portfolios/amount"

const rules = { min: 1, max: 1000 }

describe("readAmount", () => {
  it("reads an amount that can be used, as a share of the most", () => {
    expect(readAmount("250", rules)).toEqual({ amount: 250, fraction: 0.25 })
    expect(readAmount("1,000.00", rules)).toEqual({ amount: 1000, fraction: 1 })
  })

  it("says what is wrong with one that can't be", () => {
    expect(readAmount("", rules).error).toBe("Enter an amount")
    expect(readAmount("abc", rules).error).toBe("Enter an amount")
    expect(readAmount("0.5", rules).error).toBe("The least is 1.00 USDC")
    expect(readAmount("1200", rules).error).toBe("The most is 1000.00 USDC")
  })

  it("uses the words it is given for each", () => {
    const worded = { ...rules, under: (n: number) => `Sell at least ${n}`, over: (n: number) => `Only ${n} held` }

    expect(readAmount("0", worded).error).toBe("Sell at least 1")
    expect(readAmount("5000", worded).error).toBe("Only 1000 held")
  })

  it("lets the most be used whole when it is under the least", () => {
    expect(readAmount("0.6", { min: 1, max: 0.6 })).toEqual({ amount: 0.6, fraction: 1 })
  })
})
