import type { Condition, History, Node, Schedule, Weights } from "@/types/strategy"
import { read } from "./indicators"

const DEFAULT_VOLATILITY_DAYS = 20

const scaled = (weights: Weights, share: number): Weights =>
  Object.fromEntries(Object.entries(weights).map(([symbol, weight]) => [symbol, weight * share]))

const merge = (parts: Weights[]) => {
  const total: Weights = {}
  for (const part of parts)
    for (const [symbol, weight] of Object.entries(part)) total[symbol] = (total[symbol] ?? 0) + weight
  return total
}

export function holds(condition: Condition, history: History, at: number): boolean {
  if ("all" in condition) return condition.all.every((part) => holds(part, history, at))
  if ("any" in condition) return condition.any.some((part) => holds(part, history, at))
  const { left, op, right } = condition
  const a = read(history[left.symbol], at, left.indicator)
  const b = "value" in right ? right.value : read(history[right.symbol], at, right.indicator)
  // With no reading yet, a condition is not met, and its else-branch is taken
  if (a === undefined || b === undefined) return false
  return op === ">" ? a > b : a < b
}

function shares(node: Extract<Node, { type: "group" }>, history: History, at: number) {
  const count = node.children.length
  const equal = node.children.map(() => 1 / count)

  if (node.weighting === "specified") {
    const given = node.children.map(({ weight }) => Math.max(weight ?? 0, 0))
    const sum = given.reduce((total, weight) => total + weight, 0)
    return sum > 0 ? given.map((weight) => weight / sum) : equal
  }

  if (node.weighting === "inverse-volatility") {
    // A stock's own swings; a block of several has no single price to measure, so the group falls back to equal
    const swings = node.children.map(({ node: child }) =>
      child.type === "asset"
        ? read(history[child.symbol], at, { kind: "volatility", days: node.days ?? DEFAULT_VOLATILITY_DAYS })
        : undefined
    )
    if (swings.some((swing) => !swing)) return equal
    const inverse = swings.map((swing) => 1 / (swing ?? 1))
    const sum = inverse.reduce((total, value) => total + value, 0)
    return inverse.map((value) => value / sum)
  }

  return equal
}

export function evaluate(node: Node, history: History, at: number): Weights {
  switch (node.type) {
    case "asset":
      return { [node.symbol]: node.side === "short" ? -1 : 1 }

    case "cash":
      return {}

    case "group": {
      if (!node.children.length) return {}
      const split = shares(node, history, at)
      return merge(node.children.map(({ node: child }, i) => scaled(evaluate(child, history, at), split[i] ?? 0)))
    }

    case "if":
      return evaluate(holds(node.condition, history, at) ? node.then : node.else, history, at)

    case "rebalance":
      return evaluate(node.child, history, at)

    case "filter": {
      const ranked = node.from
        .map((symbol) => ({ symbol, value: read(history[symbol], at, node.by) }))
        .filter((entry): entry is { symbol: string; value: number } => entry.value !== undefined)
        .sort((a, b) => (node.pick === "top" ? b.value - a.value : a.value - b.value))
        .slice(0, Math.max(node.count, 0))
      if (node.weighting === "inverse-volatility") {
        const swings = ranked.map(({ symbol }) =>
          read(history[symbol], at, { kind: "volatility", days: node.days ?? DEFAULT_VOLATILITY_DAYS })
        )
        if (swings.length && swings.every((swing) => swing)) {
          const inverse = swings.map((swing) => 1 / (swing ?? 1))
          const sum = inverse.reduce((total, value) => total + value, 0)
          return Object.fromEntries(ranked.map(({ symbol }, i) => [symbol, (inverse[i] ?? 0) / sum]))
        }
      }
      return Object.fromEntries(ranked.map(({ symbol }) => [symbol, 1 / ranked.length]))
    }
  }
}

export type Band = { drift: number; every: Schedule }

// The stocks that sit inside a rebalance on day `at`, each with the band it is kept in. A stock inside two takes the inner one.
export function bandsOf(node: Node, history: History, at: number): Record<string, Band> {
  switch (node.type) {
    case "group":
      return Object.assign({}, ...node.children.map(({ node: child }) => bandsOf(child, history, at))) as Record<
        string,
        Band
      >
    case "if":
      return bandsOf(holds(node.condition, history, at) ? node.then : node.else, history, at)
    case "rebalance": {
      const own = Object.fromEntries(
        Object.keys(evaluate(node.child, history, at)).map((symbol) => [
          symbol,
          { drift: node.drift, every: node.every },
        ])
      )
      return { ...own, ...bandsOf(node.child, history, at) }
    }
    default:
      return {}
  }
}

const conditionSymbols = (condition: Condition): string[] => {
  if ("all" in condition) return condition.all.flatMap(conditionSymbols)
  if ("any" in condition) return condition.any.flatMap(conditionSymbols)
  return [condition.left.symbol, ...("symbol" in condition.right ? [condition.right.symbol] : [])]
}

export function symbolsOf(node: Node): string[] {
  switch (node.type) {
    case "asset":
      return [node.symbol]
    case "cash":
      return []
    case "group":
      return [...new Set(node.children.flatMap(({ node: child }) => symbolsOf(child)))]
    case "if": {
      return [...new Set([...conditionSymbols(node.condition), ...symbolsOf(node.then), ...symbolsOf(node.else)])]
    }
    case "filter":
      return [...new Set(node.from)]
    case "rebalance":
      return symbolsOf(node.child)
  }
}
