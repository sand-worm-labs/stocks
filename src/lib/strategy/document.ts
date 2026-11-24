import { z } from "zod"

import { type RuleSpec, rulesSchema } from "@/lib/rules/spec"

import { strategySchema } from "./schema"
import type { Strategy } from "./types"

// Everything a model is, as one piece of JSON: how it decides, and the rules every trade is checked against. This is what is
// saved, and what the blocks and the checks are drawn from.
export type ModelDoc = { strategy: Strategy; rules: RuleSpec[] }

const modelSchema: z.ZodType<ModelDoc> = z.object({ strategy: strategySchema, rules: rulesSchema }).strict()

export type ParsedModel = { ok: true; doc: ModelDoc } | { ok: false; error: string }

// JSON in: text or something already read, and either the model or what is wrong with it
export function parseModel(input: unknown): ParsedModel {
  let value = input
  if (typeof input === "string") {
    try {
      value = JSON.parse(input)
    } catch {
      return { ok: false, error: "That is not valid JSON" }
    }
  }
  const result = modelSchema.safeParse(value)
  if (result.success) return { ok: true, doc: result.data }
  const issue = result.error.issues[0]
  return { ok: false, error: `${issue?.path.join(".") || "strategy"}: ${issue?.message ?? "is not valid"}` }
}

// JSON out
export const serializeModel = (doc: ModelDoc) => JSON.stringify(doc, null, 2)
