import { afterEach, describe, expect, it, vi } from "vitest"

import { shared } from "@/lib/api/market"

afterEach(() => vi.useRealTimers())

describe("an answer shared between everyone asking", () => {
  it("asks once for everyone asking at the same moment", async () => {
    const load = vi.fn(async () => ["a"])
    const ask = shared(1000, load)

    const answers = await Promise.all([ask("k"), ask("k"), ask("k")])

    expect(answers).toEqual([["a"], ["a"], ["a"]])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it("keeps it for its time, then asks again", async () => {
    vi.useFakeTimers()
    const load = vi.fn(async () => ["a"])
    const ask = shared(10_000, load)

    await ask("k")
    vi.advanceTimersByTime(9_000)
    await ask("k")
    expect(load).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2_000)
    await ask("k")
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("keeps different things apart", async () => {
    const ask = shared(1000, async (key) => [key])
    expect(await ask("one")).toEqual(["one"])
    expect(await ask("two")).toEqual(["two"])
  })

  it("holds on to the last good answer when nothing comes back, and soon asks again", async () => {
    vi.useFakeTimers()
    const load = vi.fn<() => Promise<string[]>>().mockResolvedValueOnce(["a"]).mockResolvedValue([])
    const ask = shared(10_000, load)

    await ask("k")
    vi.advanceTimersByTime(11_000)
    expect(await ask("k")).toEqual(["a"])
    await ask("k")
    expect(load).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(3_000)
    await ask("k")
    expect(load).toHaveBeenCalledTimes(3)
  })
})
