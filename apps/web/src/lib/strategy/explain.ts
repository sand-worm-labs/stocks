import type { Comparison, Condition, Indicator, Node, Strategy } from "@/types/strategy"

export type Step = {
  depth: number
  kind: "if" | "then" | "else" | "split" | "keep" | "do"
  text: string
  block?: "asset" | "cash" | "filter" | "group" | "rebalance"
  share?: string
}

type Explained = { intro: string; steps: Step[] }

const EACH = { daily: "every day", weekly: "every week", monthly: "every month" } as const

const EVERY = { daily: "Every day", weekly: "Every week", monthly: "Every month" } as const

// Figures read as percentages: what is a fraction of a price rather than a price, or a score
export const FRACTIONS = new Set<Indicator["kind"]>(["return", "sma-return", "drawdown", "volatility"])

const trimmed = (value: number) => String(Number(value.toFixed(1)))

function plainIndicator(indicator: Indicator): string {
  switch (indicator.kind) {
    case "price":
      return "price"
    case "sma":
      return `${indicator.days}-day average price`
    case "ema":
      return `${indicator.days}-day weighted average price`
    case "sma-return":
      return `${indicator.days}-day average daily move`
    case "return":
      return `${indicator.days}-day return`
    case "rsi":
      return `${indicator.days}-day RSI`
    case "volatility":
      return `${indicator.days}-day volatility`
    case "std-price":
      return `${indicator.days}-day price spread`
    case "drawdown":
      return `${indicator.days}-day worst fall`
  }
}

function plainComparison({ left, op, right }: Comparison) {
  const subject = `${left.symbol}'s ${plainIndicator(left.indicator)}`
  const verb = op === ">" ? "is above" : "is below"
  const object =
    "value" in right
      ? FRACTIONS.has(left.indicator.kind)
        ? `${trimmed(right.value * 100)}%`
        : String(right.value)
      : right.symbol === left.symbol
        ? `its own ${plainIndicator(right.indicator)}`
        : `${right.symbol}'s ${plainIndicator(right.indicator)}`
  return `${subject} ${verb} ${object}`
}

export function plainCondition(condition: Condition): string {
  if ("all" in condition) return condition.all.map(plainCondition).join(" and ")
  if ("any" in condition)
    return condition.any
      .map((part) => ("all" in part ? `(${plainCondition(part)})` : plainCondition(part)))
      .join(" or ")
  return plainComparison(condition)
}

function meaningOf(indicator: Indicator): string {
  const days = "days" in indicator ? indicator.days : 0
  switch (indicator.kind) {
    case "price":
      return "What one share costs right now."
    case "sma":
      return `Its average price over the last ${days} days. Being above it usually means the stock is trending up.`
    case "ema":
      return `Its average price over the last ${days} days, with the latest days counting for more.`
    case "sma-return":
      return `How much it moves, up or down, on an average day over the last ${days} days.`
    case "return":
      return `How much it has gained or lost over the last ${days} days.`
    case "rsi":
      return `A score from 0 to 100 for how fast it has risen or fallen over ${days} days. Under 30 often means it has been sold off, over 70 that it has run up.`
    case "volatility":
      return `How much its price swings from day to day over ${days} days. Higher means a bumpier ride.`
    case "std-price":
      return `How far its price tends to stray from its ${days}-day average.`
    case "drawdown":
      return `The biggest fall from a high point in the last ${days} days.`
  }
}

const percent = (share: number) => `${Math.round(share * 100)}%`

export function explainStrategy(strategy: Strategy): Explained {
  const steps: Step[] = []

  const walk = (node: Node, depth: number, share?: string) => {
    switch (node.type) {
      case "asset":
        steps.push({
          depth,
          kind: "do",
          block: "asset",
          text:
            node.side === "short"
              ? `Short ${node.symbol}, through a perp.`
              : node.via === "perp"
                ? `Hold ${node.symbol} through a perp.`
                : `Hold ${node.symbol}.`,
          share,
        })
        return
      case "cash":
        steps.push({ depth, kind: "do", block: "cash", text: "Stay in cash (USDC), holding no stock.", share })
        return
      case "filter": {
        const { pick, count, by, from, weighting } = node
        const which = count === 1 ? "the one" : `the ${count}`
        steps.push({
          depth,
          kind: "do",
          block: "filter",
          text: `Out of ${from.join(", ")}, pick ${which} with the ${pick === "top" ? "highest" : "lowest"} ${plainIndicator(by)}, and hold ${count === 1 ? "it" : "them"}${weighting === "inverse-volatility" ? ", giving more to the steadier ones" : count === 1 ? "" : " equally"}.`,
          share,
        })
        return
      }
      case "group": {
        const total = node.children.reduce((sum, { weight }) => sum + Math.max(weight ?? 0, 0), 0)
        const how =
          node.weighting === "specified"
            ? "in the shares shown"
            : node.weighting === "inverse-volatility"
              ? "giving more to the steadier ones"
              : "equally"
        steps.push({
          depth,
          kind: "split",
          block: "group",
          text: `${node.name ? `${node.name}: split` : "Split"} the money ${how}:`,
          share,
        })
        for (const { node: child, weight } of node.children) {
          walk(
            child,
            depth + 1,
            node.weighting === "specified" && total > 0 ? percent(Math.max(weight ?? 0, 0) / total) : undefined
          )
        }
        return
      }
      case "rebalance": {
        const points = Math.round(node.drift * 100)
        steps.push({
          depth,
          kind: "keep",
          block: "rebalance",
          text: `Back to target when any stock drifts more than ${points} ${points === 1 ? "point" : "points"} from its share, checked ${EACH[node.every]}:`,
          share,
        })
        walk(node.child, depth + 1)
        return
      }
      case "if":
        steps.push({ depth, kind: "if", text: plainCondition(node.condition), share })
        steps.push({ depth: depth + 1, kind: "then", text: "" })
        walk(node.then, depth + 2)
        steps.push({ depth: depth + 1, kind: "else", text: "" })
        walk(node.else, depth + 2)
        return
    }
  }

  walk(strategy.root, 0)

  return {
    intro: `${EVERY[strategy.schedule]}, it re-reads the market and works out what to hold. Here is how it decides.`,
    steps,
  }
}

const readingsOf = (condition: Condition): Indicator[] =>
  "all" in condition
    ? condition.all.flatMap(readingsOf)
    : "any" in condition
      ? condition.any.flatMap(readingsOf)
      : [condition.left.indicator, ...("symbol" in condition.right ? [condition.right.indicator] : [])]

const indicatorsOf = (node: Node): Indicator[] => {
  switch (node.type) {
    case "group":
      return node.children.flatMap(({ node: child }) => indicatorsOf(child))
    case "if":
      return [...readingsOf(node.condition), ...indicatorsOf(node.then), ...indicatorsOf(node.else)]
    case "filter":
      return [node.by]
    case "rebalance":
      return indicatorsOf(node.child)
    default:
      return []
  }
}

export function termsOf(strategy: Strategy): { term: string; meaning: string }[] {
  const seen = new Map<string, { term: string; meaning: string }>()
  for (const indicator of indicatorsOf(strategy.root)) {
    const term = plainIndicator(indicator)
    if (indicator.kind !== "price" && !seen.has(term)) seen.set(term, { term, meaning: meaningOf(indicator) })
  }
  return [...seen.values()]
}
