import type { RuleSpec } from "@/features/strategies/rules/spec"

// What a person cares about, read from how they put it. It decides which four numbers lead their report, so a person who said they'd panic
// at a loss sees the worst fall first, and one who wants to beat the market sees how far ahead it is.
export type Priority = "growth" | "protect" | "steady" | "beat" | "spread"

const SIGNALS: Record<Priority, RegExp> = {
  growth: /\b(grow|growth|return|gain|profit|double|20%|make money)\b/i,
  protect: /\b(panic|safe|safely|protect|lose|loss|drop|fall|drawdown|worried|nervous|can'?t afford)\b/i,
  steady: /\b(steady|stable|smooth|low risk|calm|sleep|consistent|beginner|first time|new to)\b/i,
  beat: /\b(beat|outperform|better than|vs\.? the (market|s&p)|alpha)\b/i,
  spread: /\b(diversif|spread|no more than|max(imum)? \d+%|cap|any one|single stock|concentrat)\b/i,
}

export function prioritiesOf(brief: string, rules: RuleSpec[]): Priority[] {
  const found = (Object.keys(SIGNALS) as Priority[]).filter((priority) => SIGNALS[priority].test(brief))
  // A stop on the portfolio, or a cap on one stock, is a priority even when the words for it weren't used
  if (rules.some(({ type }) => type === "portfolio-stop") && !found.includes("protect")) found.push("protect")
  if (rules.some(({ type }) => type === "max-weight") && !found.includes("spread")) found.push("spread")
  return found
}

export type KpiId = "cagr" | "maxDrawdown" | "edge" | "sharpe" | "beta" | "badYear" | "positiveMonths" | "volatility" | "recent"

// How much each number matters to each priority. Everyone is shown the return and the worst fall unless they said something else matters
// more, because those are what someone buying a stock most needs to see.
const WEIGHTS: Record<KpiId, { base: number } & Partial<Record<Priority, number>>> = {
  cagr: { base: 5, growth: 3, beat: 1 },
  maxDrawdown: { base: 4.5, protect: 5, steady: 1 },
  edge: { base: 2, beat: 6, growth: 1 },
  sharpe: { base: 2.5, steady: 2, beat: 1 },
  beta: { base: 1.5, protect: 1, spread: 0.5, beat: 1 },
  badYear: { base: 1, protect: 3, steady: 2 },
  positiveMonths: { base: 0.5, steady: 4 },
  volatility: { base: 0.5, steady: 3, protect: 0.5 },
  recent: { base: 1, growth: 0.5 },
}

const ORDER = Object.keys(WEIGHTS) as KpiId[]

// Every number, most worth showing this person first. The same brief always gives the same order.
export function rankKpis(priorities: Priority[]): KpiId[] {
  const score = (id: KpiId) => WEIGHTS[id].base + priorities.reduce((sum, priority) => sum + (WEIGHTS[id][priority] ?? 0), 0)
  return ORDER.toSorted((a, b) => score(b) - score(a) || ORDER.indexOf(a) - ORDER.indexOf(b))
}

// The four that lead the report
export const kpisFor = (priorities: Priority[]) => rankKpis(priorities).slice(0, 4)

const READS: Record<Priority, string> = {
  growth: "how much it grew",
  protect: "how far it fell, since they said a loss would worry them",
  steady: "how smooth the ride was",
  beat: "whether it beat just holding the market",
  spread: "whether the money was spread out",
}

// The instructions a researcher is given with the person's own words, so the report comes back in the shape the app shows. They are
// written for an agent (Sandworm's, or one driving it) and are what makes its notebooks print what the report needs. The researcher does
// the sums; it doesn't decide what the report says.
export function reportInstructions(priorities: Priority[], kpis: KpiId[]) {
  const cares = priorities.length ? priorities.map((priority) => READS[priority]).join("; ") : "how it did against the market"
  return [
    "Report structure. Test the plan on real daily prices against the S&P 500 (SPY), after trading costs and with the rules' stop.",
    `The person cares about: ${cares}. Lead with these four numbers: ${kpis.join(", ")}.`,
    "Do all of it in one notebook for this strategy, with its summary in the first cell. Then two parts: Backtest (growth, return, Sharpe, beta, a bad/typical/good year) and Risk (worst fall, worst month, share of the risk by stock, each stock on its own).",
    "Have the notebook print lines of `STOCKS_RESULT {json}` for what it found, each under 3,000 characters. Print numbers, not sentences.",
    "Say plainly when a stock has no price history. Never promise a return; give what history shows and how wide the spread was.",
  ].join("\n")
}
