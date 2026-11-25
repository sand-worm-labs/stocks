import { BASE_RPC_URL, BASE_WS_URL } from "@/constants/markets"

import { getAllPoolQuotes, type PoolQuote } from "./pools"
import { decodeSwap, type Swap, type SwapLog, V2_SWAP, V3_SWAP } from "./swaps"
import { getBaseTokens } from "./tokens"

// Base makes a block every 200 ms. The last hour of them gives the tape trades that really happened to start with.
const BLOCK_MS = 200
const SEED_BLOCKS = (60 * 60 * 1000) / BLOCK_MS
// The node answers for ten addresses at a time
const ADDRESSES_PER_REQUEST = 10
const POOLS_REFRESH_MS = 15_000
const MAX_RETRY_MS = 30_000
// With nobody listening the node is let go, but not at once: a page that reloads comes straight back
const IDLE_CLOSE_MS = 10_000
const HISTORY_CACHE_MS = 5_000

const CONTRACT_ADDRESS = /^0x[0-9a-f]{40}$/

type Log = SwapLog & { blockNumber: string; transactionHash: string; logIndex: string }

type Listener = (swap: Swap) => void

// The same swap has the same id wherever it is read from, so a page that has it from the history never draws it twice
const withId = (swap: Swap, log: Log): Swap => ({ ...swap, id: `${log.transactionHash}:${log.logIndex}` })

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })
  const body = (await response.json()) as { result?: T; error?: { message: string } }
  if (body.result === undefined) throw new Error(body.error?.message ?? `${method} failed`)

  return body.result
}

let pools: { at: number; byPair: Record<string, PoolQuote> } | undefined

async function getPools() {
  if (pools && Date.now() - pools.at < POOLS_REFRESH_MS) return pools.byPair

  const tokens = await getBaseTokens()
  const quotes = await getAllPoolQuotes(tokens.map(({ address }) => address))
  pools = { at: Date.now(), byPair: Object.fromEntries(quotes.map((pool) => [pool.pair, pool])) }

  return pools.byPair
}

let history: { at: number; swaps: Promise<Swap[]> } | undefined

export function getRecentSwaps(): Promise<Swap[]> {
  if (history && Date.now() - history.at < HISTORY_CACHE_MS) return history.swaps

  const swaps = (async () => {
    const byPair = await getPools()
    const addresses = Object.keys(byPair).filter((pair) => CONTRACT_ADDRESS.test(pair))
    if (!addresses.length) return []

    const head = parseInt(await rpc<string>("eth_blockNumber", []), 16)
    const now = Date.now()
    const requests = Array.from({ length: Math.ceil(addresses.length / ADDRESSES_PER_REQUEST) }, (_, i) =>
      rpc<Log[]>("eth_getLogs", [
        {
          address: addresses.slice(i * ADDRESSES_PER_REQUEST, (i + 1) * ADDRESSES_PER_REQUEST),
          fromBlock: `0x${(head - SEED_BLOCKS).toString(16)}`,
          toBlock: "latest",
          topics: [[V3_SWAP, V2_SWAP]],
        },
      ])
    )

    return (await Promise.all(requests))
      .flat()
      .flatMap((log) => {
        const pool = byPair[log.address.toLowerCase()]
        const at = now - (head - parseInt(log.blockNumber, 16)) * BLOCK_MS
        const swap = pool && decodeSwap(log, pool, at)
        return swap ? [withId(swap, log)] : []
      })
      .sort((a, b) => b.at - a.at)
  })()

  history = { at: Date.now(), swaps }
  swaps.catch(() => {
    if (history?.swaps === swaps) history = undefined
  })

  return swaps
}

const listeners = new Set<Listener>()
let socket: WebSocket | undefined
let retry = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
let idleTimer: ReturnType<typeof setTimeout> | undefined

function connect() {
  const ws = new WebSocket(BASE_WS_URL)
  socket = ws

  ws.onopen = async () => {
    retry = 0
    try {
      const address = Object.keys(await getPools()).filter((pair) => CONTRACT_ADDRESS.test(pair))
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_subscribe",
          params: ["logs", { address, topics: [[V3_SWAP, V2_SWAP]] }],
        })
      )
    } catch {
      ws.close()
    }
  }

  ws.onmessage = async ({ data }) => {
    let log: Log | undefined
    try {
      log = (JSON.parse(String(data)) as { params?: { result?: Log } }).params?.result
    } catch {
      return
    }
    if (!log) return

    try {
      const pool = (await getPools())[log.address.toLowerCase()]
      const swap = pool && decodeSwap(log, pool)
      if (swap) listeners.forEach((listener) => listener(withId(swap, log)))
    } catch {}
  }

  ws.onerror = () => ws.close()

  ws.onclose = () => {
    if (socket !== ws) return
    socket = undefined
    if (!listeners.size) return
    retryTimer = setTimeout(
      () => {
        retryTimer = undefined
        connect()
      },
      Math.min(MAX_RETRY_MS, 1000 * 2 ** retry++)
    )
  }
}

export function onSwap(listener: Listener) {
  listeners.add(listener)
  clearTimeout(idleTimer)
  if (!socket && !retryTimer) connect()

  return () => {
    listeners.delete(listener)
    if (listeners.size) return

    idleTimer = setTimeout(() => {
      if (listeners.size) return
      clearTimeout(retryTimer)
      retryTimer = undefined
      const closing = socket
      socket = undefined
      closing?.close()
    }, IDLE_CLOSE_MS)
  }
}
