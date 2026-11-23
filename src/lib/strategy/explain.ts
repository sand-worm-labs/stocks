import type { Comparison, Condition, Indicator, Node, Strategy } from "./types"

// A strategy said in plain words, for someone who has never read one: what it does, line by line, and what each technical term
// it uses means. This is a way of reading the strategy and nothing is kept from it.

export type Step = {
  // How far in it is: what is inside an if or a split is further in
  depth: number
  // A condition after "if", the "then" or "otherwise" that follows it, a way of splitting the money, or something to do
  kind: "if" | "then" | "else" | "split" | "do"
  text: string
  // The share of a split that this line gets, when the shares were set
  share?: string
}

export type Explained = { intro: string; steps: Step[] }

const EVERY = { daily: "Every day", weekly: "Every week", monthly: "Every month" } as const

// Figures read as percentages: what is a fraction of a price rather than a price, or a score
const FRACTIONS = new Set<Indicator["kind"]>(["return", "sma-return", "drawdown", "volatility"])

const trimmed = (value: number) => String(Number(value.toFixed(1)))

// An indicator as a phrase that goes after a stock's name
export function plainIndicator(indicator: Indicator): string {
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

// What a term means, in a sentence
export function meaningOf(indicator: Indicator): string {
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
        steps.push({ depth, kind: "do", text: `Hold ${node.symbol}.`, share })
        return
      case "cash":
        steps.push({ depth, kind: "do", text: "Stay in cash (USDC), holding no stock.", share })
        return
      case "filter": {
        const { pick, count, by, from, weighting } = node
        const which = count === 1 ? "the one" : `the ${count}`
        steps.push({
          depth,
          kind: "do",
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
    default:
      return []
  }
}

// The terms a strategy uses, each once, with what it means. A plain price needs no explaining unless it is all there is.
export function termsOf(strategy: Strategy): { term: string; meaning: string }[] {
  const seen = new Map<string, { term: string; meaning: string }>()
  for (const indicator of indicatorsOf(strategy.root)) {
    const term = plainIndicator(indicator)
    if (indicator.kind !== "price" && !seen.has(term)) seen.set(term, { term, meaning: meaningOf(indicator) })
  }
  return [...seen.values()]
}
