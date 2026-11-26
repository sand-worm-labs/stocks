import { describe, expect, it } from "vitest"

import { closeSummary, daysLeftInTrash, deleteConsequences } from "@/lib/strategies/manage"

describe("what a person is told before closing or deleting", () => {
  it("says what a close would sell, in the words of what is held", () => {
    expect(closeSummary({ stocks: 3, value: 700, cash: 51.5 })).toBe("It holds 3 stocks and cash, about 751.50 USDC in all.")
    expect(closeSummary({ stocks: 1, value: 10, cash: 0 })).toBe("It holds 1 stock and cash, about 10.00 USDC in all.")
    expect(closeSummary({ stocks: 0, value: 0, cash: 12 })).toBe("It holds no stocks, only cash: 12.00 USDC.")
  })

  it("says what goes to the trash, which depends on what the strategy is, and that the notebook stays", () => {
    expect(deleteConsequences("draft")[0]).toMatch(/Nothing has been traded/)
    expect(deleteConsequences("closed")[0]).toMatch(/record of what was bought and sold/)
    for (const status of ["draft", "closed", "unbuildable"]) {
      const lines = deleteConsequences(status).join(" ")
      expect(lines).toMatch(/chat with the agent and its activity/)
      expect(lines).toMatch(/no longer be able to open it/)
      expect(lines).toMatch(/notebook stays in your Sandworm workspace/)
    }
  })

  it("counts the days a deleted strategy has left, rounding up, and never below none", () => {
    const now = Date.parse("2026-11-26T12:00:00Z")
    expect(daysLeftInTrash("2026-12-26T12:00:00Z", now)).toBe(30)
    expect(daysLeftInTrash("2026-11-27T01:00:00Z", now)).toBe(1)
    expect(daysLeftInTrash("2026-11-20T00:00:00Z", now)).toBe(0)
  })
})
