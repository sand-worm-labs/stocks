// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { WebSocket } from "ws"
import type { AddressInfo } from "node:net"

import type { MarketEvent } from "@/lib/markets/live"
import type { PoolQuote } from "@/lib/markets/pools"
import type { Swap } from "@/lib/markets/swaps"

import { createMarket, type MarketSource } from "./market-server"
import { createRealtimeServer } from "./realtime-server"

const TOKEN = `0x${"b".repeat(40)}`
const pool = (price: number): PoolQuote => ({
  address: TOKEN,
  pair: `0x${"c".repeat(40)}`,
  quote: `0x${"d".repeat(40)}`,
  price,
})
const swap = (id: string, price: number, at = Date.now()): Swap => ({
  id,
  token: TOKEN,
  side: "buy",
  price,
  usd: 10,
  at,
})

let listener: ((swap: Swap) => void) | undefined
const stop = vi.fn(() => {
  listener = undefined
})
let price = 100
const source: MarketSource = {
  pools: async () => [pool(price)],
  recentSwaps: async () => [swap("old:0", 99, 1)],
  onSwap: (next) => {
    listener = next
    return stop
  },
}

let server: ReturnType<typeof createRealtimeServer>
let port = 0

beforeAll(async () => {
  server = createRealtimeServer(0, createMarket(source, { poolsEvery: 40, swapsEvery: 15 }))
  await new Promise((resolve) => server.once("listening", resolve))
  port = (server.address() as AddressInfo).port
})
afterAll(() => server.close())

async function watch() {
  const socket = new WebSocket(`ws://localhost:${port}/market`)
  const heard: MarketEvent[] = []
  socket.on("message", (data) => heard.push(JSON.parse(String(data)) as MarketEvent))
  const next = <T extends MarketEvent["type"]>(type: T, after = 0) =>
    new Promise<Extract<MarketEvent, { type: T }>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`No ${type} came`)), 2000)
      const look = () => {
        const found = heard.slice(after).find((event) => event.type === type)
        if (found) {
          clearTimeout(timer)
          resolve(found as Extract<MarketEvent, { type: T }>)
        } else setTimeout(look, 10)
      }
      look()
    })
  await new Promise((resolve) => socket.once("open", resolve))
  return { socket, heard, next }
}

describe("market server", () => {
  it("opens with the pools and the last trades, then pushes swaps together and the pools again", async () => {
    const one = await watch()
    const snapshot = await one.next("snapshot")
    expect(snapshot.pools[0]?.price).toBe(100)
    expect(snapshot.swaps.map(({ id }) => id)).toEqual(["old:0"])

    listener?.(swap("a:0", 101))
    listener?.(swap("a:1", 102))
    const swaps = await one.next("swaps")
    expect(swaps.swaps.map(({ id }) => id)).toEqual(["a:0", "a:1"])

    price = 110
    const pools = await one.next("pools", one.heard.length)
    expect(pools.pools[0]?.price).toBe(110)
    one.socket.close()
    await vi.waitFor(() => expect(listener).toBeUndefined())
  })

  it("lets go of the node when the last person leaves, and picks it up for the next", async () => {
    const one = await watch()
    await one.next("snapshot")
    one.socket.close()
    await vi.waitFor(() => expect(listener).toBeUndefined())

    const two = await watch()
    await two.next("snapshot")
    expect(listener).toBeDefined()
    two.socket.close()
    await vi.waitFor(() => expect(stop).toHaveBeenCalledTimes(2))
  })
})
