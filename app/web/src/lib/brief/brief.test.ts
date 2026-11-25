import { describe, expect, it } from "vitest"

import type { BriefChange } from "@/types/brief"
import { analyzeBrief } from "./analyze"
import { parseBrief } from "./parse"
import { applyChange } from "./patch"

const READY =
  "Grow 500 USDC with robotics over 3+ years. Max 20% in any one stock, only stocks with $100K+ liquidity on Base. I'd panic at −20%. Ask before buying."

const change = (text: string, edit: BriefChange) => applyChange(text, parseBrief(text), edit)

describe("reading a brief", () => {
  it("finds what the brief says, and where it says it", () => {
    const fields = parseBrief(READY)

    expect(fields.goal?.value).toBe("Growth")
    expect(fields.horizon?.value).toBe("3+ years")
    expect(fields.loss?.value).toBe(20)
    expect(fields.budget?.value).toBe(500)
    expect(fields.maxPerStock?.value).toBe(20)
    expect(fields.minLiquidity).toBe(100_000)
    expect(fields.askBeforeBuying).toBe(true)
    expect(fields.include.items).toEqual(["Robotics"])
    expect(READY.slice(fields.budget?.span.start, fields.budget?.span.end)).toBe("500 USDC")
  })

  it("does not take a liquidity floor for the budget", () => {
    expect(parseBrief("Only stocks with $100K+ liquidity").budget).toBeUndefined()
  })

  it("reads what to leave out, and not 'no more than'", () => {
    expect(parseBrief("No oil, no Tesla. No more than 25% in one company.").avoid.items).toEqual(["oil", "Tesla"])
    expect(parseBrief("Avoid oil and Tesla").avoid.items).toEqual(["oil", "Tesla"])
  })

  it("reads time in months and ranges", () => {
    expect(parseBrief("hold for 6 months").horizon?.value).toBe("Under 1 year")
    expect(parseBrief("over 1-3 years").horizon?.value).toBe("1–3 years")
    expect(parseBrief("for 5 years").horizon?.value).toBe("3+ years")
  })

  it("does not take a theme named to be avoided as one wanted", () => {
    const fields = parseBrief("Grow 500 USDC in robotics. Avoid crypto.")

    expect(fields.include.items).toEqual(["Robotics"])
    expect(fields.avoid.items).toEqual(["crypto"])
  })
})

describe("what can be done with a brief", () => {
  it("is ready when everything is there", () => {
    expect(analyzeBrief(READY).status).toBe("ready")
  })

  it("asks for what is missing", () => {
    const { status, missing } = analyzeBrief("make me money with ai stocks lol")

    expect(status).toBe("needs-answers")
    expect(missing).toEqual(["horizon", "loss", "budget"])
  })

  it("says so when there is nothing to read", () => {
    expect(analyzeBrief("asdf qwerty zxcv").status).toBe("unreadable")
    expect(analyzeBrief("   ").status).toBe("empty")
    expect(analyzeBrief("!!!???").status).toBe("unreadable")
  })

  it("refuses a return no portfolio can plan for, with briefs that can be done", () => {
    const { status, issues } = analyzeBrief("turn 50 usdc into 1000 by next week")

    expect(status).toBe("unrealistic")
    expect(issues[0]?.message).toContain("20× in a week")
    expect(issues[0]?.fixes[0]).toBe("Grow 50 USDC over 3+ years")
  })

  it("does not call a slow, large return unrealistic", () => {
    expect(analyzeBrief("turn 500 usdc into 1000 over 5 years").status).not.toBe("unrealistic")
  })

  it("refuses positions that need more than all the money", () => {
    const { status, issues } = analyzeBrief("Build me 8 robotics stocks, each at least 15% of the portfolio.")

    expect(status).toBe("unrealistic")
    expect(issues[0]?.message).toContain("120%")
    expect(issues[0]?.fixes[0]).toContain("6 robotics stocks")
  })

  it("refuses a loss limit that an ordinary day would pass", () => {
    expect(analyzeBrief("Grow 500 USDC over 3+ years. I'd panic at −1%.").issues[0]?.message).toContain("ordinary day")
  })
})

describe("writing a control's change into the brief", () => {
  it("changes the words that were there and leaves the rest alone", () => {
    expect(change(READY, { field: "budget", value: 1000 })).toContain("Grow 1,000 USDC with robotics")
    expect(change(READY, { field: "loss", value: 35 })).toContain("I'd panic at −35%.")
    expect(change(READY, { field: "horizon", value: "Under 1 year" })).toContain("over 6 months.")
    expect(change(READY, { field: "goal", value: "Income" })).toMatch(/^Earn income on 500 USDC/)
  })

  it("adds a sentence for something the brief didn't say", () => {
    const text = "Put money into robotics"

    expect(change(text, { field: "budget", value: 500 })).toBe("Put money into robotics. Budget: 500 USDC.")
    expect(change(text, { field: "avoid", items: ["oil", "Tesla"] })).toBe(
      "Put money into robotics. Avoid oil and Tesla."
    )
  })

  it("adds to a list and takes from it", () => {
    const withAi = change(READY, { field: "include", items: ["Robotics", "ai"] })

    expect(withAi).toContain("Include ai.")
    expect(parseBrief(withAi).include.items).toEqual(["ai", "Robotics"])

    const without = change(withAi, { field: "include", items: ["ai"] })
    expect(parseBrief(without).include.items).toEqual(["ai"])
    expect(without).not.toMatch(/robotics/i)
  })

  it("reads back as the change that was made, whatever words the goal was written in", () => {
    const starts = [
      "make me money with ai stocks lol",
      "I want income from stocks",
      "Looking for growth in robotics",
      "Preserve my savings",
      "Grow 500 USDC with robotics over 3+ years",
      "Earn income on 500 USDC",
    ]
    for (const start of starts) {
      for (const value of ["Growth", "Income", "Protect capital"] as const) {
        expect(parseBrief(change(start, { field: "goal", value })).goal?.value, `${start} → ${value}`).toBe(value)
      }
    }
  })

  it("reads back as the change that was made, for every control", () => {
    for (const start of [READY, "Put money into robotics"]) {
      const read = (edit: BriefChange) => parseBrief(change(start, edit))

      expect(read({ field: "goal", value: "Protect capital" }).goal?.value).toBe("Protect capital")
      expect(read({ field: "horizon", value: "1–3 years" }).horizon?.value).toBe("1–3 years")
      expect(read({ field: "horizon", value: "Under 1 year" }).horizon?.value).toBe("Under 1 year")
      expect(read({ field: "loss", value: 10 }).loss?.value).toBe(10)
      expect(read({ field: "budget", value: 100 }).budget?.value).toBe(100)
      expect(read({ field: "avoid", items: ["oil"] }).avoid.items).toEqual(["oil"])
    }
  })
})
