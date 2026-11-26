import type { Comparison, Condition, Indicator, Node } from "@/features/strategies/types/strategy.types"

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
