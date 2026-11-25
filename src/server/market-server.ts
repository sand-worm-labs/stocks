import { WebSocket, WebSocketServer } from "ws"

import { POOLS_PUSH_MS, SNAPSHOT_SWAPS, SWAPS_PUSH_MS } from "@/constants/realtime"
import type { MarketEvent } from "@/lib/markets/live"
import { getAllPoolQuotes, type PoolQuote } from "@/lib/markets/pools"
import { getRecentSwaps, onSwap } from "@/lib/markets/swap-feed"
import type { Swap } from "@/lib/markets/swaps"
import { getBaseTokens } from "@/lib/markets/tokens"

export type MarketSource = {
  pools: () => Promise<PoolQuote[]>
  recentSwaps: () => Promise<Swap[]>
  onSwap: (listener: (swap: Swap) => void) => () => void
}

const liveSource: MarketSource = {
  pools: async () => getAllPoolQuotes((await getBaseTokens()).map(({ address }) => address)),
  recentSwaps: getRecentSwaps,
  onSwap,
}

const send = (socket: WebSocket, event: MarketEvent) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event))
}

const repriced = (pools: PoolQuote[], swaps: Swap[]) => {
  const latest = new Map(swaps.flatMap(({ token, price }) => (price ? [[token, price] as const] : [])))
  return latest.size ? pools.map((pool) => ({ ...pool, price: latest.get(pool.address) ?? pool.price })) : pools
}

export function createMarket(
  source: MarketSource = liveSource,
  { poolsEvery = POOLS_PUSH_MS, swapsEvery = SWAPS_PUSH_MS } = {}
) {
  const server = new WebSocketServer({ noServer: true, maxPayload: 1024 })
  let pools: PoolQuote[] = []
  let waiting: Swap[] = []
  let running: { stop: () => void } | undefined

  const tell = (event: MarketEvent) => server.clients.forEach((socket) => send(socket, event))

  const refresh = async () => {
    const started = Date.now()
    const fresh = await source.pools().catch(() => undefined)
    if (!fresh) return
    const traded = waiting.filter(({ at }) => at >= started)
    pools = repriced(fresh, traded)
    tell({ type: "pools", pools })
  }

  const flush = () => {
    if (!waiting.length) return
    const swaps = waiting
    waiting = []
    pools = repriced(pools, swaps)
    tell({ type: "swaps", swaps })
  }

  const start = () => {
    const stopSwaps = source.onSwap((swap) => waiting.push(swap))
    const poolsTimer = setInterval(refresh, poolsEvery)
    const swapsTimer = setInterval(flush, swapsEvery)
    running = {
      stop: () => {
        clearInterval(poolsTimer)
        clearInterval(swapsTimer)
        stopSwaps()
        waiting = []
      },
    }
  }

  server.on("connection", async (socket) => {
    if (!running) start()
    socket.on("close", () => {
      if (server.clients.size) return
      running?.stop()
      running = undefined
    })

    const [swaps, current] = await Promise.all([
      source.recentSwaps().catch(() => []),
      pools.length ? pools : source.pools().catch(() => []),
    ])
    if (!pools.length) pools = current
    const latest = [...swaps].sort((a, b) => a.at - b.at).slice(-SNAPSHOT_SWAPS)
    send(socket, { type: "snapshot", pools: current, swaps: latest })
  })

  server.on("close", () => running?.stop())

  return server
}
