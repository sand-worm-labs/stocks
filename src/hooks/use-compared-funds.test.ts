import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CHIP_MS } from "@/lib/charts/trading"

import { useComparedFunds } from "./use-compared-funds"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useComparedFunds", () => {
  it("begins with the S&P 500 fund, open at once", () => {
    const { result } = renderHook(() => useComparedFunds(["SPY", "QQQ"]))
    expect(result.current.picked.map(({ id }) => id)).toEqual(["SPY"])
    expect(result.current.chips).toMatchObject([{ id: "SPY", open: true, immediate: true }])
  })

  it("adds a chip that opens, and keeps one that is taken off until it has closed", () => {
    const { result } = renderHook(() => useComparedFunds(["SPY", "QQQ"]))
    act(() => result.current.toggle("QQQ"))
    expect(result.current.chips.map(({ id, open }) => [id, open])).toEqual([
      ["SPY", true],
      ["QQQ", true],
    ])

    act(() => result.current.toggle("SPY"))
    expect(result.current.picked.map(({ id }) => id)).toEqual(["QQQ"])
    expect(result.current.chips.find(({ id }) => id === "SPY")?.open).toBe(false)

    act(() => void vi.advanceTimersByTime(CHIP_MS + 60))
    expect(result.current.chips.map(({ id }) => id)).toEqual(["QQQ"])
  })

  it("brings a chip back that was still closing", () => {
    const { result } = renderHook(() => useComparedFunds(["SPY"]))
    act(() => result.current.toggle("SPY"))
    act(() => result.current.toggle("SPY"))
    act(() => void vi.advanceTimersByTime(CHIP_MS + 60))
    expect(result.current.chips).toMatchObject([{ id: "SPY", open: true }])
  })
})
