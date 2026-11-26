export type Indicator =
  | { kind: "price" }
  | { kind: "sma"; days: number }
  | { kind: "ema"; days: number }
  | { kind: "sma-return"; days: number }
  // How overbought (high) or oversold (low) it is, 0 to 100
  | { kind: "rsi"; days: number }
  // How much it has gained or lost over the last `days`, as a fraction
  | { kind: "return"; days: number }
  | { kind: "volatility"; days: number }
  // The worst fall from a high within the last `days`, as a fraction below zero
  | { kind: "drawdown"; days: number }
  | { kind: "std-price"; days: number }

export type Reading = { symbol: string; indicator: Indicator }

export type Comparison = {
  left: Reading
  op: ">" | "<"
  right: Reading | { value: number }
}

export type Condition = Comparison | { all: Condition[] } | { any: Condition[] }

export type Side = "long" | "short"
export type Via = "spot" | "perp"

export type Weighting = "equal" | "specified" | "inverse-volatility"

export type Node =
  // Hold a stock, or short it. A short is only possible through a perp; a stock held long can be held as the token itself (spot)
  // or through a perp.
  | { type: "asset"; symbol: string; side?: Side; via?: Via }
  | { type: "cash" }
  | { type: "group"; name?: string; weighting: Weighting; days?: number; children: { node: Node; weight?: number }[] }
  | { type: "if"; condition: Condition; then: Node; else: Node }
  | {
      type: "filter"
      pick: "top" | "bottom"
      count: number
      by: Indicator
      from: string[]
      weighting?: "equal" | "inverse-volatility"
      days?: number
    }
  // Keeps what is inside on target: a stock that is still wanted is traded back to its share only when it has drifted more than
  // `drift` (a fraction of the portfolio) from it, and only looked at this often
  | { type: "rebalance"; drift: number; every: Schedule; child: Node }

export type Schedule = "daily" | "weekly" | "monthly"

export type Strategy = { name: string; schedule: Schedule; root: Node }

// How much of the strategy each stock should be, a short being below zero. What does not add up to one is cash.
export type Weights = Record<string, number>

// Daily closing prices, oldest first, every stock the same length and lined up by day
export type History = Record<string, number[]>
