import type { Condition, Indicator, Reading } from "@/types/strategy"

export const describeIndicator = (indicator: Indicator) => {
  switch (indicator.kind) {
    case "price":
      return "price"
    case "sma":
      return `${indicator.days}-day average`
    case "ema":
      return `${indicator.days}-day EMA`
    case "sma-return":
      return `${indicator.days}-day average return`
    case "std-price":
      return `${indicator.days}-day price deviation`
    case "rsi":
      return `${indicator.days}-day RSI`
    case "return":
      return `${indicator.days}-day return`
    case "volatility":
      return `${indicator.days}-day volatility`
    case "drawdown":
      return `${indicator.days}-day max drawdown`
  }
}

const describeReading = ({ symbol, indicator }: Reading) => `${symbol} ${describeIndicator(indicator)}`

export function describeCondition(condition: Condition): string {
  if ("all" in condition) return condition.all.map(describeCondition).join(" and ")
  if ("any" in condition)
    return condition.any
      .map((part) => ("all" in part ? `(${describeCondition(part)})` : describeCondition(part)))
      .join(" or ")
  const { left, op, right } = condition
  return `${describeReading(left)} is ${op === ">" ? "above" : "below"} ${"value" in right ? right.value : describeReading(right)}`
}
