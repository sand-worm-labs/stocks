import type { Stock, StockCategory } from "@/features/market/types/market.types"
import { underlyingTicker } from "@/features/market/stock"

import { TOPICS, TOPIC_ALIASES } from "./topics"

export type Market = { stocks: Stock[]; categories: StockCategory[] }

const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9& ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
// A whole word, in its plural too: "food" is in "Packaged Foods"
const hasWord = (text: string | undefined, word: string) => !!text && new RegExp(String.raw`\b${escape(word)}(?:s|es)?\b`, "i").test(text)

const MIN_FREE_WORD = 4
// Words in a phrase that every company could be said to be
const GENERIC = new Set(["tech", "technology", "companies", "company", "business", "businesses", "based", "services", "products", "global", "group"])

// Every stock that is what a word in the idea says, whether it can be bought yet or not: a company by its ticker or name, a kind of company by
// its sector and industry, or a category kept in the database. The caller decides what to do with the ones that cannot be bought.
export function findStocks(term: string, { stocks, categories }: Market): Stock[] {
  const wanted = norm(term)
  const topic = TOPICS[TOPIC_ALIASES[wanted] ?? wanted]
  const found = new Set<string>()

  for (const stock of stocks) {
    const ticker = norm(underlyingTicker(stock.symbol))
    if (ticker === wanted || norm(stock.symbol) === wanted) found.add(stock.symbol)
    else if (hasWord(norm(stock.name), wanted)) found.add(stock.symbol)
  }

  for (const category of categories) {
    if (norm(category.id) !== wanted && !norm(category.label).split(" ").includes(wanted) && !topic?.categories?.includes(category.id)) continue
    for (const symbol of [...category.symbols, ...(category.unavailable ?? [])]) found.add(symbol)
  }

  if (topic) {
    for (const stock of stocks) {
      const isSector = !!stock.sector && !!topic.sectors?.includes(stock.sector)
      const isIndustry = !!stock.industry && !!topic.industries?.test(stock.industry)
      const isNamed = !!topic.names?.test(stock.name)
      if (isSector || isIndustry || isNamed) found.add(stock.symbol)
    }
  }

  // A word with no topic is looked for in what the stocks say about themselves. A phrase ("food tech") is looked for by its words that tell
  // something, a stock being found if it says any of them.
  if (!topic) {
    const words = wanted.split(" ").filter((word) => word.length >= MIN_FREE_WORD && !GENERIC.has(word))
    for (const stock of stocks) {
      if (words.some((word) => hasWord(stock.industry, word) || hasWord(stock.sector, word) || hasWord(stock.description, word))) found.add(stock.symbol)
    }
  }

  return stocks.filter(({ symbol }) => found.has(symbol))
}
