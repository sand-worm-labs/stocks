"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { PoolQuote } from "@/lib/markets/pools"
import type { Swap } from "@/lib/markets/swaps"

const POLL_MS = 15_000
const TRADES_KEPT = 100
// Swaps arrive many to the second, so they are put on the page once a second, not one render each
const FLUSH_MS = 1000

export type LiveQuote = PoolQuote & { price: number }

const byAddress = (pools: PoolQuote[], at: number) =>
  Object.fromEntries(pools.map((pool) => [pool.address, { ...pool, at }]))

// What the pools say. A price held by the feed is renewed every few seconds, and between those the node pushes each
// swap as it happens, so a price moves on the trade that moved it.
export function useLiveMarket(initialPools: PoolQuote[] = []) {
  const [pools, setPools] = useState<Record<string, PoolQuote & { at: number }>>(() =>
    byAddress(initialPools, Date.now())
  )
  const [updatedAt, setUpdatedAt] = useState<number | undefined>(initialPools.length ? Date.now() : undefined)
  const [prices, setPrices] = useState<Record<string, { price: number; at: number }>>({})
  const [trades, setTrades] = useState<Swap[]>([])
  const [swapCount, setSwapCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  const pending = useRef<Swap[]>([])
  const lastPoll = useRef("")

  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch("/api/markets/pools", { cache: "no-store" })
        if (!response.ok) return

        const body = await response.text()
        const live = JSON.parse(body) as PoolQuote[]
        const at = Date.now()
        setUpdatedAt(at)
        // An answer that is the same as the last one changes nothing on the page, so it isn't drawn again
        if (body !== lastPoll.current) {
          lastPoll.current = body
          setPools(byAddress(live, at))
        }
      } catch {
        // The next poll tries again
      }
    }

    void poll()
    const timer = setInterval(poll, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  // The swaps of the last hour, so the tape has trades that really happened to start with
  useEffect(() => {
    const controller = new AbortController()

    fetch("/api/markets/swaps", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<Swap[]>) : []))
      .then((seeded) =>
        setTrades((current) => {
          const known = new Set(current.map(({ id }) => id))
          return [...current, ...seeded.filter(({ id }) => !known.has(id))]
            .sort((a, b) => b.at - a.at)
            .slice(0, TRADES_KEPT)
        })
      )
      .catch(() => {
        // The tape starts empty and fills as swaps come
      })

    return () => controller.abort()
  }, [])

  // The server listens to the node and pushes each swap on. The browser opens the stream again by itself when it drops.
  useEffect(() => {
    const source = new EventSource("/api/markets/swaps/stream")

    source.onopen = () => setIsConnected(true)
    source.onerror = () => setIsConnected(false)
    source.onmessage = ({ data }) => {
      try {
        // Stamped on arrival, so a swap is compared with the polled prices by the same clock
        pending.current.push({ ...(JSON.parse(String(data)) as Swap), at: Date.now() })
      } catch {
        // A message that isn't a swap is passed over
      }
    }

    return () => source.close()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const swaps = pending.current.splice(0)
      if (!swaps.length) return

      setSwapCount((count) => count + swaps.length)
      setTrades((current) => [...swaps].reverse().concat(current).slice(0, TRADES_KEPT))
      setPrices((current) => ({
        ...current,
        ...Object.fromEntries(swaps.flatMap(({ token, price, at }) => (price ? [[token, { price, at }]] : []))),
      }))
    }, FLUSH_MS)

    return () => clearInterval(timer)
  }, [])

  // A trade since the last poll is newer than the pool's price
  const quotes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(pools).map(([address, pool]) => {
          const traded = prices[address]
          return [address, { ...pool, price: traded && traded.at > pool.at ? traded.price : pool.price }]
        })
      ) as Record<string, LiveQuote>,
    [pools, prices]
  )

  const lastTrade = useMemo(
    () =>
      Object.fromEntries(
        trades
          .slice()
          .reverse()
          .map((swap) => [swap.token, swap])
      ) as Record<string, Swap>,
    [trades]
  )

  return { quotes, trades, lastTrade, swapCount, isConnected, updatedAt }
}
