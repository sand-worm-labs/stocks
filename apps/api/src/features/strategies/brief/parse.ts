import { BRIEF_THEMES, NOT_AN_EXCLUSION } from "./brief.constants"

import type { BriefFields, Found, Goal, Horizon, NamedList, Span } from "./brief.types"

const FLAGS = "gi"

const spanOf = (match: RegExpMatchArray, group = 0): Span => {
  const text = match[group] ?? ""
  const start = (match.index ?? 0) + (group === 0 ? 0 : (match[0].indexOf(text) ?? 0))
  return { start, end: start + text.length }
}

const first = (pattern: RegExp, text: string) => text.match(new RegExp(pattern.source, pattern.flags.replace("g", "")))

const toNumber = (digits: string, scale = "") => {
  const value = Number(digits.replace(/,/g, ""))
  const factor = /^k$/i.test(scale) ? 1_000 : /^m$/i.test(scale) ? 1_000_000 : 1
  return value * factor
}

const NUMBER = String.raw`\d[\d,]*(?:\.\d+)?`
const SIGN = "[−–-]?"
const WORD = String.raw`[\w&\-]+`
const LIST = String.raw`${WORD}(?:(?:\s*,\s*|\s+(?:and|&|or)\s+)${WORD})*`
const AVOIDED = String.raw`(?!(?:no|avoid|without|exclude)\b)${WORD}`
const AVOID_LIST = String.raw`${AVOIDED}(?:(?:\s*,\s*|\s+(?:and|&|or)\s+)${AVOIDED})*`

const splitList = (list: string) =>
  list
    .split(/\s*(?:,|\band\b|&|\bor\b)\s*/i)
    .map((item) => item.trim())
    .filter(Boolean)

function readBudget(text: string): Found<number> | undefined {
  const withUnit = first(new RegExp(String.raw`(${NUMBER})\s?(k|m)?\s?(?:usdc|usd|dollars|bucks)\b`, FLAGS), text)
  if (withUnit) return { value: toNumber(withUnit[1] ?? "", withUnit[2]), span: spanOf(withUnit) }

  const stated = first(new RegExp(String.raw`budget(?:\s+of)?[:\s]+\$?\s?(${NUMBER})\s?(k|m)?`, FLAGS), text)
  if (stated) return { value: toNumber(stated[1] ?? "", stated[2]), span: spanOf(stated) }

  const dollars = first(
    new RegExp(String.raw`\$\s?(${NUMBER})(?:\s?(k|m)\b)?(?![\dkKmM.,])(?!\s?\+|\s+(?:in\s+)?liquidity)`, FLAGS),
    text
  )
  return dollars ? { value: toNumber(dollars[1] ?? "", dollars[2]), span: spanOf(dollars) } : undefined
}

const YEARS_PER = { year: 1, yr: 1, month: 1 / 12, week: 1 / 52, day: 1 / 365 } as const

function horizonFor(years: number, upTo?: number): Horizon {
  if (years < 1) return "Under 1 year"
  if (upTo !== undefined || years < 3) return years >= 3 ? "3+ years" : "1–3 years"
  return "3+ years"
}

function readHorizon(text: string): Found<Horizon> | undefined {
  const range = first(
    new RegExp(String.raw`(\d+(?:\.\d+)?)\s?(?:to|[−–-])\s?(\d+(?:\.\d+)?)\s?(year|yr|month|week|day)s?\b`, FLAGS),
    text
  )
  if (range) {
    const unit = YEARS_PER[range[3]?.toLowerCase() as keyof typeof YEARS_PER] ?? 1
    return { value: horizonFor(Number(range[1]) * unit, Number(range[2]) * unit), span: spanOf(range) }
  }

  const single = first(new RegExp(String.raw`(\d+(?:\.\d+)?)\s?(\+)?\s?(year|yr|month|week|day)s?\b`, FLAGS), text)
  if (single) {
    const unit = YEARS_PER[single[3]?.toLowerCase() as keyof typeof YEARS_PER] ?? 1
    return { value: horizonFor(Number(single[1]) * unit), span: spanOf(single) }
  }

  const soon = first(/\b(?:next|this)\s+(?:week|month|year)\b|\bshort[- ]term\b/gi, text)
  if (soon) return { value: "Under 1 year", span: spanOf(soon) }

  const long = first(/\blong[- ]term\b/gi, text)
  return long ? { value: "3+ years", span: spanOf(long) } : undefined
}

function readLoss(text: string): Found<number> | undefined {
  const match = first(
    new RegExp(
      String.raw`(?:panic|bail|sell|stomach|lose|drop|fall|drawdown|loss|down)\D{0,25}?(${SIGN}\s?\d{1,3}\s?%)`,
      FLAGS
    ),
    text
  )
  return match ? { value: Number((match[1] ?? "").replace(/\D/g, "")), span: spanOf(match, 1) } : undefined
}

const GOALS: { goal: Goal; pattern: RegExp }[] = [
  { goal: "Income", pattern: /\b(income|dividends?|yield|passive)\b/gi },
  { goal: "Protect capital", pattern: /\b(protect(?:ion)?|preserv(?:e|ation)|safe|safety|defensive|conservative)\b/gi },
  {
    goal: "Growth",
    pattern: /\b(grow|growth|appreciate|appreciation|compound|profit|returns?|make\s+(?:me\s+)?money)\b/gi,
  },
]

function readGoal(text: string): Found<Goal> | undefined {
  const found = GOALS.flatMap(({ goal, pattern }) => {
    const match = first(pattern, text)
    return match ? [{ value: goal, span: spanOf(match, 1) }] : []
  })
  return found.sort((a, b) => a.span.start - b.span.start)[0]
}

function readMaxPerStock(text: string): Found<number> | undefined {
  const match = first(
    new RegExp(
      String.raw`(?:max(?:imum)?|no more than|at most|cap(?:ped)?(?: at)?|up to)\s*(\d{1,3})\s?%\s*(?:in|per|of|on)?\s*(?:any\s+)?(?:one|single|each|a)?\s*(?:stock|company|position|name)`,
      FLAGS
    ),
    text
  )
  return match ? { value: Number(match[1]), span: spanOf(match) } : undefined
}

function readMinLiquidity(text: string) {
  const match = first(new RegExp(String.raw`\$?\s?(${NUMBER})\s?(k|m)?\s?\+?\s*(?:in\s+)?liquidity`, FLAGS), text)
  return match ? toNumber(match[1] ?? "", match[2]) : undefined
}

const isExclusion = (items: string[]) => !!items[0] && !NOT_AN_EXCLUSION.includes(items[0].toLowerCase())

const AVOID_WORDS = ["no", "avoid", "without", "exclude"]

function readAvoid(text: string): NamedList {
  const pattern = new RegExp(
    String.raw`\b(?:avoid(?:ing)?|exclud(?:e|ing)|without|(?:do not|don't) want|not interested in|no)\s+(?:any\s+)?(?:exposure\s+to\s+)?(${AVOID_LIST})`,
    FLAGS
  )
  const named: NamedList = { items: [], hits: [] }

  for (const match of Array.from(text.matchAll(pattern))) {
    const listSpan = spanOf(match, 1)
    const items = splitList(match[1] ?? "").filter((item) => !AVOID_WORDS.includes(item.toLowerCase()))
    if (!isExclusion(items)) continue

    if (!named.clause) {
      named.clause = { list: listSpan, whole: spanOf(match), items }
    } else {
      for (const item of items) {
        const offset = text.indexOf(item, listSpan.start)
        named.hits.push({ item, span: { start: offset, end: offset + item.length } })
      }
    }
    named.items.push(...items)
  }

  return named
}

function readInclude(text: string, avoid: NamedList): NamedList {
  const explicit = first(
    new RegExp(String.raw`\b(?:include|including|focus(?:ed)?\s+on|exposure\s+to)\s+(${LIST})`, FLAGS),
    text
  )
  const clause = explicit
    ? { list: spanOf(explicit, 1), whole: spanOf(explicit), items: splitList(explicit[1] ?? "") }
    : undefined

  const hits = BRIEF_THEMES.flatMap((theme) => {
    const match = first(new RegExp(String.raw`\b${theme.replace(" ", String.raw`\s`)}\b`, FLAGS), text)
    if (!match) return []

    const span = spanOf(match)
    const isAvoided = avoid.clause && span.start >= avoid.clause.whole.start && span.end <= avoid.clause.whole.end
    const isInClause = clause && span.start >= clause.whole.start && span.end <= clause.whole.end
    return isAvoided || isInClause ? [] : [{ item: theme, span }]
  })

  const items = [...(clause?.items ?? []), ...hits.map(({ item }) => item)]
  return {
    items: items.filter((item, i) => items.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === i),
    hits,
    clause,
  }
}

export function parseBrief(text: string): BriefFields {
  const avoid = readAvoid(text)

  return {
    goal: readGoal(text),
    horizon: readHorizon(text),
    loss: readLoss(text),
    budget: readBudget(text),
    maxPerStock: readMaxPerStock(text),
    minLiquidity: readMinLiquidity(text),
    askBeforeBuying: /\b(?:ask|check|confirm)\b[^.]*\bbefore\b[^.]*\b(?:buy|buying|trad\w+|invest\w*)\b/i.test(text),
    avoid,
    include: readInclude(text, avoid),
  }
}
