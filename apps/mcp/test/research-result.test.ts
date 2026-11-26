import { describe, expect, it } from "vitest"

import { researchResultSchema as appSchema } from "../../api/src/features/research/research-result"
import { researchResultSchema } from "../src/research-result"

const sample = {
  headline: "Ahead of the market",
  summary: "It beat the S&P 500.",
  metrics: [{ label: "Return", value: "12%" }],
  notebook: { title: "Research", url: "https://app.sandwormlab.xyz/notebooks/x" },
}

describe("the research result an agent is told to build", () => {
  it("has the same fields as the app's", () => {
    expect(Object.keys(researchResultSchema.shape).sort()).toEqual(Object.keys(appSchema.shape).sort())
  })

  it("fills in the same defaults as the app's", () => {
    expect(researchResultSchema.parse(sample)).toEqual(appSchema.parse(sample))
  })

  it("refuses what the app refuses", () => {
    const bad = { ...sample, notebook: undefined }
    expect(researchResultSchema.safeParse(bad).success).toBe(false)
    expect(appSchema.safeParse(bad).success).toBe(false)
  })
})
