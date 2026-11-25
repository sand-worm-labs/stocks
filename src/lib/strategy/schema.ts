import { z } from "zod"

import type { Condition, Indicator, Node, Strategy } from "@/types/strategy"

// Strategies as JSON: what is saved, sent to the agent and shared. Anything read in goes through here first, so a strategy
// that gets as far as the engine or the canvas is one they can run.

const days = z.number().int().min(1).max(1000)
const symbol = z.string().min(1).max(32)

const indicator: z.ZodType<Indicator> = z.union([
  z.object({ kind: z.literal("price") }).strict(),
  z
    .object({
      kind: z.enum(["sma", "ema", "sma-return", "rsi", "return", "volatility", "drawdown", "std-price"]),
      days,
    })
    .strict(),
])

const reading = z.object({ symbol, indicator }).strict()

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z
      .object({
        left: reading,
        op: z.enum([">", "<"]),
        right: z.union([reading, z.object({ value: z.number() }).strict()]),
      })
      .strict(),
    z.object({ all: z.array(conditionSchema).min(1) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1) }).strict(),
  ])
)

const node: z.ZodType<Node> = z.lazy(() =>
  z.union([
    z
      .object({
        type: z.literal("asset"),
        symbol,
        side: z.enum(["long", "short"]).optional(),
        via: z.enum(["spot", "perp"]).optional(),
      })
      .strict()
      .refine(({ side, via }) => side !== "short" || via === "perp", {
        message: "A short has to be held through a perp",
        path: ["via"],
      }),
    z.object({ type: z.literal("cash") }).strict(),
    z
      .object({
        type: z.literal("group"),
        name: z.string().max(80).optional(),
        weighting: z.enum(["equal", "specified", "inverse-volatility"]),
        days: days.optional(),
        children: z.array(z.object({ node, weight: z.number().min(0).optional() }).strict()).min(1),
      })
      .strict(),
    z.object({ type: z.literal("if"), condition: conditionSchema, then: node, else: node }).strict(),
    z
      .object({
        type: z.literal("filter"),
        pick: z.enum(["top", "bottom"]),
        count: z.number().int().min(1),
        by: indicator,
        from: z.array(symbol).min(1),
        weighting: z.enum(["equal", "inverse-volatility"]).optional(),
        days: days.optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("rebalance"),
        drift: z.number().gt(0).max(0.5),
        every: z.enum(["daily", "weekly", "monthly"]),
        child: node,
      })
      .strict(),
  ])
)

export const strategySchema: z.ZodType<Strategy> = z
  .object({ name: z.string().min(1).max(80), schedule: z.enum(["daily", "weekly", "monthly"]), root: node })
  .strict()

type ParsedStrategy = { ok: true; strategy: Strategy } | { ok: false; error: string }

export function parseStrategy(input: unknown): ParsedStrategy {
  let value = input
  if (typeof input === "string") {
    try {
      value = JSON.parse(input)
    } catch {
      return { ok: false, error: "That is not valid JSON" }
    }
  }
  const result = strategySchema.safeParse(value)
  if (result.success) return { ok: true, strategy: result.data }
  const issue = result.error.issues[0]
  return { ok: false, error: `${issue?.path.join(".") || "strategy"}: ${issue?.message ?? "is not valid"}` }
}

export const serializeStrategy = (strategy: Strategy) => JSON.stringify(strategy, null, 2)
