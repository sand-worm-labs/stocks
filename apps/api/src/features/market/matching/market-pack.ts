import { isBuyable } from "@/features/market/stock"
import type { Stock } from "@/features/market/types/market.types"

import { findStocks, type Market } from "./find-stocks"

const MOST_CANDIDATES = 24
const MOST_PER_TOPIC = 12

export type PackStock = {
  symbol: string
  name: string
  sector?: string
  industry?: string
  // The token's contract on Base
  address?: string
  price?: number
  // What the deepest pool on Base holds, in USD. Missing when there is no pool, so the stock cannot be bought yet.
  liquidity?: number
  isBuyable: boolean
  isPreIpo: boolean
  // Why it is here: what in the idea it matches
  why: string
}

export type PackTopic = {
  // The word in the idea
  term: string
  // Everything the data calls that, and the part of it that can be bought on Base
  matches: number
  buyable: number
}

// What Stocks found for an idea, to hand to whoever researches it: which stocks the idea is about, what can be bought and what cannot, and what the
// market on Base is made of. The research starts from this rather than from nothing.
export type MarketPack = {
  asOf: string
  universe: { listed: number; buyable: number; preIpo: number }
  topics: PackTopic[]
  candidates: PackStock[]
  // What the stocks are, by sector, so an idea that names nothing can be read against the market as it is
  sectors: { sector: string; buyable: number; listed: number }[]
  notes: string[]
}

const byLiquidity = (a: Stock, b: Stock) => (b.liquidity ?? 0) - (a.liquidity ?? 0)

function packStock(stock: Stock, why: string): PackStock {
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    industry: stock.industry,
    address: stock.address,
    price: stock.price,
    liquidity: stock.liquidity,
    isBuyable: isBuyable(stock),
    isPreIpo: !!stock.preIpo,
    why,
  }
}

/// The stocks to take when an idea names none: the deepest pool of each sector in turn, so what comes out is a spread of the market and not its
/// three most traded names. The same stock is never taken twice.
export function spreadAcrossSectors(stocks: Stock[], count: number): Stock[] {
  const queues = new Map<string, Stock[]>()
  for (const stock of stocks.filter(isBuyable).toSorted(byLiquidity)) {
    const sector = stock.sector ?? "Unknown"
    queues.set(sector, [...(queues.get(sector) ?? []), stock])
  }
  // The sector with the deepest pool goes first
  const order = [...queues.values()].toSorted((a, b) => byLiquidity(a[0]!, b[0]!))
  const taken: Stock[] = []
  for (let round = 0; taken.length < count; round++) {
    const before = taken.length
    for (const queue of order) {
      const stock = queue[round]
      if (stock && taken.length < count) taken.push(stock)
    }
    if (taken.length === before) break
  }
  return taken
}

function sectorsOf(stocks: Stock[]) {
  const counts = new Map<string, { buyable: number; listed: number }>()
  for (const stock of stocks) {
    const sector = stock.sector ?? "Not looked up yet"
    const count = counts.get(sector) ?? { buyable: 0, listed: 0 }
    count.listed += 1
    if (isBuyable(stock)) count.buyable += 1
    counts.set(sector, count)
  }
  return [...counts].map(([sector, count]) => ({ sector, ...count })).toSorted((a, b) => b.buyable - a.buyable || b.listed - a.listed)
}

export function marketPackFor(terms: string[], market: Market, now = new Date()): MarketPack {
  const listed = market.stocks
  const topics: PackTopic[] = []
  const candidates = new Map<string, PackStock>()

  for (const term of terms) {
    const matches = findStocks(term, market)
    topics.push({ term, matches: matches.length, buyable: matches.filter(isBuyable).length })
    // What can be bought comes first, and the deepest pool before a thin one; what cannot be bought is still said, so the research knows it exists
    const first = matches.toSorted((a, b) => Number(isBuyable(b)) - Number(isBuyable(a)) || byLiquidity(a, b)).slice(0, MOST_PER_TOPIC)
    for (const stock of first) {
      if (!candidates.has(stock.symbol)) candidates.set(stock.symbol, packStock(stock, `matches “${term}”`))
    }
  }

  const notes: string[] = []
  if (!terms.length) {
    for (const stock of spreadAcrossSectors(listed, MOST_CANDIDATES)) {
      candidates.set(stock.symbol, packStock(stock, "a spread across the market: the idea names no kind of company"))
    }
    notes.push("The idea names no company or kind of company, so these are the deepest pools of each sector in turn.")
  }
  for (const { term, matches, buyable } of topics) {
    if (!matches) notes.push(`Nothing listed on Base is “${term}”.`)
    else if (!buyable) notes.push(`${matches} listed stocks match “${term}”, but none has a pool on Base to buy it in yet.`)
  }
  if (!listed.length) notes.push("The list of stocks on Base could not be loaded, so nothing was found.")

  return {
    asOf: now.toISOString(),
    universe: { listed: listed.length, buyable: listed.filter(isBuyable).length, preIpo: listed.filter((stock) => stock.preIpo).length },
    topics,
    candidates: [...candidates.values()].slice(0, MOST_CANDIDATES),
    sectors: sectorsOf(listed),
    notes,
  }
}

const usd = (amount: number | undefined) => {
  if (amount === undefined) return "–"
  return amount >= 1000 ? `$${Math.round(amount / 1000)}K` : `$${Math.round(amount)}`
}

function poolText(stock: PackStock) {
  if (stock.isBuyable) return usd(stock.liquidity)
  return stock.isPreIpo ? "not listed yet" : "no pool yet"
}

/// The pack as the research is told it: a table of what to consider and a few plain lines about what is missing
export function packMarkdown(pack: MarketPack): string {
  const rows = pack.candidates.map(
    (stock) => `| ${stock.symbol} | ${stock.name} | ${stock.sector ?? "–"} / ${stock.industry ?? "–"} | ${poolText(stock)} | ${stock.why} |`,
  )
  const header = ["| Stock | Company | Sector / industry | Pool on Base | Why |", "| --- | --- | --- | --- | --- |"]
  const table = rows.length ? [...header, ...rows].join("\n") : "Nothing matched."
  const { listed, buyable, preIpo } = pack.universe
  const preIpoText = preIpo ? `, ${preIpo} not on an exchange yet` : ""
  return [
    `**On Base now:** ${listed} stocks listed, ${buyable} with a pool to buy in${preIpoText}.`,
    table,
    ...pack.notes.map((note) => `- ${note}`),
  ].join("\n\n")
}
