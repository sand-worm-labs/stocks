import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useNow } from "./use-now"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-25T10:00:00.000Z"))
})
afterEach(() => vi.useRealTimers())

describe("useNow", () => {
  it("reads the clock once it is there, and again every interval", () => {
    const { result } = renderHook(() => useNow(1000))
    expect(result.current).toBe(Date.parse("2026-11-25T10:00:00.000Z"))
    act(() => void vi.advanceTimersByTime(1000))
    expect(result.current).toBe(Date.parse("2026-11-25T10:00:01.000Z"))
  })

  it("has no time while it is not active, and stops reading", () => {
    const { result } = renderHook(() => useNow(1000, false))
    act(() => void vi.advanceTimersByTime(5000))
    expect(result.current).toBeUndefined()
  })
})
