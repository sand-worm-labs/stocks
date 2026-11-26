import type { CategoryRecord } from "@/types/markets"

import { tickerOf } from "./share"
import { type BaseToken, marketHighlights } from "./tokens"

// The two filters that aren't categories
export const ALL_TOKENS = "all"
export const HIGHLIGHTED_TOKENS = "highlights"

const isIn = (token: BaseToken, { tickers }: CategoryRecord) => {
  const ticker = tickerOf(token)
  return !!ticker && tickers.includes(ticker)
}

export function filterByCategory(tokens: BaseToken[], categoryId: string, categories: CategoryRecord[]) {
  if (categoryId === ALL_TOKENS) return tokens
  if (categoryId === HIGHLIGHTED_TOKENS) {
    const { gainers, losers, mostTraded } = marketHighlights(tokens)
    const ids = new Set([...gainers, ...losers, ...mostTraded].map(({ id }) => id))
    return tokens.filter(({ id }) => ids.has(id))
  }
  const chosen = categories.find(({ id }) => id === categoryId)
  return chosen ? tokens.filter((token) => isIn(token, chosen)) : []
}

export const categoryCounts = (tokens: BaseToken[], categories: CategoryRecord[]) =>
  categories
    .map((category) => ({
      id: category.id,
      label: category.label,
      isHot: category.isHot,
      count: tokens.filter((token) => isIn(token, category)).length,
    }))
    .filter(({ count }) => count > 0)

export const parseCategory = (value: unknown, known: string[]) =>
  typeof value === "string" && [ALL_TOKENS, HIGHLIGHTED_TOKENS, ...known].includes(value) ? value : ALL_TOKENS

// The stocks of every category an idea names
export function stocksNamedIn<S extends { symbol: string }>(idea: string, categories: { id: string; label: string; symbols: string[] }[], stocks: S[]) {
  const words = ` ${idea.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `
  const named = categories.filter(({ id, label }) => [id, label].some((name) => words.includes(` ${name.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `)))
  const symbols = new Set(named.flatMap((category) => category.symbols))
  return stocks.filter(({ symbol }) => symbols.has(symbol))
}
