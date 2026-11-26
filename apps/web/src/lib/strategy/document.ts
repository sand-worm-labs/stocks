import type { RuleSpec } from "@/lib/rules/spec"
import type { Strategy } from "@/types/strategy"

export type ModelDoc = { strategy: Strategy; rules: RuleSpec[] }
