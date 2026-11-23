import type { Holding, Portfolio } from "@/lib/portfolios/types"

import { makeSeries } from "./series"

const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places

// About what each token's share trades at, the prices the entries below are set against
const REFERENCE_PRICES: Record<string, number> = {
  AAPLc: 342.56,
  GOOGLc: 265.29,
  NVDAc: 125.53,
  METAc: 570,
  SPCXc: 136.45,
  AMZNc: 246.82,
  TTWOc: 209.6,
  SKHYc: 109.9,
  SNDKc: 670,
  ANTc: 92.51,
  TSLAc: 345.82,
  CRCLc: 50.13,
  MSTRc: 82.42,
  LLYc: 1356,
  NFLXc: 57.14,
  BCOINc: 106.62,
}
const STOCK_POOL = Object.keys(REFERENCE_PRICES)

// What was spent on a stock, and how far its price has gone since: from those, the price it was bought at and how many
// units that bought. Its value is its units at today's price, which the portfolio source marks again from the market.
function bought(symbol: string, cost: number, rise: number): Holding {
  const price = REFERENCE_PRICES[symbol] ?? 100
  const entryPrice = round(price / (1 + rise))
  const units = round(cost / entryPrice, 4)
  return { symbol, units, entryPrice, cost: round(units * entryPrice), value: round(units * price) }
}

// Names for the first models made up to fill out the list, each a theme; after them, a name is made from two word lists
const THEMES = [
  "Cloud leaders",
  "Chip equipment",
  "Cash machines",
  "Streaming and games",
  "Defense tech",
  "Quiet compounders",
  "AI infrastructure",
  "Data centres",
  "Consumer brands",
  "Healthcare growth",
  "Obesity and biotech",
  "Payments",
  "Space economy",
  "Nuclear and power",
  "Gold and miners",
  "Electric vehicles",
  "Cybersecurity",
  "Robot makers",
  "Dividend payers",
  "Small caps",
  "Software",
  "Social media",
  "Semis, low risk",
  "Autonomy",
  "Fintech",
  "Pre-IPO watch",
  "Memory cycle",
  "E-commerce",
  "Gaming",
  "Banks",
  "Energy transition",
  "Travel",
  "Retail",
  "Cloud security",
]
const ADJECTIVES = [
  "Steady",
  "Bold",
  "Quiet",
  "Sharp",
  "Patient",
  "Fast",
  "Balanced",
  "Lean",
  "Deep",
  "Wide",
  "Calm",
  "Hot",
]
const NOUNS = [
  "chips",
  "cloud",
  "growth",
  "value",
  "momentum",
  "income",
  "frontier",
  "core",
  "edge",
  "flow",
  "mix",
  "bets",
]
const modelName = (i: number) =>
  THEMES[i] ??
  `${ADJECTIVES[i % ADJECTIVES.length]} ${NOUNS[Math.floor(i / ADJECTIVES.length) % NOUNS.length]} ${i + 1}`
const SPLIT = [0.34, 0.26, 0.2]
const DRAFT_STAGES = ["researching", "rules", "ready", "rules"] as const

// Every way of choosing three of the stocks, so each model can hold a set that no other holds
const TRIPLES = STOCK_POOL.flatMap((first, i) =>
  STOCK_POOL.slice(i + 1).flatMap((second, j) => STOCK_POOL.slice(i + j + 2).map((third) => [first, second, third]))
)
// 37 shares no factor with the number of sets, so stepping by it doesn't land on the same set twice
const stocksFor = (i: number) => TRIPLES[(i * 37) % TRIPLES.length] ?? []

// Models made up in a repeatable way, every ninth still a draft: a list as long as someone with many models would have
function generatedModel(name: string, i: number): Portfolio {
  const day = String(1 + (i % 19)).padStart(2, "0")
  const base = {
    id: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    name,
    brief: `Put USDC into ${name.toLowerCase()}. Ask before buying.`,
    createdAt: `2026-11-${day}T09:${String(10 + (i % 40)).padStart(2, "0")}:00`,
    series: [] as number[],
  }
  if (i % 9 === 8) {
    return {
      ...base,
      status: "draft",
      // The drafts are at different points: some just written, some being researched, some nearly ready
      stage: DRAFT_STAGES[Math.floor(i / 9) % DRAFT_STAGES.length],
      holdings: [],
      cash: 0,
    }
  }

  const size = 1200 + ((i * 517) % 2600)
  const drift = (((i * 37) % 21) - 9) / 100
  return {
    ...base,
    status: "live",
    holdings: stocksFor(i).map((symbol, n) => bought(symbol, round(size * (SPLIT[n] ?? 0.2)), drift + n * 0.01)),
    cash: round(size * 0.2),
    startedAt: `2026-11-${day}T10:00:00`,
    weekChange: (((i * 29) % 90) - 35) / 1000,
    worstDip: -(0.002 + ((i * 11) % 40) / 1000),
    series: makeSeries(100 + i, 0.05 + (i % 7) * 0.03),
  }
}

const BASE_MODELS: Portfolio[] = [
  {
    id: "robotics-20",
    name: "Robotics, capped at 20%",
    brief:
      "Grow 6,000 USDC with robotics over 3+ years. Max 20% in any one stock, only stocks with $100K+ liquidity on Base. I'd panic at −20%. Ask before buying.",
    status: "live",
    holdings: [
      bought("NVDAc", 900, 0.041),
      bought("AMZNc", 900, 0.035),
      bought("GOOGLc", 900, 0.028),
      bought("TSLAc", 900, -0.048),
    ],
    cash: 2400,
    createdAt: "2026-11-18T14:55:00",
    startedAt: "2026-11-18T15:31:00",
    weekChange: 0.008,
    worstDip: -0.003,
    rules: { passing: 4, total: 4, checkedAt: "2026-11-20T09:00:00" },
    series: makeSeries(7, 0.12),
  },
  {
    id: "big-tech-35",
    name: "Big tech, balanced",
    brief: "Grow 7,000 USDC in big tech over 3+ years. Max 35% in any one stock. I'd panic at −20%. Ask before buying.",
    status: "live",
    holdings: [bought("AAPLc", 1725, 0.043), bought("METAc", 1650, -0.045), bought("NFLXc", 1425, 0.032)],
    cash: 2250,
    createdAt: "2026-11-12T13:40:00",
    startedAt: "2026-11-12T14:10:00",
    weekChange: 0.012,
    worstDip: -0.006,
    series: makeSeries(21, 0.1),
  },
  {
    id: "memory-space",
    name: "Memory and space",
    brief: "Put 3,800 USDC into memory chips and space for 3 years. Max 40% in one company. Ask before buying.",
    status: "live",
    holdings: [bought("SNDKc", 960, 0.125), bought("SKHYc", 900, -0.067), bought("SPCXc", 840, -0.143)],
    cash: 1200,
    createdAt: "2026-11-14T10:05:00",
    startedAt: "2026-11-14T10:45:00",
    weekChange: -0.021,
    worstDip: -0.034,
    series: makeSeries(33, 0.14),
  },
  {
    id: "crypto-treasuries",
    name: "Crypto treasuries",
    brief: "Put 2,800 USDC into companies that hold crypto. Max 40% in one stock. Ask before buying.",
    status: "live",
    holdings: [bought("MSTRc", 840, 0.143), bought("CRCLc", 720, -0.083), bought("BCOINc", 600, -0.2)],
    cash: 720,
    createdAt: "2026-11-16T15:50:00",
    startedAt: "2026-11-16T16:20:00",
    weekChange: 0.034,
    worstDip: -0.018,
    series: makeSeries(45, 0.18),
  },
  {
    id: "ai-chips-25",
    name: "AI chips, max 25%",
    brief: "Put 500 USDC into AI chips for 5 years. No more than 25% in one company.",
    status: "draft",
    stage: "ready",
    holdings: [],
    cash: 0,
    createdAt: "2026-11-19T09:12:00",
    note: "Brief written. Waiting for you to confirm the rules before research starts.",
    series: [],
  },
  {
    id: "robotics-8",
    name: "8 robotics at 15%+",
    brief: "Build me 8 robotics stocks, each at least 15% of the portfolio.",
    status: "unbuildable",
    holdings: [],
    cash: 0,
    createdAt: "2026-11-20T08:30:00",
    rules: { passing: 3, total: 4, checkedAt: "2026-11-20T09:00:00" },
    constraint: { positions: 8, minimum: 0.15 },
    series: [],
  },
]

// As many portfolios as asked for: the first few are the hand-made ones, and the rest are made up in a repeatable way
export function buildPortfoliosMockData(total: number): Portfolio[] {
  const made = Array.from({ length: Math.max(total - BASE_MODELS.length, 0) }, (_, i) =>
    generatedModel(modelName(i), i)
  )
  return [...BASE_MODELS.slice(0, total), ...made]
}
