import type { Comparison, Condition } from "./types"

// A condition as a list a person can edit: one comparison, or several that must all hold or any one of which will do. A
// condition with a group inside a group is not a list, and is left to the JSON.

export type Match = "all" | "any"
export type ConditionList = { match: Match; rows: Comparison[] }

const isComparison = (condition: Condition): condition is Comparison => "left" in condition

export function toList(condition: Condition): ConditionList | undefined {
  if (isComparison(condition)) return { match: "all", rows: [condition] }
  const match: Match = "all" in condition ? "all" : "any"
  const parts = "all" in condition ? condition.all : condition.any
  const rows = parts.filter(isComparison)
  return rows.length === parts.length ? { match, rows } : undefined
}

// The condition a list stands for: a lone comparison is just that
export function fromList({ match, rows }: ConditionList): Condition {
  const [only] = rows
  return rows.length === 1 && only ? only : match === "all" ? { all: rows } : { any: rows }
}

// A comparison as a new row starts out: the stock's price against its own 50-day average
export const newComparison = (symbol: string): Comparison => ({
  left: { symbol, indicator: { kind: "price" } },
  op: ">",
  right: { symbol, indicator: { kind: "sma", days: 50 } },
})

// Sizes of what is drawn for a condition that can be edited, in pixels, so the board leaves room for it
const LINE = 32
const BETWEEN = 10
const PADDING = 21

// How tall the editing body of an If block is: a row for each comparison (two lines when it is read against another stock, one
// when against a number), then the button to add one. A condition that is not a list is a single line of words.
export function editorHeight(condition: Condition) {
  const list = toList(condition)
  if (!list) return PADDING + LINE
  const rows = list.rows.reduce((sum, { right }) => sum + ("value" in right ? LINE : LINE * 2 + 6) + BETWEEN, 0)
  return PADDING + rows + LINE
}
