import { describe, expect, it } from "vitest"

import { completeResult, researchResultSchema } from "@/lib/research/result"
import { completeRecord } from "@/lib/store/complete"
import type { StrategyRecord } from "@/types/store"


// What a result needs and the schema has no default for
const minimal = {
  headline: "Ahead of the market",
  summary: "It beat the S&P 500.",
  metrics: [],
  notebook: { title: "Research", url: "https://app.sandwormlab.xyz/notebooks/x" },
}

describe("completeResult", () => {
  it("fills in every field the schema defaults, so a result kept before one existed still reads whole", () => {
    // `completeResult` is typed for a whole result; one kept earlier is the same thing without the later fields
    const stored = minimal as unknown as Parameters<typeof completeResult>[0]
    expect(completeResult(stored)).toEqual(researchResultSchema.parse(minimal))
  })

  it("reads a result kept with a list of notebooks as having the first of them, which held the research", () => {
    const { notebook: _notebook, ...rest } = minimal
    const old = {
      ...rest,
      notebooks: [
        { title: "Backtest", url: "https://app.sandwormlab.xyz/notebooks/first" },
        { title: "Risk", url: "https://app.sandwormlab.xyz/notebooks/second" },
      ],
    } as unknown as Parameters<typeof completeResult>[0]
    const done = completeResult(old)
    expect(done.notebook.url).toBe("https://app.sandwormlab.xyz/notebooks/first")
    expect(done).not.toHaveProperty("notebooks")
  })

  it("keeps what the result has", () => {
    const stored = { ...minimal, selection: [{ symbol: "AAPLc", text: "Steady" }] } as unknown as Parameters<typeof completeResult>[0]
    expect(completeResult(stored).selection).toHaveLength(1)
  })
})

describe("completeRecord", () => {
  const record = (research?: StrategyRecord["research"]) => ({ id: "s1", research }) as StrategyRecord

  it("leaves a strategy with no result as it is", () => {
    const bare = record()
    expect(completeRecord(bare)).toBe(bare)
  })

  it("completes the result of one that has it", () => {
    const stored = minimal as unknown as NonNullable<NonNullable<StrategyRecord["research"]>["result"]>
    const done = completeRecord(record({ mode: "waiting", result: stored } as StrategyRecord["research"]))
    expect(done.research?.result?.selection).toEqual([])
    expect(done.research?.result?.sources).toEqual([])
  })
})
