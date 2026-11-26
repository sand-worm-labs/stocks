import { fromMarket, shared } from "@/lib/api/market"

export type BaseToken = {
  id: string
  symbol: string
  company: string
  issuer: string
  image?: string
  address: string
  price: number
  marketCap?: number
  volume?: number
  rank: number
  // As fractions: 0.012 is +1.2%
  change1h?: number
  change24h?: number
  change7d?: number
  series: number[]
}

// The first list after the API starts can take half a minute, so this waits longer than the API's other calls do
const TOKENS_TIMEOUT_MS = 60_000

const KEPT_MS = 30_000

const tokensAt = shared<BaseToken>(KEPT_MS, (path) => fromMarket<BaseToken[]>(path, [], TOKENS_TIMEOUT_MS))

// Every tokenized stock on Base, biggest first. The API keeps the list and refreshes it, so this is quick once it has one.
export const getBaseTokens = () => tokensAt("/market/tokens")

export const searchTokens = (tokens: BaseToken[], query: string) => {
  const needle = query.trim().toLowerCase()
  return needle ? tokens.filter(({ symbol, company }) => `${symbol} ${company}`.toLowerCase().includes(needle)) : tokens
}

export const ALL_ISSUERS = "all"

export const filterByIssuer = (tokens: BaseToken[], issuer: string) =>
  issuer === ALL_ISSUERS ? tokens : tokens.filter((token) => token.issuer === issuer)

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

export function marketHighlights(tokens: BaseToken[]) {
  const traded = tokens.filter(({ volume = 0, change24h }) => volume >= TRADED_VOLUME && change24h !== undefined)
  const byChange = traded.toSorted((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))

  return {
    gainers: byChange.slice(0, HIGHLIGHT_COUNT),
    losers: byChange.slice(-HIGHLIGHT_COUNT).reverse(),
    mostTraded: tokens.toSorted((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, HIGHLIGHT_COUNT),
  }
}

export const findToken = (tokens: BaseToken[], slug: string) =>
  tokens.find(({ id }) => id === slug) ?? tokens.find(({ symbol }) => symbol === slug)

const PARETO_SHARE = 0.8
const PARETO_SHOWN = 20

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
    reach: ranked.findIndex(({ cumulative }) => cumulative >= PARETO_SHARE) + 1,
    shown: ranked.slice(0, PARETO_SHOWN),
  }
}

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
