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
  // Growth of 1 unit, oldest first: the portfolio against the S&P 500, and how far below its peak the portfolio was
  performance: { portfolio: number[]; benchmark: number[]; underwater: number[] }
  periods: { label: string; term: string; portfolio: number; benchmark: number }[]
  drawdown: { text: string; bad: number; median: number; good: number }
  tolerance: { panic: number; worst: number; fits: boolean; text: string }
  concentration: { symbol: string; weight: number; risk: number }[]
  liquidity: { symbol: string; token: number; share: number }[]
  research: ResearchEntry[]
  sources: Source[]
}

export type Order = { symbol: string; spend: number; receive: number; minimum: number; impact: number }
