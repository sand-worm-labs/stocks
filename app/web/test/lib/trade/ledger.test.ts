import { describe, expect, it } from "vitest"

import { depositLines, LedgerError, ledgerOf, positionsOf, saleLines, withdrawLine, withLines } from "@/lib/trade/ledger"
import type { StrategyRecord } from "@/types/store"


const AT = "2026-11-25T12:00:00.000Z"
const price = (symbol: string) => ({ NVDAc: 100, TSLAc: 200 })[symbol]

// A strategy that went live with 400 USDC: 2 NVDAc and 1 TSLAc bought, and the fee paid on them
const live = {
  status: "live",
  startedAt: AT,
  updatedAt: AT,
  funding: { mode: "paper", amount: 401.2 },
  cash: 0,
  holdings: [
    { symbol: "NVDAc", units: 2, entryPrice: 100, cost: 200, value: 200 },
    { symbol: "TSLAc", units: 1, entryPrice: 200, cost: 200, value: 200 },
  ],
} as unknown as StrategyRecord

describe("the ledger", () => {
  it("is made from what a strategy holds when it has none, and comes to the same holdings and cash", () => {
    const lines = ledgerOf(live)
    expect(lines.map(({ kind }) => kind)).toEqual(["deposit", "buy", "buy"])
    const { holdings, cash } = positionsOf(lines)
    expect(holdings.map(({ symbol, units }) => [symbol, units])).toEqual([["NVDAc", 2], ["TSLAc", 1]])
    expect(cash).toBeCloseTo(0, 5)
  })

  it("adds money, spreads it over the stocks with room, and keeps what the fee costs", () => {
    const lines = depositLines(live, 100, [{ symbol: "NVDAc", spend: 60 }, { symbol: "TSLAc", spend: 40 }], price, AT)
    expect(lines.map(({ kind }) => kind)).toEqual(["deposit", "buy", "buy"])
    const next = withLines(live, lines)
    const nvda = next.holdings.find(({ symbol }) => symbol === "NVDAc")
    expect(nvda?.units).toBeCloseTo(2 + (60 / 1.003) / 100, 5)
    // What was put in is all accounted for: held at cost, fees paid, and what is left as cash
    expect(next.cash).toBeGreaterThanOrEqual(0)
    expect(next.cash).toBeLessThan(0.01)
  })

  it("leaves what can't be placed as cash, when the stocks have no room", () => {
    const next = withLines(live, depositLines(live, 50, [], price, AT))
    expect(next.cash).toBeCloseTo(50, 5)
    expect(next.holdings).toHaveLength(2)
  })

  it("sells a share of a stock at today's price, takes the fee off, and keeps the price paid for the rest", () => {
    const next = withLines(live, saleLines(live, ["NVDAc"], 0.5, price, AT))
    const nvda = next.holdings.find(({ symbol }) => symbol === "NVDAc")
    expect(nvda?.units).toBeCloseTo(1)
    expect(nvda?.entryPrice).toBeCloseTo(100)
    expect(next.cash).toBeCloseTo(100 * (1 - 0.003), 3)
  })

  it("sells everything held, and nothing is left but cash", () => {
    const next = withLines(live, saleLines(live, ["NVDAc", "TSLAc"], 1, price, AT))
    expect(next.holdings).toEqual([])
    expect(next.cash).toBeCloseTo(400 * (1 - 0.003), 3)
  })

  it("takes out cash, but only cash", () => {
    const withCash = withLines(live, saleLines(live, ["NVDAc"], 1, price, AT))
    expect(withdrawLine(withCash, 100, AT)).toMatchObject({ kind: "withdraw", usdc: -100 })
    expect(() => withdrawLine(live, 10, AT)).toThrow(LedgerError)
  })

  it("refuses what makes no sense", () => {
    expect(() => saleLines(live, ["NVDAc"], 0, price, AT)).toThrow(LedgerError)
    expect(() => saleLines(live, ["NVDAc"], 1.5, price, AT)).toThrow(LedgerError)
    expect(() => saleLines(live, ["GHOSTc"], 1, price, AT)).toThrow(/isn't held/)
    expect(() => depositLines(live, 0, [], price, AT)).toThrow(LedgerError)
  })
})
