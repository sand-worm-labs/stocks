import { unstable_cache } from "next/cache"
import { z } from "zod"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { COINGECKO_URL } from "@/constants/markets"
import { env } from "env.mjs"

export type BaseToken = {
  id: string
  // What it trades as: GOOGLc for Coinbase's token of Alphabet
  symbol: string
  // The company the token stands for
  company: string
  issuer: string
  image?: string
  // Its contract on Base
  address: string
  price: number
  marketCap?: number
  volume?: number
  // Where it stands by market cap, among these tokens
  rank: number
  // As fractions: 0.012 is +1.2%
  change1h?: number
  change24h?: number
  change7d?: number
  // A close every few hours across the last week, oldest first
  series: number[]
}

const PAGE_SIZE = 250
const MAX_PAGES = 8
const CACHE_MS = 60 * 1000
// One point in six keeps the week's shape without sending every hour of it
const SERIES_STEP = 6

const number = z.number().nullable().optional()

const marketsSchema = z.array(
  z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    image: z.string().nullish(),
    current_price: number,
    market_cap: number,
    total_volume: number,
    price_change_percentage_1h_in_currency: number,
    price_change_percentage_24h_in_currency: number,
    price_change_percentage_7d_in_currency: number,
    sparkline_in_7d: z.object({ price: z.array(z.number()) }).nullish(),
  })
)

const RATE_LIMIT_WAIT_MS = 20_000

// With a key the calls count against its own allowance, not the shared one a deployed app is refused on
export const coingeckoHeaders = () => ({
  accept: "application/json",
  ...(env.COINGECKO_API_KEY && { "x-cg-demo-api-key": env.COINGECKO_API_KEY }),
})

async function get<T>(path: string, schema: z.ZodType<T>, retry = true): Promise<T> {
  const response = await fetch(`${COINGECKO_URL}${path}`, {
    headers: coingeckoHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  })

  // The free feed allows a few calls a minute: wait once for the limit to pass
  if (response.status === 429 && retry) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS))
    return get(path, schema, false)
  }
  if (!response.ok) throw new Error(`Market data answered ${response.status}`)

  return schema.parse(await response.json())
}

const ISSUER = /\(([^)]*?)\s*Tokenized Stocks?\)/i
const ISSUER_SUFFIX = /\b(aStock|ST0x|xStock|bStock)s?$/i
const BY_NAME = /^(.*?)\s*\(/

function describe(name: string, symbol: string) {
  const issuer = ISSUER.exec(name)?.[1] ?? ISSUER_SUFFIX.exec(name)?.[1] ?? "Other"
  const company = BY_NAME.exec(name)?.[1] ?? name.replace(ISSUER_SUFFIX, "").trim()
  // Coinbase's tokens are the ticker with a lowercase c
  const display = issuer === "Coinbase" ? `${symbol.slice(0, -1).toUpperCase()}c` : symbol.toUpperCase()

  return { issuer, company, symbol: display }
}

const toFraction = (percent?: number | null) => (percent == null ? undefined : percent / 100)

const MARKETS = "/coins/markets?vs_currency=usd&per_page=250"
const IDS_PER_REQUEST = 150

// The coins in the tokenized stock category, page by page
async function getCategoryIds() {
  const ids: string[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await get(`${MARKETS}&category=tokenized-stock&page=${page}`, marketsSchema)
    ids.push(...batch.map(({ id }) => id))
    if (batch.length < PAGE_SIZE) break
  }

  return ids
}

// A few ids at a time, so a refresh is a couple of calls however long the list is
async function getMarketsOf(ids: string[]) {
  const chunks = Array.from({ length: Math.ceil(ids.length / IDS_PER_REQUEST) }, (_, i) =>
    ids.slice(i * IDS_PER_REQUEST, (i + 1) * IDS_PER_REQUEST)
  )
  const batches = await Promise.all(
    chunks.map((chunk) =>
      get(`${MARKETS}&ids=${chunk.join(",")}&sparkline=true&price_change_percentage=1h,24h,7d`, marketsSchema)
    )
  )

  return batches.flat()
}

// What was fetched is kept on disk too, so a restart doesn't start again from nothing and a failing feed leaves the
// last good list on the page
const cacheFile = (name: string) => join(tmpdir(), `sandworm-stocks-${name}.json`)

async function readCache<T>(name: string): Promise<{ at: number; value: T } | undefined> {
  try {
    const [text, { mtimeMs }] = await Promise.all([readFile(cacheFile(name), "utf8"), stat(cacheFile(name))])
    return { at: mtimeMs, value: JSON.parse(text) as T }
  } catch {
    return undefined
  }
}

async function writeCache(name: string, value: unknown) {
  await mkdir(tmpdir(), { recursive: true })
  await writeFile(cacheFile(name), JSON.stringify(value))
}

const BASE_ADDRESSES_MS = 24 * 60 * 60 * 1000

// Which coins are on Base, and their contracts, changes slowly and the list is large, so it is fetched about once a day
async function getBaseAddresses(): Promise<Record<string, string>> {
  const cachedAddresses = await readCache<Record<string, string>>("base-addresses")
  if (cachedAddresses && Date.now() - cachedAddresses.at < BASE_ADDRESSES_MS) return cachedAddresses.value

  try {
    // Twenty thousand coins come back, so they are filtered as they are read, not checked one by one against a schema
    const response = await fetch(`${COINGECKO_URL}/coins/list?include_platform=true`, {
      headers: coingeckoHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`Market data answered ${response.status}`)

    const addresses: Record<string, string> = {}
    for (const { id, platforms } of (await response.json()) as { id: string; platforms?: Record<string, string> }[]) {
      if (platforms?.base) addresses[id] = platforms.base
    }
    await writeCache("base-addresses", addresses)
    return addresses
  } catch (error) {
    if (cachedAddresses) return cachedAddresses.value
    throw error
  }
}

// Which of the tokenized stocks are on Base. Found by walking the whole category, so it is done about once a day.
async function getTokenIds(addresses: Record<string, string>): Promise<string[]> {
  const cachedIds = await readCache<string[]>("token-ids")
  if (cachedIds && Date.now() - cachedIds.at < BASE_ADDRESSES_MS) return cachedIds.value

  try {
    const ids = (await getCategoryIds()).filter((id) => addresses[id])
    await writeCache("token-ids", ids)
    return ids
  } catch (error) {
    if (cachedIds) return cachedIds.value
    throw error
  }
}

async function loadBaseTokens(): Promise<BaseToken[]> {
  const addresses = await getBaseAddresses()
  const markets = await getMarketsOf(await getTokenIds(addresses))

  return markets
    .filter((coin) => addresses[coin.id] && coin.current_price)
    .toSorted((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
    .map((coin, i) => ({
      id: coin.id,
      ...describe(coin.name, coin.symbol),
      image: coin.image ?? undefined,
      address: addresses[coin.id] ?? "",
      price: coin.current_price ?? 0,
      marketCap: coin.market_cap ?? undefined,
      volume: coin.total_volume ?? undefined,
      rank: i + 1,
      change1h: toFraction(coin.price_change_percentage_1h_in_currency),
      change24h: toFraction(coin.price_change_percentage_24h_in_currency),
      change7d: toFraction(coin.price_change_percentage_7d_in_currency),
      series: (coin.sparkline_in_7d?.price ?? []).filter((_, i) => i % SERIES_STEP === SERIES_STEP - 1),
    }))
}

// The list is also kept in Next's data cache, which every server instance shares, so one that has only just started reads
// what another fetched instead of walking the free feed again: a start with nothing in memory or on disk is a read, not
// a dozen slow calls. A list that has gone stale is served and renewed behind it, and one that can't be renewed stays.
// The in-memory copy below still decides when to ask, so a feed that is refusing is tried about once a minute per instance,
// not once per visit.
const loadSharedTokens = unstable_cache(loadBaseTokens, ["base-tokens"], { revalidate: CACHE_MS / 1000 })

const FAILED_RETRY_MS = 60 * 1000

let cached: { at: number; tokens: BaseToken[] } | undefined
let loading: Promise<BaseToken[]> | undefined
let retryAt = 0

function refresh() {
  loading ??= loadSharedTokens()
    .then(async (tokens) => {
      cached = { at: Date.now(), tokens }
      await writeCache("tokens-v2", tokens).catch(() => {})
      return tokens
    })
    .catch((error) => {
      console.error("Could not load the tokenized stocks on Base:", error)
      retryAt = Date.now() + FAILED_RETRY_MS
      return cached?.tokens ?? []
    })
    .finally(() => {
      loading = undefined
    })

  return loading
}

// Every tokenized stock on Base, with its live price and moves. A list a few minutes old is served at once and
// renewed in the background, so a visit never waits on the free feed unless there is nothing to show yet.
export async function getBaseTokens(): Promise<BaseToken[]> {
  if (!cached) {
    const onDisk = await readCache<BaseToken[]>("tokens-v2")
    if (onDisk) cached = { at: onDisk.at, tokens: onDisk.value }
  }

  const isStale = !cached || Date.now() - cached.at > CACHE_MS
  if (cached) {
    if (isStale && Date.now() > retryAt) void refresh()
    return cached.tokens
  }

  // With nothing to show and the feed having just failed, the page is not held up for another try that is bound to be
  // refused as well: it shows no tokens now and the next visit after the pause tries again
  if (Date.now() < retryAt) return []

  return refresh()
}

export const searchTokens = (tokens: BaseToken[], query: string) => {
  const needle = query.trim().toLowerCase()
  return needle ? tokens.filter(({ symbol, company }) => `${symbol} ${company}`.toLowerCase().includes(needle)) : tokens
}

export const ALL_ISSUERS = "all"

export const filterByIssuer = (tokens: BaseToken[], issuer: string) =>
  issuer === ALL_ISSUERS ? tokens : tokens.filter((token) => token.issuer === issuer)

// Issuers, the one with the most tokens first
export const issuerCounts = (tokens: BaseToken[]) =>
  Array.from(
    Map.groupBy(tokens, ({ issuer }) => issuer),
    ([issuer, group]) => ({ issuer, count: group.length })
  ).sort((a, b) => b.count - a.count)

export function marketStats(tokens: BaseToken[]) {
  const sum = (value: (token: BaseToken) => number | undefined) =>
    tokens.reduce((total, token) => total + (value(token) ?? 0), 0)

  return {
    count: tokens.length,
    marketCap: sum(({ marketCap }) => marketCap),
    volume: sum(({ volume }) => volume),
    issuers: new Set(tokens.map(({ issuer }) => issuer)).size,
  }
}

const TRADED_VOLUME = 10_000
const HIGHLIGHT_COUNT = 3

// The lists a market page leads with: who rose most, who fell most and what is traded most. A token nobody trades
// can swing wildly, so only those with volume can be a mover.
export function marketHighlights(tokens: BaseToken[]) {
  const traded = tokens.filter(({ volume = 0, change24h }) => volume >= TRADED_VOLUME && change24h !== undefined)
  const byChange = traded.toSorted((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))

  return {
    gainers: byChange.slice(0, HIGHLIGHT_COUNT),
    losers: byChange.slice(-HIGHLIGHT_COUNT).reverse(),
    mostTraded: tokens.toSorted((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, HIGHLIGHT_COUNT),
  }
}

// A token by its CoinGecko id, or by the symbol it trades as
export const findToken = (tokens: BaseToken[], slug: string) =>
  tokens.find(({ id }) => id === slug) ?? tokens.find(({ symbol }) => symbol === slug)

const PARETO_SHARE = 0.8
const PARETO_SHOWN = 20

// How concentrated a market is: the biggest tokens first with the share they have added up to, and how few it takes to
// reach most of the total
export function pareto(tokens: BaseToken[], value: (token: BaseToken) => number | undefined) {
  const sorted = tokens
    .map((token) => ({ token, value: value(token) ?? 0 }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
  const total = sorted.reduce((sum, entry) => sum + entry.value, 0)

  let running = 0
  const ranked = sorted.map((entry) => {
    running += entry.value
    return { ...entry, cumulative: running / (total || 1) }
  })

  return {
    total,
    count: ranked.length,
    // How many tokens it takes to make up 80% of the total
    reach: ranked.findIndex(({ cumulative }) => cumulative >= PARETO_SHARE) + 1,
    shown: ranked.slice(0, PARETO_SHOWN),
  }
}

// Each issuer's share of the market cap, the largest first
export function issuerShares(tokens: BaseToken[]) {
  const total = tokens.reduce((sum, { marketCap = 0 }) => sum + marketCap, 0)

  return Array.from(
    Map.groupBy(tokens, ({ issuer }) => issuer),
    ([issuer, group]) => ({
      issuer,
      count: group.length,
      marketCap: group.reduce((sum, { marketCap = 0 }) => sum + marketCap, 0),
    })
  )
    .map((entry) => ({ ...entry, share: entry.marketCap / (total || 1) }))
    .sort((a, b) => b.marketCap - a.marketCap)
}
