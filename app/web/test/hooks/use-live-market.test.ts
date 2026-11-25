import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useLiveMarket } from "@/hooks/use-live-market"
import type { MarketEvent } from "@/lib/markets/live"
import type { PoolQuote } from "@/lib/markets/pools"
import type { Swap } from "@/lib/markets/swaps"


const TOKEN = `0x${"b".repeat(40)}`
const pool = (price: number): PoolQuote => ({ address: TOKEN, pair: `0x${"c".repeat(40)}`, quote: "0xq", price })
const swap = (id: string, price: number, at: number): Swap => ({ id, token: TOKEN, side: "buy", price, at })

class FakeSocket {
  static all: FakeSocket[] = []
  onopen?: () => void
  onmessage?: (event: { data: string }) => void
  onclose?: () => void
  closed = false
  constructor(readonly url: string) {
    FakeSocket.all.push(this)
  }
  close() {
    this.closed = true
  }
  open() {
    this.onopen?.()
  }
  say(event: MarketEvent) {
    this.onmessage?.({ data: JSON.stringify(event) })
  }
  drop() {
    this.onclose?.()
  }
}

beforeEach(() => {
  FakeSocket.all = []
  vi.stubGlobal("WebSocket", FakeSocket)
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const latest = () => FakeSocket.all[FakeSocket.all.length - 1] as FakeSocket

describe("useLiveMarket", () => {
  it("keeps what the server drew, and opens nothing, where there is no socket", () => {
    const { result } = renderHook(() => useLiveMarket([pool(100)]))
    expect(FakeSocket.all).toHaveLength(0)
    expect(result.current.quotes[TOKEN]?.price).toBe(100)
    expect(result.current.isConnected).toBe(false)
  })

  it("starts from the snapshot, then follows swaps and pools without counting the history", () => {
    const { result } = renderHook(() => useLiveMarket([pool(100)], "ws://market"))
    act(() => latest().open())
    expect(result.current.isConnected).toBe(true)

    act(() => latest().say({ type: "snapshot", pools: [pool(101)], swaps: [swap("a", 101, 1), swap("b", 101, 2)] }))
    expect(result.current.quotes[TOKEN]?.price).toBe(101)
    expect(result.current.trades.map(({ id }) => id)).toEqual(["b", "a"])
    expect(result.current.swapCount).toBe(0)

    act(() => latest().say({ type: "swaps", swaps: [swap("b", 99, 2), swap("c", 105, 3), swap("d", 106, 4)] }))
    expect(result.current.trades.map(({ id }) => id)).toEqual(["d", "c", "b", "a"])
    expect(result.current.quotes[TOKEN]?.price).toBe(106)
    expect(result.current.swapCount).toBe(3)
    expect(result.current.lastTrade[TOKEN]?.id).toBe("d")

    act(() => latest().say({ type: "pools", pools: [pool(110)] }))
    expect(result.current.quotes[TOKEN]?.price).toBe(110)
  })

  it("opens again after a drop, with a longer wait each time, and closes with the page", () => {
    const { result, unmount } = renderHook(() => useLiveMarket([], "ws://market"))
    act(() => latest().open())
    act(() => latest().drop())
    expect(result.current.isConnected).toBe(false)
    expect(FakeSocket.all).toHaveLength(1)

    act(() => vi.advanceTimersByTime(1000))
    expect(FakeSocket.all).toHaveLength(2)
    act(() => latest().drop())
    act(() => vi.advanceTimersByTime(1000))
    expect(FakeSocket.all).toHaveLength(2)
    act(() => vi.advanceTimersByTime(1000))
    expect(FakeSocket.all).toHaveLength(3)

    const last = latest()
    unmount()
    expect(last.closed).toBe(true)
  })
})
