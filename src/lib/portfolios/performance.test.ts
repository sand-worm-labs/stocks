import { describe, expect, it } from "vitest"

import { changeOver, returnOnDeposit, totalValueOverWeek, valueOverWeek } from "./performance"
import { isLive, portfolioValue } from "./portfolio"
import { getPortfolios } from "./source"

const NOW = "2026-11-20T12:00:00.000Z"
const live = (await getPortfolios()).find(isLive)!

describe("totalValueOverWeek", () => {
  it("is empty with nothing live", () => {
    expect(totalValueOverWeek([], NOW)).toEqual([])
  })

  it("adds up what is held in each live portfolio, point by point", () => {
    const one = valueOverWeek(live, NOW)
    const both = totalValueOverWeek([live, { ...live, id: "copy" }], NOW)
    expect(both).toHaveLength(one.length)
    expect(both[0]?.value).toBeCloseTo((one[0]?.value ?? 0) * 2)
  })
})

describe("totalValueOverWeek with real histories", () => {
  const nowMs = new Date(NOW).getTime()
  const history = [
    { label: "a", time: Math.floor(nowMs / 1000) - 7200, value: 100 },
    { label: "b", time: Math.floor(nowMs / 1000) - 3600, value: 110 },
  ]

  it("uses a portfolio's real history, ending at its live value and the clock", () => {
    const total = totalValueOverWeek([live], NOW, { [live.id]: history })

    expect(total[0]?.value).toBe(100)
    expect(total.at(-1)?.time).toBe(Math.floor(nowMs / 1000))
    expect(total.at(-1)?.value).toBeCloseTo(portfolioValue(live) ?? 0)
  })

  it("draws a portfolio with no history the old way", () => {
    expect(totalValueOverWeek([live], NOW, {})).toEqual(totalValueOverWeek([live], NOW))
  })
})

describe("changeOver", () => {
  it("is how far the last point is from the first", () => {
    expect(
      changeOver([
        { label: "a", time: 1, value: 100 },
        { label: "b", time: 2, value: 110 },
      ])
    ).toBeCloseTo(0.1)
    expect(changeOver([])).toBe(0)
  })
})

describe("returnOnDeposit", () => {
  it("is the profit over what was put in, from the cost of what is held and the cash", () => {
    const portfolio = {
      ...live,
      cash: 100,
      holdings: [{ symbol: "NVDAc", units: 2, entryPrice: 100, cost: 200, value: 230 }],
    }

    expect(returnOnDeposit(portfolio)).toBeCloseTo(30 / 300)
  })
})
