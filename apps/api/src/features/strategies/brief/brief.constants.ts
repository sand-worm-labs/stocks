import { TOPICS, TOPIC_ALIASES } from "@/features/market/matching/topics"

export const BRIEF_GOALS = ["Growth", "Income", "Protect capital"] as const

export const BRIEF_HORIZONS = ["Under 1 year", "1–3 years", "3+ years"] as const

export const BRIEF_THEMES = [
  "Robotics",
  "AI",
  "Chips",
  "Semiconductors",
  "Crypto",
  "Bitcoin",
  "Quantum",
  "Defense",
  "Space",
  "EV",
  "Energy",
  "Health",
  "Pharma",
  "Finance",
  "Banks",
  "Consumer",
  "Big tech",
] as const

// Words that follow "no" or "avoid" without being something to avoid ("no more than 25%")
export const NOT_AN_EXCLUSION = [
  "more",
  "less",
  "than",
  "one",
  "any",
  "other",
  "single",
  "stock",
  "stocks",
  "company",
  "companies",
  "position",
  "positions",
  "exposure",
  "risk",
  "loss",
  "losses",
]

// A brief that asks for more than this a year is not one a stock portfolio can plan for
export const MAX_PLANNABLE_ANNUAL_RETURN = 1

// A loss limit tighter than this is hit by an ordinary day
export const MIN_LOSS_LIMIT = 3

// Words for a kind of company that are not a theme of their own ("oil stocks", "airlines"): every word the topics know, but the themes above.
// What each one means in terms of sector and industry is in features/market/matching/topics.ts.
const AMBIGUOUS = ["stocks", "space", "health", "technology", "tech", "medicine", "drugs"]
export const SECTOR_WORDS = [...Object.keys(TOPICS), ...Object.keys(TOPIC_ALIASES)].filter(
  (word) => !AMBIGUOUS.includes(word) && !BRIEF_THEMES.some((theme) => theme.toLowerCase() === word)
)

// Capitalised words in a list of examples that are not a company
export const NOT_A_COMPANY = [
  "similar", "others", "other", "etc", "more", "like", "and", "or", "usdc", "usd", "eur", "etf", "etfs", "spy", "s&p", "sp500", "base",
]

// Words that describe how a person wants to invest and not what in, so "random stocks" and "dividend stocks" name no kind of company
export const NOT_A_KIND = [
  "random", "good", "best", "top", "big", "large", "small", "mid", "growth", "value", "dividend", "income", "safe", "steady", "cheap", "any", "some", "all",
  "my", "the", "a", "an", "of", "in", "for", "and", "or", "with", "that", "pay", "paying", "profitable", "stable", "solid", "winning", "hot", "new", "other",
  "similar", "these", "those", "only", "just", "also", "which", "where", "liquid", "more", "most", "few", "many", "individual", "single", "listed", "major", "leading", "popular", "blue", "chip", "base", "tokenized",
]
