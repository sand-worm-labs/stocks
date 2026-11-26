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

// Words for a kind of company that are not a theme of their own, and the theme they belong to when there is one. "Oil" is energy; "solar" is
// not a theme the app has, so nothing is found for it.
export const SECTOR_WORDS: Record<string, string | undefined> = {
  oil: "energy",
  "natural gas": "energy",
  petroleum: "energy",
  crude: "energy",
  coal: "energy",
  uranium: "energy",
  solar: undefined,
  gold: undefined,
  silver: undefined,
  mining: undefined,
  steel: undefined,
  airlines: undefined,
  shipping: undefined,
  cannabis: undefined,
  restaurants: "consumer",
  insurance: "finance",
  biotech: "health",
  utilities: undefined,
  telecom: undefined,
  "real estate": undefined,
}

// Capitalised words in a list of examples that are not a company
export const NOT_A_COMPANY = [
  "similar", "others", "other", "etc", "more", "like", "and", "or", "usdc", "usd", "eur", "etf", "etfs", "spy", "s&p", "sp500", "base",
]
