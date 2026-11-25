import type { Comparison, Condition } from "@/types/strategy"

export type Match = "all" | "any"
type ConditionList = { match: Match; rows: Comparison[] }

const isComparison = (condition: Condition): condition is Comparison => "left" in condition

export function toList(condition: Condition): ConditionList | undefined {
  if (isComparison(condition)) return { match: "all", rows: [condition] }
  const match: Match = "all" in condition ? "all" : "any"
  const parts = "all" in condition ? condition.all : condition.any
  const rows = parts.filter(isComparison)
  return rows.length === parts.length ? { match, rows } : undefined
}

export function fromList({ match, rows }: ConditionList): Condition {
  const [only] = rows
  return rows.length === 1 && only ? only : match === "all" ? { all: rows } : { any: rows }
}

export const newComparison = (symbol: string): Comparison => ({
  left: { symbol, indicator: { kind: "price" } },
  op: ">",
  right: { symbol, indicator: { kind: "sma", days: 50 } },
})

// Sizes of what is drawn for a condition that can be edited, in pixels, so the board leaves room for it
const LINE = 32
const BETWEEN = 10
const PADDING = 21
export const JOINER = 16

export function editorHeight(condition: Condition) {
  const list = toList(condition)
  if (!list) return PADDING + LINE
  const rows = list.rows.reduce((sum, { right }) => sum + ("value" in right ? LINE : LINE * 2 + 6) + BETWEEN, 0)
  const joins = Math.max(list.rows.length - 1, 0) * (JOINER + BETWEEN)
  return PADDING + rows + joins + LINE
}
