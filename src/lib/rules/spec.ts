import { z } from "zod"

import { formatCompactUsd, formatPercent } from "@/lib/format"
import type { Stock } from "@/lib/markets/types"
import type { Portfolio } from "@/lib/portfolios/types"
import { describeCondition } from "@/lib/strategy/describe"
import { plainCondition } from "@/lib/strategy/explain"
import { conditionSchema } from "@/lib/strategy/schema"
import type { Condition } from "@/lib/strategy/types"

import { readRules, type RuleReading } from "./readings"
import type { Rule } from "./types"

// The rules a portfolio is held to, as data: what is saved, edited as JSON and checked every trade against.

export type RuleSpec =
  // The most it may have put in
  | { type: "budget"; amount: number }
  // The most of the portfolio one stock may be, as a fraction
  | { type: "max-weight"; limit: number }
  // The least that a stock's pool must hold, in dollars
  | { type: "min-liquidity"; amount: number }
  // Nothing is bought or sold without the owner's OK
  | { type: "approval" }
  // Sell a stock that has fallen this far, as a fraction, below what was paid for it
  | { type: "stop-loss"; limit: number }
  // Sell a stock that has risen this far, as a fraction, above what was paid for it
  | { type: "take-profit"; limit: number }
  // Sell everything once the whole strategy has fallen this far, as a fraction, from its high, then stay in cash for `pause` trading
  // days. It is watched on the portfolio, apart from trades, and never holds a trade back.
  | { type: "portfolio-stop"; limit: number; pause?: number }
  // A condition on the market, held to at the top level: never trade while it is true, or only trade while it is
  | { type: "condition"; mode: "never" | "only"; condition: Condition }

export const ruleSchema: z.ZodType<RuleSpec> = z.union([
  z.object({ type: z.literal("budget"), amount: z.number().positive() }).strict(),
  z.object({ type: z.literal("max-weight"), limit: z.number().gt(0).max(1) }).strict(),
  z.object({ type: z.literal("min-liquidity"), amount: z.number().positive() }).strict(),
  z.object({ type: z.literal("approval") }).strict(),
  z.object({ type: z.literal("stop-loss"), limit: z.number().gt(0).max(1) }).strict(),
  z.object({ type: z.literal("take-profit"), limit: z.number().gt(0).max(10) }).strict(),
  z
    .object({
      type: z.literal("portfolio-stop"),
      limit: z.number().gt(0).max(1),
      pause: z.number().int().min(1).max(252).optional(),
    })
    .strict(),
  z.object({ type: z.literal("condition"), mode: z.enum(["never", "only"]), condition: conditionSchema }).strict(),
])

export const rulesSchema = z.array(ruleSchema).max(20)

// A rule in words
export function describeRule(spec: RuleSpec) {
  switch (spec.type) {
    case "budget":
      return `Budget ${spec.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} USDC`
    case "max-weight":
      return `Max ${formatPercent(spec.limit)} in any one stock`
    case "min-liquidity":
      return `Liquidity ≥ ${formatCompactUsd(spec.amount)} on Base`
    case "approval":
      return "Ask before buying"
    case "stop-loss":
      return `Stop-loss ${formatPercent(spec.limit)}`
    case "take-profit":
      return `Take profit ${formatPercent(spec.limit)}`
    case "portfolio-stop":
      return `Portfolio stop ${formatPercent(spec.limit)}`
    case "condition":
      return `Trade while ${describeCondition(spec.condition)}`
  }
}

// Trading days in a month, to say a pause in months
export const DEFAULT_PAUSE = 63
const pauseWords = (days: number) => {
  const months = Math.round(days / 21)
  return months >= 1 ? `${months} ${months === 1 ? "month" : "months"}` : `${days} ${days === 1 ? "day" : "days"}`
}

// A rule as a line to a person, in the same words as the rest of the model's rules: a lead word and what follows it
export function explainRule(spec: RuleSpec): { lead: "Never" | "Only" | "Always"; text: string } {
  switch (spec.type) {
    case "budget":
      return {
        lead: "Never",
        text: `put more than ${spec.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} USDC into this strategy.`,
      }
    case "max-weight":
      return {
        lead: "Never",
        text: `let one stock be more than ${formatPercent(spec.limit)} of the strategy, so one bad pick can't sink it.`,
      }
    case "min-liquidity":
      return {
        lead: "Only",
        text: `trade stocks whose pool holds at least ${formatCompactUsd(spec.amount)}, so you can always get out.`,
      }
    case "approval":
      return { lead: "Always", text: "wait for your OK before buying or selling." }
    case "stop-loss":
      return {
        lead: "Always",
        text: `sell a stock that falls ${formatPercent(spec.limit)} below what you paid for it.`,
      }
    case "take-profit":
      return {
        lead: "Always",
        text: `sell a stock once it is up ${formatPercent(spec.limit)} on what you paid for it.`,
      }
    case "portfolio-stop":
      return {
        lead: "Always",
        text: `sell everything if the strategy falls ${formatPercent(spec.limit)} from its high, then stay in cash for ${pauseWords(spec.pause ?? DEFAULT_PAUSE)}.`,
      }
    case "condition":
      return { lead: spec.mode === "never" ? "Never" : "Only", text: `trade while ${plainCondition(spec.condition)}.` }
  }
}

// The rule as the page reads it, to be measured against the portfolio
export function ruleOf(spec: RuleSpec, id: number): Rule {
  const label = describeRule(spec)
  switch (spec.type) {
    case "budget":
      return { id, label, kind: "budget", limit: spec.amount, state: "holds" }
    case "max-weight":
      return { id, label, kind: "max-weight", limit: spec.limit, state: "holds" }
    case "min-liquidity":
      return { id, label, kind: "liquidity", limit: spec.amount, state: "holds" }
    case "approval":
      return { id, label, kind: "approval", state: "holds" }
    case "stop-loss":
      return { id, label, kind: "stop-loss", limit: spec.limit, state: "holds" }
    case "take-profit":
      return { id, label, kind: "take-profit", limit: spec.limit, state: "holds" }
    case "portfolio-stop":
      return { id, label, kind: "portfolio-stop", limit: spec.limit, pause: spec.pause, state: "holds" }
    case "condition":
      return { id, label, kind: "condition", mode: spec.mode, condition: spec.condition, state: "holds" }
  }
}

// The other way: a rule that was read off the portfolio, as data. A rule that can't be measured has none.
export function specOf({ kind, limit, pause, mode, condition }: Rule): RuleSpec | undefined {
  if (kind === "budget" && limit) return { type: "budget", amount: limit }
  if (kind === "max-weight" && limit) return { type: "max-weight", limit }
  if (kind === "liquidity" && limit) return { type: "min-liquidity", amount: limit }
  if (kind === "approval") return { type: "approval" }
  if (kind === "stop-loss" && limit) return { type: "stop-loss", limit }
  if (kind === "take-profit" && limit) return { type: "take-profit", limit }
  if (kind === "portfolio-stop" && limit) return { type: "portfolio-stop", limit, ...(pause ? { pause } : {}) }
  if (kind === "condition" && mode && condition) return { type: "condition", mode, condition }
  return undefined
}

// Each rule against where the portfolio is now: how much room it has, and whether it holds. A rule is broken when the
// portfolio is past its line.
export function checkRules(
  portfolio: Portfolio,
  specs: RuleSpec[],
  stocks: Pick<Stock, "symbol" | "liquidity" | "series">[]
): RuleReading[] {
  return readRules(
    portfolio,
    specs.map((spec, i) => ruleOf(spec, i + 1)),
    stocks
  ).map((reading) => ({
    ...reading,
    rule: {
      ...reading.rule,
      state: reading.broken || (reading.closeness !== undefined && reading.closeness > 1) ? "broken" : "holds",
    },
  }))
}
