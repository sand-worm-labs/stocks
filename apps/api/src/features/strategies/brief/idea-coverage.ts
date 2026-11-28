import { isBuyable } from "@/features/market/stock"
import { findStocks } from "@/features/market/matching/find-stocks"
import { SECTOR_WORDS, NOT_A_COMPANY, NOT_A_KIND } from "./brief.constants"
import { parseBrief } from "./parse"
import { formatPercent } from "@/common/utils/format"
import { symbolsOf } from "@/features/strategies/language/evaluate"
import type { Market } from "@/features/strategies/design/pipeline.types"
import type { StrategyRecord } from "@/features/strategies/types/strategy-record"

// How far what a person's idea named is covered by what can be bought on Base:
//   named     everything it named is there
//   partly    some of it is there, and some is not
//   fallback  nothing it named is there, so the strategy tests something else (the most liquid stocks)
//   open      it named nothing in particular, so the most liquid stocks were picked as asked
export type IdeaCoverage = {
  basis: "named" | "partly" | "fallback" | "open"
  // What the idea named that has nothing buyable on Base
  couldntMatch: string[]
  // What the idea named that is listed on Base but has no pool to trade in yet: it exists, it just can't be bought
  listedOnly: string[]
  // What the strategy will actually consider
  tests: { symbol: string; name: string }[]
  // The share of the money that stays in cash because the cap on one stock leaves no room for more stocks
  cashLeft: number
  // The words for it, once, so the app and an agent say the same. Missing when there is nothing to say.
  headline?: string
  detail?: string
}

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9&]+/g, " ").trim()
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const list = (items: string[]) => (items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`)

// Examples a person gives for a kind of company: "(Exxon, Chevron and Shell)", "such as Tesla, Nvidia". Only what is written as a name.
function namedExamples(text: string) {
  const lists = [...text.matchAll(/\(([^()]{2,120})\)/g), ...text.matchAll(/\b(?:such as|like|e\.g\.|including|named)\s+([A-Z][^.;()]{1,100})/g)]
  return lists.flatMap(([, inside = ""]) =>
    inside
      .split(/\s*(?:,|&|\band\b|\bor\b)\s*/i)
      .map((word) => word.replace(/^(?:and|or)\s+/i, "").trim())
      .filter((word) => /^[A-Z]/.test(word) && word.length >= 2 && !word.includes(" ") && !NOT_A_COMPANY.includes(word.toLowerCase()))
  )
}

function sectorWords(text: string) {
  return SECTOR_WORDS.filter((word) => new RegExp(String.raw`\b${escape(word)}\b`, "i").test(text))
}

// A kind of company described in words: "food tech companies", "pet stocks". The words before the noun, without the ones that say how to invest.
const KIND_PATTERN = /\b((?:[a-z][\w&-]*\s+){0,2}[a-z][\w&-]*)\s+(?:companies|stocks|shares|firms|startups|businesses)\b/gi

export function kindsOf(text: string) {
  return Array.from(text.matchAll(KIND_PATTERN), ([, phrase = ""]) => {
    const words = phrase.split(/\s+/)
    const start = words.findLastIndex((word) => NOT_A_KIND.includes(word.toLowerCase()) || /^\d/.test(word)) + 1
    return words.slice(start).join(" ")
  }).filter((kind) => kind.length >= 3)
}

// Everything the idea names that has to be found on Base: its themes, its kinds of company, and the companies it gives as examples
export function namedBy(text: string) {
  const { include, avoid } = parseBrief(text)
  const avoided = new Set(avoid.items.map((item) => item.toLowerCase()))
  const all = [...include.items, ...sectorWords(text), ...namedExamples(text), ...kindsOf(text)]
  const unique = all.filter((item, i) => all.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === i)
  const isPartOfAnother = (item: string) =>
    unique.some((other) => other !== item && other.length > item.length && new RegExp(String.raw`\b${escape(item)}\b`, "i").test(other))
  return unique.filter((item) => !avoided.has(item.toLowerCase()) && !isPartOfAnother(item))
}

// Whether something named can be bought on Base: some stock that is what it says, with a pool to trade in
function isFound(item: string, market: Market) {
  return findStocks(item, market).some(isBuyable)
}

type Input = { brief: string; symbols: string[]; market: Market; maxShare?: number }

export function ideaCoverage({ brief, symbols, market, maxShare }: Input): IdeaCoverage {
  const named = namedBy(brief)
  const couldntMatch = named.filter((item) => !isFound(item, market))
  const listedOnly = [...new Set(named.flatMap((item) => findStocks(item, market).filter((stock) => !isBuyable(stock)).map(({ symbol }) => symbol)))]
  const tests = symbols.map((symbol) => ({ symbol, name: market.stocks.find((stock) => stock.symbol === symbol)?.name ?? symbol }))
  const basis = !named.length ? "open" : couldntMatch.length === named.length ? "fallback" : couldntMatch.length ? "partly" : "named"

  // A cap of 20% on a stock can't hold more than 100% with fewer than 5 of them: what no stock can take stays as cash
  const cashLeft = maxShare && tests.length ? Math.max(0, 1 - tests.length * maxShare) : 0
  const fewStocks = cashLeft > 0.005 ? `At ${formatPercent(maxShare ?? 0)} a stock, ${tests.length} stock${tests.length === 1 ? "" : "s"} leave ${formatPercent(cashLeft)} of the money in cash.` : undefined

  const symbolList = list(tests.map(({ symbol }) => symbol))
  const MOST_LISTED = 4
  const listedText = listedOnly.length ? `${list(listedOnly.slice(0, MOST_LISTED))}${listedOnly.length > MOST_LISTED ? ` and ${listedOnly.length - MOST_LISTED} more` : ""} ${listedOnly.length === 1 ? "is" : "are"} listed on Base, but ${listedOnly.length === 1 ? "has" : "have"} no pool to trade in yet. ` : ""
  if (basis === "fallback") {
    return {
      basis, couldntMatch, listedOnly, tests, cashLeft,
      headline: listedOnly.length ? `Can't be bought on Base yet: ${list(couldntMatch)}` : `Nothing on Base matches ${list(couldntMatch)}`,
      detail: `${listedText || "Those stocks can't be bought here yet. "}This would test the ${tests.length} most liquid stocks instead: ${symbolList}. Go ahead with those, or start again with a different idea.${fewStocks ? ` ${fewStocks}` : ""}`,
    }
  }
  if (basis === "partly") {
    return {
      basis, couldntMatch, listedOnly, tests, cashLeft,
      headline: `Not on Base yet: ${list(couldntMatch)}`,
      detail: `${listedText}The rest of your idea is covered. This tests ${symbolList}.${fewStocks ? ` ${fewStocks}` : ""}`,
    }
  }
  if (listedOnly.length) {
    return { basis, couldntMatch, listedOnly, tests, cashLeft, headline: "Some of what you named can't be bought yet", detail: `${listedText}This tests ${symbolList}.${fewStocks ? ` ${fewStocks}` : ""}` }
  }
  if (fewStocks) return { basis, couldntMatch, listedOnly, tests, cashLeft, headline: "Part of the money stays in cash", detail: fewStocks }
  return { basis, couldntMatch, listedOnly, tests, cashLeft }
}

/// The coverage of a strategy that is made: what its idea named against what is on Base now, and what its rules will actually test
export function coverageOf(record: StrategyRecord, market: Market): IdeaCoverage {
  const maxShare = record.rules.find((rule) => rule.type === "max-weight")?.limit
  return ideaCoverage({ brief: record.brief, symbols: symbolsOf(record.strategy.root), market, maxShare })
}
