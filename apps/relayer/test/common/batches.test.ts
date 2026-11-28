import { describe, expect, it } from "vitest"
import { inBatches } from "../../src/common/batches.js"

describe("inBatches", () => {
  it("splits a list into batches of at most the size", () => {
    expect(inBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it("gives no batches for an empty list", () => {
    expect(inBatches([], 100)).toEqual([])
  })

  it("keeps a short list as one batch", () => {
    expect(inBatches([1, 2], 100)).toEqual([[1, 2]])
  })
})
