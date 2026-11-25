import { describe, expect, it } from "vitest"

import type { Condition, Strategy } from "@/types/strategy"
import { explainStrategy, plainCondition, termsOf } from "./explain"
import { getStrategy } from "./source"

const above = (symbol: string, value: number): Condition => ({
  left: { symbol, indicator: { kind: "rsi", days: 14 } },
  op: ">",
  right: { value },
})

describe("explainStrategy", () => {
  it("says how often it looks, in the first words", async () => {
    expect((await getStrategy()) && explainStrategy(await getStrategy()).intro).toMatch(/^Every week,/)
  })

  it("reads the sample as sentences, in order, nested under the if that leads to them", async () => {
    const { steps } = explainStrategy(await getStrategy())
    expect(steps.map(({ depth, kind, text }) => `${"  ".repeat(depth)}${kind}: ${text}`)).toEqual([
      "if: AAPLc's price is above its own 50-day average price",
      "  then: ",
      "    split: Ride the leaders: split the money in the shares shown:",
      "      do: Out of NVDAc, AMZNc, GOOGLc, METAc, TSLAc, AAPLc, pick the 3 with the highest 30-day return, and hold them equally.",
      "      do: Hold AAPLc.",
      "  else: ",
      "    if: GOOGLc's 14-day RSI is below 30",
      "      then: ",
      "        do: Hold GOOGLc.",
      "      else: ",
      "        split: Play it safe: split the money giving more to the steadier ones:",
      "          do: Hold AAPLc.",
      "          do: Hold GOOGLc.",
      "          do: Hold METAc.",
    ])
  })

  it("gives each part of a weighted split its share", async () => {
    const { steps } = explainStrategy(await getStrategy())
    expect(steps.filter(({ share }) => share).map(({ share }) => share)).toEqual(["70%", "30%"])
  })

  it("says a condition with its own and another stock, and figures as percentages", () => {
    expect(
      plainCondition({
        left: { symbol: "AAA", indicator: { kind: "return", days: 30 } },
        op: ">",
        right: { value: 0.05 },
      })
    ).toBe("AAA's 30-day return is above 5%")
    expect(
      plainCondition({
        left: { symbol: "AAA", indicator: { kind: "price" } },
        op: "<",
        right: { symbol: "BBB", indicator: { kind: "sma", days: 200 } },
      })
    ).toBe("AAA's price is below BBB's 200-day average price")
  })

  it("joins several conditions with and, or or", () => {
    expect(plainCondition({ all: [above("A", 70), above("B", 70)] })).toBe(
      "A's 14-day RSI is above 70 and B's 14-day RSI is above 70"
    )
    expect(plainCondition({ any: [above("A", 70), { all: [above("B", 1), above("C", 2)] }] })).toContain("(")
  })

  it("says what to do with cash and a single pick", () => {
    const strategy: Strategy = {
      name: "X",
      schedule: "monthly",
      root: { type: "filter", pick: "bottom", count: 1, by: { kind: "price" }, from: ["AAA", "BBB"] },
    }
    expect(explainStrategy(strategy).steps[0]?.text).toBe(
      "Out of AAA, BBB, pick the one with the lowest price, and hold it."
    )
    expect(explainStrategy({ ...strategy, root: { type: "cash" } }).steps[0]?.text).toContain("cash")
  })
})

describe("termsOf", () => {
  it("explains each term the strategy uses, once", async () => {
    const terms = termsOf(await getStrategy())
    expect(terms.map(({ term }) => term)).toEqual(["50-day average price", "30-day return", "14-day RSI"])
    expect(terms.every(({ meaning }) => meaning.length > 20)).toBe(true)
  })
})
