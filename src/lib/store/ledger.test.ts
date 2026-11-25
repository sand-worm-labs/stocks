import { describe, expect, it } from "vitest"

import { SWAP_FEE_RATE } from "@/constants/trade"
import { withFee } from "@/lib/trade/fee"

import { depositedIn, type LedgerLine, openingLines, positionsOf } from "./ledger"

const at = new Date("2026-11-24T10:00:00.000Z")
const holdings = [
  { symbol: "NVDAc", units: 2, entryPrice: 100, cost: 200, value: 200 },
  { symbol: "TSLAc", units: 1, entryPrice: 300, cost: 300, value: 300 },
]

describe("the ledger a strategy starts with", () => {
  it("pays in what was paid, fee included, and buys each stock at what it cost", () => {
    const lines = openingLines(holdings, withFee(500), at)
    expect(lines[0]).toMatchObject({ kind: "deposit", usdc: withFee(500) })
    expect(lines.slice(1)).toMatchObject([
      { kind: "buy", symbol: "NVDAc", units: 2, price: 100, fee: 200 * SWAP_FEE_RATE },
      { kind: "buy", symbol: "TSLAc", units: 1, price: 300, fee: 300 * SWAP_FEE_RATE },
    ])
  })

  it("leaves nothing in cash, and gives the same stocks back", () => {
    const { holdings: held, cash } = positionsOf(openingLines(holdings, withFee(500), at))
    expect(cash).toBe(0)
    expect(held).toEqual(holdings)
  })
})

describe("what a ledger comes to", () => {
  const lines: LedgerLine[] = [
    { kind: "deposit", usdc: 1000, at },
    { kind: "buy", symbol: "NVDAc", units: 4, price: 100, usdc: -400, at },
    { kind: "buy", symbol: "NVDAc", units: 4, price: 200, usdc: -800, at },
  ]

  it("averages what was paid across buys", () => {
    const [held] = positionsOf(lines).holdings
    expect(held).toMatchObject({ units: 8, cost: 1200, entryPrice: 150 })
  })

  it("takes a sale out at the average paid, so what is left still cost what it did", () => {
    const { holdings: after, cash } = positionsOf([
      ...lines,
      { kind: "sell", symbol: "NVDAc", units: -2, price: 300, usdc: 600, at },
    ])
    expect(after[0]).toMatchObject({ units: 6, cost: 900, entryPrice: 150 })
    expect(cash).toBe(400)
  })

  it("drops a stock sold down to nothing", () => {
    const sold = positionsOf([...lines, { kind: "sell", symbol: "NVDAc", units: -8, price: 100, usdc: 800, at }])
    expect(sold.holdings).toEqual([])
  })

  it("counts only what was paid in as deposited", () => {
    expect(depositedIn(lines)).toBe(1000)
  })
})
