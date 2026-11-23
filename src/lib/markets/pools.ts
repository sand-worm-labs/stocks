import { z } from "zod"

import { DEXSCREENER_URL } from "@/constants/markets"

// What a token's deepest pool on Base says right now. Changes are in percent, as the feed gives them.
export type PoolQuote = {
  // The token's contract, lowercase
  address: string
  // The pool it trades in, and what it is traded against
  pair: string
  quote: string
  price: number
  change5m?: number
  change1h?: number
  change24h?: number
  volume24h?: number
  liquidity?: number
}

const ADDRESSES_PER_CALL = 30

const pairsSchema = z.array(
  z.object({
    pairAddress: z.string(),
    baseToken: z.object({ address: z.string() }),
    quoteToken: z.object({ address: z.string() }),
    priceUsd: z.string().optional(),
    priceChange: z
      .object({ m5: z.number().optional(), h1: z.number().optional(), h24: z.number().optional() })
      .optional(),
    volume: z.object({ h24: z.number().optional() }).optional(),
    liquidity: z.object({ usd: z.number().optional() }).optional(),
  })
)

async function getPairs(addresses: string[]) {
  const response = await fetch(`${DEXSCREENER_URL}/${addresses.join(",")}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  })
  return response.ok ? pairsSchema.parse(await response.json()) : []
}

// Prices straight from the pools the tokens trade in, which move as trades happen. A token with several pools is read
// from the deepest.
export async function getPoolQuotes(addresses: string[]): Promise<PoolQuote[]> {
  const chunks = Array.from({ length: Math.ceil(addresses.length / ADDRESSES_PER_CALL) }, (_, i) =>
    addresses.slice(i * ADDRESSES_PER_CALL, (i + 1) * ADDRESSES_PER_CALL)
  )
  const pairs = (await Promise.all(chunks.map(getPairs))).flat()

  const deepest = new Map<string, (typeof pairs)[number]>()
  for (const pair of pairs) {
    const key = pair.baseToken.address.toLowerCase()
    if (pair.priceUsd && (pair.liquidity?.usd ?? 0) >= (deepest.get(key)?.liquidity?.usd ?? -1)) deepest.set(key, pair)
  }

  return Array.from(deepest, ([address, pair]) => ({
    address,
    pair: pair.pairAddress.toLowerCase(),
    quote: pair.quoteToken.address.toLowerCase(),
    price: Number(pair.priceUsd),
    change5m: pair.priceChange?.m5,
    change1h: pair.priceChange?.h1,
    change24h: pair.priceChange?.h24,
    volume24h: pair.volume?.h24,
    liquidity: pair.liquidity?.usd,
  }))
}

const ALL_POOLS_MS = 10_000

let allPools: { at: number; quotes: PoolQuote[] } | undefined
let loadingPools: Promise<PoolQuote[]> | undefined

// Every token's pool, kept for a few seconds so many readers share one round of calls to the feed. Quotes that have gone
// stale are served at once and renewed in the background: the page's first paint never waits on the feed, and the
// browser polls for fresher ones anyway. Only the very first read, with nothing to show yet, waits.
export async function getAllPoolQuotes(addresses: string[]): Promise<PoolQuote[]> {
  if (allPools && Date.now() - allPools.at < ALL_POOLS_MS) return allPools.quotes

  loadingPools ??= getPoolQuotes(addresses)
    .then((quotes) => {
      allPools = { at: Date.now(), quotes }
      return quotes
    })
    .catch(() => allPools?.quotes ?? [])
    .finally(() => {
      loadingPools = undefined
    })

  return allPools ? allPools.quotes : loadingPools
}
