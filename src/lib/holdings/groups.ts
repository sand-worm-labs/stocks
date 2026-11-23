import type { Stock } from "@/lib/markets/types"
import { portfolioValue, rankByValue } from "@/lib/portfolios/portfolio"
import type { Portfolio } from "@/lib/portfolios/types"

export type HeldRow = {
  symbol: string
  name: string
  value: number
  cost: number
  // What a unit cost when it was bought
  entryPrice: number
  // Its share of the model it is in, and what it has gained since it was bought
  weight: number
  gain: number
  gainRate: number
}

export type ModelHoldings = {
  portfolio: Portfolio
  // The model's rank by value, so it has the same colour on every page
  index: number
  value: number
  rows: HeldRow[]
}

// The stocks held, under the model that holds each, the biggest model and the biggest stock first. The same stock in two
// models shows in both.
export function groupHoldingsByModel(
  portfolios: Portfolio[],
  stocks: Pick<Stock, "symbol" | "name">[]
): ModelHoldings[] {
  return rankByValue(portfolios).map((portfolio, index) => {
    const value = portfolioValue(portfolio) ?? 0
    const rows = portfolio.holdings
      .map(({ symbol, value: held, cost, entryPrice }) => ({
        symbol,
        name: stocks.find((stock) => stock.symbol === symbol)?.name ?? symbol,
        value: held,
        cost,
        entryPrice,
        weight: value ? held / value : 0,
        gain: held - cost,
        gainRate: cost ? held / cost - 1 : 0,
      }))
      .sort((a, b) => b.value - a.value)

    return { portfolio, index, value, rows }
  })
}

export type StockRow = {
  symbol: string
  name: string
  value: number
  // Its share of everything held in stocks
  share: number
  gain: number
  gainRate: number
  // The models it is in
  models: { id: string; name: string; index: number }[]
}

const sumOf = (numbers: number[]) => numbers.reduce((total, n) => total + n, 0)

// Each stock once, with what it is worth across all the models it is in, biggest first
export function aggregateStocks(models: ModelHoldings[]): StockRow[] {
  const total = sumOf(models.flatMap(({ rows }) => rows.map(({ value }) => value)))
  const bySymbol = new Map<string, StockRow & { cost: number }>()

  for (const { portfolio, index, rows } of models) {
    for (const { symbol, name, value, cost } of rows) {
      const entry = bySymbol.get(symbol) ?? {
        symbol,
        name,
        value: 0,
        cost: 0,
        share: 0,
        gain: 0,
        gainRate: 0,
        models: [],
      }
      entry.value += value
      entry.cost += cost
      entry.models.push({ id: portfolio.id, name: portfolio.name, index })
      bySymbol.set(symbol, entry)
    }
  }

  return [...bySymbol.values()]
    .map(({ cost, ...entry }) => ({
      ...entry,
      share: total ? entry.value / total : 0,
      gain: entry.value - cost,
      gainRate: cost ? entry.value / cost - 1 : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

// What is held in stocks, what it has gained, and which stock has done best and worst
export function summarizeHoldings(models: ModelHoldings[]) {
  const stocks = aggregateStocks(models)
  const value = sumOf(stocks.map((stock) => stock.value))
  const gain = sumOf(stocks.map((stock) => stock.gain))
  const byGain = stocks.toSorted((a, b) => b.gainRate - a.gainRate)

  return {
    value,
    gain,
    gainRate: value - gain ? gain / (value - gain) : 0,
    stocks: stocks.length,
    models: models.length,
    best: byGain[0],
    worst: byGain.length > 1 ? byGain.at(-1) : undefined,
  }
}

// What matches a search: a stock by its symbol or its name
export const matchesSearch = ({ symbol, name }: { symbol: string; name: string }, query: string) =>
  `${symbol} ${name}`.toLowerCase().includes(query.trim().toLowerCase())
