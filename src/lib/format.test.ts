import { describe, expect, it } from "vitest"

import {
  formatAmount,
  formatCompactUsd,
  formatDecimal,
  formatPercent,
  formatSignedAmount,
  formatUsd,
  pluralize,
  shortenAddress,
} from "./format"

describe("format", () => {
  it("shows amounts with two decimals", () => {
    expect(formatAmount(504.2)).toBe("504.20")
    expect(formatUsd(144.87)).toBe("$144.87")
  })

  it("shortens large dollar figures", () => {
    expect(formatCompactUsd(656_780)).toBe("$656.78K")
  })

  it("signs a gain or a loss, and rounds a ratio to one decimal", () => {
    expect(formatSignedAmount(3.08)).toBe("+3.08")
    expect(formatSignedAmount(-1.5)).toBe("-1.50")
    expect(formatDecimal(1.8)).toBe("1.8")
  })

  it("signs a change only when asked", () => {
    expect(formatPercent(0.008, { signed: true })).toBe("+0.8%")
    expect(formatPercent(-0.003, { signed: true })).toBe("-0.3%")
    expect(formatPercent(0.2)).toBe("20%")
  })

  it("pluralizes by count", () => {
    expect(pluralize(1, "live portfolio")).toBe("1 live portfolio")
    expect(pluralize(2, "live portfolio")).toBe("2 live portfolios")
    expect(pluralize(2, "strategy")).toBe("2 strategies")
    expect(pluralize(1, "strategy")).toBe("1 strategy")
  })

  it("keeps the start and end of a wallet address", () => {
    expect(shortenAddress("0x7a3f1234567890abcdef1234567890abcdefc21e")).toBe("0x7a3f…c21e")
  })
})
