"use client"

import { useEffect, useMemo, useState } from "react"

import { TRADES_KEPT } from "@/constants/hooks/use-live-market"
import { RECONNECT_MS } from "@/constants/realtime"
import type { MarketEvent } from "@/lib/markets/live"
import type { PoolQuote } from "@/lib/markets/pools"
import type { Swap } from "@/lib/markets/swaps"

const byAddress = (pools: PoolQuote[]) => Object.fromEntries(pools.map((pool) => [pool.address, pool]))

const newestFirst = (swaps: Swap[]) => [...swaps].sort((a, b) => b.at - a.at)

export function useLiveMarket(initialPools: PoolQuote[] = [], url?: string) {
  const [quotes, setQuotes] = useState(() => byAddress(initialPools))
  const [updatedAt, setUpdatedAt] = useState<number | undefined>(() => (initialPools.length ? Date.now() : undefined))
  const [trades, setTrades] = useState<Swap[]>([])
  const [swapCount, setSwapCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!url) return
    let stopped = false
    let attempt = 0
    let retry: ReturnType<typeof setTimeout>
    let socket: WebSocket

    const apply = (event: MarketEvent) => {
      if (event.type === "swaps") {
        const fresh = event.swaps
        setSwapCount((count) => count + fresh.length)
        setTrades((current) => {
          const known = new Set(current.map(({ id }) => id))
          return [...newestFirst(fresh.filter(({ id }) => !known.has(id))), ...current].slice(0, TRADES_KEPT)
        })
        setQuotes((current) => {
          const next = { ...current }
          for (const { token, price } of fresh) if (price && next[token]) next[token] = { ...next[token], price }
          return next
        })
        return
      }
      setQuotes(byAddress(event.pools))
      setUpdatedAt(Date.now())
      if (event.type === "snapshot") setTrades(newestFirst(event.swaps).slice(0, TRADES_KEPT))
    }

    const open = () => {
      socket = new WebSocket(url)
      socket.onopen = () => {
        attempt = 0
        setIsConnected(true)
      }
      socket.onmessage = ({ data }) => apply(JSON.parse(String(data)) as MarketEvent)
      socket.onclose = () => {
        setIsConnected(false)
        if (!stopped) retry = setTimeout(open, RECONNECT_MS[Math.min(attempt++, RECONNECT_MS.length - 1)])
      }
    }

    open()
    return () => {
      stopped = true
      clearTimeout(retry)
      socket.close()
    }
  }, [url])

  const lastTrade = useMemo(
    () => Object.fromEntries([...trades].reverse().map((swap) => [swap.token, swap])) as Record<string, Swap>,
    [trades]
  )

  return { quotes: quotes as Record<string, PoolQuote>, trades, lastTrade, swapCount, isConnected, updatedAt }
}
