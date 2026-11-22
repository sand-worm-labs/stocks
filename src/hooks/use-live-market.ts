"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { BASE_WS_URL } from "@/constants/markets"
import type { PoolQuote } from "@/lib/markets/pools"
import { decodeSwap, type Swap, type SwapLog, V2_SWAP, V3_SWAP } from "@/lib/markets/swaps"

const POLL_MS = 15_000
const TRADES_KEPT = 100
// Swaps arrive many to the second, so they are put on the page once a second, not one render each
const FLUSH_MS = 1000
const MAX_RETRY_MS = 30_000
// Base makes a block every 200 ms. The last hour of them gives the tape trades that really happened to start with.
const BLOCK_MS = 200
const SEED_BLOCKS = (60 * 60 * 1000) / BLOCK_MS
// The node answers for ten addresses at a time
const ADDRESSES_PER_REQUEST = 10

const REQUEST = { logs: 1, head: 3, history: 100 } as const

const CONTRACT_ADDRESS = /^0x[0-9a-f]{40}$/

type HistoryLog = SwapLog & { blockNumber: string }

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

  const byPair = useRef<Record<string, PoolQuote>>(Object.fromEntries(initialPools.map((pool) => [pool.pair, pool])))
  const socket = useRef<WebSocket>(undefined)
  const head = useRef(0)
  const isSeeded = useRef(false)
  const pending = useRef<Swap[]>([])
  const lastPoll = useRef("")

  // Ask the node for the swaps of the last hour in our pools, once both the pools and the head of the chain are known
  const seed = () => {
    // Newer pools are named by a 32-byte id the node can't be asked about, so only ordinary contract addresses are
    const pairs = Object.keys(byPair.current).filter((pair) => CONTRACT_ADDRESS.test(pair))
    if (isSeeded.current || !head.current || !pairs.length || socket.current?.readyState !== WebSocket.OPEN) return

    isSeeded.current = true
    for (let i = 0; i * ADDRESSES_PER_REQUEST < pairs.length; i++) {
      socket.current.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: REQUEST.history + i,
          method: "eth_getLogs",
          params: [
            {
              address: pairs.slice(i * ADDRESSES_PER_REQUEST, (i + 1) * ADDRESSES_PER_REQUEST),
              fromBlock: `0x${(head.current - SEED_BLOCKS).toString(16)}`,
              toBlock: "latest",
              topics: [[V3_SWAP, V2_SWAP]],
            },
          ],
        })
      )
    }
  }
  const seedRef = useRef(seed)
  seedRef.current = seed

  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch("/api/markets/pools", { cache: "no-store" })
        if (!response.ok) return

        const body = await response.text()
        const live = JSON.parse(body) as PoolQuote[]
        const at = Date.now()
        byPair.current = Object.fromEntries(live.map((pool) => [pool.pair, pool]))
        setUpdatedAt(at)
        // An answer that is the same as the last one changes nothing on the page, so it isn't drawn again
        if (body !== lastPoll.current) {
          lastPoll.current = body
          setPools(byAddress(live, at))
        }
        seedRef.current()
      } catch {
        // The next poll tries again
      }
    }

    void poll()
    const timer = setInterval(poll, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  // The node is listened to from the moment the page opens
  useEffect(() => {
    let retry = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let isClosed = false

    const connect = () => {
      const ws = new WebSocket(BASE_WS_URL)
      socket.current = ws
      const send = (id: number, method: string, params: unknown[]) =>
        ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }))

      ws.onopen = () => {
        retry = 0
        isSeeded.current = false
        setIsConnected(true)
        // The node limits a subscription to ten addresses, so it is asked for every swap on Base and ours are picked
        // out here
        send(REQUEST.logs, "eth_subscribe", ["logs", { topics: [[V3_SWAP, V2_SWAP]] }])
        send(REQUEST.head, "eth_blockNumber", [])
      }

      ws.onmessage = ({ data }) => {
        const message = JSON.parse(String(data)) as {
          id?: number
          result?: unknown
          params?: { result?: SwapLog }
        }

        if (message.id === REQUEST.head && typeof message.result === "string") {
          head.current = parseInt(message.result, 16)
          seedRef.current()
          return
        }

        if (message.id !== undefined && message.id >= REQUEST.history && Array.isArray(message.result)) {
          const now = Date.now()
          const seeded = (message.result as HistoryLog[]).flatMap((log) => {
            const pool = byPair.current[log.address.toLowerCase()]
            const at = now - (head.current - parseInt(log.blockNumber, 16)) * BLOCK_MS
            const swap = pool && decodeSwap(log, pool, at)
            return swap ? [swap] : []
          })
          setTrades((current) => [...current, ...seeded].sort((a, b) => b.at - a.at).slice(0, TRADES_KEPT))
          return
        }

        const result = message.params?.result
        if (!result) return

        const pool = byPair.current[result.address.toLowerCase()]
        const swap = pool && decodeSwap(result, pool)
        if (!swap) return

        pending.current.push(swap)
      }

      ws.onclose = () => {
        setIsConnected(false)
        if (isClosed) return
        timer = setTimeout(connect, Math.min(MAX_RETRY_MS, 1000 * 2 ** retry++))
      }
    }

    connect()

    return () => {
      isClosed = true
      clearTimeout(timer)
      socket.current?.close()
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const swaps = pending.current.splice(0)
      if (!swaps.length) return

      setSwapCount((count) => count + swaps.length)
      setTrades((current) => [...swaps.reverse(), ...current].slice(0, TRADES_KEPT))
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
