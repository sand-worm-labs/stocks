import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PoolQuote } from "./pools"
import { V2_SWAP } from "./swaps"

const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const POOL: PoolQuote = {
  address: `0x${"1".repeat(40)}`,
  pair: `0x${"2".repeat(40)}`,
  quote: USDC,
  price: 100,
}

vi.mock("./tokens", () => ({ getBaseTokens: async () => [{ address: POOL.address }] }))
vi.mock("./pools", () => ({ getAllPoolQuotes: async () => [POOL] }))

const word = (value: bigint) => value.toString(16).padStart(64, "0")
const log = {
  address: POOL.pair,
  topics: [V2_SWAP],
  data: `0x${word(0n)}${word(100_000_000n)}${word(10n ** 18n)}${word(0n)}`,
  blockNumber: "0x64",
  transactionHash: "0xabc",
  logIndex: "0x1",
}

class FakeSocket {
  static instances: FakeSocket[] = []
  sent: string[] = []
  closed = false
  onopen?: () => void
  onmessage?: (event: { data: string }) => void
  onerror?: () => void
  onclose?: () => void

  constructor(readonly url: string) {
    FakeSocket.instances.push(this)
  }
  send(message: string) {
    this.sent.push(message)
  }
  close() {
    this.closed = true
    this.onclose?.()
  }
}

describe("swap feed", () => {
  beforeEach(() => {
    vi.resetModules()
    FakeSocket.instances = []
    vi.stubGlobal("WebSocket", FakeSocket)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("listens to the node once for all listeners and hands each swap on with a stable id", async () => {
    const { onSwap } = await import("./swap-feed")
    const first = vi.fn()
    const second = vi.fn()
    onSwap(first)
    onSwap(second)

    expect(FakeSocket.instances).toHaveLength(1)
    const [socket] = FakeSocket.instances as [FakeSocket]
    socket.onopen?.()
    await vi.waitFor(() => expect(socket.sent).toHaveLength(1))
    expect(JSON.parse(socket.sent[0] as string)).toMatchObject({
      method: "eth_subscribe",
      params: ["logs", { address: [POOL.pair] }],
    })

    socket.onmessage?.({ data: JSON.stringify({ params: { result: log } }) })
    await vi.waitFor(() => expect(first).toHaveBeenCalledTimes(1))

    expect(second).toHaveBeenCalledTimes(1)
    expect(first.mock.calls[0]?.[0]).toMatchObject({ id: "0xabc:0x1", token: POOL.address, side: "buy", usd: 100 })
    expect(first.mock.calls[0]?.[0].price).toBeCloseTo(100)
  })

  it("lets the node go a while after the last listener leaves", async () => {
    vi.useFakeTimers()
    const { onSwap } = await import("./swap-feed")
    const stop = onSwap(vi.fn())
    stop()

    const [socket] = FakeSocket.instances as [FakeSocket]
    expect(socket.closed).toBe(false)
    vi.advanceTimersByTime(11_000)
    expect(socket.closed).toBe(true)
    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
  })

  it("reads the last hour of swaps over HTTP, newest first", async () => {
    const rpc = vi.fn(async (_url: string, init: { body: string }) => {
      const { method } = JSON.parse(init.body) as { method: string }
      return Response.json({ result: method === "eth_blockNumber" ? "0x65" : [log] })
    })
    vi.stubGlobal("fetch", rpc)

    const { getRecentSwaps } = await import("./swap-feed")
    const swaps = await getRecentSwaps()

    expect(swaps).toHaveLength(1)
    expect(swaps[0]).toMatchObject({ id: "0xabc:0x1", side: "buy" })
    expect(Date.now() - (swaps[0]?.at ?? 0)).toBeGreaterThanOrEqual(190)
  })
})
