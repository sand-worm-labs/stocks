import type { Tone } from "@/constants/tone"
import type { Source } from "@/lib/markets/types"

export type Check = { id: string; tone: Tone; text: string; term?: string }

export type Metric = {
  id: string
  label: string
  term: string
  value: number
  kind: "percent" | "ratio" | "multiple"
  // What the S&P 500 did, or what this metric was before a change
  benchmark?: number
  was?: number
  note?: string
}

export type ResearchEntry = {
  symbol: string
  text: string
  label: "Fact" | "Assumption" | "Opinion"
  source?: Source
}

// Where a number came from, and what it was used for
export type ReportSource = Source & { note: string }

export type FanPoint = { month: number; low: number; median: number; high: number }

export type Report = {
  version: 1 | 2
  verdict: { label: string; tone: Tone }
  headline: string
  plan: string
  metrics: Metric[]
  // Each stock's weight, and the cash kept
  allocation: { symbol: string; weight: number }[]
  summary: string[]
  // Version 2 only: what was changed and how it compares with before
  changed?: string
  comparison?: { label: string; term?: string; before: string; after: string }[]
  checks: { honesty: Check[]; bias: Check[]; overfit: Check[] }
  // Month-end value of 100 invested at `start` (YYYY-MM), oldest first, the portfolio against the S&P 500. The last
  // `holdoutMonths` are the stretch the strategy was never built on.
  performance: { start: string; holdoutMonths: number; portfolio: number[]; benchmark: number[] }
  periods: { label: string; term: string; portfolio: number; benchmark: number }[]
  // `fan` is the range of a year's outcomes month by month: the middle, and the bad and good year at 1 in 20
  drawdown: { text: string; bad: number; median: number; good: number; note: string; fan: FanPoint[] }
  tolerance: { panic: number; worst: number; fits: boolean; text: string }
  concentration: { symbol: string; weight: number; risk: number }[]
  liquidity: { symbol: string; token: number; share: number }[]
  // What the tokens are, and where the liquidity numbers came from
  venue: { facts: { label: string; value: string }[]; sources: Source[]; asOf: string }
  research: ResearchEntry[]
  researchNote: { text: string; sources: Source[]; asOf: string }
  sources: ReportSource[]
}

export type Order = { symbol: string; spend: number; receive: number; impact: number }
