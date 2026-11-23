// What a strategy is made of. Everything it can say comes from these few blocks, nested as far as needed, and the whole of it
// is plain data, so it can be saved, shown, edited and handed to the backtest or the trader as it is.

export type Indicator =
  | { kind: "price" }
  // The average price over the last `days`
  | { kind: "sma"; days: number }
  // The same, counting the latest days for more
  | { kind: "ema"; days: number }
  // How much it moves a day on average, up or down, over the last `days`
  | { kind: "sma-return"; days: number }
  // How overbought (high) or oversold (low) it is, 0 to 100
  | { kind: "rsi"; days: number }
  // How much it has gained or lost over the last `days`, as a fraction
  | { kind: "return"; days: number }
  // How much its daily moves swing, over the last `days`
  | { kind: "volatility"; days: number }
  // The worst fall from a high within the last `days`, as a fraction below zero
  | { kind: "drawdown"; days: number }
  // How far its price strays from its own average over the last `days`
  | { kind: "std-price"; days: number }

// An indicator of one stock
export type Reading = { symbol: string; indicator: Indicator }

export type Comparison = {
  left: Reading
  op: ">" | "<"
  // Another stock's reading, or a plain number
  right: Reading | { value: number }
}

// One comparison, or several that must all hold, or any one of which will do
export type Condition = Comparison | { all: Condition[] } | { any: Condition[] }

// How a group divides itself between what is in it
export type Weighting = "equal" | "specified" | "inverse-volatility"

export type Node =
  | { type: "asset"; symbol: string }
  // Sit in cash: no stock at all
  | { type: "cash" }
  | { type: "group"; name?: string; weighting: Weighting; days?: number; children: { node: Node; weight?: number }[] }
  | { type: "if"; condition: Condition; then: Node; else: Node }
  // The best or worst few of a set, by an indicator, held equally
  | {
      type: "filter"
      pick: "top" | "bottom"
      count: number
      by: Indicator
      from: string[]
      weighting?: "equal" | "inverse-volatility"
      days?: number
    }

export type Schedule = "daily" | "weekly" | "monthly"

export type Strategy = { name: string; schedule: Schedule; root: Node }

// How much of the portfolio each stock should be. What does not add up to one is cash.
export type Weights = Record<string, number>

// Daily closing prices, oldest first, every stock the same length and lined up by day
export type History = Record<string, number[]>
