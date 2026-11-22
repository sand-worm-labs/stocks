import { ALL_TOKENS, HIGHLIGHTED_TOKENS, TOKEN_CATEGORIES } from "@/constants/categories"

import { tickerOf } from "./share"
import { type BaseToken, marketHighlights } from "./tokens"

const isIn = (token: BaseToken, categoryId: string) => {
  const ticker = tickerOf(token)
  return (
    !!ticker &&
    TOKEN_CATEGORIES.some(({ id, tickers }) => id === categoryId && (tickers as readonly string[]).includes(ticker))
  )
}

export function filterByCategory(tokens: BaseToken[], category: string) {
  if (category === ALL_TOKENS) return tokens
  if (category === HIGHLIGHTED_TOKENS) {
    const { gainers, losers, mostTraded } = marketHighlights(tokens)
    const ids = new Set([...gainers, ...losers, ...mostTraded].map(({ id }) => id))
    return tokens.filter(({ id }) => ids.has(id))
  }
  return tokens.filter((token) => isIn(token, category))
}

// The groups that have any token in them, and how many
export const categoryCounts = (tokens: BaseToken[]) =>
  TOKEN_CATEGORIES.map(({ id, label, ...category }) => ({
    id,
    label,
    isHot: "isHot" in category,
    count: tokens.filter((token) => isIn(token, id)).length,
  })).filter(({ count }) => count > 0)

export const parseCategory = (value: unknown, known: string[]) =>
  typeof value === "string" && [ALL_TOKENS, HIGHLIGHTED_TOKENS, ...known].includes(value) ? value : ALL_TOKENS
