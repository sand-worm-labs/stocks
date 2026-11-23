import { z } from "zod"

import { formatCompactUsd, formatPercent } from "@/lib/format"
import type { Stock } from "@/lib/markets/types"
import type { Portfolio } from "@/lib/portfolios/types"

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

export const ruleSchema: z.ZodType<RuleSpec> = z.union([
  z.object({ type: z.literal("budget"), amount: z.number().positive() }).strict(),
  z.object({ type: z.literal("max-weight"), limit: z.number().gt(0).max(1) }).strict(),
  z.object({ type: z.literal("min-liquidity"), amount: z.number().positive() }).strict(),
  z.object({ type: z.literal("approval") }).strict(),
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
  }
}

// A rule as a sentence to a person: what it stops, and why it is there
export function explainRule(spec: RuleSpec) {
  switch (spec.type) {
    case "budget":
      return `Never put more than ${spec.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} USDC into this model.`
    case "max-weight":
      return `No single stock may be more than ${formatPercent(spec.limit)} of the model, so one bad pick can't sink it.`
    case "min-liquidity":
      return `Only trade stocks whose pool holds at least ${formatCompactUsd(spec.amount)}, so you can always get out.`
    case "approval":
      return "Nothing is bought or sold until you say OK."
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
  }
}

// The other way: a rule that was read off the portfolio, as data. A rule that can't be measured has none.
export function specOf({ kind, limit }: Rule): RuleSpec | undefined {
  if (kind === "budget" && limit) return { type: "budget", amount: limit }
  if (kind === "max-weight" && limit) return { type: "max-weight", limit }
  if (kind === "liquidity" && limit) return { type: "min-liquidity", amount: limit }
  if (kind === "approval") return { type: "approval" }
  return undefined
}

// Each rule against where the portfolio is now: how much room it has, and whether it holds. A rule is broken when the
// portfolio is past its line.
export function checkRules(
  portfolio: Portfolio,
  specs: RuleSpec[],
  stocks: Pick<Stock, "symbol" | "liquidity">[]
): RuleReading[] {
  return readRules(
    portfolio,
    specs.map((spec, i) => ruleOf(spec, i + 1)),
    stocks
  ).map((reading) => ({
    ...reading,
    rule: { ...reading.rule, state: reading.closeness !== undefined && reading.closeness > 1 ? "broken" : "holds" },
  }))
}
